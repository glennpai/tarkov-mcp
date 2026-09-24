import { getResolvedData } from "./cache.js";
import { ENDPOINT_SPECS, GLOBAL_NAME_SOURCES } from "./types.js";
import type { EndpointSpec, GameMode, JsonRecord, JsonValue, Lang } from "./types.js";

/** Normalizes a bulk endpoint's data (a list or an id-keyed dict, depending on the endpoint) into a Map<id, record>. */
export function getCollectionFromData(data: JsonRecord, spec: EndpointSpec): Map<string, JsonRecord> {
  let node: JsonValue = data;
  for (const segment of spec.collectionPath) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return new Map();
    node = node[segment];
  }

  if (Array.isArray(node)) {
    const map = new Map<string, JsonRecord>();
    for (const record of node) {
      if (record && typeof record === "object" && typeof (record as JsonRecord).id === "string") {
        map.set((record as JsonRecord).id as string, record as JsonRecord);
      }
    }
    return map;
  }

  if (node && typeof node === "object") {
    return new Map(Object.entries(node as Record<string, JsonRecord>));
  }

  return new Map();
}

export async function getCollection(name: keyof typeof ENDPOINT_SPECS, gameMode: GameMode, lang: Lang): Promise<Map<string, JsonRecord>> {
  const data = await getResolvedData(name, gameMode, lang);
  return getCollectionFromData(data, ENDPOINT_SPECS[name]);
}

function searchableText(record: JsonRecord): string {
  return [record.name, record.shortName, record.normalizedName]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
}

export function searchCollection(
  collection: Map<string, JsonRecord>,
  query: string | undefined,
  limit: number,
  extraFilter?: (record: JsonRecord) => boolean,
): JsonRecord[] {
  const q = query?.toLowerCase().trim() ?? "";
  const results: JsonRecord[] = [];
  for (const record of collection.values()) {
    if (extraFilter && !extraFilter(record)) continue;
    if (q && !searchableText(record).includes(q)) continue;
    results.push(record);
    if (results.length >= limit) break;
  }
  return results;
}

/** Finds one record by raw id, exact name/shortName/normalizedName match, or (last resort) name substring. */
export function findByIdOrName(collection: Map<string, JsonRecord>, idOrName: string): JsonRecord | undefined {
  const direct = collection.get(idOrName);
  if (direct) return direct;

  const q = idOrName.toLowerCase().trim();
  for (const record of collection.values()) {
    if (
      (typeof record.name === "string" && record.name.toLowerCase() === q) ||
      (typeof record.normalizedName === "string" && record.normalizedName.toLowerCase() === q) ||
      (typeof record.shortName === "string" && record.shortName.toLowerCase() === q)
    ) {
      return record;
    }
  }

  for (const record of collection.values()) {
    if (typeof record.name === "string" && record.name.toLowerCase().includes(q)) {
      return record;
    }
  }

  return undefined;
}

/** Builds a global id->name map across items/traders/maps/hideout, used to enrich cross-referenced ids in tool output. */
export async function buildGlobalNameMap(gameMode: GameMode, lang: Lang): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const collections = await Promise.all(GLOBAL_NAME_SOURCES.map((name) => getCollection(name, gameMode, lang)));
  for (const collection of collections) {
    for (const [id, record] of collection) {
      if (typeof record.name === "string") names.set(id, record.name);
    }
  }
  return names;
}
