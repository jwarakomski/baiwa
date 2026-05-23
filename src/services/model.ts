import type {
  AccuracyFeedback,
  BaiwaScore,
  BaiwaSignal,
  ForecastPeriod,
  GeoLocation,
  ProviderForecast,
} from "../types/weather";

const NEAR_RADIUS_KM = 75;

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function trustLabel(overall: number): BaiwaScore["trustLabel"] {
  if (overall >= 0.85) return "High";
  if (overall >= 0.7) return "Strong";
  if (overall >= 0.5) return "Moderate";
  return "Low";
}

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestCurrentTemp(
  forecast: ProviderForecast | null
): number | null {
  if (!forecast) return null;
  if (forecast.current?.temperatureF !== undefined && forecast.current?.temperatureF !== null) {
    return forecast.current.temperatureF;
  }
  return forecast.daily?.[0]?.temperatureF ?? forecast.hourly?.[0]?.temperatureF ?? null;
}

function nearestSummary(forecast: ProviderForecast | null): string | null {
  if (!forecast) return null;
  return (
    forecast.current?.shortDescription ??
    forecast.daily?.[0]?.shortDescription ??
    forecast.hourly?.[0]?.shortDescription ??
    null
  );
}

function relevantFeedback(
  feedback: AccuracyFeedback[],
  loc: GeoLocation
): AccuracyFeedback[] {
  return feedback.filter((entry) => {
    const distance = haversineKm(loc, {
      latitude: entry.latitude,
      longitude: entry.longitude,
    });
    return distance <= NEAR_RADIUS_KM;
  });
}

export function computeBaiwaScore(
  loc: GeoLocation,
  noaa: ProviderForecast | null,
  accu: ProviderForecast | null,
  feedback: AccuracyFeedback[]
): BaiwaScore {
  const noaaTemp = nearestCurrentTemp(noaa);
  const accuTemp = nearestCurrentTemp(accu);
  const noaaSummary = nearestSummary(noaa);
  const accuSummary = nearestSummary(accu);

  let providerAgreement = 0.6;
  let agreementDetail = "Single provider available; agreement is unverified.";
  if (noaaTemp !== null && accuTemp !== null) {
    const delta = Math.abs(noaaTemp - accuTemp);
    providerAgreement = clamp01(1 - delta / 12);
    agreementDetail = `NOAA ${noaaTemp}\u00b0F vs AccuWeather ${accuTemp}\u00b0F (\u0394 ${delta.toFixed(0)}\u00b0F).`;
  } else if (noaaTemp !== null || accuTemp !== null) {
    providerAgreement = 0.55;
  } else {
    providerAgreement = 0.3;
    agreementDetail = "No current temperature available from any provider yet.";
  }

  const local = relevantFeedback(feedback, loc);
  const sample = local.length;

  let feedbackAccuracy = 0.65;
  let feedbackDetail = "No nearby user feedback yet. Defaulting to neutral trust.";
  if (sample > 0) {
    const score = local.reduce((acc, f) => {
      if (f.wasAccurate === "yes") return acc + 1;
      if (f.wasAccurate === "partly") return acc + 0.5;
      return acc;
    }, 0);
    feedbackAccuracy = clamp01(score / sample);
    feedbackDetail = `${sample} report${sample === 1 ? "" : "s"} within ${NEAR_RADIUS_KM} km \u2192 ${(feedbackAccuracy * 100).toFixed(0)}% historic accuracy.`;
  }

  const tempDeltas = local
    .map((f) => {
      if (f.observedTempF === null || f.forecastedTempF === null) return null;
      return Math.abs(f.observedTempF - f.forecastedTempF);
    })
    .filter((v): v is number => v !== null);
  let observationCalibration = 0.7;
  let observationDetail = "No observed-vs-forecast deltas reported yet.";
  if (tempDeltas.length > 0) {
    const avgDelta =
      tempDeltas.reduce((a, b) => a + b, 0) / tempDeltas.length;
    observationCalibration = clamp01(1 - avgDelta / 10);
    observationDetail = `Average observed vs forecast \u0394 = ${avgDelta.toFixed(1)}\u00b0F across ${tempDeltas.length} report${tempDeltas.length === 1 ? "" : "s"}.`;
  }

  let confidenceWeight = 0.6;
  let confidenceDetail = "User confidence not provided yet.";
  if (sample > 0) {
    const avgConfidence =
      local.reduce((acc, f) => acc + (f.confidence || 0), 0) / sample;
    confidenceWeight = clamp01(avgConfidence / 5);
    confidenceDetail = `Average user confidence ${avgConfidence.toFixed(1)} / 5 across ${sample} report${sample === 1 ? "" : "s"}.`;
  }

  const signals: BaiwaSignal[] = [
    {
      label: "Provider Agreement",
      value: providerAgreement,
      weight: 0.4,
      detail: agreementDetail,
    },
    {
      label: "Local Feedback Accuracy",
      value: feedbackAccuracy,
      weight: 0.35,
      detail: feedbackDetail,
    },
    {
      label: "Observation Calibration",
      value: observationCalibration,
      weight: 0.15,
      detail: observationDetail,
    },
    {
      label: "User Confidence",
      value: confidenceWeight,
      weight: 0.1,
      detail: confidenceDetail,
    },
  ];

  const overall = clamp01(
    signals.reduce((acc, s) => acc + s.value * s.weight, 0)
  );

  let fusedTempF: number | null = null;
  if (noaaTemp !== null && accuTemp !== null) {
    fusedTempF = Math.round((noaaTemp + accuTemp) / 2);
  } else {
    fusedTempF = noaaTemp ?? accuTemp;
  }

  const summaryParts = [noaaSummary, accuSummary].filter(Boolean) as string[];
  let fusedSummary = "Awaiting provider data...";
  if (summaryParts.length === 1) {
    fusedSummary = summaryParts[0];
  } else if (summaryParts.length > 1) {
    fusedSummary =
      summaryParts[0] === summaryParts[1]
        ? summaryParts[0]
        : `${summaryParts[0]} \u2022 AccuWeather: ${summaryParts[1]}`;
  }

  return {
    overall,
    trustLabel: trustLabel(overall),
    signals,
    fusedSummary,
    fusedTempF,
    providerAgreement,
    feedbackSampleSize: sample,
  };
}

export function findForecastPeriodForObservation(
  forecasts: ForecastPeriod[],
  at: Date = new Date()
): ForecastPeriod | null {
  const target = at.getTime();
  let best: ForecastPeriod | null = null;
  let bestDistance = Infinity;
  for (const period of forecasts) {
    const start = new Date(period.startTime).getTime();
    const end = new Date(period.endTime).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    if (target >= start && target <= end) return period;
    const distance = Math.min(Math.abs(target - start), Math.abs(target - end));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = period;
    }
  }
  return best;
}
