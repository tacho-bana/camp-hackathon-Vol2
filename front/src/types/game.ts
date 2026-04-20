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
};

export type WaveSummary = {
  id: string;
  title: string;
  threat: number;
  remainingEnemies: number;
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
  kind: "resource" | "safe-zone" | "ruin";
  distance: number;
};

export type PlacementPreview = {
  kind: "wall" | "turret" | "sensor";
  x: number;
  y: number;
};

export type BattleEntry = {
  id: string;
  time: string;
  actor: string;
  message: string;
  tone: "info" | "success" | "warning";
};
