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
}: {
  viewport: MapViewport;
  nearbyPlaces: NearbyPlace[];
  selectedMarker: string | null;
  placementPreview: PlacementPreview | null;
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
        <StructureLayer />
        <EnemyLayer />
        <div className="map-place-list">
          {nearbyPlaces.map((place) => (
            <PlaceMarker
              key={place.id}
              place={place}
              selected={selectedMarker === place.id}
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
