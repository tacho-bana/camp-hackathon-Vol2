import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User as UserIcon, ArrowLeft as ArrowLeftIcon, BookOpen as BookOpenIcon } from "lucide-react";
import { TutorialModal } from "../components/TutorialModal";
import { MapView } from "../components/map/MapView";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNearbyPOI } from "../hooks/useNearbyPOI";
import { useCountdown } from "../hooks/useCountdown";
import { useGameSimulation, type CombatEvent } from "../hooks/useGameSimulation";
import { useAppState } from "../state/AppStateContext";
import { postGameBase } from "../api/game";
import { postStructure } from "../api/structures";
import { fetchRoadRoute } from "../utils/roadRoute";
import { calcDistance } from "../utils/geo";
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
    addBitcoin,
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
  const [isSpoofing, setIsSpoofing] = useState(false);
  const [spoofedPosition, setSpoofedPosition] = useState<LatLng | null>(null);
  const currentPosition = isSpoofing ? spoofedPosition : gpsPosition;

  // ── ゲームローカル状態 ──────────────────────────────────────────
  const [viewport] = useState<MapViewport>({ x: 24, y: 12, zoom: 1.4 });
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [enemySpawnPoints, setEnemySpawnPoints] = useState<LatLng[]>([]);
  const [enemyDisplayRoutes, setEnemyDisplayRoutes] = useState<
    Array<{ waypoints: LatLng[] }>
  >([]);
  const [attackBuff, setAttackBuff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStageSelect, setShowStageSelect] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const [isPlacingStructure, setIsPlacingStructure] = useState(false);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [hitEnemyIds, setHitEnemyIds] = useState<Set<string>>(new Set());
  /** 戻る確認ダイアログの状態（MapView から引き上げ） */
  const [pendingBack, setPendingBack] = useState<"toWaiting" | "toPrep" | null>(null);
  /** タイマーリセット用キー（新規ゲーム開始時にインクリメント） */
  const [battleKey, setBattleKey] = useState(0);
  const gameEndCalledRef = useRef(false);
  const homeHpRef = useRef(homeHp);
  /** バトル開始直前の敵スナップショット（準備フェーズへ巻き戻す際に使う） */
  const initialEnemiesRef = useRef<Enemy[]>([]);
  const hitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHomeHpRef = useRef(homeHp);
  const [baseDamageFlash, setBaseDamageFlash] = useState(false);
  useEffect(() => { homeHpRef.current = homeHp; }, [homeHp]);

  // 拠点HPが減ったらフラッシュ演出
  useEffect(() => {
    if (homeHp < prevHomeHpRef.current && gamePhase === "battle") {
      setBaseDamageFlash(true);
      const t = setTimeout(() => setBaseDamageFlash(false), 600);
      prevHomeHpRef.current = homeHp;
      return () => clearTimeout(t);
    }
    prevHomeHpRef.current = homeHp;
  }, [homeHp, gamePhase]);

  /** ダイアログ表示中はバトルを一時停止 */
  const isPaused = pendingBack === "toPrep";

  const nearbyPlaces = useNearbyPOI(currentPosition);

  // ── カウントダウン ────────────────────────────────────────────
  const battleRemaining = useCountdown(300, gamePhase === "battle" && !isPaused, battleKey);

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
    isActive: gamePhase === "battle" && !isPaused,
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

  // waiting → prep（楽観的更新: 即座に画面遷移してAPIはバックグラウンドで実行）
  const handleStartGame = () => {
    if (!currentPosition || isStartingGame) return;
    setIsStartingGame(true);

    const base = currentPosition;
    const testEnemies = spawnTestEnemies(base);

    // 即座に画面遷移
    setHomeCoords(base);
    setEnemies(testEnemies);
    setEnemySpawnPoints(testEnemies.map((e) => ({ lat: e.lat, lng: e.lng })));
    setShowStageSelect(false);
    setGamePhase("prep");
    setIsStartingGame(false);

    // バックグラウンドでAPIと同期
    postGameBase(base.lat, base.lng).catch(console.error);

    // 道路ルートをバックグラウンドで取得
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
      .catch(console.error);
  };

  const handlePlaceStructure = async (type: "turret" | "wall") => {
    if (!currentPosition || isPlacingStructure) return;
    const cost = type === "turret" ? TURRET_COST : WALL_COST;
    if (bitcoin < cost) return;

    // 同種施設の射程内には設置不可
    const rangeM = type === "turret" ? 80 : 35;
    const tooClose = structures.some(
      (s) =>
        s.kind === type &&
        calcDistance(currentPosition, { lat: s.lat, lng: s.lng }) < rangeM,
    );
    if (tooClose) return;

    setIsPlacingStructure(true);

    // 楽観的更新: 即座に画面に反映
    const localId = `local-${Date.now()}`;
    const newStructure: Structure = {
      id: localId,
      lat: currentPosition.lat,
      lng: currentPosition.lng,
      kind: type,
      hp: type === "turret" ? 120 : 200,
      maxHp: type === "turret" ? 120 : 200,
      rangeM: type === "turret" ? 80 : 35,
    };
    setStructures((prev) => [...prev, newStructure]);
    spendBitcoin(cost);

    // バックグラウンドでAPIと同期（IDを正式なものに差し替え）
    postStructure(type, currentPosition.lat, currentPosition.lng)
      .then((res) => {
        setStructures((prev) =>
          prev.map((s) => (s.id === localId ? { ...s, id: res.id } : s)),
        );
      })
      .catch(() => { /* フロントエンドのみで管理 */ })
      .finally(() => setIsPlacingStructure(false));
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
    setBattleKey((k) => k + 1); // タイマーリセット
    if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
    gameEndCalledRef.current = false;
    setHitEnemyIds(new Set());

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
    const target = structures.find((s) => s.id === id);
    if (target) {
      addBitcoin(target.kind === "turret" ? TURRET_COST : WALL_COST);
    }
    setStructures((prev) => prev.filter((s) => s.id !== id));
  };

  /** prep → waiting: 敵・スポーン情報・構造物をすべてクリア */
  const handleReturnToWaiting = () => {
    setBattleKey((k) => k + 1); // 次回バトル用にタイマーリセット
    setEnemies([]);
    setEnemySpawnPoints([]);
    setEnemyDisplayRoutes([]);

    setStructures([]);
    setHomeCoords(null);
    setGamePhase("waiting");
  };

  const handlePlayAgain = () => {
    setBattleKey((k) => k + 1); // タイマーリセット
    if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
    resetGame();
    setGameResult(null);

    setEnemyDisplayRoutes([]);
    setEnemySpawnPoints([]);

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

      {/* タイトル画面（waiting フェーズ） */}
      {gamePhase === "waiting" && !showStageSelect && (
        <div className="title-screen">
          <button
            type="button"
            className="title-user-btn"
            aria-label="ユーザー情報"
            onClick={() => setShowSettings(true)}
          >
            <UserIcon size={20} />
          </button>
          <div className="title-screen-content">
            <img src="/favicon.svg" alt="Neighbor Security logo" className="title-logo" />
            <h1 className="title-name">Neighbor Security</h1>

            <button
              type="button"
              className="primary-button title-start-btn"
              onClick={() => setShowStageSelect(true)}
              disabled={!currentPosition}
            >
              ゲームを始める
            </button>
            <button
              type="button"
              className="title-tutorial-btn"
              onClick={() => setShowTutorial(true)}
            >
              <BookOpenIcon size={15} />
              遊び方
            </button>
            {!currentPosition && (
              <p className="title-gps-hint">GPS 取得中...</p>
            )}
          </div>
        </div>
      )}

      {/* ステージ選択画面 */}
      {gamePhase === "waiting" && showStageSelect && (
        <div className="title-screen">
          <div className="stage-select-content">
            <button
              type="button"
              className="stage-select-back"
              onClick={() => setShowStageSelect(false)}
            >
              <ArrowLeftIcon size={14} /> タイトルに戻る
            </button>
            <h2 className="stage-select-title">ステージを選択</h2>
            <div className="stage-list">
              {/* Stage 1 — プレイ可能 */}
              <button
                type="button"
                className="stage-card stage-card--active"
                onClick={handleStartGame}
                disabled={isStartingGame}
              >
                <span className="stage-number">STAGE 1</span>
                <span className="stage-difficulty">★☆☆</span>
              </button>

              {/* Stage 2 — Coming Soon */}
              <div className="stage-card stage-card--soon">
                <span className="stage-number">STAGE 2</span>
                <span className="stage-coming-badge">Coming Soon</span>
                <span className="stage-difficulty">★★☆</span>
              </div>

              {/* Stage 3 — Coming Soon */}
              <div className="stage-card stage-card--soon">
                <span className="stage-number">STAGE 3</span>
                <span className="stage-coming-badge">Coming Soon</span>
                <span className="stage-difficulty">★★★</span>
              </div>
            </div>
          </div>
        </div>
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
        onPlaceStructure={gamePhase === "prep" ? handlePlaceStructure : undefined}
        isPlacingStructure={isPlacingStructure}
        onOpenSettings={() => setShowSettings(true)}
        pendingBack={pendingBack}
        onPendingBackChange={setPendingBack}
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

      {/* 拠点ダメージフラッシュ */}
      {baseDamageFlash && (
        <div className="base-damage-flash" aria-hidden="true" />
      )}

      {showTutorial && (
        <TutorialModal onClose={() => setShowTutorial(false)} />
      )}

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
                onClick={() => {
                  void signOut();
                  setShowSettings(false);
                }}
              >
                ログアウト
              </button>
            </div>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>位置情報</p>
              <div className="dev-tools">
                <button
                  type="button"
                  className={isSpoofing ? "ghost-button active" : "ghost-button"}
                  onClick={() => setIsSpoofing((p) => !p)}
                >
                  {isSpoofing ? "偽装モード ON" : "偽装モード OFF"}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
