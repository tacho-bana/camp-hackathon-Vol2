import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type {
  Enemy,
  GamePhase,
  LatLng,
  MapViewport,
  NearbyPlace,
  PlacementPreview,
  Structure,
} from "../../types/game";
import { BaseMarker } from "./BaseMarker";
import { EnemyLayer } from "./EnemyLayer";
import { EnemySprite } from "./EnemySprite";
import { PlaceMarker } from "./PlaceMarker";
import { StructureLayer } from "./StructureLayer";

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const initialCenter = { lng: 139.7671, lat: 35.6812 };

type EnemyOverlayItem = {
  id: string;
  enemy: Enemy;
  x: number;
  y: number;
};

type EnemyRoute = {
  waypoints: LatLng[];
};

/** 中心点から半径 R メートルの円を GeoJSON polygon 座標列で近似する */
function circleCoords(
  center: LatLng,
  radiusM: number,
  steps = 48,
): [number, number][] {
  const latRad = (center.lat * Math.PI) / 180;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dlat = (radiusM / 111_000) * Math.cos(angle);
    const dlng = (radiusM / (111_000 * Math.cos(latRad))) * Math.sin(angle);
    coords.push([center.lng + dlng, center.lat + dlat]);
  }
  return coords;
}

export function MapView({
  viewport,
  nearbyPlaces,
  selectedMarker,
  placementPreview,
  onSelectMarker,
  deployedStructures,
  currentPosition,
  isSpoofing,
  onSpoofedLocationSet,
  structures,
  enemies,
  homeCoords,
  gamePhase,
  bitcoin,
  homeHp,
  prepRemaining,
  battleRemaining,
  currentPositionLabel,
  enemyRoutes,
  onStartBattle,
  isStartingBattle,
  hasBuff,
  gameResult,
  hitEnemyIds,
  onPlayAgain,
  onReturnToPrep,
  onReturnToWaiting,
  onDeleteStructure,
}: {
  viewport: MapViewport;
  nearbyPlaces: NearbyPlace[];
  selectedMarker: string | null;
  placementPreview: PlacementPreview | null;
  onSelectMarker: (id: string) => void;
  deployedStructures: string[];
  currentPosition: LatLng | null;
  isSpoofing: boolean;
  onSpoofedLocationSet: (coords: LatLng) => void;
  structures: Structure[];
  enemies: Enemy[];
  homeCoords: LatLng | null;
  gamePhase: GamePhase;
  bitcoin: number;
  homeHp: number;
  prepRemaining: number;
  battleRemaining: number;
  currentPositionLabel: string;
  enemyRoutes: EnemyRoute[];
  onStartBattle?: () => void;
  isStartingBattle?: boolean;
  hasBuff: boolean;
  gameResult: "win" | "lose" | null;
  hitEnemyIds: Set<string>;
  onPlayAgain: () => void;
  onReturnToPrep?: () => void;
  onReturnToWaiting?: () => void;
  onDeleteStructure?: (id: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const currentPositionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const homeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const nearbyPlaceMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const structureMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const hasAutocenteredRef = useRef(false);
  const [enemyOverlayItems, setEnemyOverlayItems] = useState<EnemyOverlayItem[]>([]);
  const [mapStatus, setMapStatus] = useState<
    "loading" | "ready" | "missing-token" | "error"
  >(mapboxToken ? "loading" : "missing-token");
  const [pendingBack, setPendingBack] = useState<"toWaiting" | "toPrep" | null>(null);
  const [pendingDeleteStructure, setPendingDeleteStructure] = useState<Structure | null>(null);

  // ── 地図初期化 ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 13,
      pitch: 35,
      bearing: -12,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    map.on("load", () => setMapStatus("ready"));
    map.on("error", (e) => {
      console.error("[MapView]", e.error);
      setMapStatus("error");
    });
    mapRef.current = map;

    return () => {
      currentPositionMarkerRef.current?.remove();
      currentPositionMarkerRef.current = null;
      homeMarkerRef.current?.remove();
      homeMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── 敵ルートライン ────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") return;
    const map = mapRef.current;

    const data = {
      type: "FeatureCollection" as const,
      features: enemyRoutes.map((route, i) => ({
        type: "Feature" as const,
        id: i,
        geometry: {
          type: "LineString" as const,
          coordinates: route.waypoints.map((p) => [p.lng, p.lat]),
        },
        properties: {},
      })),
    };

    if (map.getSource("enemy-routes")) {
      (map.getSource("enemy-routes") as mapboxgl.GeoJSONSource).setData(data);
    } else {
      map.addSource("enemy-routes", { type: "geojson", data });
      map.addLayer({
        id: "enemy-routes-glow",
        type: "line",
        source: "enemy-routes",
        paint: {
          "line-color": "#f97316",
          "line-width": 8,
          "line-opacity": 0.18,
          "line-blur": 6,
        },
      });
      map.addLayer({
        id: "enemy-routes-dash",
        type: "line",
        source: "enemy-routes",
        paint: {
          "line-color": "#ef4444",
          "line-width": 2.5,
          "line-dasharray": [4, 4],
          "line-opacity": 0.85,
        },
      });
    }
  }, [enemyRoutes, mapStatus]);

  // ── 構造物の射程サークル ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") return;
    const map = mapRef.current;

    const features = structures.map((s) => ({
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [circleCoords({ lat: s.lat, lng: s.lng }, s.rangeM)],
      },
      properties: {
        color: s.kind === "turret" ? "#f97316" : "#60a5fa",
      },
    }));
    const data = { type: "FeatureCollection" as const, features };

    if (map.getSource("structure-ranges")) {
      (map.getSource("structure-ranges") as mapboxgl.GeoJSONSource).setData(data);
    } else {
      map.addSource("structure-ranges", { type: "geojson", data });
      map.addLayer({
        id: "structure-ranges-fill",
        type: "fill",
        source: "structure-ranges",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.1,
        },
      });
      map.addLayer({
        id: "structure-ranges-border",
        type: "line",
        source: "structure-ranges",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.5,
          "line-dasharray": [3, 3],
        },
      });
    }
  }, [structures, mapStatus]);

  // ── 近隣場所マーカー ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") return;

    nearbyPlaces.forEach((place) => {
      const isConbini = place.kind === "convenience-store";
      const marker = new mapboxgl.Marker({
        color: isConbini ? "#f59e0b" : "#22c55e",
      })
        .setLngLat([place.lng, place.lat])
        .setPopup(
          (() => {
            const el = document.createElement("div");
            const strong = document.createElement("strong");
            strong.textContent = place.name;
            el.append(strong, document.createElement("br"));
            el.append(
              document.createTextNode(
                `${isConbini ? "🏪 コンビニ" : place.kind}  ${place.distance}m`,
              ),
            );
            if (isConbini) {
              const buff = document.createElement("div");
              buff.style.cssText =
                "color:#fbbf24;font-size:0.85rem;margin-top:4px";
              buff.textContent = "⚡ 50m以内でバフ取得";
              el.append(buff);
            }
            return new mapboxgl.Popup({ offset: 20 }).setDOMContent(el);
          })(),
        )
        .addTo(mapRef.current!);
      nearbyPlaceMarkersRef.current.push(marker);
    });

    return () => {
      nearbyPlaceMarkersRef.current.forEach((m) => m.remove());
      nearbyPlaceMarkersRef.current = [];
    };
  }, [nearbyPlaces, mapStatus]);

  // ── ビューポート同期 ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapboxToken || mapStatus !== "ready") return;
    mapRef.current.setCenter([
      initialCenter.lng + viewport.x * 0.001,
      initialCenter.lat + viewport.y * 0.001,
    ]);
    mapRef.current.setZoom(Math.max(12, Math.min(16, viewport.zoom * 2 + 10)));
  }, [viewport, mapStatus]);

  // ── 現在地マーカー ────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready" || !currentPosition) return;

    if (!currentPositionMarkerRef.current) {
      currentPositionMarkerRef.current = new mapboxgl.Marker({ color: "#3b82f6" })
        .setLngLat([currentPosition.lng, currentPosition.lat])
        .addTo(mapRef.current);
    } else {
      currentPositionMarkerRef.current.setLngLat([
        currentPosition.lng,
        currentPosition.lat,
      ]);
    }

    if (!hasAutocenteredRef.current) {
      hasAutocenteredRef.current = true;
      mapRef.current.flyTo({
        center: [currentPosition.lng, currentPosition.lat],
        zoom: 15,
        duration: 1200,
      });
    }
  }, [currentPosition, mapStatus]);

  // ── 本拠地マーカー ────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") return;

    if (!homeCoords) {
      homeMarkerRef.current?.remove();
      homeMarkerRef.current = null;
      return;
    }

    if (!homeMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:36px;height:36px;background:#fbbf24;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(0,0,0,0.6);cursor:default;";
      el.textContent = "🏠";
      homeMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([homeCoords.lng, homeCoords.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 20 }).setHTML(
            "<strong>本拠地</strong><br>ここを守り切れ！",
          ),
        )
        .addTo(mapRef.current);
    } else {
      homeMarkerRef.current.setLngLat([homeCoords.lng, homeCoords.lat]);
    }
  }, [homeCoords, mapStatus]);

  // ── 位置偽装 ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") return;
    const canvas = mapRef.current.getCanvas();
    canvas.style.cursor = isSpoofing ? "crosshair" : "";

    if (!isSpoofing) return () => { canvas.style.cursor = ""; };

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      onSpoofedLocationSet({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    mapRef.current.on("click", handleClick);
    return () => {
      mapRef.current?.off("click", handleClick);
      canvas.style.cursor = "";
    };
  }, [isSpoofing, onSpoofedLocationSet, mapStatus]);

  // ── 構造物マーカー ────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") return;

    const currentIds = new Set(structures.map((s) => s.id));
    for (const [id, marker] of structureMarkersRef.current.entries()) {
      if (!currentIds.has(id)) {
        marker.remove();
        structureMarkersRef.current.delete(id);
      }
    }
    for (const structure of structures) {
      if (!structureMarkersRef.current.has(structure.id)) {
        const isTurret = structure.kind === "turret";
        const el = document.createElement("div");
        el.style.cssText = `
          width:32px;height:32px;
          background:${isTurret ? "#f97316" : "#60a5fa"};
          border:2.5px solid #fff;
          border-radius:${isTurret ? "8px" : "50%"};
          display:flex;align-items:center;justify-content:center;
          font-size:16px;
          box-shadow:0 2px 8px rgba(0,0,0,0.55);
          cursor:pointer;
        `;
        el.textContent = isTurret ? "🔫" : "🧱";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setPendingDeleteStructure(structure);
        });
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([structure.lng, structure.lat])
          .addTo(mapRef.current!);
        structureMarkersRef.current.set(structure.id, marker);
      }
    }
  }, [structures, mapStatus]);

  // ── 敵オーバーレイ位置計算 ────────────────────────────────────
  useEffect(() => {
    const aliveEnemies = enemies.filter((e) => e.state !== "dead");

    if (!mapRef.current || mapStatus !== "ready") {
      setEnemyOverlayItems(
        aliveEnemies.map((enemy, index) => ({
          id: enemy.id,
          enemy,
          x: 120 + (index % 3) * 92,
          y: 160 + Math.floor(index / 3) * 96,
        })),
      );
      return;
    }

    const map = mapRef.current;
    const update = () => {
      setEnemyOverlayItems(
        aliveEnemies.map((enemy) => {
          const point = map.project([enemy.lng, enemy.lat]);
          return { id: enemy.id, enemy, x: point.x, y: point.y };
        }),
      );
    };

    update();
    map.on("move", update);
    map.on("zoom", update);
    map.on("resize", update);
    return () => {
      map.off("move", update);
      map.off("zoom", update);
      map.off("resize", update);
    };
  }, [enemies, mapStatus]);

  // ── 集計 ─────────────────────────────────────────────────────
  const deadCount = enemies.filter((e) => e.state === "dead").length;

  // ── レンダー ──────────────────────────────────────────────────
  return (
    <section className="map-view">
      <div className="map-canvas">
        <div ref={mapContainerRef} className="mapbox-container" />

        {/* 敵スプライトオーバーレイ */}
        <div className="enemy-overlay-layer" aria-hidden="true">
          {enemyOverlayItems.map((item) => (
            <div
              key={item.id}
              className={`enemy-overlay-item${hitEnemyIds.has(item.id) ? " enemy-hit" : ""}`}
              style={{ left: item.x - 32, top: item.y - 70 }}
            >
              <EnemySprite enemy={item.enemy} />
            </div>
          ))}
        </div>

        {/* ステータスカード（左上） */}
        {mapStatus !== "ready" ? (
          <div className="map-status-card">
            <strong>地図読み込み中</strong>
            <span>
              {mapStatus === "missing-token"
                ? "VITE_MAPBOX_ACCESS_TOKEN が未設定です。"
                : mapStatus === "error"
                  ? "地図の読み込みに失敗しました。"
                  : "Mapbox を初期化しています。"}
            </span>
          </div>
        ) : (
          <div className="map-status-card">
            <strong>
              {gamePhase === "waiting" && "待機中"}
              {gamePhase === "prep" &&
                `準備 ${Math.floor(prepRemaining / 60)}:${String(prepRemaining % 60).padStart(2, "0")}`}
              {gamePhase === "battle" &&
                `⚔ ${Math.floor(battleRemaining / 60)}:${String(battleRemaining % 60).padStart(2, "0")}`}
              {gamePhase === "result" &&
                (gameResult === "win" ? "🎉 VICTORY!" : "💀 DEFEAT...")}
            </strong>
            <span>
              BTC {bitcoin} / HP{" "}
              <span
                style={{
                  color:
                    homeHp > 60
                      ? "#86efac"
                      : homeHp > 30
                        ? "#fbbf24"
                        : "#f87171",
                  fontWeight: 700,
                }}
              >
                {homeHp}
              </span>
              /100
            </span>
            {(gamePhase === "battle" || gamePhase === "result") && (
              <span>
                敵 {deadCount}/{enemies.length} 撃破
              </span>
            )}
            <span style={{ fontSize: "0.78rem", color: "#7dd3fc" }}>
              {currentPositionLabel}
            </span>
          </div>
        )}

        {/* コンビニバフインジケーター */}
        {hasBuff && (
          <div className="map-buff-indicator">⚡ コンビニバフ発動中</div>
        )}

        {/* ゲームスタートボタン（prep フェーズのみ） */}
        {gamePhase === "prep" && onStartBattle && (
          <button
            type="button"
            className="map-start-battle-btn"
            onClick={onStartBattle}
            disabled={isStartingBattle}
          >
            {isStartingBattle ? "開始中..." : "⚔ ゲームスタート"}
          </button>
        )}

        {/* 戻るボタン（アイコンのみ） */}
        {gamePhase === "prep" && onReturnToWaiting && (
          <button
            type="button"
            className="map-back-btn"
            aria-label="開始前に戻る"
            onClick={() => setPendingBack("toWaiting")}
          >
            ←
          </button>
        )}
        {gamePhase === "battle" && onReturnToPrep && (
          <button
            type="button"
            className="map-back-btn map-back-btn--battle"
            aria-label="準備に戻る"
            onClick={() => setPendingBack("toPrep")}
          >
            ⏸
          </button>
        )}

        {/* 施設削除確認ダイアログ */}
        {pendingDeleteStructure && (
          <div className="map-back-confirm-overlay">
            <div className="map-back-confirm-card">
              <p className="map-back-confirm-msg">
                {pendingDeleteStructure.kind === "turret" ? "🔫 タレット" : "🧱 壁"}を削除しますか？
              </p>
              <div className="map-back-confirm-actions">
                <button
                  type="button"
                  className="map-back-confirm-btn map-back-confirm-btn--cancel"
                  onClick={() => setPendingDeleteStructure(null)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="map-back-confirm-btn map-back-confirm-btn--ok"
                  onClick={() => {
                    onDeleteStructure?.(pendingDeleteStructure.id);
                    setPendingDeleteStructure(null);
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 戻る確認ダイアログ */}
        {pendingBack && (
          <div className="map-back-confirm-overlay">
            <div className="map-back-confirm-card">
              <p className="map-back-confirm-msg">
                {pendingBack === "toPrep"
                  ? "準備フェーズに戻りますか？\n敵は初期位置に戻ります。施設はそのまま残ります。"
                  : "ゲーム開始前に戻りますか？\n施設はそのまま残ります。"}
              </p>
              <div className="map-back-confirm-actions">
                <button
                  type="button"
                  className="map-back-confirm-btn map-back-confirm-btn--cancel"
                  onClick={() => setPendingBack(null)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="map-back-confirm-btn map-back-confirm-btn--ok"
                  onClick={() => {
                    setPendingBack(null);
                    if (pendingBack === "toPrep") onReturnToPrep?.();
                    else onReturnToWaiting?.();
                  }}
                >
                  戻る
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 勝敗リザルトオーバーレイ */}
        {gamePhase === "result" && (
          <div
            className={`battle-result-overlay ${
              gameResult === "win" ? "result-victory" : "result-defeat"
            }`}
          >
            <div className="battle-result-card">
              <div className="result-icon">
                {gameResult === "win" ? "🎉" : "💀"}
              </div>
              <h2 className="result-title">
                {gameResult === "win" ? "VICTORY!" : "DEFEAT..."}
              </h2>
              <p style={{ margin: 0, color: "#9aa9bc" }}>
                {gameResult === "win"
                  ? "拠点を守り切った！"
                  : "拠点が陥落した..."}
              </p>
              <div className="result-stats">
                <span>
                  残り HP:{" "}
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
                  敵撃破: {deadCount} / {enemies.length} 体
                </span>
                <span>設置施設: {structures.length} 基</span>
              </div>
              <button
                type="button"
                className="primary-button"
                style={{ justifySelf: "center", padding: "12px 32px" }}
                onClick={onPlayAgain}
              >
                もう一度プレイ
              </button>
            </div>
          </div>
        )}

        {/* レガシー: Mapbox 非使用時のフォールバック */}
        {mapStatus !== "ready" && (
          <div className="map-layer-stack">
            <BaseMarker label="拠点コア" active={selectedMarker === "base-core"} />
            <StructureLayer structures={structures} />
            <EnemyLayer enemies={enemies} />
            <div className="map-place-list">
              {nearbyPlaces.map((place) => (
                <PlaceMarker
                  key={place.id}
                  place={place}
                  selected={selectedMarker === place.id}
                  deployed={deployedStructures.includes(place.id)}
                  onClick={() => onSelectMarker(place.id)}
                />
              ))}
            </div>
          </div>
        )}

        {placementPreview && (
          <div className="placement-preview">
            プレビュー {placementPreview.kind} @ {placementPreview.x},{placementPreview.y}
          </div>
        )}
      </div>
    </section>
  );
}
