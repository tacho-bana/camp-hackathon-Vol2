import { navigateTo } from "../routing/navigation";

const loopCards = [
  {
    title: "外出フェーズ",
    description:
      "街を歩いて近くのPOIにチェックインし、実在の場所を防衛施設に変換します。",
    cta: "マップを開く",
    target: "/map",
  },
  {
    title: "防衛フェーズ",
    description:
      "一定間隔のティックで敵が自宅エリアへ進軍し、施設が自動で迎撃します。",
    cta: "バトルを開く",
    target: "/battle",
  },
  {
    title: "結果と報酬",
    description:
      "防衛レポートを確認し、XPと補給アイテムを受け取って次の外出に備えます。",
    cta: "レポートを開く",
    target: "/report",
  },
] as const;

export function HomePage() {
  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">ミッションボード</p>
          <h2>ネイバーセキュリティ</h2>
        </div>
        <p className="muted">
          街を歩いて防衛拠点を設置し、家のルーターに迫るウイルスを
          迎撃する1人用タワーディフェンス。
        </p>
      </div>

      <div className="grid-cards two-up">
        {loopCards.map((card) => (
          <article key={card.title} className="feature-card">
            <strong>{card.title}</strong>
            <span>{card.description}</span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigateTo(card.target)}
            >
              {card.cta}
            </button>
          </article>
        ))}
      </div>

      <div className="grid-cards">
        <button
          type="button"
          className="feature-card quick-link"
          onClick={() => navigateTo("/base")}
        >
          <strong>拠点ステータス</strong>
          <span>プライバシー配慮済みの拠点エリアと耐久度を確認</span>
        </button>
        <button
          type="button"
          className="feature-card quick-link"
          onClick={() => navigateTo("/inventory")}
        >
          <strong>持ち物準備</strong>
          <span>次の外出前に支援アイテムを見直す</span>
        </button>
        <button
          type="button"
          className="feature-card quick-link"
          onClick={() => navigateTo("/map")}
        >
          <strong>フィールドモード開始</strong>
          <span>移動をシミュレートして周辺POIを変換</span>
        </button>
        <button
          type="button"
          className="feature-card quick-link"
          onClick={() => navigateTo("/battle")}
        >
          <strong>防衛ティック実行</strong>
          <span>夜間の敵圧力に対する拠点防衛を解決</span>
        </button>
      </div>
    </section>
  );
}
