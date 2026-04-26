import { useMemo, useState } from "react";
import { BattleFeed } from "../components/battle/BattleFeed";
import { EnemyCanvas } from "../components/battle/EnemyCanvas";
import { RewardModal } from "../components/battle/RewardModal";
import { useAppState } from "../state/AppStateContext";
import type { BattleEntry } from "../types/game";

export function BattlePage() {
  const [page, setPage] = useState(1);
  const [showReward, setShowReward] = useState(false);
  const [localEnemyCount, setLocalEnemyCount] = useState(7);
  const [tickCount, setTickCount] = useState(0);
  const { currentBaseSummary, updateBaseSummary, updateWaveSummary } =
    useAppState();

  const entries = useMemo<BattleEntry[]>(
    () => [
      {
        id: "1",
        time: "20:12",
        actor: "Scanner",
        message: "enemy wave detected on avenue ingress",
        tone: "warning",
      },
      {
        id: "2",
        time: "20:14",
        actor: "EMP Tower",
        message: "front runners slowed with short stun",
        tone: "info",
      },
      {
        id: "3",
        time: "20:18",
        actor: "Home Beacon",
        message: "base sustained and rerouted remaining units",
        tone: "success",
      },
    ],
    [],
  );

  const handleRunTick = () => {
    setTickCount((value) => value + 1);

    setLocalEnemyCount((current) => {
      const nextValue = Math.max(0, current - 2);
      updateWaveSummary({
        remainingEnemies: nextValue,
        phase: "defense",
        nextTickSec: 18,
      });

      if (nextValue === 0) {
        setShowReward(true);
      }

      return nextValue;
    });

    updateBaseSummary({
      durability: Math.max(0, currentBaseSummary.durability - 1),
    });
  };

  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Defense Phase</p>
          <h2>Tick-driven auto defense</h2>
          <p className="muted">
            Frontend simulation of enemy advance toward home base for API
            integration.
          </p>
        </div>
        <div className="inline-controls">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Prev
          </button>
          <span className="page-pill">page {page}</span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>{localEnemyCount}</strong>
          <span>enemies remaining</span>
        </article>
        <article className="feature-card stat-card">
          <strong>{tickCount}</strong>
          <span>ticks executed</span>
        </article>
      </div>

      <article className="feature-card">
        <p className="eyebrow">Enemy Preview</p>
        <h3>p5 enemy render template</h3>
        <EnemyCanvas />
      </article>

      <BattleFeed entries={entries} />

      <button
        type="button"
        className="primary-button align-left"
        onClick={handleRunTick}
      >
        Run defense tick
      </button>

      <button
        type="button"
        className="ghost-button align-left"
        onClick={() => setShowReward(true)}
      >
        Open reward preview
      </button>

      <RewardModal
        open={showReward}
        title="Night defense rewards"
        description="+120 XP, +1 Pulse Cell, and +1 Repair Kit from successful auto defense."
        onClose={() => setShowReward(false)}
      />
    </section>
  );
}
