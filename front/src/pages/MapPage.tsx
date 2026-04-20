import { useMemo, useState } from "react";
import { BottomActionPanel } from "../components/ui/BottomActionPanel";
import { MapView } from "../components/map/MapView";
import type {
  MapViewport,
  NearbyPlace,
  PlacementPreview,
  PlaceTransformRule,
} from "../types/game";

const transformRules: PlaceTransformRule[] = [
  {
    sourceKind: "electronics-shop",
    structureType: "electric_shop_tower",
    effect: "EMP stun pulse",
  },
  {
    sourceKind: "convenience-store",
    structureType: "supply_depot",
    effect: "Repairs nearby structure HP",
  },
  {
    sourceKind: "cafe",
    structureType: "cafe_heal_node",
    effect: "Continuous heal aura",
  },
  {
    sourceKind: "park",
    structureType: "park_scout_node",
    effect: "Early detection and range boost",
  },
  {
    sourceKind: "station",
    structureType: "station_support",
    effect: "Wide-area burst support",
  },
  {
    sourceKind: "avenue",
    structureType: "avenue_hazard",
    effect: "Danger zone that speeds enemy routes",
  },
];

export function MapPage() {
  const [viewport, setViewport] = useState<MapViewport>({
    x: 24,
    y: 12,
    zoom: 1.4,
  });
  const [selectedMarker, setSelectedMarker] = useState<string | null>("poi-01");
  const [checkedInPlaceIds, setCheckedInPlaceIds] = useState<string[]>([]);
  const [deployedStructures, setDeployedStructures] = useState<string[]>([]);
  const [placementPreview, setPlacementPreview] =
    useState<PlacementPreview | null>({
      kind: "electric_shop_tower",
      x: 14,
      y: 20,
    });

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([
    {
      id: "poi-01",
      name: "Akiba Sparks",
      kind: "electronics-shop",
      distance: 74,
    },
    {
      id: "poi-02",
      name: "Kite Mart",
      kind: "convenience-store",
      distance: 162,
    },
    { id: "poi-03", name: "Blue Lantern Cafe", kind: "cafe", distance: 116 },
    { id: "poi-04", name: "River Park", kind: "park", distance: 228 },
    { id: "poi-05", name: "Horizon Station", kind: "station", distance: 330 },
    { id: "poi-06", name: "East Avenue", kind: "avenue", distance: 178 },
  ]);

  const selectedPlace = useMemo(
    () => nearbyPlaces.find((place) => place.id === selectedMarker) ?? null,
    [nearbyPlaces, selectedMarker],
  );

  const selectedRule = useMemo(
    () =>
      selectedPlace
        ? (transformRules.find(
            (rule) => rule.sourceKind === selectedPlace.kind,
          ) ?? null)
        : null,
    [selectedPlace],
  );

  const canCheckIn = selectedPlace ? selectedPlace.distance <= 90 : false;
  const isCheckedIn = selectedMarker
    ? checkedInPlaceIds.includes(selectedMarker)
    : false;

  const handleSimulateMovement = () => {
    setNearbyPlaces((current) =>
      current.map((place, index) => ({
        ...place,
        distance: Math.max(24, place.distance - (index + 1) * 12),
      })),
    );
    setViewport((current) => ({
      ...current,
      x: current.x + 1,
      y: current.y + 1,
    }));
  };

  const handleCheckIn = () => {
    if (!selectedMarker || !canCheckIn || isCheckedIn) {
      return;
    }

    setCheckedInPlaceIds((current) => [...current, selectedMarker]);
  };

  const handleConvertToStructure = () => {
    if (!selectedPlace || !selectedRule || !isCheckedIn) {
      return;
    }

    if (!deployedStructures.includes(selectedPlace.id)) {
      setDeployedStructures((current) => [...current, selectedPlace.id]);
    }

    setPlacementPreview({
      kind: selectedRule.structureType,
      x: Math.round(viewport.x + 4),
      y: Math.round(viewport.y + 6),
    });
  };

  return (
    <section className="content-panel stack-layout">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Outing Phase</p>
          <h2>POI check-in and structure conversion</h2>
          <p className="muted">
            Move, check in within 90m, then convert POIs into defensive
            structures.
          </p>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={handleSimulateMovement}
        >
          Simulate walk tick
        </button>
      </div>

      <div className="grid-cards two-up">
        <article className="feature-card stat-card">
          <strong>{checkedInPlaceIds.length}</strong>
          <span>checked-in places</span>
        </article>
        <article className="feature-card stat-card">
          <strong>{deployedStructures.length}</strong>
          <span>converted structures</span>
        </article>
      </div>

      {selectedPlace && selectedRule ? (
        <article className="feature-card">
          <strong>{selectedPlace.name}</strong>
          <span>
            {selectedPlace.kind} - {selectedRule.structureType}
          </span>
          <span>{selectedRule.effect}</span>
        </article>
      ) : null}

      <MapView
        viewport={viewport}
        nearbyPlaces={nearbyPlaces}
        selectedMarker={selectedMarker}
        placementPreview={placementPreview}
        onSelectMarker={setSelectedMarker}
        deployedStructures={deployedStructures}
      />

      <BottomActionPanel
        actions={[
          {
            label: "Check in selected POI",
            emphasis: "primary",
            onClick: handleCheckIn,
          },
          {
            label: "Convert to structure",
            onClick: handleConvertToStructure,
          },
          {
            label: "Reset preview",
            onClick: () => setPlacementPreview(null),
          },
        ]}
      />

      <p className="muted">
        Check-in status:{" "}
        {isCheckedIn ? "ready for conversion" : "approach selected POI"}
      </p>
    </section>
  );
}
