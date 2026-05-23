import type { GeoLocation } from "../types/weather";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const OPEN_METEO_REVERSE = "https://geocoding-api.open-meteo.com/v1/reverse";
const NOAA_BASE = "https://api.weather.gov";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

const noaaUserAgent =
  import.meta.env.VITE_NOAA_USER_AGENT?.trim() ||
  "(baiwa-weather-prototype, dev@example.com)";

interface OpenMeteoGeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  feature_code?: string;
}

interface OpenMeteoGeoResponse {
  results?: OpenMeteoGeoResult[];
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
  display_name?: string;
}

interface NoaaPointsPlaceResponse {
  properties?: {
    relativeLocation?: {
      properties?: { city?: string; state?: string };
    };
  };
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function placeFromCoords(
  latitude: number,
  longitude: number,
  name: string,
  region?: string,
  country?: string
): GeoLocation {
  return {
    name: name.trim(),
    region: region?.trim() || undefined,
    country: country?.trim() || undefined,
    latitude,
    longitude,
  };
}

function pickNominatimName(address: NominatimAddress): string | null {
  return (
    address.city ??
    address.town ??
    address.village ??
    address.hamlet ??
    address.municipality ??
    address.county ??
    null
  );
}

async function reverseOpenMeteo(
  latitude: number,
  longitude: number
): Promise<GeoLocation | null> {
  const url = new URL(OPEN_METEO_REVERSE);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("language", "en");
  url.searchParams.set("count", "8");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data: OpenMeteoGeoResponse = await res.json();
  const results = data.results ?? [];
  if (results.length === 0) return null;

  const sorted = [...results].sort(
    (a, b) =>
      haversineKm(latitude, longitude, a.latitude, a.longitude) -
      haversineKm(latitude, longitude, b.latitude, b.longitude)
  );
  const hit = sorted[0];
  return placeFromCoords(
    latitude,
    longitude,
    hit.name,
    hit.admin1,
    hit.country
  );
}

async function reverseNoaa(
  latitude: number,
  longitude: number
): Promise<GeoLocation | null> {
  const lat = latitude.toFixed(4);
  const lon = longitude.toFixed(4);
  const res = await fetch(`${NOAA_BASE}/points/${lat},${lon}`, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": noaaUserAgent,
    },
  });
  if (!res.ok) return null;
  const data: NoaaPointsPlaceResponse = await res.json();
  const rel = data.properties?.relativeLocation?.properties;
  const city = rel?.city?.trim();
  if (!city) return null;
  return placeFromCoords(latitude, longitude, city, rel?.state, "United States");
}

async function reverseNominatim(
  latitude: number,
  longitude: number
): Promise<GeoLocation | null> {
  const url = new URL(NOMINATIM_REVERSE);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": noaaUserAgent,
    },
  });
  if (!res.ok) return null;
  const data: NominatimResponse = await res.json();
  const address = data.address;
  if (!address) return null;
  const name = pickNominatimName(address);
  if (!name) return null;
  return placeFromCoords(
    latitude,
    longitude,
    name,
    address.state,
    address.country
  );
}

/** Resolve the nearest town/place name while keeping the user's exact coordinates. */
export async function resolveNearestPlace(
  latitude: number,
  longitude: number
): Promise<GeoLocation> {
  const providers = [reverseOpenMeteo, reverseNoaa, reverseNominatim];
  for (const provider of providers) {
    try {
      const result = await provider(latitude, longitude);
      if (result?.name) return result;
    } catch {
      // Try next provider.
    }
  }

  return placeFromCoords(
    latitude,
    longitude,
    `Near ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`
  );
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeoLocation | null> {
  const place = await resolveNearestPlace(latitude, longitude);
  if (place.name.startsWith("Near ")) return null;
  return place;
}

export async function geocode(query: string): Promise<GeoLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(GEO_URL);
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }
  const data: OpenMeteoGeoResponse = await res.json();
  const results = data.results ?? [];
  return results.map((r) => ({
    name: r.name,
    region: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export function formatLocation(loc: GeoLocation): string {
  return [loc.name, loc.region, loc.country].filter(Boolean).join(", ");
}

export function coordsLocation(
  latitude: number,
  longitude: number,
  label?: string
): GeoLocation {
  return placeFromCoords(
    latitude,
    longitude,
    label ?? `Near ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`
  );
}
