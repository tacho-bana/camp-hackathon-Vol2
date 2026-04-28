import type p5 from "p5";
import { enemyPalette } from "../assets/palettes";
import { enemyParams } from "../assets/params";
import type { EnemyFrame, EnemyModel } from "../types/enemy";

export function drawEnemy(s: p5, enemy: EnemyModel, frame: EnemyFrame): void {
  s.push();
  s.noStroke();
  s.fill(enemyPalette.shadow + "66");
  s.ellipse(
    enemy.x,
    enemy.y + enemyParams.radius + 10,
    enemyParams.radius * 1.6,
    14,
  );
  s.pop();

  s.push();
  s.translate(enemy.x, enemy.y + frame.bobY);
  s.scale(enemy.facing, 1);

  s.push();

  drawEnemyBodyByKind(s, enemy);

  s.pop();

  drawHpBar(s, enemy);
  s.pop();
}

function drawHpBar(s: p5, enemy: EnemyModel): void {
  const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
  const width = enemyParams.hpBarWidth;

  s.noStroke();
  s.fill(enemyPalette.hpBack);
  s.rect(-width / 2, -enemyParams.radius - 16, width, enemyParams.hpBarHeight, 3);

  s.fill(enemyPalette.hpFill);
  s.rect(
    -width / 2,
    -enemyParams.radius - 16,
    width * ratio,
    enemyParams.hpBarHeight,
    3,
  );
}

function drawEnemyBodyByKind(s: p5, enemy: EnemyModel): void {
  const size = enemyParams.radius * 2;

  s.stroke(120, 0, 0);
  s.strokeWeight(4);
  s.strokeJoin(s.ROUND);
  s.fill(enemyPalette.bodyMain);

  switch (enemy.kind) {
    case "triangle":
      s.triangle(0, -enemyParams.radius, -enemyParams.radius, enemyParams.radius, enemyParams.radius, enemyParams.radius);
      s.point(-enemyParams.radius / 4, enemyParams.radius / 4);
      s.point(-enemyParams.radius / 4, enemyParams.radius / 1.5);
      s.line(enemyParams.radius/16, enemyParams.radius / 1.2,enemyParams.radius / 4, -enemyParams.radius / 6);
      break;
    case "house":
      s.rectMode(s.CENTER);
      s.rect(0, 4, size * 0.95, size * 0.85, 4);
      s.triangle(0, -enemyParams.radius - 6, -enemyParams.radius, -2, enemyParams.radius, -2);
      s.rectMode(s.CORNER);
      break;
    case "worm": {
      const t = s.millis() / 1000;
      const seed = enemy.id.length * 0.33;
      const speed = 3;
      const amplitude = 4.8;
      const phaseStep = 0.75;

      const xSegments = [-16, -4, 10, 22];
      const widths = [size * 0.62, size * 0.72, size * 0.68, size * 0.56];
      const heights = [size * 0.5, size * 0.58, size * 0.54, size * 0.44];

      for (let i = 0; i < xSegments.length; i += 1) {
        const yWave = s.sin(t * speed + i * phaseStep + seed) * amplitude;
        s.ellipse(xSegments[i], yWave, widths[i], heights[i]);
      }

      s.strokeWeight(3);
      s.point(25, s.sin(t * speed + 2 * phaseStep + seed) * amplitude - 2);
      s.point(25, s.sin(t * speed + 2 * phaseStep + seed) * amplitude + 2);
      break;
    }
    case "circle":
    default:
      s.circle(0, 0, size);
      s.arc(0, 0, size - 15, size - 15, s.PI, s.TWO_PI);
      s.point(-enemyParams.radius / 4, enemyParams.radius / 4);
      s.point(enemyParams.radius / 4, enemyParams.radius / 4);

      return;
  }


}
