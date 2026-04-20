import type { NearbyPlace } from "../../types/game";

const kindLabel: Record<NearbyPlace["kind"], string> = {
  "electronics-shop": "Electronics Shop",
  "convenience-store": "Convenience Store",
  cafe: "Cafe",
  park: "Park",
  station: "Station",
  avenue: "Avenue",
};

export function PlaceMarker({
  place,
  selected,
  deployed,
  onClick,
}: {
  place: NearbyPlace;
  selected?: boolean;
  deployed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={
        selected ? "marker marker-place active" : "marker marker-place"
      }
      onClick={onClick}
    >
      <strong>{place.name}</strong>
      <span>
        {kindLabel[place.kind]} / {place.distance}m
      </span>
      {deployed ? <span className="marker-status">converted</span> : null}
    </button>
  );
}
