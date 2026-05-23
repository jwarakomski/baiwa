import { useMemo, useState } from "react";
import type { ForecastPeriod } from "../types/weather";

type Range = "daily" | "hourly";

interface Props {
  daily: ForecastPeriod[];
  hourly: ForecastPeriod[];
  selectedId: string | null;
  onSelectPeriod: (period: ForecastPeriod) => void;
}

export function ForecastPanel({
  daily,
  hourly,
  selectedId,
  onSelectPeriod,
}: Props) {
  const [range, setRange] = useState<Range>("daily");

  const periods = useMemo(() => {
    if (range === "hourly") return hourly.slice(0, 12);
    return daily.slice(0, 8);
  }, [range, daily, hourly]);

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <div className="card__title">NOAA Forecast</div>
          <div className="card__subtitle">
            Click a period to seed accuracy feedback
          </div>
        </div>
        <div className="tabs">
          <button
            className={`tab ${range === "daily" ? "is-active" : ""}`}
            onClick={() => setRange("daily")}
          >
            Daily
          </button>
          <button
            className={`tab ${range === "hourly" ? "is-active" : ""}`}
            onClick={() => setRange("hourly")}
          >
            Hourly
          </button>
        </div>
      </div>
      {periods.length === 0 ? (
        <div className="empty">No forecast yet.</div>
      ) : (
        <div className="forecast-grid">
          {periods.map((p) => (
            <button
              key={p.id}
              className={`period-card ${
                selectedId === p.id ? "is-selected" : ""
              }`}
              onClick={() => onSelectPeriod(p)}
            >
              <span className="period-card__name">{p.name}</span>
              <span className="period-card__temp">{p.temperatureF}&deg;</span>
              <span className="period-card__desc">{p.shortDescription}</span>
              <span className="period-card__meta">
                <span>
                  {p.precipChance !== null ? `${p.precipChance}% precip` : ""}
                </span>
                <span>
                  {p.windMph !== null ? `${p.windMph} mph` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
