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
import type {
  AccuracyFeedback,
  Contributor,
  ForecastPeriod,
  GeoLocation,
  ProviderForecast,
} from "./types/weather";

const DEFAULT_LOCATION: GeoLocation = {
  name: "Seattle",
  region: "Washington",
  country: "United States",
  latitude: 47.6062,
  longitude: -122.3321,
};

function App() {
  const [location, setLocation] = useState<GeoLocation>(DEFAULT_LOCATION);
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

  const loadForecasts = useCallback(async (loc: GeoLocation) => {
    setLoading(true);
    setError(null);
    setNoaa(null);
    setAccu(null);
    try {
      const [noaaResult, accuResult] = await Promise.all([
        fetchNoaaForecast(loc).catch((err: Error) => {
          throw new Error(`NOAA: ${err.message}`);
        }),
        fetchAccuweatherForecast(loc),
      ]);
      setNoaa(noaaResult);
      setAccu(accuResult);
      setSelectedPeriod(noaaResult.daily[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Forecast load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForecasts(location);
  }, [location, loadForecasts]);

  const baiwa = useMemo(
    () => computeBaiwaScore(location, noaa, accu, feedback),
    [location, noaa, accu, feedback]
  );

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
            <span className="pill__dot" /> Baiwa model v0.1
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

      <SearchBar onSelect={setLocation} />

      {error && <div className="error">{error}</div>}

      <div className="dashboard">
        <CurrentConditionsCard
          location={location}
          current={noaa?.current ?? null}
          baiwa={baiwa}
          alerts={noaa?.alerts ?? []}
          loading={loading}
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

      <ContributorSignup
        ref={contributorRef}
        contributors={contributors}
        onSignup={handleSignup}
      />

      <footer className="footer">
        Data: NOAA / National Weather Service. Optional comparison: AccuWeather.
        Baiwa model v0.1 fuses provider agreement with your accuracy feedback.
      </footer>
    </div>
  );
}

export default App;
