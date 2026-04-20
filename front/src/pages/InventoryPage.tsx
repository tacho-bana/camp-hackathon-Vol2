export function InventoryPage() {
  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Field and defense items</h2>
        </div>
      </div>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>Repair Kit x3</strong>
          <span>restore home base durability</span>
        </article>
        <article className="feature-card stat-card">
          <strong>Pulse Sensor x2</strong>
          <span>reveal early enemy route</span>
        </article>
        <article className="feature-card stat-card">
          <strong>EMP Cell x1</strong>
          <span>boost electric shop tower uptime</span>
        </article>
        <article className="feature-card stat-card">
          <strong>Coffee Syrup x2</strong>
          <span>amplify cafe heal node output</span>
        </article>
      </div>
    </section>
  );
}
