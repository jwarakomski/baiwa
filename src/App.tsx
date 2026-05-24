import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { CurrentConditionsCard } from "./components/CurrentConditionsCard";
import { ForecastPanel } from "./components/ForecastPanel";
import { ProviderCompare } from "./components/ProviderCompare";
import { BaiwaModelCard } from "./components/BaiwaModelCard";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { SplashHero } from "./components/SplashHero";
import { RadarCard } from "./components/RadarCard";
import { ContributorSignup } from "./components/ContributorSignup";
import { DonateButton } from "./components/DonateButton";
import {
  accuweatherEnabled,
  fetchAccuweatherForecast,
} from "./services/accuweather";
import { fetchNoaaForecast } from "./services/noaa";
import { computeBaiwaScore } from "./services/model";
import {
  addFeedback,
  clearFeedback,
  loadFeedback,
  removeFeedback,
} from "./services/feedback";
import {
  addContributor,
  loadContributors,
} from "./services/contributors";
import {
  DEFAULT_LOCATION,
  formatLocation,
  locationSourceLabel,
  requestBrowserLocation,
  resolveUserLocation,
  type LocationSource,
} from "./services/location";
import type {
  AccuracyFeedback,
  Contributor,
  ForecastPeriod,
  GeoLocation,
  ProviderForecast,
} from "./types/weather";

const DEFAULT_LOCATION_FALLBACK = DEFAULT_LOCATION;

function App() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource | null>(
    null
  );
  const [locating, setLocating] = useState(true);
  const [noaa, setNoaa] = useState<ProviderForecast | null>(null);
  const [accu, setAccu] = useState<ProviderForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ForecastPeriod | null>(
    null
  );
  const [feedback, setFeedback] = useState<AccuracyFeedback[]>(() =>
    loadFeedback()
  );
  const [contributors, setContributors] = useState<Contributor[]>(() =>
    loadContributors()
  );

  const contributorRef = useRef<HTMLElement | null>(null);
  const forecastAbortRef = useRef<AbortController | null>(null);
  const locationDetectRef = useRef(false);

  useEffect(() => {
    if (locationDetectRef.current) return;
    locationDetectRef.current = true;

    void (async () => {
      setLocating(true);
      try {
        const resolved = await resolveUserLocation();
        setLocation(resolved.location);
        setLocationSource(resolved.source);
      } catch {
        setLocation(DEFAULT_LOCATION_FALLBACK);
        setLocationSource("default");
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  const loadForecasts = useCallback(async (loc: GeoLocation) => {
    forecastAbortRef.current?.abort();
    const controller = new AbortController();
    forecastAbortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError(null);
    setNoaa(null);
    setAccu(null);
    const [noaaSettled, accuSettled] = await Promise.allSettled([
      fetchNoaaForecast(loc, signal),
      fetchAccuweatherForecast(loc, signal),
    ]);

    if (signal.aborted) return;

    if (noaaSettled.status === "fulfilled") {
      setNoaa(noaaSettled.value);
      setSelectedPeriod(noaaSettled.value.daily[0] ?? null);
      setError(null);
    } else {
      const message =
        noaaSettled.reason instanceof Error
          ? noaaSettled.reason.message
          : "Forecast load failed.";
      setError(`NOAA: ${message}`);
    }

    if (accuSettled.status === "fulfilled") {
      setAccu(accuSettled.value);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!location) return;
    void loadForecasts(location);
    return () => {
      forecastAbortRef.current?.abort();
    };
  }, [location, loadForecasts]);

  const baiwa = useMemo(
    () =>
      location
        ? computeBaiwaScore(location, noaa, accu, feedback)
        : computeBaiwaScore(DEFAULT_LOCATION_FALLBACK, noaa, accu, feedback),
    [location, noaa, accu, feedback]
  );

  function handleSelectLocation(loc: GeoLocation) {
    setLocation(loc);
    setLocationSource("manual");
  }

  async function handleUseMyLocation() {
    setLocating(true);
    setError(null);
    try {
      const resolved = await requestBrowserLocation();
      setLocation(resolved.location);
      setLocationSource(resolved.source);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not access your device location."
      );
    } finally {
      setLocating(false);
    }
  }

  function handleSubmitFeedback(
    entry: Omit<AccuracyFeedback, "id" | "createdAt">
  ) {
    const saved = addFeedback(entry);
    setFeedback((prev) => [saved, ...prev]);
  }

  function handleRemoveFeedback(id: string) {
    removeFeedback(id);
    setFeedback((prev) => prev.filter((f) => f.id !== id));
  }

  function handleClearFeedback() {
    clearFeedback();
    setFeedback([]);
  }

  function handleSignup(entry: Omit<Contributor, "id" | "createdAt">) {
    const saved = addContributor(entry);
    setContributors((prev) => [saved, ...prev]);
  }

  function scrollToContributors() {
    contributorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand__mark" />
          <div className="brand__title">
            <strong>Baiwa Weather</strong>
            <span>Prototype &middot; NOAA + Feedback Fusion</span>
          </div>
        </div>
        <div className="header__meta">
          <span className="pill">
            <span className="pill__dot" /> NOAA live
          </span>
          <span className="pill">
            <span
              className={`pill__dot ${
                accuweatherEnabled ? "" : "pill__dot--off"
              }`}
            />
            AccuWeather {accuweatherEnabled ? "on" : "off"}
          </span>
          <span className="pill">
            <span className="pill__dot" /> Baiwa model v0.4
          </span>
        </div>
      </header>

      <SplashHero
        noaaOnline={!error}
        accuOnline={accuweatherEnabled}
        contributorCount={contributors.length}
        feedbackCount={feedback.length}
        onJoinClick={scrollToContributors}
      />

      <div id="dashboard" />

      <SearchBar
        onSelect={handleSelectLocation}
        initialQuery={location ? formatLocation(location) : ""}
        locating={locating}
        locationSource={locationSource}
        onUseMyLocation={handleUseMyLocation}
      />

      {locating && !location && (
        <div className="locating-banner">
          <span className="spinner" />
          Finding your location...
        </div>
      )}

      {location && locationSource && (
        <p className="location-source">{locationSourceLabel(locationSource)}</p>
      )}

      {error && <div className="error">{error}</div>}

      {location && (
        <>
      <div className="dashboard">
        <CurrentConditionsCard
          location={location}
          current={noaa?.current ?? null}
          nextPeriod={noaa?.hourly?.[0] ?? noaa?.daily?.[0] ?? null}
          baiwa={baiwa}
          alerts={noaa?.alerts ?? []}
          loading={loading || locating}
        />
        <BaiwaModelCard score={baiwa} />
      </div>

      <RadarCard
        station={noaa?.radarStation}
        forecastOffice={noaa?.forecastOffice}
      />

      <ForecastPanel
        daily={noaa?.daily ?? []}
        hourly={noaa?.hourly ?? []}
        selectedId={selectedPeriod?.id ?? null}
        onSelectPeriod={setSelectedPeriod}
      />

      <div className="dashboard">
        <ProviderCompare
          noaa={noaa}
          accu={accu}
          accuEnabled={accuweatherEnabled}
        />
        <FeedbackPanel
          location={location}
          selectedPeriod={selectedPeriod}
          feedback={feedback}
          onSubmit={handleSubmitFeedback}
          onRemove={handleRemoveFeedback}
          onClear={handleClearFeedback}
        />
      </div>
        </>
      )}

      <section className="donate-band" aria-label="Support Baiwa">
        <p className="donate-band__text">
          Help keep Baiwa Weather growing — forecasts, radar, and the Baibot advisor.
        </p>
        <DonateButton size="large" />
      </section>

      <ContributorSignup
        ref={contributorRef}
        contributors={contributors}
        onSignup={handleSignup}
      />

      <footer className="footer">
        <DonateButton className="footer__donate" />
        <p className="footer__copy">
          Data: NOAA / National Weather Service. Optional comparison: AccuWeather.
          Baiwa model v0.4 fuses provider agreement with your accuracy feedback.
        </p>
      </footer>
    </div>
  );
}

export default App;
