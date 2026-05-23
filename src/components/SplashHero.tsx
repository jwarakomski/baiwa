interface Props {
  noaaOnline: boolean;
  accuOnline: boolean;
  contributorCount: number;
  feedbackCount: number;
  onJoinClick: () => void;
}

export function SplashHero({
  noaaOnline,
  accuOnline,
  contributorCount,
  feedbackCount,
  onJoinClick,
}: Props) {
  return (
    <section className="splash">
      <div className="splash__bg" aria-hidden="true">
        <span className="splash__orb splash__orb--a" />
        <span className="splash__orb splash__orb--b" />
        <span className="splash__orb splash__orb--c" />
        <svg
          className="splash__grid"
          viewBox="0 0 1200 400"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(124,242,255,0)" />
              <stop offset="50%" stopColor="rgba(124,242,255,0.5)" />
              <stop offset="100%" stopColor="rgba(91,108,255,0)" />
            </linearGradient>
          </defs>
          {Array.from({ length: 9 }).map((_, i) => {
            const y = 40 + i * 40;
            return (
              <path
                key={i}
                d={`M0 ${y} Q300 ${y - 30} 600 ${y} T1200 ${y}`}
                stroke="url(#line)"
                strokeWidth="1"
                fill="none"
                opacity={0.6 - i * 0.05}
              />
            );
          })}
        </svg>
      </div>

      <div className="splash__content">
        <span className="splash__eyebrow">
          <span className="pill__dot" /> Baiwa Weather Lab &middot; v0.2
        </span>
        <h1 className="splash__title">
          Forecasts that <span className="splash__title-accent">learn</span>{" "}
          from the people who live there.
        </h1>
        <p className="splash__lede">
          We blend live NOAA feeds, optional AccuWeather signals, and your
          ground-truth observations to train a forecasting model that's unique
          to Baiwa &mdash; transparent, local, and yours.
        </p>

        <div className="splash__cta-row">
          <button className="btn btn--primary" onClick={onJoinClick}>
            Become a contributor
          </button>
          <a className="btn btn--ghost" href="#dashboard">
            Skip to forecast
          </a>
        </div>

        <div className="splash__stats">
          <div className="splash__stat">
            <span className="splash__stat-value">122+</span>
            <span className="splash__stat-label">NOAA radar sites</span>
          </div>
          <div className="splash__stat">
            <span className="splash__stat-value">{feedbackCount}</span>
            <span className="splash__stat-label">Reports submitted</span>
          </div>
          <div className="splash__stat">
            <span className="splash__stat-value">{contributorCount}</span>
            <span className="splash__stat-label">Contributors signed up</span>
          </div>
          <div className="splash__stat">
            <span className="splash__stat-value">
              {noaaOnline ? "Live" : "Offline"}
            </span>
            <span className="splash__stat-label">
              NOAA feed{accuOnline ? " + AccuWeather" : ""}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
