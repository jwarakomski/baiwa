import { describe, expect, it } from "vitest";
import { computeBaiwaScore, findForecastPeriodForObservation } from "./model";
import type {
  AccuracyFeedback,
  CurrentConditions,
  ForecastPeriod,
  GeoLocation,
  ProviderForecast,
} from "../types/weather";

const seattle: GeoLocation = {
  name: "Seattle",
  region: "Washington",
  country: "United States",
  latitude: 47.6062,
  longitude: -122.3321,
};

function makeCurrent(overrides: Partial<CurrentConditions> = {}): CurrentConditions {
  return {
    provider: "noaa",
    observedAt: "2026-05-23T12:00:00Z",
    temperatureF: 62,
    feelsLikeF: 60,
    humidity: 70,
    windMph: 5,
    windDirection: "W",
    shortDescription: "Cloudy",
    icon: null,
    ...overrides,
  };
}

function makeForecast(
  overrides: Partial<ProviderForecast> = {}
): ProviderForecast {
  return {
    provider: "noaa",
    current: makeCurrent(),
    daily: [],
    hourly: [],
    alerts: [],
    warnings: [],
    ...overrides,
  };
}

function makeFeedback(overrides: Partial<AccuracyFeedback> = {}): AccuracyFeedback {
  return {
    id: "f1",
    createdAt: "2026-05-22T12:00:00Z",
    locationName: "Seattle",
    latitude: seattle.latitude,
    longitude: seattle.longitude,
    forecastPeriodId: null,
    forecastProvider: "noaa",
    forecastedTempF: 60,
    forecastedSummary: "Cloudy",
    observedTempF: 60,
    observedSummary: "Cloudy",
    wasAccurate: "yes",
    confidence: 4,
    notes: "",
    ...overrides,
  };
}

describe("computeBaiwaScore", () => {
  it("falls back to a neutral baseline when no data is available", () => {
    const score = computeBaiwaScore(seattle, null, null, []);
    // Neutral priors land just above 0.5 → Moderate. This documents the model's
    // empty-input behavior, not a recommendation to trust it.
    expect(score.trustLabel).toBe("Moderate");
    expect(score.fusedTempF).toBeNull();
    expect(score.fusedSummary).toBe("Awaiting provider data...");
    expect(score.feedbackSampleSize).toBe(0);
  });

  it("uses single-provider summary verbatim when only one is available", () => {
    const noaa = makeForecast({
      current: makeCurrent({ temperatureF: 65, shortDescription: "Sunny" }),
    });
    const score = computeBaiwaScore(seattle, noaa, null, []);
    expect(score.fusedSummary).toBe("Sunny");
    expect(score.fusedTempF).toBe(65);
  });

  it("averages provider temperatures and reports the delta", () => {
    const noaa = makeForecast({
      current: makeCurrent({ temperatureF: 60, shortDescription: "Cloudy" }),
    });
    const accu = makeForecast({
      provider: "accuweather",
      current: makeCurrent({
        provider: "accuweather",
        temperatureF: 70,
        shortDescription: "Partly cloudy",
      }),
    });
    const score = computeBaiwaScore(seattle, noaa, accu, []);
    expect(score.fusedTempF).toBe(65);
    expect(score.fusedSummary).toContain("Cloudy");
    expect(score.fusedSummary).toContain("AccuWeather: Partly cloudy");
    // 10° delta over a 12° window → ~0.17 agreement.
    expect(score.providerAgreement).toBeGreaterThan(0.1);
    expect(score.providerAgreement).toBeLessThan(0.2);
  });

  it("collapses identical summaries into one", () => {
    const noaa = makeForecast({
      current: makeCurrent({ temperatureF: 60, shortDescription: "Cloudy" }),
    });
    const accu = makeForecast({
      provider: "accuweather",
      current: makeCurrent({
        provider: "accuweather",
        temperatureF: 60,
        shortDescription: "Cloudy",
      }),
    });
    const score = computeBaiwaScore(seattle, noaa, accu, []);
    expect(score.fusedSummary).toBe("Cloudy");
    expect(score.providerAgreement).toBe(1);
  });

  it("counts nearby feedback and ignores far-away feedback", () => {
    const nearby = makeFeedback({
      id: "near",
      latitude: seattle.latitude + 0.1, // ~11 km north
      longitude: seattle.longitude,
      wasAccurate: "yes",
    });
    const farAway = makeFeedback({
      id: "far",
      latitude: 40.7128, // New York
      longitude: -74.006,
      wasAccurate: "no",
    });
    const score = computeBaiwaScore(seattle, null, null, [nearby, farAway]);
    expect(score.feedbackSampleSize).toBe(1);
  });

  it("treats 'partly' feedback as half-credit accuracy", () => {
    const score = computeBaiwaScore(seattle, null, null, [
      makeFeedback({ id: "a", wasAccurate: "partly" }),
      makeFeedback({ id: "b", wasAccurate: "partly" }),
    ]);
    const local = score.signals.find((s) => s.label === "Local Feedback Accuracy");
    expect(local?.value).toBeCloseTo(0.5, 5);
  });

  it("treats all-'no' feedback as zero accuracy", () => {
    const score = computeBaiwaScore(seattle, null, null, [
      makeFeedback({ id: "a", wasAccurate: "no" }),
      makeFeedback({ id: "b", wasAccurate: "no" }),
    ]);
    const local = score.signals.find((s) => s.label === "Local Feedback Accuracy");
    expect(local?.value).toBe(0);
  });

  it("scales observation calibration with observed vs forecast delta", () => {
    const score = computeBaiwaScore(seattle, null, null, [
      makeFeedback({ id: "a", forecastedTempF: 60, observedTempF: 65 }),
      makeFeedback({ id: "b", forecastedTempF: 60, observedTempF: 65 }),
    ]);
    const obs = score.signals.find((s) => s.label === "Observation Calibration");
    // 5° avg delta over a 10° window → 0.5
    expect(obs?.value).toBeCloseTo(0.5, 5);
  });

  it("ignores observation deltas when temperatures are missing", () => {
    const score = computeBaiwaScore(seattle, null, null, [
      makeFeedback({ id: "a", forecastedTempF: null, observedTempF: 60 }),
    ]);
    const obs = score.signals.find((s) => s.label === "Observation Calibration");
    expect(obs?.detail).toContain("No observed-vs-forecast");
  });

  it("clamps overall score into [0, 1] and assigns trustLabel by threshold", () => {
    const goodFeedback = Array.from({ length: 5 }, (_, i) =>
      makeFeedback({
        id: `f${i}`,
        forecastedTempF: 60,
        observedTempF: 60,
        wasAccurate: "yes",
        confidence: 5,
      })
    );
    const noaa = makeForecast({
      current: makeCurrent({ temperatureF: 60, shortDescription: "Clear" }),
    });
    const accu = makeForecast({
      provider: "accuweather",
      current: makeCurrent({
        provider: "accuweather",
        temperatureF: 60,
        shortDescription: "Clear",
      }),
    });
    const score = computeBaiwaScore(seattle, noaa, accu, goodFeedback);
    expect(score.overall).toBeGreaterThan(0.85);
    expect(score.trustLabel).toBe("High");
    expect(score.overall).toBeLessThanOrEqual(1);
  });

  it("falls back to daily forecast temperature when no current observation", () => {
    const daily: ForecastPeriod = {
      id: "d1",
      provider: "noaa",
      name: "Today",
      startTime: "2026-05-23T12:00:00Z",
      endTime: "2026-05-23T18:00:00Z",
      isDaytime: true,
      temperatureF: 72,
      precipChance: 10,
      windMph: 3,
      shortDescription: "Sunny",
    };
    const noaa = makeForecast({ current: null, daily: [daily] });
    const score = computeBaiwaScore(seattle, noaa, null, []);
    expect(score.fusedTempF).toBe(72);
    expect(score.fusedSummary).toBe("Sunny");
  });
});

describe("findForecastPeriodForObservation", () => {
  const periods: ForecastPeriod[] = [
    {
      id: "1",
      provider: "noaa",
      name: "Morning",
      startTime: "2026-05-23T12:00:00Z",
      endTime: "2026-05-23T18:00:00Z",
      isDaytime: true,
      temperatureF: 60,
      precipChance: null,
      windMph: null,
      shortDescription: "Cloudy",
    },
    {
      id: "2",
      provider: "noaa",
      name: "Evening",
      startTime: "2026-05-23T18:00:00Z",
      endTime: "2026-05-24T00:00:00Z",
      isDaytime: false,
      temperatureF: 55,
      precipChance: null,
      windMph: null,
      shortDescription: "Clear",
    },
  ];

  it("returns the period that contains the timestamp", () => {
    const result = findForecastPeriodForObservation(
      periods,
      new Date("2026-05-23T15:00:00Z")
    );
    expect(result?.id).toBe("1");
  });

  it("returns the nearest period when none contains the timestamp", () => {
    const result = findForecastPeriodForObservation(
      periods,
      new Date("2026-05-24T06:00:00Z")
    );
    expect(result?.id).toBe("2");
  });

  it("returns null for an empty period list", () => {
    expect(findForecastPeriodForObservation([], new Date())).toBeNull();
  });
});
