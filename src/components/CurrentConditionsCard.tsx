import type {
  BaiwaScore,
  CurrentConditions,
  ForecastPeriod,
  GeoLocation,
  WeatherAlert,
} from "../types/weather";
import { BaibotAdvisor } from "./BaibotAdvisor";

interface Props {
  location: GeoLocation;
  current: CurrentConditions | null;
  nextPeriod: ForecastPeriod | null;
  baiwa: BaiwaScore;
  alerts: WeatherAlert[];
  loading: boolean;
}

function fmt(value: number | null | undefined, suffix: string): string {
  if (value === null || value === undefined) return "--";
  return `${value}${suffix}`;
}

export function CurrentConditionsCard({
  location,
  current,
  nextPeriod,
  baiwa,
  alerts,
  loading,
}: Props) {
  const localizedName = [location.name, location.region]
    .filter(Boolean)
    .join(", ");

  const display = baiwa.fusedTempF ?? current?.temperatureF ?? null;
  const summary = current?.shortDescription ?? baiwa.fusedSummary;

  return (
    <section className="card hero">
      <div className="hero__top">
        <div className="hero__location">
          <h1>{localizedName}</h1>
          <span>
            {location.country ?? ""} {" "}
            {location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}
          </span>
        </div>
        <div className="pill">
          <span className="pill__dot" />
          Live NOAA observation
        </div>
      </div>

      {loading && !current ? (
        <div className="hero__main">
          <div className="loading">
            <span className="spinner" />
            Pulling NOAA observation...
          </div>
          <BaibotAdvisor
            current={null}
            nextPeriod={nextPeriod}
            alerts={alerts}
            summaryFallback={baiwa.fusedSummary}
            loading={loading}
          />
        </div>
      ) : (
        <>
          <div className="hero__main">
            <div className="hero__temp">
              <span className="hero__temp-value">
                {display !== null ? `${display}\u00b0` : "--"}
              </span>
              <div className="hero__temp-meta">
                <strong>{summary || "--"}</strong>
                <span>
                  Feels like {fmt(current?.feelsLikeF ?? null, "\u00b0F")}
                </span>
                {current?.observedAt && (
                  <span>
                    Observed {new Date(current.observedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            <BaibotAdvisor
              current={current}
              nextPeriod={nextPeriod}
              alerts={alerts}
              summaryFallback={baiwa.fusedSummary}
              loading={loading}
            />
          </div>
          <div className="hero__metrics">
            <div className="metric">
              <span className="metric__label">Humidity</span>
              <span className="metric__value">
                {fmt(current?.humidity ?? null, "%")}
              </span>
              <span className="metric__sub">Relative</span>
            </div>
            <div className="metric">
              <span className="metric__label">Wind</span>
              <span className="metric__value">
                {fmt(current?.windMph ?? null, " mph")}
              </span>
              <span className="metric__sub">
                {current?.windDirection ?? "--"}
              </span>
            </div>
            <div className="metric">
              <span className="metric__label">Baiwa Trust</span>
              <span className="metric__value">
                {Math.round(baiwa.overall * 100)}
              </span>
              <span className="metric__sub">{baiwa.trustLabel} confidence</span>
            </div>
            <div className="metric">
              <span className="metric__label">Provider Agreement</span>
              <span className="metric__value">
                {Math.round(baiwa.providerAgreement * 100)}%
              </span>
              <span className="metric__sub">NOAA vs AccuWeather</span>
            </div>
          </div>
        </>
      )}

      {alerts.length > 0 && (
        <div className="alerts">
          {alerts.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className={
                a.severity?.toLowerCase().includes("severe") ||
                a.severity?.toLowerCase().includes("extreme")
                  ? "alert alert--severe"
                  : "alert"
              }
            >
              <strong>{a.event}</strong> &mdash; {a.headline}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
