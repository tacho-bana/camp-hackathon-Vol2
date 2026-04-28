export { drawEnemy } from "./render/EnemyRenderer";
export { computeEnemyFrame } from "./animation/EnemyAnimator";
export { applyEnemyDamage, transitionEnemyState } from "./core/EnemyStateMachine";
export type {
	EnemyModel,
	EnemyAnimationState,
	EnemyRenderContext,
	EnemyKind,
} from "./types/enemy";
