import type {
  CurrentConditions,
  ForecastPeriod,
  GeoLocation,
  ProviderForecast,
  WeatherAlert,
} from "../types/weather";

const NOAA_BASE = "https://api.weather.gov";

const userAgent =
  import.meta.env.VITE_NOAA_USER_AGENT?.trim() ||
  "(baiwa-weather-prototype, dev@example.com)";

interface NoaaPointsResponse {
  properties: {
    forecast: string;
    forecastHourly: string;
    forecastZone: string;
    observationStations: string;
    radarStation?: string;
    cwa?: string;
    gridId?: string;
    relativeLocation?: {
      properties?: { city?: string; state?: string };
    };
  };
}

interface NoaaForecastResponse {
  properties: {
    periods: Array<{
      number: number;
      name: string;
      startTime: string;
      endTime: string;
      isDaytime: boolean;
      temperature: number;
      temperatureUnit: string;
      temperatureTrend?: string | null;
      probabilityOfPrecipitation?: { value: number | null };
      windSpeed?: string;
      windDirection?: string;
      icon?: string;
      shortForecast: string;
      detailedForecast?: string;
    }>;
  };
}

interface NoaaStationsResponse {
  features: Array<{
    id: string;
    properties: { stationIdentifier: string; name: string };
  }>;
}

interface NoaaObservationResponse {
  properties: {
    timestamp: string;
    textDescription: string;
    icon?: string;
    temperature?: { value: number | null; unitCode: string };
    windSpeed?: { value: number | null; unitCode: string };
    windDirection?: { value: number | null };
    relativeHumidity?: { value: number | null };
    heatIndex?: { value: number | null; unitCode: string };
    windChill?: { value: number | null; unitCode: string };
  };
}

interface NoaaAlertsResponse {
  features: Array<{
    id: string;
    properties: {
      event: string;
      severity: string;
      headline: string;
      description: string;
      effective: string;
      expires: string;
    };
  }>;
}

async function noaaFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": userAgent,
    },
    signal,
  });
  if (!res.ok) {
    throw new Error(`NOAA request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

interface NoaaPointsCache {
  points: NoaaPointsResponse["properties"];
  observationStationUrl?: string;
}

const POINTS_CACHE_PREFIX = "baiwa.noaa.points.v1:";

function pointsCacheKey(lat: string, lon: string): string {
  return `${POINTS_CACHE_PREFIX}${lat},${lon}`;
}

function readPointsCache(key: string): NoaaPointsCache | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as NoaaPointsCache) : null;
  } catch {
    return null;
  }
}

function writePointsCache(key: string, value: NoaaPointsCache): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private-mode errors
  }
}

function celsiusToF(c: number | null | undefined): number | null {
  if (c === null || c === undefined) return null;
  return Math.round((c * 9) / 5 + 32);
}

function knotsOrMs(value: number | null | undefined, unitCode: string): number | null {
  if (value === null || value === undefined) return null;
  if (unitCode.includes("km_h-1")) {
    return Math.round(value * 0.621371);
  }
  if (unitCode.includes("m_s-1")) {
    return Math.round(value * 2.23694);
  }
  return Math.round(value);
}

function parseWindMph(windSpeed: string | undefined): number | null {
  if (!windSpeed) return null;
  const match = windSpeed.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function degreesToCardinal(deg: number | null | undefined): string | null {
  if (deg === null || deg === undefined) return null;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

async function fetchCurrent(
  stationsUrl: string,
  cachedObservationUrl: string | undefined,
  onResolveStation: (observationUrl: string) => void,
  signal?: AbortSignal
): Promise<CurrentConditions | null> {
  try {
    let observationUrl = cachedObservationUrl;
    if (!observationUrl) {
      const stations = await noaaFetch<NoaaStationsResponse>(stationsUrl, signal);
      const first = stations.features?.[0];
      if (!first) return null;
      observationUrl = `${first.id}/observations/latest`;
      onResolveStation(observationUrl);
    }
    const obs = await noaaFetch<NoaaObservationResponse>(observationUrl, signal);
    const props = obs.properties;
    const tempC = props.temperature?.value ?? null;
    const feelsC =
      props.heatIndex?.value ?? props.windChill?.value ?? tempC;
    return {
      provider: "noaa",
      observedAt: props.timestamp,
      temperatureF: celsiusToF(tempC),
      feelsLikeF: celsiusToF(feelsC),
      humidity:
        props.relativeHumidity?.value !== null &&
        props.relativeHumidity?.value !== undefined
          ? Math.round(props.relativeHumidity.value)
          : null,
      windMph: knotsOrMs(props.windSpeed?.value, props.windSpeed?.unitCode ?? ""),
      windDirection: degreesToCardinal(props.windDirection?.value),
      shortDescription: props.textDescription,
      icon: props.icon ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchAlerts(
  loc: GeoLocation,
  signal?: AbortSignal
): Promise<WeatherAlert[]> {
  try {
    const url = `${NOAA_BASE}/alerts/active?point=${loc.latitude},${loc.longitude}`;
    const data = await noaaFetch<NoaaAlertsResponse>(url, signal);
    return data.features.map((f) => ({
      id: f.id,
      event: f.properties.event,
      severity: f.properties.severity,
      headline: f.properties.headline,
      description: f.properties.description,
      effective: f.properties.effective,
      expires: f.properties.expires,
    }));
  } catch {
    return [];
  }
}

function mapPeriods(
  data: NoaaForecastResponse,
  prefix: string,
  limit: number
): ForecastPeriod[] {
  return data.properties.periods.slice(0, limit).map((p) => ({
    id: `${prefix}-${p.number}-${p.startTime}`,
    provider: "noaa",
    name: p.name,
    startTime: p.startTime,
    endTime: p.endTime,
    isDaytime: p.isDaytime,
    temperatureF:
      p.temperatureUnit === "F"
        ? p.temperature
        : Math.round((p.temperature * 9) / 5 + 32),
    temperatureTrend: p.temperatureTrend ?? null,
    precipChance: p.probabilityOfPrecipitation?.value ?? null,
    windMph: parseWindMph(p.windSpeed),
    windDirection: p.windDirection ?? null,
    shortDescription: p.shortForecast,
    detailedDescription: p.detailedForecast,
    icon: p.icon ?? null,
  }));
}

export async function fetchNoaaForecast(
  loc: GeoLocation,
  signal?: AbortSignal
): Promise<ProviderForecast> {
  // NOAA's grid for a coordinate is stable; cache to ~1km granularity.
  const cacheLat = loc.latitude.toFixed(2);
  const cacheLon = loc.longitude.toFixed(2);
  const cacheKey = pointsCacheKey(cacheLat, cacheLon);

  let cached = readPointsCache(cacheKey);
  let pointsProps: NoaaPointsResponse["properties"];

  if (cached) {
    pointsProps = cached.points;
  } else {
    const lat = loc.latitude.toFixed(4);
    const lon = loc.longitude.toFixed(4);
    const points = await noaaFetch<NoaaPointsResponse>(
      `${NOAA_BASE}/points/${lat},${lon}`,
      signal
    );
    pointsProps = points.properties;
    cached = { points: pointsProps };
    writePointsCache(cacheKey, cached);
  }

  const cacheRef = cached;
  const [daily, hourly, current, alerts] = await Promise.all([
    noaaFetch<NoaaForecastResponse>(pointsProps.forecast, signal),
    noaaFetch<NoaaForecastResponse>(pointsProps.forecastHourly, signal),
    fetchCurrent(
      pointsProps.observationStations,
      cacheRef.observationStationUrl,
      (observationUrl) => {
        cacheRef.observationStationUrl = observationUrl;
        writePointsCache(cacheKey, cacheRef);
      },
      signal
    ),
    fetchAlerts(loc, signal),
  ]);

  const dailyPeriods = mapPeriods(daily, "daily", 14);
  const hourlyPeriods = mapPeriods(hourly, "hourly", 24);

  return {
    provider: "noaa",
    current,
    daily: dailyPeriods,
    hourly: hourlyPeriods,
    alerts,
    warnings: [],
    radarStation: pointsProps.radarStation ?? null,
    forecastOffice: pointsProps.cwa ?? pointsProps.gridId ?? null,
  };
}
