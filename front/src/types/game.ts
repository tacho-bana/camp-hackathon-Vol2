import type { EnemyState, StructureApiType } from "./api";

// -------------------------------------------------------
// 共通プリミティブ
// -------------------------------------------------------

export type LatLng = {
  lat: number;
  lng: number;
};

// -------------------------------------------------------
// ゲームフェーズ
// -------------------------------------------------------

export type GamePhase = "waiting" | "difficulty" | "prep" | "battle" | "result";

// -------------------------------------------------------
// フロントエンド用ゲームエンティティ
// -------------------------------------------------------

/** フロントが保持する敵の状態（API の EnemyResponse をマッピング） */
export type Enemy = {
  id: string;
  lat: number;
  lng: number;
  hp: number;
  maxHp: number;
  speed: number;
  state: EnemyState;
  /** 道路に沿ったルートのウェイポイント列 (未取得時は undefined) */
  route?: LatLng[];
  /** route 上の現在ターゲットインデックス */
  routeIndex?: number;
  /** バトル開始から実際に移動を始めるまでの待機ティック数 */
  spawnDelay?: number;
};

/** フロントが保持する防衛施設の状態（API の StructureResponse をマッピング） */
export type Structure = {
  id: string;
  lat: number;
  lng: number;
  kind: StructureApiType;
  hp: number;
  maxHp: number;
  rangeM: number;
};

/** ゲーム全体の状態を集約する型 */
export type GameState = {
  phase: GamePhase;
  bitcoin: number;
  homeCoords: LatLng | null;
  homeHp: number;
  structures: Structure[];
  enemies: Enemy[];
  waveId: string | null;
};

// -------------------------------------------------------
// ルーティング
// -------------------------------------------------------

export type RoutePath =
  | "/login"
  | "/home"
  | "/map"
  | "/base"
  | "/battle"
  | "/inventory"
  | "/report";

export type AuthStatus = "anonymous" | "authenticated";
export type LoadingAuthStatus = AuthStatus | "loading";

export type User = {
  id: string;
  email: string;
  name: string;
  level: number;
  xp: number;
  role: "captain" | "scout" | "engineer";
};

export type BaseSummary = {
  name: string;
  level: number;
  durability: number;
  energy: number;
  homeArea: string;
  structuresPlaced: number;
  patrolDistanceKm: number;
};

export type WaveSummary = {
  id: string;
  title: string;
  threat: number;
  remainingEnemies: number;
  phase: "outing" | "defense";
  nextTickSec: number;
};

export type Settings = {
  theme: "day" | "night";
  showEnemyLabels: boolean;
  compactMap: boolean;
};

export type MapViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type NearbyPlace = {
  id: string;
  name: string;
  kind:
    | "electronics-shop"
    | "convenience-store"
    | "cafe"
    | "park"
    | "station"
    | "avenue";
  lat: number;
  lng: number;
  distance: number;
};

export type PlacementPreview = {
  kind: StructureType;
  x: number;
  y: number;
};

export type StructureType =
  | "electric_shop_tower"
  | "supply_depot"
  | "cafe_heal_node"
  | "park_scout_node"
  | "station_support"
  | "avenue_hazard";

export type PlaceTransformRule = {
  sourceKind: NearbyPlace["kind"];
  structureType: StructureType;
  effect: string;
};

export type BattleEntry = {
  id: string;
  time: string;
  actor: string;
  message: string;
  tone: "info" | "success" | "warning";
};
