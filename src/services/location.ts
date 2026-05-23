import {
  coordsLocation,
  formatLocation,
  reverseGeocode,
} from "./geocoding";
import type { GeoLocation } from "../types/weather";

export type LocationSource = "browser" | "ip" | "default" | "manual";

export interface ResolvedLocation {
  location: GeoLocation;
  source: LocationSource;
}

const DEFAULT_LOCATION: GeoLocation = {
  name: "Seattle",
  region: "Washington",
  country: "United States",
  latitude: 47.6062,
  longitude: -122.3321,
};

const BROWSER_GEO_TIMEOUT_MS = 12_000;

function getBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: BROWSER_GEO_TIMEOUT_MS,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

async function locateFromBrowser(): Promise<GeoLocation> {
  const position = await getBrowserPosition();
  const { latitude, longitude } = position.coords;
  try {
    const named = await reverseGeocode(latitude, longitude);
    if (named) return named;
  } catch {
    // Fall back to raw coordinates if reverse geocoding fails.
  }
  return coordsLocation(latitude, longitude);
}

interface IpWhoResponse {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  message?: string;
}

async function locateFromIp(): Promise<GeoLocation> {
  const res = await fetch("https://ipwho.is/");
  if (!res.ok) {
    throw new Error(`IP location lookup failed: ${res.status}`);
  }
  const data: IpWhoResponse = await res.json();
  if (!data.success || data.latitude === undefined || data.longitude === undefined) {
    throw new Error(data.message ?? "IP location lookup returned no coordinates.");
  }
  return {
    name: data.city?.trim() || "Nearby",
    region: data.region,
    country: data.country,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

export function locationSourceLabel(source: LocationSource): string {
  switch (source) {
    case "browser":
      return "Using your device location";
    case "ip":
      return "Estimated from your network (IP address)";
    case "manual":
      return "Location set by search";
    case "default":
      return "Showing default location (Seattle)";
  }
}

/** Browser geolocation first, then IP guess, then Seattle. */
export async function resolveUserLocation(): Promise<ResolvedLocation> {
  try {
    const location = await locateFromBrowser();
    return { location, source: "browser" };
  } catch {
    // Permission denied, timeout, or unsupported — try IP next.
  }

  try {
    const location = await locateFromIp();
    return { location, source: "ip" };
  } catch {
    // Offline or IP service blocked — use default.
  }

  return { location: DEFAULT_LOCATION, source: "default" };
}

export async function requestBrowserLocation(): Promise<ResolvedLocation> {
  const location = await locateFromBrowser();
  return { location, source: "browser" };
}

export { DEFAULT_LOCATION, formatLocation };
