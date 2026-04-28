import { useEffect, useRef } from "react";
import p5 from "p5";
import {
  computeEnemyFrame,
  drawEnemy,
  transitionEnemyState,
  type EnemyKind,
  type EnemyModel,
} from "../../features/enemy";

type EnemyCanvasProps = {
  width?: number;
  height?: number;
};

export function EnemyCanvas({ width = 640, height = 260 }: EnemyCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const sketch = (s: p5) => {
      const kinds: EnemyKind[] = ["triangle", "circle", "house", "worm"];
      let enemies: EnemyModel[] = [];

      s.setup = () => {
        s.createCanvas(width, height);

        enemies = kinds.map((kind, index) => ({
          id: `enemy-${kind}`,
          kind,
          x: ((index + 1) * width) / (kinds.length + 1),
          y: height * 0.58,
          hp: 100,
          maxHp: 100,
          phase: "alive",
          animState: "idle",
          facing: index % 2 === 0 ? 1 : -1,
        }));
      };

      s.draw = () => {
        s.background(15, 23, 42);

        const timeSec = s.millis() / 1000;
        const deltaSec = s.deltaTime / 1000;

        enemies = enemies.map((enemy, index) => {
          let nextEnemy = enemy;
          const localFrame = s.frameCount + index * 20;

          if (nextEnemy.phase === "alive") {
            if (localFrame % 180 === 0) {
              nextEnemy = transitionEnemyState(nextEnemy, "attack");
            } else if (localFrame % 120 === 0) {
              nextEnemy = transitionEnemyState(nextEnemy, "walk");
            } else if (localFrame % 60 === 0) {
              nextEnemy = transitionEnemyState(nextEnemy, "idle");
            }
          }

          const frame = computeEnemyFrame(nextEnemy, { timeSec, deltaSec });
          drawEnemy(s, nextEnemy, frame);
          return nextEnemy;
        });
      };

      s.windowResized = () => {
        s.resizeCanvas(width, height);
      };
    };

    const instance = new p5(sketch, containerRef.current);

    return () => {
      instance.remove();
    };
  }, [height, width]);

  return <div ref={containerRef} className="p5-canvas-root" />;
}
