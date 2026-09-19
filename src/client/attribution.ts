const SOURCE_KEY = "frontdesk_ref";
const MAX_SOURCE_LENGTH = 120;

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim().slice(0, MAX_SOURCE_LENGTH) ?? "";
  return normalized || null;
}

/** Capture a truthful ref query parameter once per browser session. */
export function captureAttributionSource(): string | null {
  if (typeof window === "undefined") return null;
  const fromQuery = clean(new URLSearchParams(window.location.search).get("ref"));
  if (fromQuery) {
    window.sessionStorage.setItem(SOURCE_KEY, fromQuery);
    return fromQuery;
  }
  return clean(window.sessionStorage.getItem(SOURCE_KEY));
}

export function attributionSource(): string | null {
  if (typeof window === "undefined") return null;
  return clean(window.sessionStorage.getItem(SOURCE_KEY));
}
