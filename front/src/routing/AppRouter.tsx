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

  useEffect(() => {
    if (authStatus === "loading") {
      return;
    }

    if (authStatus === "authenticated" && path === "/login") {
      navigateTo("/map");
    }

    if (authStatus === "anonymous" && path !== "/login") {
      navigateTo("/login");
    }
  }, [authStatus, path]);

  if (authStatus === "loading") {
    return (
      <section className="auth-screen auth-layout">
        <div className="hero-panel auth-panel">
          <p className="eyebrow">初期化中</p>
          <h1>セッションを確認しています</h1>
          <p className="muted">バックエンドの認証状態を読み込んでいます。</p>
        </div>
      </section>
    );
  }

  if (path === "/login") {
    return content;
  }

  return <AppShell activePath={path}>{content}</AppShell>;
}
