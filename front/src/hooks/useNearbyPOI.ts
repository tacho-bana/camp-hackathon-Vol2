import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLng, NearbyPlace } from "../types/game";
import { calcDistance } from "../utils/geo";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const REFETCH_THRESHOLD_M = 25;

type RawPlace = Omit<NearbyPlace, "distance">;
type CategoryDef = { query: string; kind: NearbyPlace["kind"] };

const CATEGORIES: CategoryDef[] = [
  { query: "electronics store", kind: "electronics-shop" },
  { query: "convenience store", kind: "convenience-store" },
  { query: "cafe", kind: "cafe" },
  { query: "park", kind: "park" },
  { query: "train station", kind: "station" },
];

export function useNearbyPOI(position: LatLng | null): NearbyPlace[] {
  const [rawPlaces, setRawPlaces] = useState<RawPlace[]>([]);
  const lastFetchPositionRef = useRef<LatLng | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!position || !MAPBOX_TOKEN) return;
    if (
      lastFetchPositionRef.current &&
      calcDistance(lastFetchPositionRef.current, position) < REFETCH_THRESHOLD_M
    ) {
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    lastFetchPositionRef.current = position;

    (async () => {
      const settled = await Promise.allSettled(
        CATEGORIES.map(async ({ query, kind }) => {
          const url = new URL(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
          );
          url.searchParams.set("access_token", MAPBOX_TOKEN);
          url.searchParams.set("proximity", `${position.lng},${position.lat}`);
          url.searchParams.set("types", "poi");
          url.searchParams.set("limit", "3");
          url.searchParams.set("language", "ja");

          const res = await fetch(url.toString(), { signal });
          if (!res.ok || signal.aborted) return [];

          const data: {
            features: Array<{
              id: string;
              text: string;
              geometry: { coordinates: [number, number] };
            }>;
          } = await res.json();
          if (signal.aborted) return [];

          return (data.features ?? []).map<RawPlace>((feature) => {
            const [lng, lat] = feature.geometry.coordinates;
            return { id: feature.id, name: feature.text, kind, lat, lng };
          });
        }),
      );

      if (signal.aborted) return;

      const results = settled
        .filter(
          (r): r is PromiseFulfilledResult<RawPlace[]> =>
            r.status === "fulfilled",
        )
        .flatMap((r) => r.value);

      setRawPlaces(results);
    })();

    return () => controller.abort();
  }, [position?.lat, position?.lng]);

  return useMemo(
    () =>
      rawPlaces.map((place) => ({
        ...place,
        distance: position
          ? Math.round(calcDistance(position, { lat: place.lat, lng: place.lng }))
          : 0,
      })),
    [rawPlaces, position],
  );
}
