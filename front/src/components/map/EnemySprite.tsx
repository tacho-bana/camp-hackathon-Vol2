import { useEffect, useRef } from "react";
import p5 from "p5";
import {
  computeEnemyFrame,
  drawEnemy,
  transitionEnemyState,
  type EnemyKind,
  type EnemyModel,
} from "../../features/enemy";
import type { Enemy } from "../../types/game";

const enemyKinds: EnemyKind[] = ["triangle", "circle", "house", "worm"];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function resolveEnemyKind(enemyId: string): EnemyKind {
  return enemyKinds[hashString(enemyId) % enemyKinds.length];
}

function resolveFacing(enemyId: string): 1 | -1 {
  return hashString(enemyId) % 2 === 0 ? 1 : -1;
}

function mapEnemyStateToAnimState(state: Enemy["state"]): EnemyModel["animState"] {
  if (state === "attacking") {
    return "attack";
  }
  if (state === "moving") {
    return "walk";
  }
  if (state === "dead") {
    return "death";
  }
  return "idle";
}

export function EnemySprite({ enemy }: { enemy: Enemy }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<EnemyModel>({
    id: `overlay-enemy-${enemy.id}`,
    kind: resolveEnemyKind(enemy.id),
    x: 32,
    y: 34,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    phase: enemy.state === "dead" ? "dead" : "alive",
    animState: mapEnemyStateToAnimState(enemy.state),
    facing: resolveFacing(enemy.id),
  });

  useEffect(() => {
    const model = modelRef.current;
    model.hp = enemy.hp;
    model.maxHp = enemy.maxHp;
    model.phase = enemy.state === "dead" ? "dead" : "alive";
    model.animState = mapEnemyStateToAnimState(enemy.state);
  }, [enemy.hp, enemy.maxHp, enemy.state]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const sketch = new p5((s: p5) => {
      s.setup = () => {
        s.createCanvas(64, 72);
      };

      s.draw = () => {
        s.clear();

        const model = modelRef.current;
        if (model.phase === "alive") {
          if (model.animState === "attack") {
            Object.assign(model, transitionEnemyState(model, "attack"));
          } else if (model.animState === "walk") {
            Object.assign(model, transitionEnemyState(model, "walk"));
          } else {
            Object.assign(model, transitionEnemyState(model, "idle"));
          }
        }

        const frame = computeEnemyFrame(model, {
          timeSec: s.millis() / 1000,
          deltaSec: s.deltaTime / 1000,
        });
        drawEnemy(s, model, frame);
      };
    }, containerRef.current);

    return () => {
      sketch.remove();
    };
  }, []);

  return <div ref={containerRef} className="enemy-overlay-canvas" />;
}
