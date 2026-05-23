import { useEffect, useRef, useState } from "react";
import { formatLocation, geocode } from "../services/geocoding";
import type { LocationSource } from "../services/location";
import type { GeoLocation } from "../types/weather";

interface Props {
  onSelect: (loc: GeoLocation) => void;
  initialQuery?: string;
  locating?: boolean;
  locationSource?: LocationSource | null;
  onUseMyLocation?: () => void;
}

export function SearchBar({
  onSelect,
  initialQuery = "",
  locating = false,
  onUseMyLocation,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function runSearch(value: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await geocode(value);
        setResults(found);
        setOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 220);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const found = await geocode(query);
      if (found.length === 0) {
        setError("No matching locations found.");
        return;
      }
      onSelect(found[0]);
      setQuery(formatLocation(found[0]));
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="search" ref={wrapRef}>
      <form className="search__row" onSubmit={handleSubmit}>
        <input
          className="search__input"
          placeholder="Search a city, town, or zip..."
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            runSearch(v);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        <button className="btn btn--primary" type="submit" disabled={loading || locating}>
          {loading ? "Searching..." : locating ? "Locating..." : "Get Forecast"}
        </button>
        {onUseMyLocation && (
          <button
            className="btn btn--ghost"
            type="button"
            disabled={locating}
            onClick={onUseMyLocation}
            title="Use device GPS location"
          >
            {locating ? "Locating..." : "Use my location"}
          </button>
        )}
      </form>
      {error && <div className="error">{error}</div>}
      {open && results.length > 0 && (
        <div className="search__suggestions">
          {results.map((r) => (
            <button
              type="button"
              className="search__suggestion"
              key={`${r.latitude}-${r.longitude}-${r.name}`}
              onClick={() => {
                onSelect(r);
                setQuery(formatLocation(r));
                setOpen(false);
              }}
            >
              <span>{formatLocation(r)}</span>
              <span className="search__suggestion-coords">
                {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
