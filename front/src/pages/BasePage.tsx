import { useAppState } from "../state/AppStateContext";

export function BasePage() {
  const { currentBaseSummary, updateBaseSummary } = useAppState();

  return (
    <section className="content-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Home Base</p>
          <h2>{currentBaseSummary.name}</h2>
          <p className="muted">
            Home coordinates are masked as an area label on the client for
            privacy.
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
          Simulate enemy hit
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
        <article className="feature-card stat-card">
          <strong>{currentBaseSummary.structuresPlaced}</strong>
          <span>active structures</span>
        </article>
        <article className="feature-card stat-card">
          <strong>{currentBaseSummary.patrolDistanceKm.toFixed(1)} km</strong>
          <span>today movement distance</span>
        </article>
      </div>

      <article className="feature-card">
        <strong>Home area display</strong>
        <span>{currentBaseSummary.homeArea}</span>
        <span>
          Server-authoritative validation is expected for placement and battle
          outcomes.
        </span>
      </article>
    </section>
  );
}
