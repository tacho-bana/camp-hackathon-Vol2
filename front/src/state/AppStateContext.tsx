import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  BaseSummary,
  Enemy,
  GamePhase,
  LatLng,
  Settings,
  Structure,
  User,
  WaveSummary,
} from "../types/game";

type AppStateValue = {
  // --- 認証（モック） ---
  authStatus: "anonymous" | "authenticated";
  currentUser: User | null;
  signIn: () => void;
  signOut: () => void;

  // --- レガシーモック状態（既存ページが依存、段階的に移行予定） ---
  currentBaseSummary: BaseSummary;
  activeWaveSummary: WaveSummary;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  updateBaseSummary: (patch: Partial<BaseSummary>) => void;
  updateWaveSummary: (patch: Partial<WaveSummary>) => void;

  // --- ゲーム状態 ---
  gamePhase: GamePhase;
  difficulty: 1 | 2 | 3;
  bitcoin: number;
  homeCoords: LatLng | null;
  homeHp: number;
  structures: Structure[];
  enemies: Enemy[];
  setGamePhase: (phase: GamePhase) => void;
  setDifficulty: (level: 1 | 2 | 3) => void;
  addBitcoin: (amount: number) => void;
  spendBitcoin: (amount: number) => void;
  setHomeCoords: (coords: LatLng | null) => void;
  mergeEnemies: (incoming: Enemy[]) => void;
  setHomeHp: (hp: number) => void;
  setStructures: (updater: Structure[] | ((prev: Structure[]) => Structure[])) => void;
  setEnemies: (enemies: Enemy[]) => void;
  resetGame: () => void;
};

const defaultBaseSummary: BaseSummary = {
  name: "ホームビーコン",
  level: 3,
  durability: 88,
  energy: 74,
  homeArea: "リバーサイド C ブロック",
  structuresPlaced: 5,
  patrolDistanceKm: 2.6,
};

const defaultWaveSummary: WaveSummary = {
  id: "wave-021",
  title: "夜間ルート掃討",
  threat: 5,
  remainingEnemies: 9,
  phase: "outing",
  nextTickSec: 18,
};

const defaultSettings: Settings = {
  theme: "night",
  showEnemyLabels: true,
  compactMap: false,
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<"anonymous" | "authenticated">(
    "anonymous",
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentBaseSummary, setCurrentBaseSummary] =
    useState<BaseSummary>(defaultBaseSummary);
  const [activeWaveSummary, setActiveWaveSummary] =
    useState<WaveSummary>(defaultWaveSummary);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // ゲーム状態
  const [gamePhase, setGamePhaseState] = useState<GamePhase>("waiting");
  const [difficulty, setDifficultyState] = useState<1 | 2 | 3>(2);
  const [bitcoin, setBitcoin] = useState<number>(300);
  const [homeCoords, setHomeCoordsState] = useState<LatLng | null>(null);
  const [homeHp, setHomeHpState] = useState<number>(100);
  const [structures, setStructuresState] = useState<Structure[]>([]);
  const [enemies, setEnemiesState] = useState<Enemy[]>([]);

  const value = useMemo<AppStateValue>(
    () => ({
      // 認証
      authStatus,
      currentUser,
      signIn: () => {
        setCurrentUser({
          id: "user-01",
          name: "リク",
          level: 12,
          role: "captain",
        });
        setAuthStatus("authenticated");
      },
      signOut: () => {
        setCurrentUser(null);
        setAuthStatus("anonymous");
      },

      // レガシーモック状態
      currentBaseSummary,
      activeWaveSummary,
      settings,
      updateSettings: (patch) => {
        setSettings((previous) => ({ ...previous, ...patch }));
      },
      updateBaseSummary: (patch) => {
        setCurrentBaseSummary((previous) => ({ ...previous, ...patch }));
      },
      updateWaveSummary: (patch) => {
        setActiveWaveSummary((previous) => ({ ...previous, ...patch }));
      },

      // ゲーム状態
      gamePhase,
      difficulty,
      bitcoin,
      homeCoords,
      homeHp,
      structures,
      enemies,
      setGamePhase: (phase) => setGamePhaseState(phase),
      setDifficulty: (level) => setDifficultyState(level),
      addBitcoin: (amount) => setBitcoin((prev) => prev + amount),
      spendBitcoin: (amount) =>
        setBitcoin((prev) => {
          if (prev < amount) return prev;
          return prev - amount;
        }),
      setHomeCoords: (coords) => setHomeCoordsState(coords),
      setHomeHp: (hp) => setHomeHpState(hp),
      setStructures: (updater) =>
        setStructuresState((prev) =>
          typeof updater === "function" ? updater(prev) : updater,
        ),
      setEnemies: (enemies) => setEnemiesState(enemies),
      mergeEnemies: (incoming) =>
        setEnemiesState((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          incoming.forEach((e) => map.set(e.id, e));
          return Array.from(map.values());
        }),
      resetGame: () => {
        setGamePhaseState("waiting");
        setDifficultyState(2);
        setBitcoin(300);
        setHomeCoordsState(null);
        setHomeHpState(100);
        setStructuresState([]);
        setEnemiesState([]);
      },
    }),
    [
      activeWaveSummary,
      authStatus,
      bitcoin,
      currentBaseSummary,
      currentUser,
      enemies,
      gamePhase,
      homeCoords,
      homeHp,
      settings,
      structures,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return context;
}
