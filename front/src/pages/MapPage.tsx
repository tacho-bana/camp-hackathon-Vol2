import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapView } from "../components/map/MapView";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNearbyPOI } from "../hooks/useNearbyPOI";
import { useCountdown } from "../hooks/useCountdown";
import { useGameSimulation, type CombatEvent } from "../hooks/useGameSimulation";
import { useAppState } from "../state/AppStateContext";
import { postGameBase } from "../api/game";
import { postStructure } from "../api/structures";
import { fetchRoadRoute } from "../utils/roadRoute";
import type { Enemy, LatLng, MapViewport, Structure } from "../types/game";

// ── 定数 ──────────────────────────────────────────────────────────
const TURRET_COST = 100;
const WALL_COST = 50;
const CONBINI_BUFF_RADIUS_M = 50;

function spawnTestEnemies(base: LatLng): Enemy[] {
  const offsets: Array<{ lat: number; lng: number }> = [
    { lat: 0.0027, lng: 0.0005 },
    { lat: -0.0008, lng: 0.0028 },
    { lat: -0.0020, lng: -0.0018 },
  ];
  return offsets.map((offset, i) => ({
    id: `test-enemy-${i + 1}`,
    lat: base.lat + offset.lat,
    lng: base.lng + offset.lng,
    hp: 100,
    maxHp: 100,
    speed: 2.5,
    state: "spawned" as const,
  }));
}
// ─────────────────────────────────────────────────────────────────

export function MapPage() {
  const {
    currentUser,
    gamePhase,
    bitcoin,
    homeCoords,
    homeHp,
    structures,
    enemies,
    setGamePhase,
    spendBitcoin,
    setHomeCoords,
    setStructures,
    setEnemies,
    setHomeHp,
    signOut,
    resetGame,
  } = useAppState();

  // ── 位置情報 ─────────────────────────────────────────────────────
  const { position: gpsPosition, error: gpsError } = useGeolocation();
  const [isSpoofing, setIsSpoofing] = useState(import.meta.env.DEV);
  const [spoofedPosition, setSpoofedPosition] = useState<LatLng | null>(null);
  const currentPosition = isSpoofing ? spoofedPosition : gpsPosition;

  // ── ゲームローカル状態 ──────────────────────────────────────────
  const [viewport] = useState<MapViewport>({ x: 24, y: 12, zoom: 1.4 });
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [enemySpawnPoints, setEnemySpawnPoints] = useState<LatLng[]>([]);
  const [enemyDisplayRoutes, setEnemyDisplayRoutes] = useState<
    Array<{ waypoints: LatLng[] }>
  >([]);
  const [selectedStructureType, setSelectedStructureType] = useState<
    "turret" | "wall" | null
  >(null);
  const [attackBuff, setAttackBuff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const [isPlacingStructure, setIsPlacingStructure] = useState(false);
  const [isFetchingRoutes, setIsFetchingRoutes] = useState(false);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [hitEnemyIds, setHitEnemyIds] = useState<Set<string>>(new Set());
  const gameEndCalledRef = useRef(false);
  const homeHpRef = useRef(homeHp);
  /** バトル開始直前の敵スナップショット（準備フェーズへ巻き戻す際に使う） */
  const initialEnemiesRef = useRef<Enemy[]>([]);
  const hitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { homeHpRef.current = homeHp; }, [homeHp]);

  const nearbyPlaces = useNearbyPOI(currentPosition);

  // ── カウントダウン ────────────────────────────────────────────
  const battleRemaining = useCountdown(300, gamePhase === "battle");

  // ── コンビニバフ検出 ──────────────────────────────────────────
  useEffect(() => {
    if (!currentPosition) return;
    const nearConbini = nearbyPlaces.some(
      (p) => p.kind === "convenience-store" && p.distance <= CONBINI_BUFF_RADIUS_M,
    );
    setAttackBuff(nearConbini);
  }, [currentPosition, nearbyPlaces]);

  // ── バトルシミュレーション ────────────────────────────────────
  const handleSimUpdate = useCallback(
    (newEnemies: Enemy[], homeDamage: number, events: CombatEvent[]) => {
      setEnemies(newEnemies);
      if (homeDamage > 0) {
        setHomeHp(Math.max(0, homeHpRef.current - homeDamage));
      }

      const newHitIds = new Set<string>();

      for (const ev of events) {
        if (ev.type === "enemy_hit") newHitIds.add(ev.enemyId);
      }

      if (newHitIds.size > 0) {
        setHitEnemyIds(newHitIds);
        if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
        hitTimerRef.current = setTimeout(
          () => setHitEnemyIds(new Set()),
          500,
        );
      }

    },
    [setEnemies, setHomeHp],
  );

  useGameSimulation({
    isActive: gamePhase === "battle",
    homeCoords,
    structures,
    enemies,
    attackBuff,
    onUpdate: handleSimUpdate,
  });

  // ── 敵ルート (道路 or 直線フォールバック) ────────────────────
  const enemyRoutes = useMemo(() => {
    if (enemyDisplayRoutes.length > 0) return enemyDisplayRoutes;
    if (!homeCoords || enemySpawnPoints.length === 0) return [];
    return enemySpawnPoints.map((pt) => ({ waypoints: [pt, homeCoords] }));
  }, [enemyDisplayRoutes, enemySpawnPoints, homeCoords]);

  // ── waiting → リセット ─────────────────────────────────────────
  useEffect(() => {
    if (gamePhase === "waiting") {
      setSelectedMarker(null);
      setEnemySpawnPoints([]);
      setEnemyDisplayRoutes([]);
      setSelectedStructureType(null);
      setAttackBuff(false);
      setGameResult(null);
      setHitEnemyIds(new Set());
      gameEndCalledRef.current = false;
    }
  }, [gamePhase]);

  // ── バトル終了判定 ────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase !== "battle" || gameEndCalledRef.current) return;

    if (homeHp <= 0) {
      gameEndCalledRef.current = true;
      setGameResult("lose");
      setGamePhase("result");
      return;
    }

    if (enemies.length > 0 && enemies.every((e) => e.state === "dead")) {
      gameEndCalledRef.current = true;
      setGameResult("win");
      setGamePhase("result");
    }
  }, [homeHp, enemies, gamePhase, setGamePhase]);

  // ── バトルタイムアップ ────────────────────────────────────────
  useEffect(() => {
    if (
      gamePhase === "battle" &&
      battleRemaining === 0 &&
      !gameEndCalledRef.current
    ) {
      gameEndCalledRef.current = true;
      // 制限時間内に拠点が生き残っていれば勝利
      setGameResult(homeHp > 0 ? "win" : "lose");
      setGamePhase("result");
    }
  }, [battleRemaining, gamePhase, homeHp, setGamePhase]);

  // ── ハンドラー ────────────────────────────────────────────────

  const handleStartGame = async () => {
    if (!currentPosition || isStartingGame) return;
    setIsStartingGame(true);
    try {
      await postGameBase(currentPosition.lat, currentPosition.lng).catch(
        console.error,
      );

      const base = currentPosition;
      const testEnemies = spawnTestEnemies(base);
      setHomeCoords(base);
      setEnemies(testEnemies);
      setEnemySpawnPoints(testEnemies.map((e) => ({ lat: e.lat, lng: e.lng })));
      setGamePhase("prep");

      // 道路ルートをバックグラウンドで取得
      setIsFetchingRoutes(true);
      Promise.all(
        testEnemies.map((e) => fetchRoadRoute({ lat: e.lat, lng: e.lng }, base)),
      )
        .then((routes) => {
          setEnemyDisplayRoutes(routes.map((waypoints) => ({ waypoints })));
          setEnemies(
            testEnemies.map((enemy, i) => ({
              ...enemy,
              route: routes[i],
              routeIndex: 0,
            })),
          );
        })
        .catch(console.error)
        .finally(() => setIsFetchingRoutes(false));
    } finally {
      setIsStartingGame(false);
    }
  };

  const handlePlaceStructureAtPosition = async () => {
    if (!currentPosition || !selectedStructureType || isPlacingStructure) return;
    const cost = selectedStructureType === "turret" ? TURRET_COST : WALL_COST;
    if (bitcoin < cost) return;

    setIsPlacingStructure(true);
    try {
      const newStructure: Structure = {
        id: `local-${Date.now()}`,
        lat: currentPosition.lat,
        lng: currentPosition.lng,
        kind: selectedStructureType,
        hp: selectedStructureType === "turret" ? 120 : 200,
        maxHp: selectedStructureType === "turret" ? 120 : 200,
        rangeM: selectedStructureType === "turret" ? 80 : 35,
      };

      try {
        const res = await postStructure(
          selectedStructureType,
          currentPosition.lat,
          currentPosition.lng,
        );
        newStructure.id = res.id;
      } catch {
        /* フロントエンドのみで管理 */
      }

      setStructures((prev) => [...prev, newStructure]);
      spendBitcoin(cost);
    } finally {
      setIsPlacingStructure(false);
    }
  };

  const handleStartBattle = () => {
    if (isStartingBattle) return;
    setIsStartingBattle(true);
    // バトル開始時に敵の初期状態を保存（戻る際のリセット用）
    initialEnemiesRef.current = enemies.map((e) => ({ ...e }));
    setGamePhase("battle");
    setIsStartingBattle(false);
  };

  /** battle → prep: 敵を初期配置に戻す。構造物はそのまま */
  const handleReturnToPrep = () => {
    if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
    gameEndCalledRef.current = false;
    setHitEnemyIds(new Set());
    setBattleLog([]);
    setEnemies(
      initialEnemiesRef.current.map((e) => ({
        ...e,
        hp: e.maxHp,
        state: "spawned" as const,
        routeIndex: 0,
      })),
    );
    setHomeHp(100);
    setGamePhase("prep");
  };

  const handleDeleteStructure = (id: string) => {
    setStructures((prev) => prev.filter((s) => s.id !== id));
  };

  /** prep → waiting: 敵・スポーン情報・構造物をすべてクリア */
  const handleReturnToWaiting = () => {
    setEnemies([]);
    setEnemySpawnPoints([]);
    setEnemyDisplayRoutes([]);
    setSelectedStructureType(null);
    setStructures([]);
    setHomeCoords(null);
    setGamePhase("waiting");
  };

  const handlePlayAgain = () => {
    if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
    resetGame();
    setGameResult(null);
    setBattleLog([]);
    setEnemyDisplayRoutes([]);
    setEnemySpawnPoints([]);
    setSelectedStructureType(null);
    setAttackBuff(false);
    setHitEnemyIds(new Set());
    gameEndCalledRef.current = false;
  };

  // ── ユーティリティ ─────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const currentPositionLabel = (() => {
    if (currentPosition) {
      const coords = `${currentPosition.lat.toFixed(5)}, ${currentPosition.lng.toFixed(5)}`;
      return isSpoofing ? `${coords} (偽装中)` : coords;
    }
    if (isSpoofing) return "地図をタップして現在地を設定";
    if (gpsError) return "位置情報取得エラー";
    return "GPS 取得中…";
  })();

  const aliveEnemyCount = enemies.filter((e) => e.state !== "dead").length;
  const canPlaceHere =
    !!currentPosition &&
    !!selectedStructureType &&
    bitcoin >= (selectedStructureType === "turret" ? TURRET_COST : WALL_COST) &&
    !isPlacingStructure;

  // ── レンダー ──────────────────────────────────────────────────
  return (
    <section className="content-panel stack-layout map-screen">
      {/* PC 用ヘッダ */}
      <div className="panel-header">
        <div>
          <p className="eyebrow">
            {gamePhase === "waiting" && "待機中"}
            {gamePhase === "prep" && "準備フェーズ"}
            {gamePhase === "battle" && "バトル中"}
            {gamePhase === "result" && "ゲーム終了"}
          </p>
          <h2>
            {gamePhase === "waiting" && "ゲームを始める"}
            {gamePhase === "prep" && "準備中"}
            {gamePhase === "battle" &&
              `バトル中 ${formatTime(battleRemaining)}`}
            {gamePhase === "result" &&
              (gameResult === "win" ? "VICTORY!" : "DEFEAT...")}
          </h2>
          <p className="muted">
            BTC: {bitcoin} / 家HP: {homeHp} / 100
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
        </div>
      </div>

      {/* スマホ: ボトムシート */}
      <div className="mobile-bottom-sheet">
        <div className="mobile-sheet-header">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowSettings(true)}
          >
            ⚙ 設定
          </button>
        </div>

        {/* ── 待機中 ── */}
        {gamePhase === "waiting" && (
          <article className="feature-card">
            <strong>ゲーム開始</strong>
            <span>
              現在地を「家（本拠地）」として設定し、敵3体が出現します。防衛施設を配置してからゲームスタートボタンを押してください。
            </span>
            {!currentPosition && (
              <span className="muted">
                GPS 取得中、または偽装モードで地図をタップして設定してください。
              </span>
            )}
          </article>
        )}

        {/* ── 準備フェーズ ── */}
        {gamePhase === "prep" && (
          <>
            <article className="feature-card">
              <strong>準備フェーズ</strong>
              <span>BTC: {bitcoin}</span>
              {isFetchingRoutes && (
                <span className="muted">🗺 道路ルートを取得中...</span>
              )}
              {!isFetchingRoutes && enemyDisplayRoutes.length > 0 && (
                <span className="muted">🗺 道路ルート表示中</span>
              )}
              {attackBuff && (
                <div className="buff-banner">
                  ⚡ コンビニバフ発動中！タレット攻撃力 ×1.5
                </div>
              )}
            </article>

            <article className="feature-card">
              <strong>防衛施設を設置</strong>
              <span className="muted">施設種別を選んで現在地に設置します</span>
              <div className="choice-grid compact">
                <button
                  type="button"
                  className={
                    selectedStructureType === "turret"
                      ? "choice-chip active"
                      : "choice-chip"
                  }
                  onClick={() =>
                    setSelectedStructureType((p) =>
                      p === "turret" ? null : "turret",
                    )
                  }
                >
                  <strong>🔫 タレット</strong>
                  <small>射程80m・攻撃型 -{TURRET_COST} BTC</small>
                </button>
                <button
                  type="button"
                  className={
                    selectedStructureType === "wall"
                      ? "choice-chip active"
                      : "choice-chip"
                  }
                  onClick={() =>
                    setSelectedStructureType((p) =>
                      p === "wall" ? null : "wall",
                    )
                  }
                >
                  <strong>🧱 壁</strong>
                  <small>射程35m・足止め型 -{WALL_COST} BTC</small>
                </button>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={handlePlaceStructureAtPosition}
                disabled={!canPlaceHere}
              >
                {isPlacingStructure
                  ? "設置中..."
                  : !selectedStructureType
                    ? "施設種別を選択"
                    : !currentPosition
                      ? "GPS 取得中..."
                      : bitcoin <
                          (selectedStructureType === "turret"
                            ? TURRET_COST
                            : WALL_COST)
                        ? "BTC 不足"
                        : `現在地に設置 (-${
                            selectedStructureType === "turret"
                              ? TURRET_COST
                              : WALL_COST
                          } BTC)`}
              </button>
              {structures.length > 0 && (
                <span className="muted">設置済み: {structures.length} 基</span>
              )}
            </article>

            {nearbyPlaces.some((p) => p.kind === "convenience-store") && (
              <article className="feature-card">
                <strong>近くのコンビニ</strong>
                {nearbyPlaces
                  .filter((p) => p.kind === "convenience-store")
                  .slice(0, 3)
                  .map((p) => (
                    <span key={p.id} className="muted">
                      {p.name} — {p.distance}m
                      {p.distance <= CONBINI_BUFF_RADIUS_M && (
                        <span style={{ color: "#fbbf24", marginLeft: 6 }}>
                          ⚡ バフ発動中
                        </span>
                      )}
                    </span>
                  ))}
              </article>
            )}
          </>
        )}

        {/* ── バトルフェーズ ── */}
        {gamePhase === "battle" && (
          <>
            <article className="feature-card">
              <strong>バトルフェーズ</strong>
              <span>残り: {formatTime(battleRemaining)}</span>
              <span>
                家 HP:{" "}
                <strong
                  style={{
                    color:
                      homeHp > 60
                        ? "#86efac"
                        : homeHp > 30
                          ? "#fbbf24"
                          : "#f87171",
                  }}
                >
                  {homeHp}
                </strong>
                {" / 100"}
              </span>
              <span>
                敵: {aliveEnemyCount} / {enemies.length} 体
              </span>
              {attackBuff && (
                <div className="buff-banner">⚡ コンビニバフ発動中</div>
              )}
            </article>

          </>
        )}
      </div>

      {/* 右下フローティング CTA（waiting のみ） */}
      {gamePhase === "waiting" && (
        <button
          type="button"
          className="primary-button floating-action"
          onClick={handleStartGame}
          disabled={!currentPosition || isStartingGame}
        >
          {isStartingGame ? "開始中..." : "ゲームを始める"}
        </button>
      )}

      {/* 地図 */}
      <MapView
        viewport={viewport}
        nearbyPlaces={nearbyPlaces}
        selectedMarker={selectedMarker}
        placementPreview={null}
        onSelectMarker={setSelectedMarker}
        deployedStructures={[]}
        currentPosition={currentPosition}
        isSpoofing={isSpoofing}
        onSpoofedLocationSet={setSpoofedPosition}
        structures={structures}
        enemies={enemies}
        homeCoords={homeCoords}
        gamePhase={gamePhase}
        bitcoin={bitcoin}
        homeHp={homeHp}
        battleRemaining={battleRemaining}
        currentPositionLabel={currentPositionLabel}
        enemyRoutes={enemyRoutes}
        onStartBattle={gamePhase === "prep" ? handleStartBattle : undefined}
        isStartingBattle={isStartingBattle}
        hasBuff={attackBuff}
        gameResult={gameResult}
        hitEnemyIds={hitEnemyIds}
        onPlayAgain={handlePlayAgain}
        onReturnToPrep={gamePhase === "battle" ? handleReturnToPrep : undefined}
        onReturnToWaiting={gamePhase === "prep" ? handleReturnToWaiting : undefined}
        onDeleteStructure={handleDeleteStructure}
      />

      {gpsError && !isSpoofing && (
        <article
          className="feature-card"
          style={{ borderLeft: "3px solid #ef4444" }}
        >
          <strong>位置情報エラー</strong>
          <span>{gpsError}</span>
          <span className="muted">
            Chrome のアドレスバー横の鍵アイコン →「位置情報」→「許可」に変更してください。
          </span>
        </article>
      )}

      <p className="muted">{currentPositionLabel}</p>

      {showSettings && (
        <div className="settings-modal" role="dialog" aria-modal="true">
          <article className="settings-card">
            <div className="settings-header">
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
            <div className="action-group">
              <button
                type="button"
                className="primary-button"
                onClick={() => { signOut(); setShowSettings(false); }}
              >
                ログアウト
              </button>
            </div>
            {import.meta.env.DEV && (
              <div>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  開発者ツール
                </p>
                <div className="dev-tools">
                  <button
                    type="button"
                    className={
                      isSpoofing ? "ghost-button active" : "ghost-button"
                    }
                    onClick={() => setIsSpoofing((p) => !p)}
                  >
                    {isSpoofing ? "偽装 ON" : "偽装 OFF"}
                  </button>
                </div>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
