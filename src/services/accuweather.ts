import type {
  CurrentConditions,
  ForecastPeriod,
  GeoLocation,
  ProviderForecast,
} from "../types/weather";

const ACCU_BASE = "https://dataservice.accuweather.com";

const apiKey = import.meta.env.VITE_ACCUWEATHER_API_KEY?.trim() || "";

export const accuweatherEnabled = apiKey.length > 0;

interface AccuLocationSearchResult {
  Key: string;
  LocalizedName: string;
  AdministrativeArea?: { LocalizedName?: string; ID?: string };
  Country?: { LocalizedName?: string; ID?: string };
  GeoPosition?: { Latitude: number; Longitude: number };
}

interface AccuCurrentConditions {
  LocalObservationDateTime: string;
  WeatherText: string;
  WeatherIcon: number;
  IsDayTime: boolean;
  Temperature: { Imperial: { Value: number; Unit: string } };
  RealFeelTemperature?: { Imperial: { Value: number; Unit: string } };
  RelativeHumidity?: number;
  Wind?: {
    Speed: { Imperial: { Value: number; Unit: string } };
    Direction: { English: string; Degrees: number };
  };
  Link?: string;
}

interface AccuDailyForecastResponse {
  Headline?: { Text: string };
  DailyForecasts: Array<{
    Date: string;
    EpochDate: number;
    Temperature: {
      Minimum: { Value: number; Unit: string };
      Maximum: { Value: number; Unit: string };
    };
    Day: {
      Icon: number;
      IconPhrase: string;
      ShortPhrase?: string;
      LongPhrase?: string;
      PrecipitationProbability?: number;
      Wind?: {
        Speed: { Value: number; Unit: string };
        Direction: { English: string };
      };
    };
    Night: {
      Icon: number;
      IconPhrase: string;
      ShortPhrase?: string;
      LongPhrase?: string;
      PrecipitationProbability?: number;
      Wind?: {
        Speed: { Value: number; Unit: string };
        Direction: { English: string };
      };
    };
  }>;
}

async function accuFetch<T>(
  path: string,
  params: Record<string, string> = {},
  signal?: AbortSignal
): Promise<T> {
  if (!accuweatherEnabled) {
    throw new Error("AccuWeather is not configured");
  }
  const url = new URL(`${ACCU_BASE}${path}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`AccuWeather request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function findLocationKey(
  loc: GeoLocation,
  signal?: AbortSignal
): Promise<string | null> {
  const results = await accuFetch<AccuLocationSearchResult[]>(
    "/locations/v1/cities/geoposition/search",
    { q: `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}` },
    signal
  );
  if (Array.isArray(results)) {
    return results[0]?.Key ?? null;
  }
  const single = results as unknown as AccuLocationSearchResult | null;
  return single?.Key ?? null;
}

function mapCurrent(data: AccuCurrentConditions): CurrentConditions {
  return {
    provider: "accuweather",
    observedAt: data.LocalObservationDateTime,
    temperatureF: Math.round(data.Temperature.Imperial.Value),
    feelsLikeF: data.RealFeelTemperature
      ? Math.round(data.RealFeelTemperature.Imperial.Value)
      : null,
    humidity: data.RelativeHumidity ?? null,
    windMph: data.Wind ? Math.round(data.Wind.Speed.Imperial.Value) : null,
    windDirection: data.Wind?.Direction.English ?? null,
    shortDescription: data.WeatherText,
    icon: data.WeatherIcon
      ? `https://developer.accuweather.com/sites/default/files/${String(
          data.WeatherIcon
        ).padStart(2, "0")}-s.png`
      : null,
  };
}

const ACCU_DAILY_LIMIT = 7;

function mapDaily(data: AccuDailyForecastResponse): ForecastPeriod[] {
  return data.DailyForecasts.slice(0, ACCU_DAILY_LIMIT).flatMap((d, idx) => [
    {
      id: `accu-daily-day-${d.EpochDate}`,
      provider: "accuweather" as const,
      name:
        idx === 0
          ? "Today"
          : new Date(d.Date).toLocaleDateString(undefined, { weekday: "long" }),
      startTime: d.Date,
      endTime: d.Date,
      isDaytime: true,
      temperatureF: Math.round(d.Temperature.Maximum.Value),
      temperatureTrend: null,
      precipChance: d.Day.PrecipitationProbability ?? null,
      windMph: d.Day.Wind ? Math.round(d.Day.Wind.Speed.Value) : null,
      windDirection: d.Day.Wind?.Direction.English ?? null,
      shortDescription: d.Day.IconPhrase,
      detailedDescription: d.Day.LongPhrase ?? d.Day.ShortPhrase,
      icon: `https://developer.accuweather.com/sites/default/files/${String(
        d.Day.Icon
      ).padStart(2, "0")}-s.png`,
    },
    {
      id: `accu-daily-night-${d.EpochDate}`,
      provider: "accuweather" as const,
      name:
        idx === 0
          ? "Tonight"
          : `${new Date(d.Date).toLocaleDateString(undefined, {
              weekday: "long",
            })} Night`,
      startTime: d.Date,
      endTime: d.Date,
      isDaytime: false,
      temperatureF: Math.round(d.Temperature.Minimum.Value),
      temperatureTrend: null,
      precipChance: d.Night.PrecipitationProbability ?? null,
      windMph: d.Night.Wind ? Math.round(d.Night.Wind.Speed.Value) : null,
      windDirection: d.Night.Wind?.Direction.English ?? null,
      shortDescription: d.Night.IconPhrase,
      detailedDescription: d.Night.LongPhrase ?? d.Night.ShortPhrase,
      icon: `https://developer.accuweather.com/sites/default/files/${String(
        d.Night.Icon
      ).padStart(2, "0")}-s.png`,
    },
  ]);
}

export async function fetchAccuweatherForecast(
  loc: GeoLocation,
  signal?: AbortSignal
): Promise<ProviderForecast | null> {
  if (!accuweatherEnabled) return null;
  try {
    const key = await findLocationKey(loc, signal);
    if (!key) return null;
    const [currentArr, daily] = await Promise.all([
      accuFetch<AccuCurrentConditions[]>(
        `/currentconditions/v1/${key}`,
        { details: "true" },
        signal
      ),
      accuFetch<AccuDailyForecastResponse>(
        `/forecasts/v1/daily/5day/${key}`,
        { details: "true" },
        signal
      ),
    ]);
    const current = currentArr?.[0] ? mapCurrent(currentArr[0]) : null;
    const dailyPeriods = mapDaily(daily);
    return {
      provider: "accuweather",
      current,
      daily: dailyPeriods,
      hourly: [],
      alerts: [],
      warnings: daily.Headline?.Text ? [daily.Headline.Text] : [],
    };
  } catch (err) {
    return {
      provider: "accuweather",
      current: null,
      daily: [],
      hourly: [],
      alerts: [],
      warnings: [
        `AccuWeather lookup failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      ],
    };
  }
}
