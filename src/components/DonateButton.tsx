import { DONATE_URL } from "../config/donate";

interface Props {
  className?: string;
  size?: "default" | "large";
}

export function DonateButton({ className = "", size = "default" }: Props) {
  return (
    <a
      href={DONATE_URL}
      className={`donate-btn donate-btn--${size} ${className}`.trim()}
      target="_blank"
      rel="noopener noreferrer"
    >
      Donate
    </a>
  );
}
