import { useEffect, useMemo, useRef, useState } from "react";
import { BottomActionPanel } from "../components/ui/BottomActionPanel";
import { MapView } from "../components/map/MapView";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNearbyPOI } from "../hooks/useNearbyPOI";
import { useCountdown } from "../hooks/useCountdown";
import { useEnemyPolling } from "../hooks/useEnemyPolling";
import { useAppState } from "../state/AppStateContext";
import { postGameBase, postGameStart, postGameClear, postGameEnd } from "../api/game";
import { postStructure } from "../api/structures";
import type {
  LatLng,
  MapViewport,
  PlacementPreview,
  Structure,
} from "../types/game";

const CHECK_IN_RADIUS_M = 50;
const STRUCTURE_COST = 150;
const CHECKIN_REWARD = 30;

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
    signOut,
  } = useAppState();

  const { position: gpsPosition, error: gpsError } = useGeolocation();
  const [isSpoofing, setIsSpoofing] = useState(import.meta.env.DEV);
  const [spoofedPosition, setSpoofedPosition] = useState<LatLng | null>(null);
  const currentPosition = isSpoofing
    ? spoofedPosition
    : (gpsPosition ?? spoofedPosition);

  const [viewport, setViewport] = useState<MapViewport>({
    x: 24,
    y: 12,
    zoom: 1.4,
  });
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [checkedInPlaceIds, setCheckedInPlaceIds] = useState<string[]>([]);
  const [deployedStructurePlaceIds, setDeployedStructurePlaceIds] = useState<string[]>([]);
  const [placementPreview, setPlacementPreview] =
    useState<PlacementPreview | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const [isPlacingStructure, setIsPlacingStructure] = useState(false);
  const gameEndCalledRef = useRef(false);

  const nearbyPlaces = useNearbyPOI(currentPosition);

  // カウントダウン
  const prepRemaining = useCountdown(900, gamePhase === "prep");
  const battleRemaining = useCountdown(300, gamePhase === "battle");

  // 敵ポーリング
  useEnemyPolling(gamePhase === "battle", setEnemies);

  const selectedPlace = useMemo(
    () => nearbyPlaces.find((place) => place.id === selectedMarker) ?? null,
    [nearbyPlaces, selectedMarker],
  );

  const canCheckIn =
    selectedPlace !== null &&
    selectedPlace.distance <= CHECK_IN_RADIUS_M &&
    gamePhase === "prep";

  const isCheckedIn = selectedMarker
    ? checkedInPlaceIds.includes(selectedMarker)
    : false;

  const isStructureDeployed = selectedMarker
    ? deployedStructurePlaceIds.includes(selectedMarker)
    : false;

  const canPlaceStructure =
    isCheckedIn &&
    bitcoin >= STRUCTURE_COST &&
    !isStructureDeployed &&
    gamePhase === "prep" &&
    selectedPlace !== null;

  // waiting に戻ったらローカル state をリセット（Fix #6）
  useEffect(() => {
    if (gamePhase === "waiting") {
      setCheckedInPlaceIds([]);
      setDeployedStructurePlaceIds([]);
      setSelectedMarker(null);
      setPlacementPreview(null);
      gameEndCalledRef.current = false;
    }
  }, [gamePhase]);

  // バトルフェーズ終了条件の監視（Fix #3: 二重呼び出し防止）
  useEffect(() => {
    if (gamePhase !== "battle" || gameEndCalledRef.current) return;

    if (homeHp <= 0) {
      gameEndCalledRef.current = true;
      postGameEnd().catch(console.error).finally(() => setGamePhase("result"));
      return;
    }

    if (enemies.length > 0 && enemies.every((e) => e.state === "dead")) {
      gameEndCalledRef.current = true;
      postGameClear().catch(console.error).finally(() => setGamePhase("result"));
    }
  }, [homeHp, enemies, gamePhase, setGamePhase]);

  // バトルタイムアップ処理（Fix #5）
  useEffect(() => {
    if (gamePhase === "battle" && battleRemaining === 0 && !gameEndCalledRef.current) {
      gameEndCalledRef.current = true;
      postGameEnd().catch(console.error).finally(() => setGamePhase("result"));
    }
  }, [battleRemaining, gamePhase, setGamePhase]);

  const handleSimulateMovement = () => {
    setViewport((current) => ({
      ...current,
      x: current.x + 1,
      y: current.y + 1,
    }));
  };

  // ゲーム開始ボタン (waiting → prep)
  const handleStartGame = async () => {
    if (!currentPosition || isStartingGame) return;
    setIsStartingGame(true);
    try {
      await postGameBase(currentPosition.lat, currentPosition.lng);
      setGamePhase("prep");
      setHomeCoords(currentPosition);
    } catch (e) {
      console.error(e);
    } finally {
      setIsStartingGame(false);
    }
  };

  // チェックイン
  const handleCheckIn = () => {
    if (!selectedMarker || !canCheckIn || isCheckedIn) return;
    setCheckedInPlaceIds((current) => [...current, selectedMarker]);
    addBitcoin(CHECKIN_REWARD);
  };

  // 防衛拠点設置
  const handlePlaceStructure = async () => {
    if (!selectedPlace || !canPlaceStructure || isPlacingStructure) return;
    setIsPlacingStructure(true);
    try {
      const res = await postStructure("turret", selectedPlace.lat, selectedPlace.lng);
      const newStructure: Structure = {
        id: res.id,
        lat: res.lat,
        lng: res.lng,
        kind: res.type,
        hp: res.hp,
        maxHp: res.max_hp,
        rangeM: res.range_m,
      };
      setStructures((prev) => [...prev, newStructure]);
      spendBitcoin(STRUCTURE_COST);
      setDeployedStructurePlaceIds((current) => [...current, selectedPlace.id]);
      setPlacementPreview({
        kind: "electric_shop_tower",
        x: Math.round(viewport.x + 4),
        y: Math.round(viewport.y + 6),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlacingStructure(false);
    }
  };

  // ゲームスタート (prep → battle)
  const handleStartBattle = async () => {
    if (isStartingBattle) return;
    setIsStartingBattle(true);
    try {
      await postGameStart(3);
      setGamePhase("battle");
    } catch (e) {
      console.error(e);
    } finally {
      setIsStartingBattle(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <section className="content-panel stack-layout map-screen">
      <div className="panel-header">
        <div>
          <p className="eyebrow">
            {gamePhase === "waiting" && "地図画面（待機中）"}
            {gamePhase === "prep" && "地図画面（準備フェーズ）"}
            {gamePhase === "battle" && "地図画面（バトル中）"}
            {gamePhase === "result" && "地図画面（結果）"}
          </p>
          <h2>
            {gamePhase === "waiting" && "ゲームを始める"}
            {gamePhase === "prep" && `準備中 ${formatTime(prepRemaining)}`}
            {gamePhase === "battle" && `バトル中 ${formatTime(battleRemaining)}`}
            {gamePhase === "result" && "ゲーム終了"}
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
          <button
            type="button"
            className={isSpoofing ? "ghost-button active" : "ghost-button"}
            onClick={() => setIsSpoofing((prev) => !prev)}
            title="地図をクリックして現在地を変更するモード"
          >
            {isSpoofing ? "偽装 ON" : "偽装 OFF"}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={handleSimulateMovement}
          >
            歩行ティック
          </button>
        </div>
      </div>

      {gamePhase === "waiting" ? (
        <article className="feature-card">
          <strong>ゲーム開始</strong>
          <span>現在地を「家（本拠地）」として設定してゲームを開始します。</span>
          <button
            type="button"
            className="primary-button"
            onClick={handleStartGame}
            disabled={!currentPosition || isStartingGame}
          >
            {isStartingGame ? "開始中..." : "ゲーム開始"}
          </button>
        </article>
      ) : null}

      {gamePhase === "prep" ? (
        <>
          <article className="feature-card">
            <strong>準備フェーズ</strong>
            <span>
              残り時間: {formatTime(prepRemaining)} / BTC: {bitcoin}
            </span>
            <span className="muted">
              家の座標: {homeCoords ? `${homeCoords.lat.toFixed(5)}, ${homeCoords.lng.toFixed(5)}` : "未設定"}
            </span>
          </article>

          {selectedPlace ? (
            <article className="feature-card">
              <strong>{selectedPlace.name}</strong>
              <span>距離: {selectedPlace.distance}m</span>
              {!isCheckedIn ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleCheckIn}
                  disabled={!canCheckIn}
                >
                  {canCheckIn ? `チェックイン (+${CHECKIN_REWARD} BTC)` : "近づいてからチェックイン"}
                </button>
              ) : (
                <>
                  <span className="muted">チェックイン済み</span>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handlePlaceStructure}
                    disabled={!canPlaceStructure || isPlacingStructure}
                  >
                    {isPlacingStructure
                      ? "設置中..."
                      : isStructureDeployed
                        ? "設置済み"
                        : bitcoin < STRUCTURE_COST
                          ? `BTC不足 (必要: ${STRUCTURE_COST})`
                          : `防衛拠点設置 (-${STRUCTURE_COST} BTC)`}
                  </button>
                </>
              )}
            </article>
          ) : (
            <article className="feature-card">
              <strong>店を選択</strong>
              <span>地図上の店マーカーをタップして選択してください。</span>
            </article>
          )}
        </>
      ) : null}

      {gamePhase === "battle" ? (
        <article className="feature-card">
          <strong>バトルフェーズ</strong>
          <span>残り時間: {formatTime(battleRemaining)}</span>
          <span>家HP: {homeHp} / 100</span>
          <span>拠点数: {structures.length}</span>
          {structures.map((s) => (
            <span key={s.id} className="muted">
              {s.kind}: HP {s.hp}/{s.maxHp}
            </span>
          ))}
        </article>
      ) : null}

      <MapView
        viewport={viewport}
        nearbyPlaces={nearbyPlaces}
        selectedMarker={selectedMarker}
        placementPreview={placementPreview}
        onSelectMarker={setSelectedMarker}
        deployedStructures={deployedStructurePlaceIds}
        currentPosition={currentPosition}
        isSpoofing={isSpoofing}
        onSpoofedLocationSet={setSpoofedPosition}
        structures={structures}
        enemies={enemies}
        homeCoords={homeCoords}
      />

      {gamePhase === "prep" ? (
        <BottomActionPanel
          actions={[
            {
              label: "ゲームスタート",
              emphasis: "primary",
              onClick: handleStartBattle,
            },
          ]}
        />
      ) : null}

      {gpsError && !isSpoofing && (
        <article className="feature-card" style={{ borderLeft: "3px solid #ef4444" }}>
          <strong>位置情報エラー</strong>
          <span>{gpsError}</span>
          <span className="muted">
            Chromeのアドレスバー横の鍵アイコン →「位置情報」→「許可」に変更してページを再読み込みしてください。
            または「偽装 ON」にして地図をクリックすることで位置を手動設定できます。
          </span>
        </article>
      )}

      <p className="muted">
        {currentPosition
          ? `現在地: ${currentPosition.lat.toFixed(5)}, ${currentPosition.lng.toFixed(5)}${isSpoofing ? " (偽装中)" : ""}`
          : isSpoofing
            ? "地図をクリックして現在地を設定してください"
            : gpsError
              ? "位置情報が取得できていません（上記のエラーを確認）"
              : "GPS 取得中…"}
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
