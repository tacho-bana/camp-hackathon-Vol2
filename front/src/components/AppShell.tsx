import { navigateTo } from "../routing/navigation";
import { useAppState } from "../state/AppStateContext";
import type { RoutePath } from "../types/game";
import type { ReactNode } from "react";

const menuItems: Array<{ path: RoutePath; label: string }> = [
  { path: "/home", label: "Home" },
  { path: "/map", label: "Map" },
  { path: "/base", label: "Base" },
  { path: "/battle", label: "Battle" },
  { path: "/inventory", label: "Inventory" },
  { path: "/report", label: "Report" },
];

export function AppShell({
  activePath,
  children,
}: {
  activePath: RoutePath;
  children: ReactNode;
}) {
  const { currentUser, currentBaseSummary, activeWaveSummary, signOut } =
    useAppState();

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div className="brand-block">
          <p className="eyebrow">Solo Defense Ops</p>
          <h1>Urban Loop Console</h1>
          <p className="muted">
            Walk outside to deploy structures, then defend your home area during
            auto battle ticks.
          </p>
        </div>

        <section className="summary-card">
          <span className="summary-label">Current User</span>
          <strong>{currentUser?.name ?? "Guest"}</strong>
          <span className="summary-meta">
            {currentUser?.role ?? "anonymous"}
          </span>
        </section>

        <section className="summary-card">
          <span className="summary-label">Home Area</span>
          <strong>{currentBaseSummary.name}</strong>
          <span className="summary-meta">
            {currentBaseSummary.homeArea} / Energy {currentBaseSummary.energy}
          </span>
        </section>

        <section className="summary-card">
          <span className="summary-label">Wave</span>
          <strong>{activeWaveSummary.title}</strong>
          <span className="summary-meta">
            Threat {activeWaveSummary.threat} / Enemies{" "}
            {activeWaveSummary.remainingEnemies} / {activeWaveSummary.phase}
          </span>
        </section>

        <nav className="menu-list" aria-label="Primary">
          {menuItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={
                item.path === activePath ? "menu-item active" : "menu-item"
              }
              onClick={() => navigateTo(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="ghost-button" onClick={signOut}>
          Sign out
        </button>
      </aside>

      <main className="page-frame">{children}</main>
    </div>
  );
}
