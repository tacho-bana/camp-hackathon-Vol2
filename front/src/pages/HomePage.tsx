import { navigateTo } from "../routing/navigation";

const destinations = [
  "/map",
  "/base",
  "/battle",
  "/inventory",
  "/report",
] as const;

export function HomePage() {
  return (
    <section className="content-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Home</p>
          <h2>Screen map</h2>
        </div>
        <p className="muted">
          各画面はルート単位で分離し、必要なローカル状態だけを持ちます。
        </p>
      </div>

      <div className="grid-cards">
        {destinations.map((path) => (
          <button
            key={path}
            type="button"
            className="feature-card"
            onClick={() => navigateTo(path)}
          >
            <strong>{path}</strong>
            <span>open {path.replace("/", "")} screen</span>
          </button>
        ))}
      </div>
    </section>
  );
}
