// ⚠️ 注意: この型定義は back/app/db/models.py と back/app/schemas/*.py
// の DB モデル・コメントから推測したもの。
// バックエンドのルーターが有効になり openapi.json が取得できるようになったら、
// 再度 fetch して内容を検証し、差分があれば修正すること。
// 検証コマンド: curl http://localhost:8001/openapi.json
// -------------------------------------------------------
// Auth
// -------------------------------------------------------

/** POST /auth/register */
export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

/** POST /auth/login */
export type LoginRequest = {
  email: string;
  password: string;
};

/** 共通 auth response */
export type AuthResponse = {
  message: string;
  user: UserResponse;
};

/** GET /auth/me → response */
export type UserResponse = {
  id: string;
  email: string;
  name: string | null;
  level: number;
  xp: number;
};

// -------------------------------------------------------
// Game
// -------------------------------------------------------

/** POST /game/base */
export type BaseSetupRequest = {
  lat: number;
  lng: number;
  name?: string;
};

/** POST /game/base → response */
export type BaseResponse = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hp: number;
  max_hp: number;
  shield: number;
};

/** POST /game/start */
export type StageSelectRequest = {
  difficulty: number; // 1〜5
};

/** GET /game/state → response (POST /game/start のレスポンスも同様) */
export type GameStateResponse = {
  wave_id: string;
  status: "pending" | "active" | "cleared" | "failed";
  difficulty: number;
  started_at: string; // ISO 8601
  enemy_count: number;
};

// -------------------------------------------------------
// Structures
// -------------------------------------------------------

/** バックエンドが受け付ける施設種別 */
export type StructureApiType = "turret" | "wall" | "slow";

/** POST /structures/ */
export type PlaceStructureRequest = {
  type: StructureApiType;
  lat: number;
  lng: number;
};

/** GET /structures/ の要素 / POST /structures/ のレスポンス */
export type StructureResponse = {
  id: string;
  type: StructureApiType;
  name: string;
  lat: number;
  lng: number;
  hp: number;
  max_hp: number;
  attack: number;
  range_m: number;
  duration_sec: number;
  placed_at: string;
  rarity: string;
  metadata_json: Record<string, unknown>;
};

// -------------------------------------------------------
// Enemies
// -------------------------------------------------------

/** 敵の状態 */
export type EnemyState = "spawned" | "moving" | "attacking" | "dead";

/** GET /enemies/ の要素 */
export type EnemyResponse = {
  id: string;
  wave_id: string | null;
  enemy_type: string;
  name: string;
  hp: number;
  max_hp: number;
  lat: number;
  lng: number;
  state: EnemyState;
  attack: number;
  speed: number;
  spawned_at: string;
};

/** ウェーブの進行ルート上の点 */
export type RoutePoint = {
  lat: number;
  lng: number;
};

export type EnemyRoute = {
  enemy_id: string;
  mode: string;
  points: RoutePoint[];
};

/** GET /enemies/wave/{id} → response */
export type WaveResponse = {
  wave_id: string;
  difficulty: number;
  status: "pending" | "active" | "cleared" | "failed";
  enemies: EnemyResponse[];
  route: EnemyRoute[];
};
