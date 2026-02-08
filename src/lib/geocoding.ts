/**
 * Geocode an address using OpenStreetMap Nominatim (free, no API key required).
 */

export interface GeocodedResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(
  address: string,
  options?: { viewbox?: string; limit?: number }
): Promise<GeocodedResult | null> {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: String(options?.limit ?? 1),
    countrycodes: 'ca',
  });
  if (options?.viewbox) {
    params.set('viewbox', options.viewbox);
    params.set('bounded', '1');
  }

  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'KingstonSmartParking/1.0',
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0];
  return {
    lat: parseFloat(first.lat),
    lng: parseFloat(first.lon),
    displayName: first.display_name ?? address,
  };
}
