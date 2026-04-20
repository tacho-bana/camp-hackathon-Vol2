import type {
  MapViewport,
  NearbyPlace,
  PlacementPreview,
} from "../../types/game";
import { BaseMarker } from "./BaseMarker";
import { EnemyLayer } from "./EnemyLayer";
import { PlaceMarker } from "./PlaceMarker";
import { StructureLayer } from "./StructureLayer";

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
  return (
    <section className="map-view">
      <div className="map-canvas">
        <div className="map-overlay">
          <span>
            viewport: {viewport.x}, {viewport.y}
          </span>
          <span>zoom: {viewport.zoom.toFixed(1)}x</span>
        </div>

        <BaseMarker label="Base Core" active={selectedMarker === "base-core"} />
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

        {placementPreview ? (
          <div className="placement-preview">
            Preview {placementPreview.kind} at {placementPreview.x},{" "}
            {placementPreview.y}
          </div>
        ) : null}
      </div>
    </section>
  );
}
