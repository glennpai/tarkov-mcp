import type { Envelope, GameMode, JsonRecord, JsonValue, Lang, TranslationDict } from "./types.js";

function apiBase(): string {
  return (process.env.TARKOV_API_BASE ?? "https://json.tarkov.dev").replace(/\/+$/, "");
}

async function fetchJson(path: string): Promise<JsonValue> {
  const url = `${apiBase()}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Tarkov API request failed (${res.status} ${res.statusText}): ${url}`);
  }
  return (await res.json()) as JsonValue;
}

export async function fetchEndpoint(name: string, gameMode: GameMode): Promise<Envelope> {
  const json = await fetchJson(`/${gameMode}/${name}`);
  return json as unknown as Envelope;
}

export async function fetchTranslations(name: string, gameMode: GameMode, lang: Lang): Promise<TranslationDict> {
  const json = await fetchJson(`/${gameMode}/${name}_${lang}`);
  const envelope = json as unknown as Envelope;
  return (envelope.data ?? {}) as TranslationDict;
}

export async function fetchStatus(): Promise<JsonRecord> {
  const json = await fetchJson(`/status`);
  const envelope = json as unknown as Envelope;
  return envelope.data;
}

export async function fetchPriceHistory(itemId: string, gameMode: GameMode): Promise<JsonValue> {
  const json = await fetchJson(`/${gameMode}/prices/${encodeURIComponent(itemId)}`);
  const envelope = json as unknown as Envelope;
  return envelope.data;
}
