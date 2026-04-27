import { useEffect, useRef } from "react";
import p5 from "p5";

type P5SampleCanvasProps = {
  width?: number;
  height?: number;
};

export function P5SampleCanvas({
  width = 640,
  height = 260,
}: P5SampleCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const sketch = (s: p5) => {
      s.setup = () => {
        s.createCanvas(width, height);
        s.noStroke();
      };

      s.draw = () => {
        s.background(12, 18, 30);

        for (let i = 0; i < 28; i += 1) {
          const offset = i * 18;
          const pulse = s.sin(s.frameCount * 0.04 + i * 0.55);
          const x = (offset + s.frameCount * 2.2) % (width + 40) - 20;
          const y = height * 0.5 + pulse * 72;
          const radius = 10 + (pulse + 1) * 8;

          s.fill(56, 189, 248, 90 + i * 3);
          s.circle(x, y, radius);
        }

        s.fill(34, 197, 94, 210);
        s.circle(width * 0.15 + s.sin(s.frameCount * 0.02) * 20, height * 0.2, 56);
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
