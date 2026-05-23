import type { ProviderForecast } from "../types/weather";

interface Props {
  noaa: ProviderForecast | null;
  accu: ProviderForecast | null;
  accuEnabled: boolean;
}

function tempOf(p: ProviderForecast | null): number | null {
  if (!p) return null;
  if (p.current?.temperatureF !== null && p.current?.temperatureF !== undefined) {
    return p.current.temperatureF;
  }
  return p.daily[0]?.temperatureF ?? null;
}

function summaryOf(p: ProviderForecast | null): string | null {
  if (!p) return null;
  return p.current?.shortDescription ?? p.daily[0]?.shortDescription ?? null;
}

export function ProviderCompare({ noaa, accu, accuEnabled }: Props) {
  const noaaTemp = tempOf(noaa);
  const accuTemp = tempOf(accu);
  return (
    <section className="card">
      <div className="card__header">
        <div>
          <div className="card__title">Provider Comparison</div>
          <div className="card__subtitle">
            Side-by-side reads to seed the Baiwa fusion model
          </div>
        </div>
      </div>
      <div className="providers">
        <div className="provider">
          <div className="provider__head">
            <span className="provider__name">NOAA / NWS</span>
            <span className="pill">
              <span className="pill__dot" /> Primary
            </span>
          </div>
          <span className="provider__temp">
            {noaaTemp !== null ? `${noaaTemp}\u00b0` : "--"}
          </span>
          <span className="provider__desc">
            {summaryOf(noaa) ?? "Awaiting data"}
          </span>
        </div>
        <div className="provider">
          <div className="provider__head">
            <span className="provider__name">AccuWeather</span>
            <span className="pill">
              <span
                className={`pill__dot ${
                  accuEnabled ? "" : "pill__dot--off"
                }`}
              />
              {accuEnabled ? "Comparison" : "Disabled"}
            </span>
          </div>
          {accuEnabled ? (
            <>
              <span className="provider__temp">
                {accuTemp !== null ? `${accuTemp}\u00b0` : "--"}
              </span>
              <span className="provider__desc">
                {summaryOf(accu) ?? "Loading..."}
              </span>
              {accu?.warnings?.[0] && (
                <span className="provider__missing">
                  {accu.warnings[0]}
                </span>
              )}
            </>
          ) : (
            <span className="provider__missing">
              Add VITE_ACCUWEATHER_API_KEY to .env to enable comparison.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
