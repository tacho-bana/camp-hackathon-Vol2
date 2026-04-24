import { useMemo, useState } from "react";
import { BottomActionPanel } from "../components/ui/BottomActionPanel";
import { MapView } from "../components/map/MapView";
import { useAppState } from "../state/AppStateContext";
import type {
  MapViewport,
  NearbyPlace,
  PlacementPreview,
  PlaceTransformRule,
  StructureType,
} from "../types/game";

const transformRules: PlaceTransformRule[] = [
  {
    sourceKind: "electronics-shop",
    structureType: "electric_shop_tower",
    effect: "EMPスタンパルス",
  },
  {
    sourceKind: "convenience-store",
    structureType: "supply_depot",
    effect: "周辺施設のHPを修復",
  },
  {
    sourceKind: "cafe",
    structureType: "cafe_heal_node",
    effect: "継続回復オーラ",
  },
  {
    sourceKind: "park",
    structureType: "park_scout_node",
    effect: "早期探知と射程強化",
  },
  {
    sourceKind: "station",
    structureType: "station_support",
    effect: "広域バースト支援",
  },
  {
    sourceKind: "avenue",
    structureType: "avenue_hazard",
    effect: "敵ルートを加速させる危険地帯",
  },
];

export function MapPage() {
  const {
    currentUser,
    currentBaseSummary,
    activeWaveSummary,
    signOut,
    updateWaveSummary,
  } = useAppState();
  const [viewport, setViewport] = useState<MapViewport>({
    x: 24,
    y: 12,
    zoom: 1.4,
  });
  const [selectedMarker, setSelectedMarker] = useState<string | null>("poi-01");
  const [checkedInPlaceIds, setCheckedInPlaceIds] = useState<string[]>([]);
  const [deployedStructures, setDeployedStructures] = useState<string[]>([]);
  const [placementPreview, setPlacementPreview] =
    useState<PlacementPreview | null>({
      kind: "electric_shop_tower",
      x: 14,
      y: 20,
    });
  const [selectedStage, setSelectedStage] = useState("city-center");
  const [selectedDifficulty, setSelectedDifficulty] = useState("normal");
  const [selectedStructureKind, setSelectedStructureKind] =
    useState<StructureType>("electric_shop_tower");
  const [showSettings, setShowSettings] = useState(false);

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([
    {
      id: "poi-01",
      name: "アキバスパークス",
      kind: "electronics-shop",
      lat: 35.6847,
      lng: 139.7496,
      distance: 74,
    },
    {
      id: "poi-02",
      name: "カイトマート",
      kind: "convenience-store",
      lat: 35.6781,
      lng: 139.7566,
      distance: 162,
    },
    {
      id: "poi-03",
      name: "ブルーランタンカフェ",
      kind: "cafe",
      lat: 35.6854,
      lng: 139.7636,
      distance: 116,
    },
    { id: "poi-04", name: "リバーパーク", kind: "park", lat: 35.6788, lng: 139.7706, distance: 228 },
    { id: "poi-05", name: "ホライズン駅", kind: "station", lat: 35.6861, lng: 139.7776, distance: 330 },
    { id: "poi-06", name: "イーストアベニュー", kind: "avenue", lat: 35.6795, lng: 139.7846, distance: 178 },
  ]);

  const selectedPlace = useMemo(
    () => nearbyPlaces.find((place) => place.id === selectedMarker) ?? null,
    [nearbyPlaces, selectedMarker],
  );

  const selectedRule = useMemo(
    () =>
      selectedPlace
        ? (transformRules.find(
            (rule) => rule.sourceKind === selectedPlace.kind,
          ) ?? null)
        : null,
    [selectedPlace],
  );

  const stageOptions = [
    { value: "city-center", label: "都心ステージ", note: "敵が多いが報酬高め" },
    {
      value: "suburb",
      label: "郊外ステージ",
      note: "歩きやすく拠点を置きやすい",
    },
    { value: "coastline", label: "湾岸ステージ", note: "広域支援施設が強い" },
  ] as const;

  const difficultyOptions = [
    { value: "easy", label: "やさしい", threat: 2, enemies: 5 },
    { value: "normal", label: "ふつう", threat: 4, enemies: 9 },
    { value: "hard", label: "むずかしい", threat: 6, enemies: 14 },
  ] as const;

  const structureOptions = [
    {
      kind: "electric_shop_tower",
      label: "近くを攻撃",
      detail: "EMPで足を止める",
    },
    {
      kind: "avenue_hazard",
      label: "近く道に設置して足止め",
      detail: "通路上で敵を減速",
    },
    {
      kind: "park_scout_node",
      label: "近くの敵の進行を遅くする",
      detail: "索敵と進行抑制を両立",
    },
  ] as const;

  const currentStage =
    stageOptions.find((option) => option.value === selectedStage) ??
    stageOptions[0];
  const currentDifficulty =
    difficultyOptions.find((option) => option.value === selectedDifficulty) ??
    difficultyOptions[1];

  const isPlaying = activeWaveSummary.phase === "defense";

  const canCheckIn = selectedPlace ? selectedPlace.distance <= 90 : false;
  const isCheckedIn = selectedMarker
    ? checkedInPlaceIds.includes(selectedMarker)
    : false;

  const handleSimulateMovement = () => {
    setNearbyPlaces((current) =>
      current.map((place, index) => ({
        ...place,
        distance: Math.max(24, place.distance - (index + 1) * 12),
      })),
    );
    setViewport((current) => ({
      ...current,
      x: current.x + 1,
      y: current.y + 1,
    }));
  };

  const handleCheckIn = () => {
    if (!selectedMarker || !canCheckIn || isCheckedIn) {
      return;
    }

    setCheckedInPlaceIds((current) => [...current, selectedMarker]);
  };

  const handleConvertToStructure = () => {
    if (!selectedPlace || !selectedRule || !isCheckedIn) {
      return;
    }

    if (!deployedStructures.includes(selectedPlace.id)) {
      setDeployedStructures((current) => [...current, selectedPlace.id]);
    }

    setPlacementPreview({
      kind: selectedRule.structureType,
      x: Math.round(viewport.x + 4),
      y: Math.round(viewport.y + 6),
    });
  };

  const handleStartGame = () => {
    updateWaveSummary({
      title: `${currentStage.label} / ${currentDifficulty.label}`,
      threat: currentDifficulty.threat,
      remainingEnemies: currentDifficulty.enemies,
      phase: "defense",
      nextTickSec: 18,
    });
  };

  const handleEndGame = () => {
    updateWaveSummary({
      title: `${currentStage.label} 待機`,
      threat: currentDifficulty.threat,
      remainingEnemies: 0,
      phase: "outing",
      nextTickSec: 0,
    });
  };

  return (
    <section className="content-panel stack-layout map-screen">
      <div className="panel-header">
        <div>
          <p className="eyebrow">
            {isPlaying ? "地図画面（ゲーム中）" : "地図画面（準備）"}
          </p>
          <h2>
            {isPlaying ? "敵の進軍と防衛ログ" : "ゲーム始める（拠点設定）"}
          </h2>
          <p className="muted">
            {isPlaying
              ? "敵が道を伝って本拠地へ進軍します。終了すると準備状態へ戻ります。"
              : "現在地の近くで施設を選び、チェックインと拠点設定を行います。"}
          </p>
        </div>
        <div className="inline-controls">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowSettings(true)}
          >
            設定
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={handleSimulateMovement}
          >
            歩行ティックを実行
          </button>
        </div>
      </div>

      {!isPlaying ? (
        <div className="grid-cards two-up">
          <article className="feature-card">
            <strong>ステージ選択</strong>
            <div className="choice-grid">
              {stageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    option.value === selectedStage
                      ? "choice-chip active"
                      : "choice-chip"
                  }
                  onClick={() => setSelectedStage(option.value)}
                >
                  <span>{option.label}</span>
                  <small>{option.note}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="feature-card">
            <strong>難易度選択</strong>
            <div className="choice-grid">
              {difficultyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    option.value === selectedDifficulty
                      ? "choice-chip active"
                      : "choice-chip"
                  }
                  onClick={() => setSelectedDifficulty(option.value)}
                >
                  <span>{option.label}</span>
                  <small>
                    脅威 {option.threat} / 敵 {option.enemies}
                  </small>
                </button>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      <article className="feature-card map-briefing">
        <strong>{isPlaying ? "現在のウェーブ" : "防衛施設設置"}</strong>
        <span>
          {isPlaying
            ? `${activeWaveSummary.title} / 残敵 ${activeWaveSummary.remainingEnemies}`
            : "現在地の近くにしか配置できません。店の種類で特殊効果が変わります。"}
        </span>
        <span className="muted">
          {isPlaying
            ? `次のティックまで ${activeWaveSummary.nextTickSec} 秒`
            : `本拠地: ${currentBaseSummary.name} / 耐久 ${currentBaseSummary.durability}`}
        </span>
      </article>

      {!isPlaying ? (
        <article className="feature-card">
          <strong>設置したい施設を選ぶ</strong>
          <div className="choice-grid compact">
            {structureOptions.map((option) => (
              <button
                key={option.kind}
                type="button"
                className={
                  option.kind === selectedStructureKind
                    ? "choice-chip active"
                    : "choice-chip"
                }
                onClick={() => {
                  setSelectedStructureKind(option.kind);
                  const match = transformRules.find(
                    (rule) => rule.structureType === option.kind,
                  );
                  if (match) {
                    setPlacementPreview({
                      kind: match.structureType,
                      x: Math.round(viewport.x + 4),
                      y: Math.round(viewport.y + 6),
                    });
                  }
                }}
              >
                <span>{option.label}</span>
                <small>{option.detail}</small>
              </button>
            ))}
          </div>
        </article>
      ) : null}

      {!isPlaying && selectedPlace && selectedRule ? (
        <article className="feature-card">
          <strong>{selectedPlace.name}</strong>
          <span>
            {selectedPlace.kind} -&gt; {selectedRule.structureType}
          </span>
          <span>{selectedRule.effect}</span>
          <span className="muted">
            近くのスポットに行くと、有利なアイテムや変換ボーナスが出ます。
          </span>
        </article>
      ) : null}

      <MapView
        viewport={viewport}
        nearbyPlaces={nearbyPlaces}
        selectedMarker={selectedMarker}
        placementPreview={placementPreview}
        onSelectMarker={setSelectedMarker}
        deployedStructures={deployedStructures}
      />

      {!isPlaying ? (
        <BottomActionPanel
          actions={[
            {
              label: "選択中POIにチェックイン",
              emphasis: "primary",
              onClick: handleCheckIn,
            },
            {
              label: "施設へ変換",
              onClick: handleConvertToStructure,
            },
            {
              label: "ゲームスタート",
              emphasis: "primary",
              onClick: handleStartGame,
            },
          ]}
        />
      ) : (
        <BottomActionPanel
          actions={[
            {
              label: "終了",
              emphasis: "primary",
              onClick: handleEndGame,
            },
            {
              label: "プレビューをリセット",
              onClick: () => setPlacementPreview(null),
            },
          ]}
        />
      )}

      <p className="muted">
        {isPlaying
          ? `防衛中: ${activeWaveSummary.remainingEnemies}体 / ${activeWaveSummary.phase}`
          : `チェックイン状態: ${isCheckedIn ? "変換可能" : "選択中POIに接近してください"}`}
      </p>

      {showSettings ? (
        <div className="settings-modal" role="dialog" aria-modal="true">
          <article className="settings-card">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">設定</p>
                <h3>ユーザ情報</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setShowSettings(false)}
              >
                閉じる
              </button>
            </div>

            <div className="summary-card">
              <span className="summary-label">ユーザ名</span>
              <strong>{currentUser?.name ?? "ゲスト"}</strong>
              <span className="summary-label">レベル</span>
              <strong>{currentUser?.level ?? 1}</strong>
            </div>

            <div className="auth-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  signOut();
                  setShowSettings(false);
                }}
              >
                ログアウト
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
