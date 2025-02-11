import { useCallback } from "react";

export function useMapAnimation(mapRef: React.RefObject<google.maps.Map>) {
  const flyTo = useCallback(
    (toLatLng: google.maps.LatLngLiteral, toZoom: number) => {
      const map = mapRef.current;
      if (!map) return;

      requestAnimationFrame(function loop() {
        const { lat, lng } = map.getCenter()?.toJSON() || { lat: 0, lng: 0 };
        const zoom = map.getZoom() || 0;

        if (
          Math.abs(toLatLng.lat - lat) < 0.000001 &&
          Math.abs(toLatLng.lng - lng) < 0.000001 &&
          Math.abs(toZoom - zoom) < 0.01
        ) {
          map.moveCamera({ center: toLatLng, zoom: toZoom });
          return;
        }

        requestAnimationFrame(loop);

        map.moveCamera({
          center: {
            lat: lat + (toLatLng.lat - lat) * 0.1,
            lng: lng + (toLatLng.lng - lng) * 0.1,
          },
          zoom: zoom + (toZoom - zoom) * 0.04,
        });
      });
    },
    [mapRef]
  );

  return { flyTo };
}
