import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type {
  Enemy,
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
import { ElectricTowerSprite } from "./tower/ElectricTowerSprite";
import { TalettSprite } from "./tower/TalettSprite";
import { FirewallSprite } from "./tower/FirewallSprite";

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const initialCenter = {
  lng: 139.7671,
  lat: 35.6812,
};

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
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const currentPositionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const homeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const nearbyPlaceMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const hasAutocenteredRef = useRef(false);
  const [enemyOverlayItems, setEnemyOverlayItems] = useState<EnemyOverlayItem[]>(
    [],
  );
  const [towerOverlayItems, setTowerOverlayItems] = useState<TowerOverlayItem[]>(
    [],
  );
  const [beamOverlayItems, setBeamOverlayItems] = useState<BeamOverlayItem[]>([]);
  const [effectTimeSec, setEffectTimeSec] = useState(0);
  const [mapStatus, setMapStatus] = useState<
    "loading" | "ready" | "missing-token" | "error"
  >(mapboxToken ? "loading" : "missing-token");

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
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) {
      return;
    }

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

  // nearbyPlaces マーカーを差分管理（地図インスタンスとは別 useEffect）
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") {
      return;
    }

    nearbyPlaces.forEach((place) => {
      const marker = new mapboxgl.Marker({
        color: place.kind === "electronics-shop" ? "#22c55e" : "#f59e0b",
      })
        .setLngLat([place.lng, place.lat])
        .setPopup((() => {
          const el = document.createElement("div");
          const strong = document.createElement("strong");
          strong.textContent = place.name;
          const meta = document.createTextNode(` ${place.kind}  距離 ${place.distance}m`);
          el.append(strong, document.createElement("br"), meta);
          return new mapboxgl.Popup({ offset: 20 }).setDOMContent(el);
        })())
        .addTo(mapRef.current!);

      nearbyPlaceMarkersRef.current.push(marker);
    });

    return () => {
      nearbyPlaceMarkersRef.current.forEach((m) => m.remove());
      nearbyPlaceMarkersRef.current = [];
    };
  }, [nearbyPlaces, mapStatus]);

  useEffect(() => {
    if (!mapRef.current || !mapboxToken || mapStatus !== "ready") {
      return;
    }

    mapRef.current.setCenter([
      initialCenter.lng + viewport.x * 0.001,
      initialCenter.lat + viewport.y * 0.001,
    ]);
    mapRef.current.setZoom(Math.max(12, Math.min(16, viewport.zoom * 2 + 10)));
  }, [viewport, mapStatus]);

  // 現在地マーカーの表示・更新、初回取得時に地図を中心に移動
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready" || !currentPosition) {
      return;
    }

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

  // 本拠地マーカー（homeCoords が設定されたら表示）
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
        "width:30px;height:30px;background:#fbbf24;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.6);cursor:default;";
      el.textContent = "🏠";
      homeMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([homeCoords.lng, homeCoords.lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML("<strong>本拠地</strong>"))
        .addTo(mapRef.current);
    } else {
      homeMarkerRef.current.setLngLat([homeCoords.lng, homeCoords.lat]);
    }
  }, [homeCoords, mapStatus]);

  // 位置偽装モード: 地図クリックで現在地をセット
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") {
      return;
    }

    const canvas = mapRef.current.getCanvas();
    canvas.style.cursor = isSpoofing ? "crosshair" : "";

    if (!isSpoofing) {
      return () => {
        canvas.style.cursor = "";
      };
    }

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      onSpoofedLocationSet({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };

    mapRef.current.on("click", handleClick);
    return () => {
      mapRef.current?.off("click", handleClick);
      canvas.style.cursor = "";
    };
  }, [isSpoofing, onSpoofedLocationSet, mapStatus]);

  useEffect(() => {
    const aliveEnemies = enemies.filter((enemy) => enemy.state !== "dead");

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

    const updateOverlayPositions = () => {
      setEnemyOverlayItems(
        aliveEnemies.map((enemy) => {
          const point = map.project([enemy.lng, enemy.lat]);
          return {
            id: enemy.id,
            enemy,
            x: point.x,
            y: point.y,
          };
        }),
      );
    };

    updateOverlayPositions();
    map.on("move", updateOverlayPositions);
    map.on("zoom", updateOverlayPositions);
    map.on("resize", updateOverlayPositions);

    return () => {
      map.off("move", updateOverlayPositions);
      map.off("zoom", updateOverlayPositions);
      map.off("resize", updateOverlayPositions);
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
                style={{ left: item.x - 52, top: item.y - 130 }}
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

        <div className="enemy-overlay-layer" aria-hidden="true">
          {enemyOverlayItems.map((item) => (
            <div
              key={item.id}
              className="enemy-overlay-item"
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
          <span>ズーム: {viewport.zoom.toFixed(1)}x</span>
        </div>

        <div className="map-layer-stack">
          <BaseMarker
            label="拠点コア"
            active={selectedMarker === "base-core"}
          />
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
                  ? "地図の読み込みに失敗しました。トークンとネットワークを確認してください。"
                  : "Mapbox を初期化しています。"}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
