import { forwardRef, useState } from "react";
import type { Contributor } from "../types/weather";

interface Props {
  contributors: Contributor[];
  onSignup: (entry: Omit<Contributor, "id" | "createdAt">) => void;
}

interface FormState {
  name: string;
  email: string;
  region: string;
  expertise: string;
  notes: string;
}

const blank: FormState = {
  name: "",
  email: "",
  region: "",
  expertise: "Hobbyist observer",
  notes: "",
};

export const ContributorSignup = forwardRef<HTMLElement, Props>(
  function ContributorSignup({ contributors, onSignup }, ref) {
    const [form, setForm] = useState<FormState>(blank);
    const [justSignedUp, setJustSignedUp] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      const name = form.name.trim();
      const email = form.email.trim();
      const region = form.region.trim();
      if (!name) {
        setError("Please add your name.");
        return;
      }
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        setError("Please enter a valid email address.");
        return;
      }
      onSignup({
        name,
        email,
        region,
        expertise: form.expertise,
        notes: form.notes.trim(),
      });
      setJustSignedUp(name);
      setForm(blank);
    }

    return (
      <section className="card contributor" id="contributors" ref={ref}>
        <div className="card__header">
          <div>
            <div className="card__title">Become a Baiwa Contributor</div>
            <div className="card__subtitle">
              Submit ground-truth observations and shape the model for your
              region.
            </div>
          </div>
          <span className="pill">
            <span className="pill__dot" />
            {contributors.length} signed up
          </span>
        </div>

        <div className="contributor__layout">
          <div className="contributor__pitch">
            <h3>Why contribute?</h3>
            <ul>
              <li>
                <strong>Train a local model.</strong> Your observations weight
                Baiwa&apos;s forecasts toward your microclimate.
              </li>
              <li>
                <strong>See the math.</strong> Every signal is transparent &mdash; no
                black-box predictions.
              </li>
              <li>
                <strong>Stay in the loop.</strong> We&apos;ll email when your
                region&apos;s model improves, and never share your data.
              </li>
            </ul>
            <div className="contributor__quote">
              &ldquo;Hyperlocal forecasts only get good when the people on the
              ground tell us what really happened.&rdquo;
            </div>
          </div>

          <form className="contributor__form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Avery Storm"
                required
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="field">
              <label>Region you cover</label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="e.g. Olympic Peninsula, WA"
              />
            </div>
            <div className="field">
              <label>Background</label>
              <select
                value={form.expertise}
                onChange={(e) =>
                  setForm({ ...form, expertise: e.target.value })
                }
              >
                <option>Hobbyist observer</option>
                <option>CoCoRaHS / Skywarn volunteer</option>
                <option>Pilot / mariner</option>
                <option>Farmer / outdoor operator</option>
                <option>Researcher / meteorologist</option>
                <option>Just curious</option>
              </select>
            </div>
            <div className="field field--full">
              <label>What microclimate quirks should we know about?</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. The valley fogs out below 45F, even when forecast is clear."
              />
            </div>
            {error && (
              <div className="error field--full">{error}</div>
            )}
            {justSignedUp && (
              <div className="contributor__success field--full">
                Thanks, <strong>{justSignedUp}</strong>! You&apos;re on the
                early-access list. We&apos;ll reach out when the Baiwa model
                trains on your region.
              </div>
            )}
            <div className="field field--full">
              <button className="btn btn--primary" type="submit">
                Sign me up
              </button>
            </div>
          </form>
        </div>

        {contributors.length > 0 && (
          <div className="contributor__roster">
            <div className="section-title">Recent signups</div>
            <div className="contributor__chips">
              {contributors.slice(0, 8).map((c) => (
                <span className="contributor__chip" key={c.id}>
                  <strong>{c.name.split(" ")[0]}</strong>
                  {c.region ? ` \u00b7 ${c.region}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }
);
