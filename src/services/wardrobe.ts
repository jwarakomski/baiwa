import type { CurrentConditions, ForecastPeriod, WeatherAlert } from "../types/weather";

export interface WardrobeAdvice {
  greeting: string;
  outfit: string[];
  bring: string[];
  vibe: "freezing" | "cold" | "cool" | "mild" | "warm" | "hot";
}

interface WardrobeInput {
  tempF: number | null;
  feelsLikeF: number | null;
  summary: string;
  humidity: number | null;
  windMph: number | null;
  precipChance: number | null;
  alerts: WeatherAlert[];
}

function effectiveTemp(input: WardrobeInput): number | null {
  return input.feelsLikeF ?? input.tempF;
}

function summaryHints(summary: string): {
  rain: boolean;
  snow: boolean;
  storm: boolean;
  sunny: boolean;
  fog: boolean;
} {
  const s = summary.toLowerCase();
  return {
    rain: /rain|shower|drizzle|storm|thunder/.test(s),
    snow: /snow|sleet|flurr|blizzard|ice/.test(s),
    storm: /thunder|lightning|severe|tornado|hail/.test(s),
    sunny: /sun|clear|fair/.test(s),
    fog: /fog|mist|haze/.test(s),
  };
}

function vibeFromTemp(temp: number): WardrobeAdvice["vibe"] {
  if (temp < 25) return "freezing";
  if (temp < 40) return "cold";
  if (temp < 55) return "cool";
  if (temp < 70) return "mild";
  if (temp < 82) return "warm";
  return "hot";
}

function greetingFor(vibe: WardrobeAdvice["vibe"], hints: ReturnType<typeof summaryHints>): string {
  if (hints.storm) return "Heads up — rough weather out there. Dress smart and travel light on metal.";
  if (hints.snow) return "Brr! It's a snow day vibe. Layer up and keep those toes dry.";
  if (hints.rain) return "Looks wet out there. I've got you covered — literally.";
  switch (vibe) {
    case "freezing":
      return "Bundle mode activated. You'll want every layer you've got.";
    case "cold":
      return "Crisp air today. Cozy layers are your best friend.";
    case "cool":
      return "Classic jacket weather. Comfortable with the right top.";
    case "mild":
      return "Pretty pleasant! One light layer should do it.";
    case "warm":
      return "Sun's doing work today. Keep it breezy and breathable.";
    case "hot":
      return "It's toasty. Think minimal, light, and hydrated.";
  }
}

export function buildWardrobeAdvice(input: WardrobeInput): WardrobeAdvice | null {
  const temp = effectiveTemp(input);
  if (temp === null) return null;

  const hints = summaryHints(input.summary);
  const precip =
    (input.precipChance ?? 0) >= 40 || hints.rain || hints.snow || hints.storm;
  const windy = (input.windMph ?? 0) >= 15;
  const humid = (input.humidity ?? 0) >= 75;
  const vibe = vibeFromTemp(temp);

  const outfit: string[] = [];
  const bring: string[] = [];

  if (vibe === "freezing" || vibe === "cold") {
    outfit.push("Heavy coat or parka", "Warm sweater", "Insulated pants");
    if (hints.snow) outfit.push("Waterproof boots");
    else outfit.push("Closed-toe shoes");
    bring.push("Gloves", "Beanie", "Scarf");
  } else if (vibe === "cool") {
    outfit.push("Medium jacket", "Long-sleeve top", "Jeans or chinos");
    outfit.push("Closed-toe shoes");
    if (windy) outfit.push("Wind-resistant layer");
  } else if (vibe === "mild") {
    outfit.push("Light jacket or hoodie", "Long or short sleeves", "Comfortable pants");
    outfit.push("Sneakers");
  } else if (vibe === "warm") {
    outfit.push("T-shirt or breathable top", "Shorts or light pants");
    outfit.push("Sneakers or sandals");
    if (hints.sunny) bring.push("Sunglasses");
    if (humid) outfit.push("Moisture-wicking fabric");
  } else {
    outfit.push("Light tank or tee", "Shorts", "Sandals or breathable shoes");
    bring.push("Sunscreen", "Water bottle");
    if (hints.sunny) bring.push("Sunglasses", "Hat");
  }

  if (precip) {
    if (hints.snow) {
      bring.push("Umbrella (windproof)", "Hand warmers");
      if (!outfit.includes("Waterproof boots")) outfit.push("Waterproof boots");
    } else {
      bring.push("Compact umbrella", "Water-resistant jacket");
    }
  }

  if (windy && !bring.includes("Wind-resistant layer")) {
    bring.push("Hair tie / cap (wind)");
  }

  if (hints.fog) {
    bring.push("Reflective gear if walking");
  }

  if (input.alerts.length > 0) {
    bring.push("Check active weather alerts");
  }

  if (vibe === "warm" || vibe === "hot") {
    if (!bring.includes("Water bottle")) bring.push("Water bottle");
  }

  // Deduplicate while preserving order
  const dedupe = (items: string[]) => [...new Set(items)];

  return {
    greeting: greetingFor(vibe, hints),
    outfit: dedupe(outfit).slice(0, 4),
    bring: dedupe(bring).slice(0, 5),
    vibe,
  };
}

export function wardrobeFromWeather(
  current: CurrentConditions | null,
  nextPeriod: ForecastPeriod | null,
  alerts: WeatherAlert[],
  summaryFallback: string
): WardrobeAdvice | null {
  return buildWardrobeAdvice({
    tempF: current?.temperatureF ?? nextPeriod?.temperatureF ?? null,
    feelsLikeF: current?.feelsLikeF ?? null,
    summary: current?.shortDescription ?? nextPeriod?.shortDescription ?? summaryFallback,
    humidity: current?.humidity ?? null,
    windMph: current?.windMph ?? nextPeriod?.windMph ?? null,
    precipChance: nextPeriod?.precipChance ?? null,
    alerts,
  });
}
