import type { Enemy } from "../../types/game";

export function EnemyLayer({ enemies }: { enemies: Enemy[] }) {
  const aliveCount = enemies.filter((e) => e.state !== "dead").length;
  return (
    <div className="layer layer-enemy">
      <span>敵レイヤー</span>
      <span>生存中の敵: {aliveCount}体</span>
    </div>
  );
}
