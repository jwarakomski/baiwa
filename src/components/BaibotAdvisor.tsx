import { useMemo } from "react";
import { wardrobeFromWeather } from "../services/wardrobe";
import type {
  CurrentConditions,
  ForecastPeriod,
  WeatherAlert,
} from "../types/weather";

interface Props {
  current: CurrentConditions | null;
  nextPeriod: ForecastPeriod | null;
  alerts: WeatherAlert[];
  summaryFallback: string;
  loading: boolean;
}

const VIBE_EMOJI: Record<string, string> = {
  freezing: "🧊",
  cold: "🧣",
  cool: "🍂",
  mild: "🌤️",
  warm: "☀️",
  hot: "🔥",
};

function BaibotMascot({ vibe }: { vibe?: string }) {
  return (
    <div
      className={`wardrobe__bot ${vibe ? `wardrobe__bot--${vibe}` : ""}`}
      aria-hidden="true"
    >
      <span className="wardrobe__bot-antenna" />
      <span className="wardrobe__bot-head">
        <span className="wardrobe__bot-eye wardrobe__bot-eye--l" />
        <span className="wardrobe__bot-eye wardrobe__bot-eye--r" />
        <span className="wardrobe__bot-smile" />
        <span className="wardrobe__bot-blush wardrobe__bot-blush--l" />
        <span className="wardrobe__bot-blush wardrobe__bot-blush--r" />
      </span>
      <span className="wardrobe__bot-body">
        <span className="wardrobe__bot-badge">Bb</span>
      </span>
    </div>
  );
}

export function BaibotAdvisor({
  current,
  nextPeriod,
  alerts,
  summaryFallback,
  loading,
}: Props) {
  const advice = useMemo(
    () => wardrobeFromWeather(current, nextPeriod, alerts, summaryFallback),
    [current, nextPeriod, alerts, summaryFallback]
  );

  if (loading && !advice) {
    return (
      <aside className="wardrobe wardrobe--loading" aria-label="Baibot wardrobe advisor">
        <BaibotMascot />
        <div className="wardrobe__bubble wardrobe__bubble--muted">
          Baibot is scanning the forecast for outfit ideas...
        </div>
      </aside>
    );
  }

  if (!advice) return null;

  return (
    <aside className="wardrobe" aria-label="Baibot wardrobe advisor">
      <div className="wardrobe__bot-wrap">
        <BaibotMascot vibe={advice.vibe} />
        <span className="wardrobe__bot-name">Baibot</span>
      </div>

      <div className="wardrobe__bubble">
        <p className="wardrobe__greeting">
          {VIBE_EMOJI[advice.vibe] ?? "👋"} {advice.greeting}
        </p>

        <div className="wardrobe__section">
          <span className="wardrobe__label">Wear</span>
          <div className="wardrobe__chips">
            {advice.outfit.map((item) => (
              <span className="wardrobe__chip wardrobe__chip--outfit" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>

        {advice.bring.length > 0 && (
          <div className="wardrobe__section">
            <span className="wardrobe__label">Bring with you</span>
            <div className="wardrobe__chips">
              {advice.bring.map((item) => (
                <span className="wardrobe__chip wardrobe__chip--bring" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
