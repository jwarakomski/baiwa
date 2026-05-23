import type { GeoLocation } from "../types/weather";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

interface OpenMeteoGeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface OpenMeteoGeoResponse {
  results?: OpenMeteoGeoResult[];
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
