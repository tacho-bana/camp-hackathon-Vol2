import type { LatLng } from "../types/game";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

/**
 * Mapbox Directions API (walking profile) を使って
 * from → to の道路に沿ったウェイポイント列を返す。
 * API が使えない場合は直線の [from, to] を返す。
 */
export async function fetchRoadRoute(
  from: LatLng,
  to: LatLng,
): Promise<LatLng[]> {
  if (!MAPBOX_TOKEN) return [from, to];

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?access_token=${MAPBOX_TOKEN}` +
    `&geometries=geojson&overview=full&steps=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [from, to];

    const data: {
      routes?: Array<{
        geometry: { coordinates: [number, number][] };
      }>;
    } = await res.json();

    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return [from, to];

    return coords.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return [from, to];
  }
}
