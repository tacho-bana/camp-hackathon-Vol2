import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type {
  MapViewport,
  NearbyPlace,
  PlacementPreview,
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

export function MapView({
  viewport,
  nearbyPlaces,
  selectedMarker,
  placementPreview,
  onSelectMarker,
  deployedStructures,
}: {
  viewport: MapViewport;
  nearbyPlaces: NearbyPlace[];
  selectedMarker: string | null;
  placementPreview: PlacementPreview | null;
  onSelectMarker: (id: string) => void;
  deployedStructures: string[];
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
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
      map.addSource("route-line", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [139.755, 35.6765],
              [139.764, 35.679],
              [139.771, 35.682],
              [139.781, 35.686],
            ],
          },
          properties: {},
        },
      });

      map.addLayer({
        id: "route-line-layer",
        type: "line",
        source: "route-line",
        paint: {
          "line-color": "#22c55e",
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });

      map.addSource("base-point", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [139.7671, 35.6812],
          },
          properties: {},
        },
      });

      map.addLayer({
        id: "base-point-layer",
        type: "circle",
        source: "base-point",
        paint: {
          "circle-radius": 9,
          "circle-color": "#38bdf8",
          "circle-stroke-color": "#d7e0ea",
          "circle-stroke-width": 2,
        },
      });

      nearbyPlaces.forEach((place, index) => {
        const longitude = initialCenter.lng + 0.007 * (index - 2.5);
        const latitude =
          initialCenter.lat +
          0.0035 * ((index % 2 === 0 ? 1 : -1) + index / 10);

        new mapboxgl.Marker({
          color: place.kind === "electronics-shop" ? "#22c55e" : "#f59e0b",
        })
          .setLngLat([longitude, latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 20 }).setHTML(
              `<strong>${place.name}</strong><br />${place.kind}<br />距離 ${place.distance}m`,
            ),
          )
          .addTo(map);
      });

      setMapStatus("ready");
    });

    map.on("error", () => {
      setMapStatus("error");
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [nearbyPlaces]);

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
          <StructureLayer deployedCount={deployedStructures.length} />
          <EnemyLayer />
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
