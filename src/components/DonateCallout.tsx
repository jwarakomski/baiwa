import { DonateButton } from "./DonateButton";

export function DonateCallout() {
  return (
    <section className="donate-callout" aria-label="Support Baiwa">
      <p className="donate-callout__text">
        Help us grow Baiwa Weather — better local forecasts, radar, and the Baibot
        advisor for everyone. Your contribution is very much appreciated.
      </p>
      <DonateButton size="large" />
    </section>
  );
}
