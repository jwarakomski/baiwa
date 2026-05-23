import { useEffect, useMemo, useState } from "react";

interface Props {
  station: string | null | undefined;
  forecastOffice?: string | null;
}

type Layer = "loop" | "still";

function radarUrl(site: string, layer: Layer, cacheBust: number): string {
  const base = "https://radar.weather.gov/ridge/standard";
  const file = layer === "loop" ? `${site}_loop.gif` : `${site}_0.gif`;
  return `${base}/${file}?t=${cacheBust}`;
}

function nationalUrl(layer: Layer, cacheBust: number): string {
  const base = "https://radar.weather.gov/ridge/standard";
  const file =
    layer === "loop" ? "CONUS-LARGE_loop.gif" : "CONUS-LARGE_0.gif";
  return `${base}/${file}?t=${cacheBust}`;
}

export function RadarCard({ station, forecastOffice }: Props) {
  const [layer, setLayer] = useState<Layer>("loop");
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
    setCacheBust(Date.now());
  }, [station, layer]);

  const url = useMemo(() => {
    if (station && !errored) return radarUrl(station, layer, cacheBust);
    return nationalUrl(layer, cacheBust);
  }, [station, layer, cacheBust, errored]);

  const showingNational = !station || errored;

  return (
    <section className="card radar">
      <div className="card__header">
        <div>
          <div className="card__title">NOAA Radar</div>
          <div className="card__subtitle">
            {showingNational
              ? "National CONUS mosaic"
              : `Station ${station}${
                  forecastOffice ? ` \u00b7 office ${forecastOffice}` : ""
                }`}
          </div>
        </div>
        <div className="tabs">
          <button
            className={`tab ${layer === "loop" ? "is-active" : ""}`}
            onClick={() => setLayer("loop")}
          >
            Loop
          </button>
          <button
            className={`tab ${layer === "still" ? "is-active" : ""}`}
            onClick={() => setLayer("still")}
          >
            Latest
          </button>
          <button
            className="tab"
            onClick={() => setCacheBust(Date.now())}
            title="Refresh"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="radar__frame">
        <img
          src={url}
          alt={
            showingNational
              ? "NOAA national radar"
              : `NOAA radar at station ${station}`
          }
          onError={() => setErrored(true)}
        />
        <div className="radar__legend">
          <span>Light</span>
          <div className="radar__legend-bar" />
          <span>Heavy precip</span>
        </div>
      </div>

      <div className="radar__footer">
        <a
          href={
            showingNational
              ? "https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnt9fQ%3D%3D"
              : `https://radar.weather.gov/station/${station?.toLowerCase()}/standard`
          }
          target="_blank"
          rel="noreferrer"
        >
          Open in NOAA Radar Viewer &rarr;
        </a>
        <span className="card__subtitle">
          Auto-refresh on station change &middot; image courtesy NOAA NWS
        </span>
      </div>
    </section>
  );
}
