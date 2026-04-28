import { useEffect, useState, type ReactNode } from "react";
import { navigateTo } from "../routing/navigation";
import { useAppState } from "../state/AppStateContext";
import type { RoutePath } from "../types/game";

const menuItems: Array<{ path: RoutePath; label: string }> = [
  { path: "/home", label: "ホーム" },
  { path: "/map", label: "マップ" },
  { path: "/base", label: "拠点" },
  { path: "/battle", label: "バトル" },
  { path: "/inventory", label: "持ち物" },
  { path: "/report", label: "レポート" },
];

const roleLabel: Record<string, string> = {
  captain: "隊長",
  scout: "偵察",
  engineer: "工兵",
};

const phaseLabel: Record<string, string> = {
  outing: "外出",
  defense: "防衛",
};

export function AppShell({
  activePath,
  children,
}: {
  activePath: RoutePath;
  children: ReactNode;
}) {
  const { currentUser, currentBaseSummary, activeWaveSummary, signOut } =
    useAppState();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ルート遷移時にドロワーを閉じる
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [activePath]);

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button
          type="button"
          className="ghost-button"
          aria-label="メニュー"
          onClick={() => setIsDrawerOpen(true)}
        >
          ≡
        </button>
        <strong>ネイバーセキュリティ</strong>
      </header>

      {isDrawerOpen && (
        <div
          className="drawer-scrim"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <aside className={isDrawerOpen ? "side-rail open" : "side-rail"}>
        <div className="brand-block">
          <p className="eyebrow">家庭ネットワーク防衛</p>
          <h1>ネイバーセキュリティ</h1>
          <p className="muted">
            街を歩いて防衛拠点を設置し、家のルーターに侵入してくる
            ウイルスから家庭ネットワークを守ります。
          </p>
        </div>

        <section className="summary-card">
          <span className="summary-label">現在のユーザー</span>
          <strong>{currentUser?.name ?? "ゲスト"}</strong>
          <span className="summary-meta">
            {currentUser
              ? `${roleLabel[currentUser.role]} / Lv.${currentUser.level}`
              : "未認証"}
          </span>
        </section>

        <section className="summary-card">
          <span className="summary-label">拠点エリア</span>
          <strong>{currentBaseSummary.name}</strong>
          <span className="summary-meta">
            {currentBaseSummary.homeArea} / エネルギー{" "}
            {currentBaseSummary.energy}
          </span>
        </section>

        <section className="summary-card">
          <span className="summary-label">ウェーブ</span>
          <strong>{activeWaveSummary.title}</strong>
          <span className="summary-meta">
            脅威 {activeWaveSummary.threat} / 残敵{" "}
            {activeWaveSummary.remainingEnemies} /{" "}
            {phaseLabel[activeWaveSummary.phase]}
          </span>
        </section>

        <nav className="menu-list" aria-label="メインメニュー">
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

        <button
          type="button"
          className="ghost-button"
          onClick={() => void signOut()}
        >
          ログアウト
        </button>
      </aside>

      <main className="page-frame">{children}</main>
    </div>
  );
}
