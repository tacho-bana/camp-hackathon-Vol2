import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

type TalettSpriteProps = {
  aimingAngleRad: number;
  firing: boolean;
  wobble: number;
};

export function TalettSprite({
  aimingAngleRad,
  firing,
  wobble,
}: TalettSpriteProps) {
  const baseWrapRef = useRef<HTMLDivElement | null>(null);
  const midStructureWrapRef = useRef<HTMLDivElement | null>(null);
  const headWrapRef = useRef<HTMLDivElement | null>(null);

  const aimingAngleDeg = useMemo(
    () => (aimingAngleRad * 180) / Math.PI,
    [aimingAngleRad],
  );

  useEffect(() => {
    if (!baseWrapRef.current || !midStructureWrapRef.current || !headWrapRef.current) {
      return;
    }

    gsap.set(baseWrapRef.current, {
      xPercent: -50,
      y: wobble,
      force3D: true,
    });

    gsap.set(midStructureWrapRef.current, {
      xPercent: -50,
      y: wobble - 10,
      force3D: true,
    });

    gsap.set(headWrapRef.current, {
      xPercent: -50,
      yPercent: -50,
      transformOrigin: "50% 50%",
      force3D: true,
    });

    return () => {
      gsap.killTweensOf(baseWrapRef.current);
      gsap.killTweensOf(midStructureWrapRef.current);
      gsap.killTweensOf(headWrapRef.current);
    };
  }, [wobble]);

  useEffect(() => {
    if (!baseWrapRef.current || !midStructureWrapRef.current) {
      return;
    }

    gsap.to(baseWrapRef.current, {
      y: wobble,
      duration: 0.16,
      ease: "sine.inOut",
      overwrite: "auto",
    });

    gsap.to(midStructureWrapRef.current, {
      y: wobble - 10,
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
      rotation: aimingAngleDeg,
      duration: 0.12,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [aimingAngleDeg]);

  useEffect(() => {
    if (!headWrapRef.current) {
      return;
    }

    if (firing) {
      gsap.fromTo(
        headWrapRef.current,
        { y: -8 },
        {
          y: 0,
          duration: 0.15,
          ease: "back.out",
          overwrite: "auto",
        },
      );
    }
  }, [firing]);

  return (
    <div className={firing ? "talett-sprite firing" : "talett-sprite"}>
      <div ref={baseWrapRef} className="talett-base-wrap">
        <img
          className="talett-base"
          src="/tower/talett/path1.svg"
          alt=""
          draggable={false}
        />
      </div>

      <div ref={midStructureWrapRef} className="talett-mid-wrap">
        <img
          className="talett-mid"
          src="/tower/talett/path6.svg"
          alt=""
          draggable={false}
        />
      </div>

      <div ref={headWrapRef} className="talett-head-wrap">
        <img
          className="talett-head"
          src="/tower/talett/path2.svg"
          alt=""
          draggable={false}
        />
      </div>
    </div>
  );
}