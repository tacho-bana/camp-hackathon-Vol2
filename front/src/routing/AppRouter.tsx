import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { BasePage } from "../pages/BasePage";
import { BattlePage } from "../pages/BattlePage";
import { HomePage } from "../pages/HomePage";
import { InventoryPage } from "../pages/InventoryPage";
import { LoginPage } from "../pages/LoginPage";
import { MapPage } from "../pages/MapPage";
import { ReportPage } from "../pages/ReportPage";
import { useAppState } from "../state/AppStateContext";
import type { RoutePath } from "../types/game";
import { normalizePath, navigateTo } from "./navigation";

function useRoutePath() {
  const [path, setPath] = useState<RoutePath>(() =>
    normalizePath(window.location.pathname),
  );

  useEffect(() => {
    const updatePath = () => {
      setPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  return path;
}

export function AppRouter() {
  const path = useRoutePath();
  const { authStatus } = useAppState();

  useEffect(() => {
    if (authStatus === "authenticated" && path === "/login") {
      navigateTo("/home");
    }

    if (authStatus === "anonymous" && path !== "/login") {
      navigateTo("/login");
    }
  }, [authStatus, path]);

  const content = useMemo(() => {
    switch (path) {
      case "/home":
        return <HomePage />;
      case "/map":
        return <MapPage />;
      case "/base":
        return <BasePage />;
      case "/battle":
        return <BattlePage />;
      case "/inventory":
        return <InventoryPage />;
      case "/report":
        return <ReportPage />;
      case "/login":
      default:
        return <LoginPage />;
    }
  }, [path]);

  if (path === "/login") {
    return content;
  }

  return <AppShell activePath={path}>{content}</AppShell>;
}
