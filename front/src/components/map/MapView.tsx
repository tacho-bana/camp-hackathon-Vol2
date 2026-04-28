import { useCallback, useEffect, useRef, useState } from "react";
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
import { EnemySprite } from "./EnemySprite";
import { PlaceMarker } from "./PlaceMarker";
import { ElectricTowerSprite } from "./tower/ElectricTowerSprite";
import { TalettSprite } from "./tower/TalettSprite";
import { FirewallSprite } from "./tower/FirewallSprite";

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const initialCenter = { lng: 139.7671, lat: 35.6812 };

type EnemyOverlayItem = {
  id: string;
  enemy: Enemy;
  x: number;
  y: number;
};

type TowerOverlayItem = {
  id: string;
  structure: Structure;
  x: number;
  y: number;
  aimingAngleRad: number;
  firing: boolean;
  wobble: number;
};

type BeamOverlayItem = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  polylinePoints: string;
};

type EnemyRoute = {
  waypoints: LatLng[];
};

function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function triangleWave(value: number): number {
  const wrapped = value - Math.floor(value);
  return 1 - 4 * Math.abs(wrapped - 0.5);
}

function sawtoothWave(value: number): number {
  const wrapped = value - Math.floor(value);
  return wrapped * 2 - 1;
}

function buildNormalTrianglePolyline(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  timeSec: number,
): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy);

  if (length < 1) {
    return `${fromX},${fromY} ${toX},${toY}`;
  }

  const tx = dx / length;
  const ty = dy / length;
  const nx = -ty;
  const ny = tx;

  const segments = 16;
  const freq = 5.5;
  const phase = timeSec * 4.6;
  const amplitude = Math.min(10, length * 0.08);
  const points: string[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const px = fromX + dx * t;
    const py = fromY + dy * t;
    const wave = triangleWave(t * freq + phase) * amplitude;
    points.push(`${px + nx * wave},${py + ny * wave}`);
  }

  return points.join(" ");
}

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
  onPlaceStructure,
  isPlacingStructure = false,
  onOpenSettings,
  pendingBack,
  onPendingBackChange,
  isFetchingRoutes = false,
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
  onPlaceStructure?: (type: "turret" | "wall") => void;
  isPlacingStructure?: boolean;
  onOpenSettings?: () => void;
  pendingBack: "toWaiting" | "toPrep" | null;
  onPendingBackChange: (v: "toWaiting" | "toPrep" | null) => void;
  isFetchingRoutes?: boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const currentPositionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const homeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const nearbyPlaceMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const hasAutocenteredRef = useRef(false);
  const currentPositionRef = useRef(currentPosition);
  const savedBearingRef = useRef(-12);
  const savedPitchRef = useRef(35);
  const [enemyOverlayItems, setEnemyOverlayItems] = useState<EnemyOverlayItem[]>([]);
  const [towerOverlayItems, setTowerOverlayItems] = useState<TowerOverlayItem[]>([]);
  const [beamOverlayItems, setBeamOverlayItems] = useState<BeamOverlayItem[]>([]);
  const [effectTimeSec, setEffectTimeSec] = useState(0);
  const [mapStatus, setMapStatus] = useState<
    "loading" | "ready" | "missing-token" | "error"
  >(mapboxToken ? "loading" : "missing-token");
  const [actualZoom, setActualZoom] = useState(13);
  const [isNorthLocked, setIsNorthLocked] = useState(false);
  const [pendingDeleteStructure, setPendingDeleteStructure] = useState<Structure | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<"turret" | "wall" | null>(null);

  // ── 地図初期化 ────────────────────────────────────────────────
  useEffect(() => {
    let rafId = 0;
    let mounted = true;
    const tick = (ms: number) => {
      if (!mounted) {
        return;
      }
      setEffectTimeSec(ms / 1000);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

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
      scrollZoom: false,
      boxZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      dragRotate: false,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true, showCompass: false }),
      "top-right",
    );

    map.on("zoom", () => setActualZoom(map.getZoom()));

    map.on("load", () => {
      setMapStatus("ready");
    });

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

  useEffect(() => {
    const aliveEnemies = enemies.filter((enemy) => enemy.state !== "dead");

    const buildFromMap = (map: mapboxgl.Map) => {
      const enemiesProjected = new Map<string, { x: number; y: number }>();
      aliveEnemies.forEach((enemy) => {
        const point = map.project([enemy.lng, enemy.lat]);
        enemiesProjected.set(enemy.id, { x: point.x, y: point.y });
      });

      setTowerOverlayItems(
        structures.map((structure, index) => {
          const point = map.project([structure.lng, structure.lat]);
          const inRange = aliveEnemies
            .map((enemy) => ({ enemy, d: distanceMeters(structure, enemy) }))
            .filter((entry) => entry.d <= structure.rangeM)
            .sort((a, b) => a.d - b.d);

          const target = inRange.length > 0 ? enemiesProjected.get(inRange[0].enemy.id) : null;
          const aimingAngleRad = target
            ? Math.atan2(target.y - point.y, target.x - point.x)
            : -Math.PI / 2;

          return {
            id: structure.id,
            structure,
            x: point.x,
            y: point.y,
            aimingAngleRad,
            firing: inRange.length > 0,
            wobble: sawtoothWave(effectTimeSec * 1.45 + index * 0.25) * 2.8,
          };
        }),
      );

      const beams: BeamOverlayItem[] = [];
      structures.forEach((structure) => {
        const from = map.project([structure.lng, structure.lat]);
        const sourceX = from.x;
        const sourceY = from.y - 56;

        aliveEnemies
          .map((enemy) => ({ enemy, d: distanceMeters(structure, enemy) }))
          .filter((entry) => entry.d <= structure.rangeM)
          .forEach((entry) => {
            const target = enemiesProjected.get(entry.enemy.id);
            if (!target) {
              return;
            }

            beams.push({
              id: `${structure.id}-${entry.enemy.id}`,
              fromX: sourceX,
              fromY: sourceY,
              toX: target.x,
              toY: target.y - 34,
              polylinePoints: buildNormalTrianglePolyline(
                sourceX,
                sourceY,
                target.x,
                target.y - 34,
                effectTimeSec,
              ),
            });
          });
      });

      setBeamOverlayItems(beams);
    };

    if (!mapRef.current || mapStatus !== "ready") {
      setTowerOverlayItems(
        structures.map((structure, index) => ({
          id: structure.id,
          structure,
          x: 180 + (index % 3) * 140,
          y: 370 + Math.floor(index / 3) * 110,
          aimingAngleRad: -Math.PI / 2,
          firing: false,
          wobble: sawtoothWave(effectTimeSec * 1.25 + index * 0.2) * 2,
        })),
      );
      setBeamOverlayItems([]);
      return;
    }

    buildFromMap(mapRef.current);
  }, [effectTimeSec, enemies, structures, mapStatus]);

  // currentPosition を ref に同期
  useEffect(() => { currentPositionRef.current = currentPosition; }, [currentPosition]);

  // ── 集計 ─────────────────────────────────────────────────────
  const deadCount = enemies.filter((e) => e.state === "dead").length;

  const handleFlyToCurrentPosition = useCallback(() => {
    const pos = currentPositionRef.current;
    if (!mapRef.current || !pos) return;
    mapRef.current.flyTo({ center: [pos.lng, pos.lat], zoom: 15, duration: 800 });
  }, []);

  // ── レンダー ──────────────────────────────────────────────────
  const handleCompassToggle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!isNorthLocked) {
      savedBearingRef.current = map.getBearing();
      savedPitchRef.current = map.getPitch();
      map.easeTo({ bearing: 0, pitch: 0, duration: 300 });
      setIsNorthLocked(true);
    } else {
      map.easeTo({ bearing: savedBearingRef.current, pitch: savedPitchRef.current, duration: 300 });
      setIsNorthLocked(false);
    }
  }, [isNorthLocked]);

  return (
    <section className="map-view">
      <div className="map-canvas">
        <div ref={mapContainerRef} className="mapbox-container" />

        <svg className="tower-laser-layer" aria-hidden="true">
          {beamOverlayItems.map((beam) => (
            <g key={beam.id}>
              <line
                className="tower-laser-main"
                x1={beam.fromX}
                y1={beam.fromY}
                x2={beam.toX}
                y2={beam.toY}
              />
              <polyline className="tower-laser-wave" points={beam.polylinePoints} />
            </g>
          ))}
        </svg>

        <div className="tower-overlay-layer" aria-hidden="true">
          {towerOverlayItems.map((item) => {
            const kind = item.structure?.kind;

            let SpriteComponent = ElectricTowerSprite;
            if (kind === "turret") {
              SpriteComponent = TalettSprite;
            } else if (kind === "wall") {
              SpriteComponent = FirewallSprite;
            }

            return (
              <div
                key={item.id}
                className="tower-overlay-item"
                style={{ left: item.x - 52, top: item.y - 130, cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDeleteStructure(item.structure);
                }}
              >
                <SpriteComponent
                  aimingAngleRad={item.aimingAngleRad}
                  firing={item.firing}
                  wobble={item.wobble}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="map-compass-toggle"
          onClick={handleCompassToggle}
          aria-label={isNorthLocked ? "ベアリングを元に戻す" : "北を上に固定"}
          style={{
            position: "absolute",
            top: 78,
            right: 10,
            zIndex: 3,
            width: 29,
            height: 29,
            borderRadius: 4,
            border: "none",
            background: isNorthLocked ? "#38bdf8" : "rgba(15,23,42,0.9)",
            color: isNorthLocked ? "#07111b" : "#d7e0ea",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 1px rgba(148,163,184,0.2)",
          }}
        >
          N
        </button>

        {/* 現在地に戻るボタン */}
        <button
          type="button"
          aria-label="現在地に戻る"
          onClick={handleFlyToCurrentPosition}
          style={{
            position: "absolute",
            top: 113,
            right: 10,
            zIndex: 3,
            width: 29,
            height: 29,
            borderRadius: 4,
            border: "none",
            background: "rgba(15,23,42,0.9)",
            color: "#d7e0ea",
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 1px rgba(148,163,184,0.2)",
          }}
        >
          ◎
        </button>

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

        <div className="map-overlay map-overlay-top">
          <span>
            表示範囲: {viewport.x}, {viewport.y}
          </span>
          <span>ズーム: {actualZoom.toFixed(1)}x</span>
        </div>

        <div className="map-layer-stack">

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

        {placementPreview ? (
          <div className="placement-preview">
            プレビュー {placementPreview.kind} @ {placementPreview.x},
            {placementPreview.y}
          </div>
        ) : null}

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
              {gamePhase === "prep" && "準備中"}
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
            {gamePhase === "prep" && enemies.length > 0 && (
              <span style={{ fontSize: "0.82rem", color: "#9aa9bc" }}>
                敵 {enemies.length} 体が侵攻予定
              </span>
            )}
            {(gamePhase === "battle" || gamePhase === "result") && (
              <span>
                敵 {deadCount}/{enemies.length} 撃破
              </span>
            )}
            {gamePhase === "prep" && isFetchingRoutes && (
              <span style={{ fontSize: "0.78rem", color: "#9aa9bc" }}>
                🗺 ルート取得中...
              </span>
            )}
            {gamePhase === "prep" && !isFetchingRoutes && enemyRoutes.length > 0 && (
              <span style={{ fontSize: "0.78rem", color: "#9aa9bc" }}>
                🗺 ルート表示中
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

        {/* 設定ボタン（左下・常時） */}
        {onOpenSettings && (
          <button
            type="button"
            className="map-settings-btn"
            aria-label="設定"
            onClick={onOpenSettings}
          >
            ⚙
          </button>
        )}

        {/* 戻るボタン（アイコンのみ） */}
        {gamePhase === "prep" && onReturnToWaiting && (
          <button
            type="button"
            className="map-back-btn"
            aria-label="開始前に戻る"
            onClick={() => onPendingBackChange("toWaiting")}
          >
            ←
          </button>
        )}

        {/* 施設配置ボタン（prep フェーズ・左下） */}
        {gamePhase === "prep" && onPlaceStructure && (
          <>
            <button
              type="button"
              className="map-place-btn map-place-btn--wall"
              aria-label="壁を設置"
              onClick={() => setPendingPlacement("wall")}
            >
              🧱
            </button>
            <button
              type="button"
              className="map-place-btn map-place-btn--turret"
              aria-label="タレットを設置"
              onClick={() => setPendingPlacement("turret")}
            >
              🔫
            </button>
          </>
        )}

        {/* 施設配置確認ダイアログ */}
        {pendingPlacement && (
          <div className="map-back-confirm-overlay">
            <div className="map-back-confirm-card">
              <p className="map-back-confirm-msg">
                {pendingPlacement === "turret"
                  ? "🔫 タレット\n射程80m・近くの敵を自動攻撃します。\n-100 BTC"
                  : "🧱 壁\n射程35m・範囲内の敵を減速させます。\n-50 BTC"}
              </p>
              {!currentPosition && (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#f87171" }}>
                  GPS 取得中...
                </p>
              )}
              {currentPosition && bitcoin < (pendingPlacement === "turret" ? 100 : 50) && (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#f87171" }}>
                  BTC 不足（必要: {pendingPlacement === "turret" ? 100 : 50} BTC）
                </p>
              )}
              <div className="map-back-confirm-actions">
                <button
                  type="button"
                  className="map-back-confirm-btn map-back-confirm-btn--cancel"
                  onClick={() => setPendingPlacement(null)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="map-back-confirm-btn map-back-confirm-btn--ok"
                  disabled={
                    !currentPosition ||
                    isPlacingStructure ||
                    bitcoin < (pendingPlacement === "turret" ? 100 : 50)
                  }
                  onClick={() => {
                    onPlaceStructure?.(pendingPlacement);
                    setPendingPlacement(null);
                  }}
                >
                  {isPlacingStructure ? "設置中..." : "現在地に配置"}
                </button>
              </div>
            </div>
          </div>
        )}
        {gamePhase === "battle" && onReturnToPrep && (
          <button
            type="button"
            className="map-back-btn map-back-btn--battle"
            aria-label="準備に戻る"
            onClick={() => onPendingBackChange("toPrep")}
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
                  : "ゲーム開始前に戻りますか？\n施設は削除されます。"}
              </p>
              <div className="map-back-confirm-actions">
                <button
                  type="button"
                  className="map-back-confirm-btn map-back-confirm-btn--cancel"
                  onClick={() => onPendingBackChange(null)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="map-back-confirm-btn map-back-confirm-btn--ok"
                  onClick={() => {
                    onPendingBackChange(null);
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
