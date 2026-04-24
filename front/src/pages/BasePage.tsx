import { useAppState } from "../state/AppStateContext";

export function BasePage() {
  const { currentBaseSummary, updateBaseSummary } = useAppState();

  return (
    <section className="content-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">ホーム拠点</p>
          <h2>{currentBaseSummary.name}</h2>
          <p className="muted">
            プライバシー保護のため、拠点座標はクライアント上で
            エリア名としてマスク表示しています。
          </p>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() =>
            updateBaseSummary({
              durability: Math.max(0, currentBaseSummary.durability - 3),
            })
          }
        >
          敵の被弾をシミュレート
        </button>
      </div>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>レベル {currentBaseSummary.level}</strong>
          <span>拠点ランク</span>
        </article>
        <article className="feature-card stat-card">
          <strong>{currentBaseSummary.durability}%</strong>
          <span>耐久度</span>
        </article>
        <article className="feature-card stat-card">
          <strong>{currentBaseSummary.structuresPlaced}</strong>
          <span>稼働中施設</span>
        </article>
        <article className="feature-card stat-card">
          <strong>{currentBaseSummary.patrolDistanceKm.toFixed(1)} km</strong>
          <span>本日の移動距離</span>
        </article>
      </div>

      <article className="feature-card">
        <strong>拠点エリア表示</strong>
        <span>{currentBaseSummary.homeArea}</span>
        <span>配置結果と戦闘結果はサーバー権威で検証する前提です。</span>
      </article>
    </section>
  );
}
