import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BaseSummary, Settings, WaveSummary, User } from "../types/game";

type AppStateValue = {
  authStatus: "anonymous" | "authenticated";
  currentUser: User | null;
  currentBaseSummary: BaseSummary;
  activeWaveSummary: WaveSummary;
  settings: Settings;
  signIn: () => void;
  signOut: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateBaseSummary: (patch: Partial<BaseSummary>) => void;
  updateWaveSummary: (patch: Partial<WaveSummary>) => void;
};

const defaultBaseSummary: BaseSummary = {
  name: "North Ridge Base",
  level: 4,
  durability: 82,
  energy: 68,
};

const defaultWaveSummary: WaveSummary = {
  id: "wave-17",
  title: "Signal Storm",
  threat: 7,
  remainingEnemies: 12,
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

  const value = useMemo<AppStateValue>(
    () => ({
      authStatus,
      currentUser,
      currentBaseSummary,
      activeWaveSummary,
      settings,
      signIn: () => {
        setCurrentUser({ id: "user-01", name: "Astra", role: "captain" });
        setAuthStatus("authenticated");
      },
      signOut: () => {
        setCurrentUser(null);
        setAuthStatus("anonymous");
      },
      updateSettings: (patch) => {
        setSettings((previous) => ({ ...previous, ...patch }));
      },
      updateBaseSummary: (patch) => {
        setCurrentBaseSummary((previous) => ({ ...previous, ...patch }));
      },
      updateWaveSummary: (patch) => {
        setActiveWaveSummary((previous) => ({ ...previous, ...patch }));
      },
    }),
    [activeWaveSummary, authStatus, currentBaseSummary, currentUser, settings],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return context;
}
