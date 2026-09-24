import { fetchEndpoint, fetchTranslations } from "./client.js";
import { resolveTranslations } from "./resolve.js";
import type { GameMode, JsonRecord, Lang } from "./types.js";

interface CacheEntry {
  data: JsonRecord;
  fetchedAt: number;
}

function ttlMs(): number {
  const raw = Number(process.env.TARKOV_CACHE_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 3_600_000;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<JsonRecord>>();

function cacheKey(name: string, gameMode: GameMode, lang: Lang): string {
  return `${name}:${gameMode}:${lang}`;
}

/** Fetches (or returns cached) data for a bulk endpoint, with translation keys already resolved to real text. */
export async function getResolvedData(name: string, gameMode: GameMode, lang: Lang): Promise<JsonRecord> {
  const key = cacheKey(name, gameMode, lang);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < ttlMs()) {
    return cached.data;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const [envelope, translations] = await Promise.all([
      fetchEndpoint(name, gameMode),
      fetchTranslations(name, gameMode, lang).catch(() => ({})),
    ]);
    const resolved = resolveTranslations(envelope.data, translations);
    cache.set(key, { data: resolved, fetchedAt: Date.now() });
    return resolved;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
