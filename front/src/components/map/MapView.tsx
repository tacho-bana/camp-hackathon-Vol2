import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import p5 from "p5";
import {
  computeEnemyFrame,
  drawEnemy,
  transitionEnemyState,
  type EnemyKind,
  type EnemyModel,
} from "../../features/enemy";
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
import { PlaceMarker } from "./PlaceMarker";
import { StructureLayer } from "./StructureLayer";

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const initialCenter = {
  lng: 139.7671,
  lat: 35.6812,
};

const enemyKinds: EnemyKind[] = ["triangle", "circle", "house", "worm"];

type EnemyMarkerEntry = {
  marker: mapboxgl.Marker;
  sketch: p5;
  model: EnemyModel;
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function resolveEnemyKind(enemyId: string): EnemyKind {
  return enemyKinds[hashString(enemyId) % enemyKinds.length];
}

function resolveFacing(enemyId: string): 1 | -1 {
  return hashString(enemyId) % 2 === 0 ? 1 : -1;
}

function createEnemyMarkerEntry(map: mapboxgl.Map, enemy: Enemy): EnemyMarkerEntry {
  const root = document.createElement("div");
  root.className = "map-enemy-marker";

  const model: EnemyModel = {
    id: `map-enemy-${enemy.id}`,
    kind: resolveEnemyKind(enemy.id),
    x: 28,
    y: 28,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    phase: enemy.state === "dead" ? "dead" : "alive",
    animState: "idle",
    facing: resolveFacing(enemy.id),
  };

  const sketch = new p5((s: p5) => {
    s.setup = () => {
      const canvas = s.createCanvas(56, 56);
      canvas.style("pointer-events", "none");
    };

    s.draw = () => {
      s.clear();

      if (model.phase === "alive") {
        if (s.frameCount % 180 === 0) {
          Object.assign(model, transitionEnemyState(model, "attack"));
        } else if (s.frameCount % 120 === 0) {
          Object.assign(model, transitionEnemyState(model, "walk"));
        } else if (s.frameCount % 60 === 0) {
          Object.assign(model, transitionEnemyState(model, "idle"));
        }
      }

      const frame = computeEnemyFrame(model, {
        timeSec: s.millis() / 1000,
        deltaSec: s.deltaTime / 1000,
      });

      drawEnemy(s, model, frame);
    };
  }, root);

  const marker = new mapboxgl.Marker({ element: root, anchor: "bottom" })
    .setLngLat([enemy.lng, enemy.lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 20 }).setHTML(
        `<strong>敵</strong><br/>HP: ${enemy.hp}/${enemy.maxHp}`,
      ),
    )
    .addTo(map);

  return { marker, sketch, model };
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
  const structureMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const enemyMarkersRef = useRef<Map<string, EnemyMarkerEntry>>(new Map());
  const hasAutocenteredRef = useRef(false);
  const [mapStatus, setMapStatus] = useState<
    "loading" | "ready" | "missing-token" | "error"
  >(mapboxToken ? "loading" : "missing-token");

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
      enemyMarkersRef.current.forEach((entry) => {
        entry.marker.remove();
        entry.sketch.remove();
      });
      enemyMarkersRef.current.clear();
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

  // 構造物マーカーの差分管理
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") {
      return;
    }

    const currentIds = new Set(structures.map((s) => s.id));
    // 削除
    for (const [id, marker] of structureMarkersRef.current.entries()) {
      if (!currentIds.has(id)) {
        marker.remove();
        structureMarkersRef.current.delete(id);
      }
    }
    // 追加・更新
    for (const structure of structures) {
      if (!structureMarkersRef.current.has(structure.id)) {
        const marker = new mapboxgl.Marker({ color: "#f97316" })
          .setLngLat([structure.lng, structure.lat])
          .setPopup((() => {
            const el = document.createElement("div");
            const strong = document.createElement("strong");
            strong.textContent = structure.kind;
            el.append(strong, document.createElement("br"), `HP: ${structure.hp}/${structure.maxHp}`);
            return new mapboxgl.Popup({ offset: 20 }).setDOMContent(el);
          })())
          .addTo(mapRef.current!);
        structureMarkersRef.current.set(structure.id, marker);
      } else {
        structureMarkersRef.current
          .get(structure.id)!
          .setLngLat([structure.lng, structure.lat]);
      }
    }
  }, [structures, mapStatus]);

  // 敵マーカーの差分管理
  useEffect(() => {
    if (!mapRef.current || mapStatus !== "ready") {
      return;
    }

    const currentIds = new Set(enemies.map((e) => e.id));
    // 削除
    for (const [id, entry] of enemyMarkersRef.current.entries()) {
      if (!currentIds.has(id)) {
        entry.marker.remove();
        entry.sketch.remove();
        enemyMarkersRef.current.delete(id);
      }
    }
    // 追加・更新
    for (const enemy of enemies) {
      if (enemy.state === "dead") {
        if (enemyMarkersRef.current.has(enemy.id)) {
          const entry = enemyMarkersRef.current.get(enemy.id)!;
          entry.marker.remove();
          entry.sketch.remove();
          enemyMarkersRef.current.delete(enemy.id);
        }
        continue;
      }
      if (!enemyMarkersRef.current.has(enemy.id)) {
        const entry = createEnemyMarkerEntry(mapRef.current, enemy);
        enemyMarkersRef.current.set(enemy.id, entry);
      } else {
        const entry = enemyMarkersRef.current.get(enemy.id)!;
        entry.marker.setLngLat([enemy.lng, enemy.lat]);
        entry.model.hp = enemy.hp;
        entry.model.maxHp = enemy.maxHp;
        entry.model.phase = "alive";
      }
    }
  }, [enemies, mapStatus]);

  return (
    <section className="map-view">
      <div className="map-canvas">
        <div ref={mapContainerRef} className="mapbox-container" />

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
