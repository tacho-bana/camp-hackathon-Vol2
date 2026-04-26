import { useEffect, useRef } from "react";
import { getEnemies } from "../api/enemies";
import type { Enemy } from "../types/game";
import type { EnemyResponse } from "../types/api";

function mapEnemyResponseToEnemy(res: EnemyResponse): Enemy {
  return {
    id: res.id,
    lat: res.lat,
    lng: res.lng,
    hp: res.hp,
    maxHp: res.max_hp,
    speed: 1,
    state: res.state,
  };
}

export function useEnemyPolling(
  active: boolean,
  onUpdate: (enemies: Enemy[]) => void,
): void {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    if (!active) return;

    const poll = async () => {
      try {
        const responses = await getEnemies();
        onUpdateRef.current(responses.map(mapEnemyResponseToEnemy));
      } catch (e) {
        console.error("[useEnemyPolling]", e);
      }
    };

    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [active]); // onUpdate を deps から除外
}
