export type EnemyAnimationState = "idle" | "walk" | "attack" | "hit" | "death";

export type EnemyPhase = "alive" | "dead";

export type EnemyKind = "triangle" | "circle" | "house" | "worm";

export type EnemyModel = {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  phase: EnemyPhase;
  animState: EnemyAnimationState;
  facing: 1 | -1;
};

export type EnemyFrame = {
  bobY: number;
  squash: number;
  stretch: number;
  flashAlpha: number;
  weaponSwing: number;
};

export type EnemyRenderContext = {
  timeSec: number;
  deltaSec: number;
};
