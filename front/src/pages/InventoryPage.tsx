export function InventoryPage() {
  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">持ち物</p>
          <h2>外出・防衛アイテム</h2>
        </div>
      </div>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>修理キット x3</strong>
          <span>拠点の耐久度を回復</span>
        </article>
        <article className="feature-card stat-card">
          <strong>パルスセンサー x2</strong>
          <span>敵ルートを早期に可視化</span>
        </article>
        <article className="feature-card stat-card">
          <strong>EMPセル x1</strong>
          <span>電機塔の稼働時間を強化</span>
        </article>
        <article className="feature-card stat-card">
          <strong>コーヒーシロップ x2</strong>
          <span>カフェ回復ノードの出力を増幅</span>
        </article>
      </div>
    </section>
  );
}
