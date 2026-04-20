export function InventoryPage() {
  return (
    <section className="content-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Collected gear</h2>
        </div>
      </div>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>Repair Kit</strong>
          <span>consumable</span>
        </article>
        <article className="feature-card stat-card">
          <strong>Pulse Sensor</strong>
          <span>utility</span>
        </article>
      </div>
    </section>
  );
}
