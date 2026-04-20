export function ReportPage() {
  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Night Report</p>
          <h2>Last defense summary</h2>
        </div>
      </div>

      <article className="feature-card report-card">
        <strong>Wave outcome: defended</strong>
        <span>
          Enemy wave 021 reached outer ring but failed to break the home core.
        </span>
        <span>
          Primary contribution: electric shop tower stun and cafe heal node.
        </span>
      </article>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>+120 XP</strong>
          <span>reward granted</span>
        </article>
        <article className="feature-card stat-card">
          <strong>2 structures expired</strong>
          <span>go outside to rebuild coverage</span>
        </article>
      </div>
    </section>
  );
}
