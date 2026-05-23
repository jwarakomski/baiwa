import type { BaiwaScore } from "../types/weather";

interface Props {
  score: BaiwaScore;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BaiwaModelCard({ score }: Props) {
  const offset = CIRCUMFERENCE * (1 - score.overall);
  return (
    <section className="card score">
      <div className="card__header">
        <div>
          <div className="card__title">Baiwa Model</div>
          <div className="card__subtitle">
            Fused signal from providers + your feedback
          </div>
        </div>
      </div>
      <div className="score__head">
        <div className="score__ring">
          <svg viewBox="0 0 110 110">
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7cf2ff" />
                <stop offset="100%" stopColor="#5b6cff" />
              </linearGradient>
            </defs>
            <circle
              cx="55"
              cy="55"
              r={RADIUS}
              stroke="rgba(135,175,255,0.18)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="55"
              cy="55"
              r={RADIUS}
              stroke="url(#ring)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="score__ring-label">
            <span className="score__ring-value">
              {Math.round(score.overall * 100)}
            </span>
            <span className="score__ring-trust">{score.trustLabel}</span>
          </div>
        </div>
        <div className="score__head-text">
          <h3>BaiwaScore</h3>
          <p>{score.fusedSummary}</p>
          <p>
            Fused temp:{" "}
            <strong>
              {score.fusedTempF !== null ? `${score.fusedTempF}\u00b0F` : "--"}
            </strong>
            {" \u00b7 "}
            Reports: <strong>{score.feedbackSampleSize}</strong>
          </p>
        </div>
      </div>
      <div className="signals">
        {score.signals.map((s) => (
          <div className="signal" key={s.label}>
            <div className="signal__top">
              <span>{s.label}</span>
              <span>
                {Math.round(s.value * 100)}{" "}
                <span style={{ color: "var(--text-mute)" }}>
                  &middot; w {Math.round(s.weight * 100)}%
                </span>
              </span>
            </div>
            <div className="signal__bar">
              <span
                className="signal__bar-fill"
                style={{ width: `${Math.round(s.value * 100)}%` }}
              />
            </div>
            <span className="signal__detail">{s.detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
