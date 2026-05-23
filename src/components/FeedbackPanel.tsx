import { useEffect, useMemo, useState } from "react";
import type {
  AccuracyFeedback,
  ForecastPeriod,
  GeoLocation,
} from "../types/weather";

interface Props {
  location: GeoLocation;
  selectedPeriod: ForecastPeriod | null;
  feedback: AccuracyFeedback[];
  onSubmit: (entry: Omit<AccuracyFeedback, "id" | "createdAt">) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

interface FormState {
  observedTempF: string;
  observedSummary: string;
  wasAccurate: AccuracyFeedback["wasAccurate"];
  confidence: number;
  notes: string;
}

const initialForm: FormState = {
  observedTempF: "",
  observedSummary: "",
  wasAccurate: "yes",
  confidence: 4,
  notes: "",
};

export function FeedbackPanel({
  location,
  selectedPeriod,
  feedback,
  onSubmit,
  onRemove,
  onClear,
}: Props) {
  const [form, setForm] = useState<FormState>(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [selectedPeriod?.id]);

  const localFeedback = useMemo(
    () =>
      feedback.filter((f) => {
        return (
          Math.abs(f.latitude - location.latitude) < 1 &&
          Math.abs(f.longitude - location.longitude) < 1
        );
      }),
    [feedback, location.latitude, location.longitude]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const observedTempF =
      form.observedTempF.trim() === ""
        ? null
        : Number.parseFloat(form.observedTempF);
    onSubmit({
      locationName: [location.name, location.region]
        .filter(Boolean)
        .join(", "),
      latitude: location.latitude,
      longitude: location.longitude,
      forecastPeriodId: selectedPeriod?.id ?? null,
      forecastProvider: selectedPeriod?.provider ?? null,
      forecastedTempF: selectedPeriod?.temperatureF ?? null,
      forecastedSummary: selectedPeriod?.shortDescription ?? null,
      observedTempF: Number.isNaN(observedTempF) ? null : observedTempF,
      observedSummary: form.observedSummary,
      wasAccurate: form.wasAccurate,
      confidence: form.confidence,
      notes: form.notes,
    });
    setForm(initialForm);
  }

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <div className="card__title">Accuracy Feedback</div>
          <div className="card__subtitle">
            {selectedPeriod
              ? `Reporting on: ${selectedPeriod.name} \u00b7 ${selectedPeriod.temperatureF}\u00b0 \u00b7 ${selectedPeriod.shortDescription}`
              : "Pick a forecast period above to attach a report (optional)."}
          </div>
        </div>
        {feedback.length > 0 && (
          <button className="btn btn--ghost btn--small" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Was the forecast accurate?</label>
          <select
            value={form.wasAccurate}
            onChange={(e) =>
              setForm({
                ...form,
                wasAccurate: e.target
                  .value as AccuracyFeedback["wasAccurate"],
              })
            }
          >
            <option value="yes">Yes</option>
            <option value="partly">Partly</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="field">
          <label>Your confidence (1-5)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={form.confidence}
            onChange={(e) =>
              setForm({
                ...form,
                confidence: Math.max(
                  1,
                  Math.min(5, Number.parseInt(e.target.value, 10) || 1)
                ),
              })
            }
          />
        </div>
        <div className="field">
          <label>Observed temperature (&deg;F)</label>
          <input
            type="number"
            inputMode="decimal"
            placeholder={
              selectedPeriod ? `${selectedPeriod.temperatureF}` : "--"
            }
            value={form.observedTempF}
            onChange={(e) =>
              setForm({ ...form, observedTempF: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label>Observed conditions</label>
          <input
            type="text"
            placeholder="e.g. light rain, gusty"
            value={form.observedSummary}
            onChange={(e) =>
              setForm({ ...form, observedSummary: e.target.value })
            }
          />
        </div>
        <div className="field field--full">
          <label>Notes (optional)</label>
          <textarea
            placeholder="What did the forecast miss? Anything microclimatic?"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div className="field field--full">
          <button className="btn btn--primary" type="submit">
            Submit Report
          </button>
        </div>
      </form>

      <div style={{ marginTop: 18 }}>
        <div className="section-title">Recent reports for this area</div>
        {localFeedback.length === 0 ? (
          <div className="empty">
            No feedback yet. The Baiwa model will use these to learn.
          </div>
        ) : (
          <div className="feedback-list">
            {localFeedback.slice(0, 5).map((f) => (
              <div className="feedback-item" key={f.id}>
                <div className="feedback-item__top">
                  <span
                    className={`feedback-item__verdict feedback-item__verdict--${f.wasAccurate}`}
                  >
                    {f.wasAccurate === "yes"
                      ? "Accurate"
                      : f.wasAccurate === "partly"
                      ? "Partly"
                      : "Off"}
                  </span>
                  <span className="feedback-item__meta">
                    {new Date(f.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className="feedback-item__notes">
                  {f.observedSummary || "(no observed summary)"}
                  {f.observedTempF !== null
                    ? ` \u00b7 obs ${f.observedTempF}\u00b0F`
                    : ""}
                  {f.forecastedTempF !== null
                    ? ` \u00b7 forecast ${f.forecastedTempF}\u00b0F`
                    : ""}
                </span>
                {f.notes && (
                  <span className="feedback-item__meta">{f.notes}</span>
                )}
                <button
                  className="btn btn--ghost btn--small"
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => onRemove(f.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
