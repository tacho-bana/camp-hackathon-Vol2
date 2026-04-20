import { useMemo, useState } from "react";
import { BattleFeed } from "../components/battle/BattleFeed";
import { RewardModal } from "../components/battle/RewardModal";
import type { BattleEntry } from "../types/game";

export function BattlePage() {
  const [page, setPage] = useState(1);
  const [showReward, setShowReward] = useState(false);

  const entries = useMemo<BattleEntry[]>(
    () => [
      {
        id: "1",
        time: "08:12",
        actor: "Drone",
        message: "enemy located near ridge",
        tone: "warning",
      },
      {
        id: "2",
        time: "08:14",
        actor: "Scout",
        message: "fallback path secured",
        tone: "info",
      },
      {
        id: "3",
        time: "08:18",
        actor: "Base",
        message: "reinforcement wave deployed",
        tone: "success",
      },
    ],
    [],
  );

  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Battle</p>
          <h2>Battle feed</h2>
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

      <BattleFeed entries={entries} />

      <button
        type="button"
        className="primary-button align-left"
        onClick={() => setShowReward(true)}
      >
        Open reward
      </button>

      <RewardModal
        open={showReward}
        title="Recovered salvage"
        description="This modal represents the end-of-wave reward state and can be driven by battle outcomes."
      />
    </section>
  );
}
