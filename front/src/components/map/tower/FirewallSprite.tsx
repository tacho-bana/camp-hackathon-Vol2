import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type FirewallSpriteProps = {
  aimingAngleRad: number;
  firing: boolean;
  wobble: number;
};

export function FirewallSprite({
  firing,
  wobble,
}: FirewallSpriteProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!wrapRef.current) {
      return;
    }

    gsap.set(wrapRef.current, {
      xPercent: -50,
      yPercent: -50,
      transformOrigin: "50% 50%",
      force3D: true,
    });

    return () => {
      gsap.killTweensOf(wrapRef.current);
    };
  }, []);

  useEffect(() => {
    if (!wrapRef.current) {
      return;
    }

    // Bobbing animation
    gsap.to(wrapRef.current, {
      y: wobble * 0.5,
      duration: 0.18,
      ease: "sine.inOut",
      overwrite: "auto",
    });
  }, [wobble]);

  useEffect(() => {
    if (!wrapRef.current) {
      return;
    }

    if (firing) {
      gsap.to(wrapRef.current, {
        scale: 1.1,
        yoyo: true,
        repeat: 1,
        duration: 0.1,
        ease: "power1.inOut",
        overwrite: "auto",
      });
    }
  }, [firing]);

  return (
    <div className={firing ? "firewall-sprite firing" : "firewall-sprite"}>
      <div ref={wrapRef} className="firewall-wrap">
        <img
          className="firewall-base"
          src="/tower/fierwall/path1.svg"
          alt=""
          draggable={false}
        />
      </div>
    </div>
  );
}