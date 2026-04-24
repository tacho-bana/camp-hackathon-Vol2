export function ReportPage() {
  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">夜間レポート</p>
          <h2>直近の防衛サマリー</h2>
        </div>
      </div>

      <article className="feature-card report-card">
        <strong>ウェーブ結果: 防衛成功</strong>
        <span>
          敵ウェーブ021は外周まで到達しましたが、ホームコアの突破には失敗しました。
        </span>
        <span>主な貢献: 電機塔のスタンとカフェ回復ノード。</span>
      </article>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>+120 XP</strong>
          <span>報酬を獲得</span>
        </article>
        <article className="feature-card stat-card">
          <strong>施設2つが期限切れ</strong>
          <span>外出して防衛範囲を再構築してください</span>
        </article>
      </div>
    </section>
  );
}
