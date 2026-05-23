export type Provider = "noaa" | "accuweather" | "baiwa";

export interface GeoLocation {
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface CurrentConditions {
  provider: Provider;
  observedAt: string;
  temperatureF: number | null;
  feelsLikeF: number | null;
  humidity: number | null;
  windMph: number | null;
  windDirection?: string | null;
  shortDescription: string;
  icon?: string | null;
}

export interface ForecastPeriod {
  id: string;
  provider: Provider;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperatureF: number;
  temperatureTrend?: string | null;
  precipChance: number | null;
  windMph: number | null;
  windDirection?: string | null;
  shortDescription: string;
  detailedDescription?: string;
  icon?: string | null;
}

export interface ProviderForecast {
  provider: Provider;
  current: CurrentConditions | null;
  daily: ForecastPeriod[];
  hourly: ForecastPeriod[];
  alerts: WeatherAlert[];
  warnings: string[];
  radarStation?: string | null;
  forecastOffice?: string | null;
}

export interface WeatherAlert {
  id: string;
  event: string;
  severity: string;
  headline: string;
  description: string;
  effective: string;
  expires: string;
}

export interface AccuracyFeedback {
  id: string;
  createdAt: string;
  locationName: string;
  latitude: number;
  longitude: number;
  forecastPeriodId: string | null;
  forecastProvider: Provider | null;
  forecastedTempF: number | null;
  forecastedSummary: string | null;
  observedTempF: number | null;
  observedSummary: string;
  wasAccurate: "yes" | "partly" | "no";
  confidence: number;
  notes: string;
}

export interface BaiwaSignal {
  label: string;
  value: number;
  weight: number;
  detail: string;
}

export interface BaiwaScore {
  overall: number;
  trustLabel: "Low" | "Moderate" | "Strong" | "High";
  signals: BaiwaSignal[];
  fusedSummary: string;
  fusedTempF: number | null;
  providerAgreement: number;
  feedbackSampleSize: number;
}

export interface Contributor {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  region: string;
  expertise: string;
  notes: string;
}
