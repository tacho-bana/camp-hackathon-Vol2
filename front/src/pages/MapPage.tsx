import { useMemo, useState } from "react";
import { BottomActionPanel } from "../components/ui/BottomActionPanel";
import { MapView } from "../components/map/MapView";
import type { MapViewport, NearbyPlace, PlacementPreview } from "../types/game";

export function MapPage() {
  const [viewport, setViewport] = useState<MapViewport>({
    x: 24,
    y: 12,
    zoom: 1.4,
  });
  const [selectedMarker, setSelectedMarker] = useState<string | null>(
    "camp-03",
  );
  const [placementPreview, setPlacementPreview] =
    useState<PlacementPreview | null>({
      kind: "turret",
      x: 14,
      y: 20,
    });

  const nearbyPlaces = useMemo<NearbyPlace[]>(
    () => [
      { id: "camp-03", name: "South Camp", kind: "safe-zone", distance: 120 },
      { id: "ruin-11", name: "Glass Ruin", kind: "ruin", distance: 240 },
      { id: "ore-07", name: "Ore Node", kind: "resource", distance: 380 },
    ],
    [],
  );

  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Map</p>
          <h2>Viewport and markers</h2>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() =>
            setViewport((current) => ({ ...current, zoom: current.zoom + 0.1 }))
          }
        >
          Zoom in
        </button>
      </div>

      <MapView
        viewport={viewport}
        nearbyPlaces={nearbyPlaces}
        selectedMarker={selectedMarker}
        placementPreview={placementPreview}
      />

      <BottomActionPanel
        actions={[
          {
            label: "Select Camp",
            emphasis: "primary",
            onClick: () => setSelectedMarker("camp-03"),
          },
          {
            label: "Preview Wall",
            onClick: () => setPlacementPreview({ kind: "wall", x: 18, y: 13 }),
          },
          { label: "Clear Preview", onClick: () => setPlacementPreview(null) },
        ]}
      />
    </section>
  );
}
