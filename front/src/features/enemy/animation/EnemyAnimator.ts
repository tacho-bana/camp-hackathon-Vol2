import { enemyParams } from "../assets/params";
import { easeOutQuad, pingPong } from "../utils/easing";
import type { EnemyFrame, EnemyModel, EnemyRenderContext } from "../types/enemy";

export function computeEnemyFrame(
  enemy: EnemyModel,
  context: EnemyRenderContext,
): EnemyFrame {
  const t = context.timeSec;
  const cycle = pingPong(t * 2);

  const baseBob = Math.sin(t * 4 + enemy.id.length) * enemyParams.bobAmplitude;
  const moveBoost = enemy.animState === "walk" ? 1.4 : 1;
  const bobY = baseBob * moveBoost;

  const stretch = 1 + cycle * 0.05;
  const squash = 1 - cycle * 0.05;

  const hitProgress = enemy.animState === "hit" ? Math.min(1, context.deltaSec * 10) : 0;
  const flashAlpha = (1 - easeOutQuad(hitProgress)) * 160;

  const attackSwing = enemy.animState === "attack" ? Math.sin(t * 14) * 0.6 : 0;

  return {
    bobY,
    squash,
    stretch,
    flashAlpha,
    weaponSwing: attackSwing,
  };
}
