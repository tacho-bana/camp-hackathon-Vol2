import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { Enemy } from "../../../types/game";

type HouseSpriteProps = {
  enemy: Enemy;
};

export function HouseSprite({ enemy }: HouseSpriteProps) {
  const spriteRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const neckRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);

  // Facing direction based on internal logic or just rely on velocity if we had it.
  // Here we use a generic hash logic mapped over from EnemySprite or just apply CSS scaleX if needed.
  // We'll let the parent handle the position, we only handle local animation here.

  useEffect(() => {
    if (!bodyRef.current || !neckRef.current || !headRef.current) {
      return;
    }

    gsap.set(bodyRef.current, { xPercent: -50, force3D: true });
    gsap.set(neckRef.current, { xPercent: -50, transformOrigin: "50% 100%", force3D: true });
    gsap.set(headRef.current, { xPercent: -50, yPercent: -50, transformOrigin: "50% 50%", force3D: true });

    return () => {
      gsap.killTweensOf(spriteRef.current);
      gsap.killTweensOf(bodyRef.current);
      gsap.killTweensOf(neckRef.current);
      gsap.killTweensOf(headRef.current);
    };
  }, []);

  useEffect(() => {
    if (!bodyRef.current || !neckRef.current || !headRef.current) {
      return;
    }

    const tBody = gsap.getTweensOf(bodyRef.current);
    const tNeck = gsap.getTweensOf(neckRef.current);
    const tHead = gsap.getTweensOf(headRef.current);

    tBody.forEach(t => t.kill());
    tNeck.forEach(t => t.kill());
    tHead.forEach(t => t.kill());

    if (enemy.state === "moving") {
      gsap.to(bodyRef.current, {
        y: -4,
        rotation: 2,
        yoyo: true,
        repeat: -1,
        duration: 0.3,
        ease: "sine.inOut"
      });
      gsap.to(neckRef.current, {
        rotation: 10,
        yoyo: true,
        repeat: -1,
        duration: 0.4,
        ease: "sine.inOut"
      });
      gsap.to(headRef.current, {
        y: 2,
        rotation: -5,
        yoyo: true,
        repeat: -1,
        duration: 0.4,
        ease: "sine.inOut",
        delay: 0.1
      });
    } else if (enemy.state === "attacking") {
      gsap.to(bodyRef.current, {
        x: 4,
        yoyo: true,
        repeat: -1,
        duration: 0.1,
        ease: "power1.inOut"
      });
      gsap.to(neckRef.current, {
        rotation: 25,
        yoyo: true,
        repeat: -1,
        duration: 0.2,
        ease: "back.out(1.7)"
      });
      gsap.to(headRef.current, {
        rotation: 15,
        yoyo: true,
        repeat: -1,
        duration: 0.2,
        ease: "back.out(1.7)",
        delay: 0.05
      });
    } else if (enemy.state === "dead") {
      gsap.to(spriteRef.current, {
        autoAlpha: 0,
        rotation: 90,
        scale: 0.5,
        duration: 0.5,
        ease: "power2.in"
      });
    } else {
      // Idle
      gsap.to(bodyRef.current, {
        y: 0,
        rotation: 0,
        duration: 0.5,
        ease: "sine.out"
      });
      gsap.to(neckRef.current, {
        rotation: 0,
        duration: 0.5,
        ease: "sine.out"
      });
      gsap.to(headRef.current, {
        y: 0,
        rotation: 0,
        duration: 0.5,
        ease: "sine.out"
      });
    }
  }, [enemy.state]);

  const hpPercent = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));

  return (
    <div ref={spriteRef} className="house-sprite">
      <div className="enemy-hp-bar-bg">
        <div
          className="enemy-hp-bar-fill"
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      <div ref={bodyRef} className="house-body-wrap">
        <img className="house-body" src="/enemy/house/body.svg" alt="" draggable={false} />
      </div>
      <div ref={neckRef} className="house-neck-wrap">
        <img className="house-neck" src="/enemy/house/neck.svg" alt="" draggable={false} />
      </div>
      <div ref={headRef} className="house-head-wrap">
        <img className="house-head" src="/enemy/house/head.svg" alt="" draggable={false} />
      </div>
    </div>
  );
}