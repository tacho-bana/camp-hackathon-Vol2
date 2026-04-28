import { useEffect, useRef } from "react";
import type { Enemy, LatLng, Structure } from "../types/game";
import { calcDistance } from "../utils/geo";

// ── 定数 ─────────────────────────────────────────────────────────
const TICK_MS = 500;
const ENEMY_SPEED_MPS = 5;
const BASE_REACH_M = 12;
const WAYPOINT_REACH_M = 3;
const ENEMY_BASE_DAMAGE = 8;
const TURRET_RANGE_M = 80;
const TURRET_BASE_DAMAGE = 22;
const TURRET_COOLDOWN_TICKS = 2;
const WALL_RANGE_M = 35;
const WALL_SLOW_FACTOR = 0.4;
// ─────────────────────────────────────────────────────────────────

/** バトル中に発生するイベント */
export type CombatEvent =
  | { type: "enemy_hit"; enemyId: string; damage: number }
  | { type: "enemy_dead"; enemyId: string }
  | { type: "base_damaged"; damage: number };

/** ルートウェイポイントに沿って敵を 1 ティック分移動させる */
function moveEnemy(
  enemy: Enemy,
  home: LatLng,
  speedM: number,
): Pick<Enemy, "lat" | "lng" | "routeIndex" | "state"> {
  const route = enemy.route;
  const routeIdx = enemy.routeIndex ?? 0;

  if (!route || route.length === 0) {
    const dist = calcDistance({ lat: enemy.lat, lng: enemy.lng }, home);
    if (dist <= BASE_REACH_M) {
      return { lat: enemy.lat, lng: enemy.lng, routeIndex: routeIdx, state: "attacking" };
    }
    const frac = Math.min(speedM / dist, 1);
    return {
      lat: enemy.lat + (home.lat - enemy.lat) * frac,
      lng: enemy.lng + (home.lng - enemy.lng) * frac,
      routeIndex: routeIdx,
      state: "moving",
    };
  }

  let lat = enemy.lat;
  let lng = enemy.lng;
  let idx = routeIdx;
  let remaining = speedM;

  while (remaining > 0 && idx < route.length) {
    const target = route[idx];
    const dist = calcDistance({ lat, lng }, target);

    if (dist <= WAYPOINT_REACH_M) {
      lat = target.lat;
      lng = target.lng;
      idx++;
      continue;
    }

    if (dist <= remaining) {
      lat = target.lat;
      lng = target.lng;
      remaining -= dist;
      idx++;
    } else {
      const frac = remaining / dist;
      lat += (target.lat - lat) * frac;
      lng += (target.lng - lng) * frac;
      remaining = 0;
    }
  }

  const distToBase = calcDistance({ lat, lng }, home);
  if (idx >= route.length || distToBase <= BASE_REACH_M) {
    return { lat, lng, routeIndex: idx, state: "attacking" };
  }

  return { lat, lng, routeIndex: idx, state: "moving" };
}

// ─────────────────────────────────────────────────────────────────

export function useGameSimulation({
  isActive,
  homeCoords,
  structures,
  enemies,
  attackBuff,
  onUpdate,
}: {
  isActive: boolean;
  homeCoords: LatLng | null;
  structures: Structure[];
  enemies: Enemy[];
  attackBuff: boolean;
  /** 新しい敵リスト・拠点ダメージ・イベント列を返す */
  onUpdate: (newEnemies: Enemy[], homeDamage: number, events: CombatEvent[]) => void;
}) {
  const homeRef = useRef(homeCoords);
  const structuresRef = useRef(structures);
  const enemiesRef = useRef(enemies);
  const attackBuffRef = useRef(attackBuff);
  const onUpdateRef = useRef(onUpdate);
  const turretCooldownRef = useRef<Map<string, number>>(new Map());

  useEffect(() => { homeRef.current = homeCoords; }, [homeCoords]);
  useEffect(() => { structuresRef.current = structures; }, [structures]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
  useEffect(() => { attackBuffRef.current = attackBuff; }, [attackBuff]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (!isActive) return;
    turretCooldownRef.current.clear();

    const interval = setInterval(() => {
      const home = homeRef.current;
      if (!home) return;

      const currentEnemies = [...enemiesRef.current];
      const currentStructures = structuresRef.current;
      const buff = attackBuffRef.current;
      const turretCooldowns = turretCooldownRef.current;
      const events: CombatEvent[] = [];
      let homeDamage = 0;

      // ── ステップ1: 移動 ────────────────────────────────────────
      const movedEnemies = currentEnemies.map((enemy) => {
        if (enemy.state === "dead") return enemy;

        const distToBase = calcDistance({ lat: enemy.lat, lng: enemy.lng }, home);
        if (enemy.state === "attacking" || distToBase <= BASE_REACH_M) {
          homeDamage += ENEMY_BASE_DAMAGE;
          return { ...enemy, state: "attacking" as const };
        }

        const isSlowed = currentStructures.some(
          (s) =>
            s.kind === "wall" &&
            calcDistance(
              { lat: enemy.lat, lng: enemy.lng },
              { lat: s.lat, lng: s.lng },
            ) <= WALL_RANGE_M,
        );
        const speed = ENEMY_SPEED_MPS * (isSlowed ? WALL_SLOW_FACTOR : 1);
        const moved = moveEnemy(enemy, home, speed);
        if (moved.state === "attacking") homeDamage += ENEMY_BASE_DAMAGE;
        return { ...enemy, ...moved };
      });

      if (homeDamage > 0) {
        events.push({ type: "base_damaged", damage: homeDamage });
      }

      // ── ステップ2: タレット攻撃 ────────────────────────────────
      const damageMap = new Map<string, number>();

      for (const structure of currentStructures) {
        if (structure.kind !== "turret") continue;

        const cd = turretCooldowns.get(structure.id) ?? 0;
        if (cd > 0) {
          turretCooldowns.set(structure.id, cd - 1);
          continue;
        }

        let target: Enemy | null = null;
        let minDist = Infinity;

        for (const enemy of movedEnemies) {
          if (enemy.state === "dead") continue;
          const d = calcDistance(
            { lat: enemy.lat, lng: enemy.lng },
            { lat: structure.lat, lng: structure.lng },
          );
          if (d <= TURRET_RANGE_M && d < minDist) {
            target = enemy;
            minDist = d;
          }
        }

        if (target) {
          const dmg = Math.round(TURRET_BASE_DAMAGE * (buff ? 1.5 : 1.0));
          damageMap.set(target.id, (damageMap.get(target.id) ?? 0) + dmg);
          turretCooldowns.set(structure.id, TURRET_COOLDOWN_TICKS);
          events.push({ type: "enemy_hit", enemyId: target.id, damage: dmg });
        }
      }

      // ── ステップ3: ダメージ適用 ────────────────────────────────
      const finalEnemies = movedEnemies.map((enemy) => {
        if (enemy.state === "dead") return enemy;
        const dmg = damageMap.get(enemy.id) ?? 0;
        if (dmg === 0) return enemy;
        const newHp = Math.max(0, enemy.hp - dmg);
        if (newHp === 0) {
          events.push({ type: "enemy_dead", enemyId: enemy.id });
          return { ...enemy, hp: 0, state: "dead" as const };
        }
        return { ...enemy, hp: newHp };
      });

      onUpdateRef.current(finalEnemies, homeDamage, events);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [isActive]);
}
