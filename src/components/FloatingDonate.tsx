import { DONATE_URL } from "../config/donate";

export function FloatingDonate() {
  return (
    <a
      href={DONATE_URL}
      className="float-donate"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Donate to support Baiwa Weather"
      title="Donate"
    >
      <svg
        className="float-donate__bolt"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
        />
      </svg>
    </a>
  );
}
