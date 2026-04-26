import { useEffect, useState } from "react";
import type { LatLng } from "../types/game";

type GeolocationState = {
  position: LatLng | null;
  error: string | null;
};

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ position: null, error: "位置情報がサポートされていません" });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
        });
      },
      (err) => {
        setState((prev) => ({ ...prev, error: err.message }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}
