/**
 * Cache layer — KOMIKU
 * Default: in-memory cache (per-instance).
 * Untuk Redis: install ioredis + set REDIS_URL di env, lalu uncomment bagian Redis.
 */

export const TTL = {
  genres:       3600 * 6,
  series:       3600 * 2,
  chapters:     60 * 10,
  home:         60 * 5,
  seriesDetail: 3600,
} as const

// ── In-memory cache ──────────────────────────────────────────────────────────
const memCache = new Map<string, { value: string; exp: number }>()

function memGet(key: string): string | null {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.exp) { memCache.delete(key); return null }
  return entry.value
}

function memSet(key: string, value: string, ttlSec: number) {
  if (memCache.size > 500) {
    const now = Date.now()
    for (const [k, v] of memCache) { if (now > v.exp) memCache.delete(k) }
  }
  memCache.set(key, { value, exp: Date.now() + ttlSec * 1000 })
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = memGet(key)
  return raw ? (JSON.parse(raw) as T) : null
}

export async function cacheSet<T>(key: string, value: T, ttl: number): Promise<void> {
  memSet(key, JSON.stringify(value), ttl)
}

export async function cacheDel(key: string): Promise<void> {
  memCache.delete(key)
}

export async function cached<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key)
  if (hit !== null) return hit
  const data = await fetcher()
  await cacheSet(key, data, ttl)
  return data
}
