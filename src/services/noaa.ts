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

async function noaaFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": userAgent,
    },
  });
  if (!res.ok) {
    throw new Error(`NOAA request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
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

async function fetchCurrent(stationsUrl: string): Promise<CurrentConditions | null> {
  try {
    const stations = await noaaFetch<NoaaStationsResponse>(stationsUrl);
    const first = stations.features?.[0];
    if (!first) return null;
    const obs = await noaaFetch<NoaaObservationResponse>(
      `${first.id}/observations/latest`
    );
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

async function fetchAlerts(loc: GeoLocation): Promise<WeatherAlert[]> {
  try {
    const url = `${NOAA_BASE}/alerts/active?point=${loc.latitude},${loc.longitude}`;
    const data = await noaaFetch<NoaaAlertsResponse>(url);
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
  prefix: string
): ForecastPeriod[] {
  return data.properties.periods.map((p) => ({
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
  loc: GeoLocation
): Promise<ProviderForecast> {
  const lat = loc.latitude.toFixed(4);
  const lon = loc.longitude.toFixed(4);
  const points = await noaaFetch<NoaaPointsResponse>(
    `${NOAA_BASE}/points/${lat},${lon}`
  );

  const [daily, hourly, current, alerts] = await Promise.all([
    noaaFetch<NoaaForecastResponse>(points.properties.forecast),
    noaaFetch<NoaaForecastResponse>(points.properties.forecastHourly),
    fetchCurrent(points.properties.observationStations),
    fetchAlerts(loc),
  ]);

  const dailyPeriods = mapPeriods(daily, "daily").slice(0, 14);
  const hourlyPeriods = mapPeriods(hourly, "hourly").slice(0, 24);

  return {
    provider: "noaa",
    current,
    daily: dailyPeriods,
    hourly: hourlyPeriods,
    alerts,
    warnings: [],
    radarStation: points.properties.radarStation ?? null,
    forecastOffice: points.properties.cwa ?? points.properties.gridId ?? null,
  };
}
