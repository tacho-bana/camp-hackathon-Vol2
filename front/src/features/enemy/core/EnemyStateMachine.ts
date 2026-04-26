import type { EnemyAnimationState, EnemyModel } from "../types/enemy";

export function transitionEnemyState(
  enemy: EnemyModel,
  nextState: EnemyAnimationState,
): EnemyModel {
  if (enemy.phase === "dead") {
    return { ...enemy, animState: "death" };
  }

  return {
    ...enemy,
    animState: nextState,
  };
}

export function applyEnemyDamage(enemy: EnemyModel, amount: number): EnemyModel {
  const nextHp = Math.max(0, enemy.hp - amount);

  if (nextHp === 0) {
    return {
      ...enemy,
      hp: 0,
      phase: "dead",
      animState: "death",
    };
  }

  return {
    ...enemy,
    hp: nextHp,
    animState: "hit",
  };
}
