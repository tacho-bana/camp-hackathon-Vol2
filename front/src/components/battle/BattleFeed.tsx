import type { BattleEntry } from "../../types/game";

export function BattleFeed({ entries }: { entries: BattleEntry[] }) {
  return (
    <section className="battle-feed">
      {entries.map((entry) => (
        <article key={entry.id} className={`battle-entry ${entry.tone}`}>
          <time>{entry.time}</time>
          <strong>{entry.actor}</strong>
          <p>{entry.message}</p>
        </article>
      ))}
    </section>
  );
}
