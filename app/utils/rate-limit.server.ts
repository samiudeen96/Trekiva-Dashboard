// Small in-memory sliding-window limiter. It resets when the server restarts
// and is per server instance, which is enough to blunt guessing on a single
// instance; use a shared store (for example Redis) if the app is scaled out.

const hits = new Map<string, number[]>();

// Returns true if this hit is allowed, false if the limit is already reached.
export function allow(key: string, limit: number, windowMs: number, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

// Counts a hit without deciding, used to record failed attempts.
export function record(key: string, windowMs: number, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
}

export function count(key: string, windowMs: number, now = Date.now()) {
  return (hits.get(key) ?? []).filter((t) => now - t < windowMs).length;
}

// Drop old keys now and then so the map can't grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, times] of hits) {
    if (!times.some((t) => now - t < 60 * 60 * 1000)) hits.delete(key);
  }
}, 10 * 60 * 1000).unref();
