import { useState, useCallback } from 'react';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface UseGeolocationResult {
  location: GeoLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}

export function useGeolocation(): UseGeolocationResult {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    // On phones, browsers usually require HTTPS to allow location
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError(
        'Location requires a secure connection (HTTPS). Open this site using https:// so your browser can share your location.'
      );
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError(
              'Location was denied. Allow location for this site in your browser or phone settings (e.g. Settings → Privacy → Location), then refresh and try again. The site must be opened over HTTPS on mobile.'
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location is unavailable. Check that location services are on for your device and browser.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Make sure location is enabled and try again.');
            break;
          default:
            setError('Could not get your location. Try enabling location for this site and reloading.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  return { location, loading, error, requestLocation };
}
