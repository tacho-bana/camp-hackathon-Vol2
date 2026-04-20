export type RoutePath =
  | "/login"
  | "/home"
  | "/map"
  | "/base"
  | "/battle"
  | "/inventory"
  | "/report";

export type AuthStatus = "anonymous" | "authenticated";

export type User = {
  id: string;
  name: string;
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
