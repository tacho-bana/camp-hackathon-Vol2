import type { NearbyPlace } from "../../types/game";

export function PlaceMarker({
  place,
  selected,
}: {
  place: NearbyPlace;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      className={
        selected ? "marker marker-place active" : "marker marker-place"
      }
    >
      <strong>{place.name}</strong>
      <span>
        {place.kind} / {place.distance}m
      </span>
    </button>
  );
}
