import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

type ElectricTowerSpriteProps = {
  aimingAngleRad: number;
  firing: boolean;
  wobble: number;
};

export function ElectricTowerSprite({
  aimingAngleRad,
  firing,
  wobble,
}: ElectricTowerSpriteProps) {
  const coreWrapRef = useRef<HTMLDivElement | null>(null);
  const headWrapRef = useRef<HTMLDivElement | null>(null);

  const aimingAngleDeg = useMemo(
    () => (aimingAngleRad * 180) / Math.PI,
    [aimingAngleRad],
  );

  useEffect(() => {
    if (!coreWrapRef.current || !headWrapRef.current) {
      return;
    }

    gsap.set(coreWrapRef.current, {
      xPercent: -50,
      y: wobble,
      force3D: true,
    });

    gsap.set(headWrapRef.current, {
      xPercent: -50,
      yPercent: -50,
      transformOrigin: "50% 50%",
      force3D: true,
    });

    return () => {
      gsap.killTweensOf(coreWrapRef.current);
      gsap.killTweensOf(headWrapRef.current);
    };
  }, []);

  useEffect(() => {
    if (!coreWrapRef.current) {
      return;
    }

    gsap.to(coreWrapRef.current, {
      y: wobble,
      duration: 0.16,
      ease: "sine.inOut",
      overwrite: "auto",
    });
  }, [wobble]);

  useEffect(() => {
    if (!headWrapRef.current) {
      return;
    }

    gsap.to(headWrapRef.current, {
      duration: 0.12,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [aimingAngleDeg]);

  return (
    <div className={firing ? "electric-tower firing" : "electric-tower"}>
      <img
        className="electric-tower-base"
        src="/tower/erectric_tower/path1.svg"
        alt=""
        draggable={false}
      />

      <div
        ref={coreWrapRef}
        className="electric-tower-core-wrap"
      >
        <img
          className="electric-tower-core"
          src="/tower/erectric_tower/path4.svg"
          alt=""
          draggable={false}
        />
      </div>

      <div
        ref={headWrapRef}
        className="electric-tower-head-wrap"
      >
        <img
          className="electric-tower-head"
          src="/tower/erectric_tower/path3.svg"
          alt=""
          draggable={false}
        />
      </div>
    </div>
  );
}
