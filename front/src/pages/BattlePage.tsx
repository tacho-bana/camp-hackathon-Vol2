import { useMemo, useState } from "react";
import { BattleFeed } from "../components/battle/BattleFeed";
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
        actor: "スキャナー",
        message: "アベニュー侵入路で敵ウェーブを検知",
        tone: "warning",
      },
      {
        id: "2",
        time: "20:14",
        actor: "EMPタワー",
        message: "先頭集団に短時間スタンを付与",
        tone: "info",
      },
      {
        id: "3",
        time: "20:18",
        actor: "ホームビーコン",
        message: "拠点は持ちこたえ、残敵を外周へ誘導",
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
          <p className="eyebrow">防衛フェーズ</p>
          <h2>ティック駆動オート防衛</h2>
          <p className="muted">
            API連携を想定した、敵の拠点進軍シミュレーションです。
          </p>
        </div>
        <div className="inline-controls">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            前へ
          </button>
          <span className="page-pill">ページ {page}</span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPage((value) => value + 1)}
          >
            次へ
          </button>
        </div>
      </div>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>{localEnemyCount}</strong>
          <span>残敵数</span>
        </article>
        <article className="feature-card stat-card">
          <strong>{tickCount}</strong>
          <span>実行ティック数</span>
        </article>
      </div>

      <BattleFeed entries={entries} />

      <button
        type="button"
        className="primary-button align-left"
        onClick={handleRunTick}
      >
        防衛ティックを実行
      </button>

      <button
        type="button"
        className="ghost-button align-left"
        onClick={() => setShowReward(true)}
      >
        報酬プレビューを開く
      </button>

      <RewardModal
        open={showReward}
        title="夜間防衛の報酬"
        description="オート防衛成功: +120 XP、パルスセル +1、修理キット +1"
        onClose={() => setShowReward(false)}
      />
    </section>
  );
}
