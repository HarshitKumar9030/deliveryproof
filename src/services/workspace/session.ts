export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  if (process.env.APP_ORIGIN) return origin === process.env.APP_ORIGIN;
  try {
    const supplied = new URL(origin);
    const host = request.headers.get('host') || new URL(request.url).host;
    return (supplied.protocol === 'https:' || supplied.protocol === 'http:') && supplied.host === host;
  } catch { return false; }
}

/** Single-process workspace limits; replace with a shared store before scaling. */
const buckets = new Map<string, { count: number; expires: number }>();
export function takeLimit(key: string, maximum: number, interval: number, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || current.expires <= now) {
    buckets.set(key, { count: 1, expires: now + interval });
    return true;
  }
  if (current.count >= maximum) return false;
  current.count++;
  return true;
}
