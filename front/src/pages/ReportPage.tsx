import { useAppState } from "../state/AppStateContext";
import { navigateTo } from "../routing/navigation";

export function ReportPage() {
  const { gamePhase, homeHp, resetGame } = useAppState();

  const handlePlayAgain = () => {
    resetGame();
    navigateTo("/map");
  };

  if (gamePhase !== "result") {
    return (
      <section className="content-panel stack-layout">
        <div className="panel-header">
          <div>
            <p className="eyebrow">結果画面</p>
            <h2>ゲームがまだ終了していません</h2>
            <p className="muted">バトルフェーズが終了するとここに結果が表示されます。</p>
          </div>
        </div>
        <article className="feature-card">
          <strong>ゲームはまだ進行中です</strong>
          <span>地図画面でゲームを進めてください。</span>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigateTo("/map")}
          >
            地図画面へ
          </button>
        </article>
      </section>
    );
  }

  const isVictory = homeHp > 0;

  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">ゲーム結果</p>
          <h2>{isVictory ? "防衛成功！" : "防衛失敗..."}</h2>
          <p className="muted">
            {isVictory
              ? "ウイルスの侵入を防ぎました！"
              : "ルーターがウイルスに侵入されてしまいました..."}
          </p>
        </div>
      </div>

      <article className="feature-card report-card">
        <strong>{isVictory ? "防衛成功！" : "防衛失敗..."}</strong>
        <span>
          {isVictory
            ? "家のルーターへのウイルス侵入を防ぎました。おめでとうございます！"
            : "残念ながら家のHPが0になりました。次は頑張りましょう！"}
        </span>
        <span className="muted">家HP: {homeHp} / 100</span>
      </article>

      <div className="auth-actions">
        <button
          type="button"
          className="primary-button"
          onClick={handlePlayAgain}
        >
          もう一度遊ぶ
        </button>
      </div>
    </section>
  );
}
