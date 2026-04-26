import { navigateTo } from "../routing/navigation";
import { useAppState } from "../state/AppStateContext";
import type { RoutePath } from "../types/game";
import type { ReactNode } from "react";

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

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div className="brand-block">
          <p className="eyebrow">単独防衛作戦</p>
          <h1>アーバンループ司令コンソール</h1>
          <p className="muted">
            外を歩いて施設を展開し、オートバトルの進行に合わせて
            自宅エリアを防衛します。
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

        <button type="button" className="ghost-button" onClick={signOut}>
          ログアウト
        </button>
      </aside>

      <main className="page-frame">{children}</main>
    </div>
  );
}
