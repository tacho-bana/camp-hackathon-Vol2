import { useAppState } from "../state/AppStateContext";

export function BasePage() {
  const { currentBaseSummary, updateBaseSummary } = useAppState();

  return (
    <section className="content-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Base</p>
          <h2>{currentBaseSummary.name}</h2>
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
          Simulate damage
        </button>
      </div>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>Level {currentBaseSummary.level}</strong>
          <span>base tier</span>
        </article>
        <article className="feature-card stat-card">
          <strong>{currentBaseSummary.durability}%</strong>
          <span>durability</span>
        </article>
      </div>
    </section>
  );
}
