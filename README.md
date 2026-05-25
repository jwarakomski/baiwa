# Baiwa Weather

A polished prototype that fuses NOAA / National Weather Service forecasts with
optional AccuWeather data and your own accuracy feedback to seed a Baiwa-specific
weather model.

## Stack

- Vite + React + TypeScript
- Open-Meteo geocoding (no key, used only to resolve a location name to lat/lon)
- NOAA api.weather.gov (no key, descriptive `User-Agent` recommended)
- AccuWeather (optional, used for provider comparison when a key is present)

## Setup

```bash
npm install
cp .env.example .env
# (optional) add your AccuWeather key to .env
npm run dev
```

Then open http://localhost:5173.

## Deploy (GitHub Pages)

Pushes to `main` deploy automatically via GitHub Actions.

**Live site:** https://baiwa.org/ (GitHub Pages; `jwarakomski.github.io/baiwa` redirects here)

One-time repo setup (if Pages is not enabled yet):

1. GitHub repo **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**

Optional: add `VITE_ACCUWEATHER_API_KEY` as a repository **secret** and reference it in `.github/workflows/deploy.yml` if you want AccuWeather on the public site (the key will be embedded in the client bundle).

## Environment

| Variable                     | Required | Notes                                                                   |
| ---------------------------- | -------- | ----------------------------------------------------------------------- |
| `VITE_NOAA_USER_AGENT`       | No       | Descriptive UA string sent to NOAA. Defaults to a baiwa-weather string. |
| `VITE_ACCUWEATHER_API_KEY`   | No       | If set, enables the AccuWeather comparison panel.                       |

## How the prototype works

1. You type a location. Open-Meteo geocoding resolves it to lat/lon and a name.
2. NOAA is queried via `/points/{lat},{lon}` and the returned forecast URLs are
   followed for daily and hourly forecasts.
3. If an AccuWeather key is configured, the same location is resolved to an
   AccuWeather location key and current conditions / 5-day forecast are pulled
   in parallel.
4. You can submit accuracy feedback for any forecast period (was it accurate?
   how confident are you? what did you actually observe?). Feedback is stored in
   `localStorage` for the prototype.
5. The Baiwa Model panel computes a transparent `BaiwaScore` from provider
   agreement, recent user-reported accuracy, and observed-vs-forecast deltas.
   This is the seed signal for a future trained model unique to Baiwa.

## Project layout

```
src/
  App.tsx                  Top-level dashboard
  index.css                Visual system (dark gradient + glass cards)
  components/              UI components for each panel
  services/
    geocoding.ts           Open-Meteo geocoding
    noaa.ts                NOAA / NWS client
    accuweather.ts         Optional AccuWeather client
    model.ts               Baiwa prototype scoring
    feedback.ts            localStorage-backed feedback store
  types/weather.ts         Normalized provider-agnostic types
```

## Notes

This is a prototype. The "Baiwa model" intentionally uses transparent heuristics
rather than pretending to be a trained ML model. The feedback store and provider
fusion are the foundation for training a real model later.
