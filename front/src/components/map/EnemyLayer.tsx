import type { Enemy } from "../../types/game";

export function EnemyLayer({ enemies }: { enemies: Enemy[] }) {
  const aliveCount = enemies.filter((enemy) => enemy.state !== "dead").length;
  const deadCount = enemies.length - aliveCount;

  return (
    <div className="layer layer-enemy">
      <strong>敵レイヤー</strong>
      <span>生存中: {aliveCount}体</span>
      <span>撃破済み: {deadCount}体</span>
    </div>
  );
}
