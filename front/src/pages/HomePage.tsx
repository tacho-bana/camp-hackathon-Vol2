import { navigateTo } from "../routing/navigation";
import { P5SampleCanvas } from "../components/P5SampleCanvas";

const loopCards = [
  {
    title: "Outing phase",
    description:
      "Walk in the city, check in to nearby POIs, and transform real places into structures.",
    cta: "Open map",
    target: "/map",
  },
  {
    title: "Defense phase",
    description:
      "At fixed ticks, enemies route toward your home area and structures auto-engage.",
    cta: "Open battle",
    target: "/battle",
  },
  {
    title: "Results and reward",
    description:
      "Review last defense report, then claim XP and supply items to prepare the next outing.",
    cta: "Open report",
    target: "/report",
  },
] as const;

const roadmap = [
  "Phase 1: Hello map, login, and home area setup",
  "Phase 2: POI fetch, check-in, and structure conversion",
  "Phase 3: Enemy waves, tick movement, and server battle resolution",
  "Phase 4: Night report, rewards, and structure expiration",
  "Phase 5: A* pathing, bosses, and PWA polish",
];

export function HomePage() {
  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Mission Board</p>
          <h2>Solo tower defense walker</h2>
        </div>
        <p className="muted">
          Frontend MVP focuses on one-player core loop without PvP or co-op
          features.
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

      <article className="feature-card roadmap-card">
        <strong>Development roadmap</strong>
        <div className="roadmap-list">
          {roadmap.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>

      <article className="feature-card p5-demo-card">
        <div>
          <strong>p5.js playground</strong>
          <span>Interactive sketch rendered via React component lifecycle.</span>
        </div>
        <P5SampleCanvas />
      </article>

      <div className="grid-cards">
        <button
          type="button"
          className="feature-card quick-link"
          onClick={() => navigateTo("/base")}
        >
          <strong>Home base status</strong>
          <span>privacy-safe home area and durability overview</span>
        </button>
        <button
          type="button"
          className="feature-card quick-link"
          onClick={() => navigateTo("/inventory")}
        >
          <strong>Inventory prep</strong>
          <span>review support items before next outing</span>
        </button>
        <button
          type="button"
          className="feature-card quick-link"
          onClick={() => navigateTo("/map")}
        >
          <strong>Launch field mode</strong>
          <span>simulate movement and convert nearby POIs</span>
        </button>
        <button
          type="button"
          className="feature-card quick-link"
          onClick={() => navigateTo("/battle")}
        >
          <strong>Run defense ticks</strong>
          <span>resolve nightly enemy pressure on home area</span>
        </button>
      </div>
    </section>
  );
}
