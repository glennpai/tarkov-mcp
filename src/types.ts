export const GAME_MODE_VALUES = ["regular", "pve", "pvp-season"] as const;
export type GameMode = (typeof GAME_MODE_VALUES)[number];
export const GAME_MODES: GameMode[] = [...GAME_MODE_VALUES];

export const SUPPORTED_LANGS = [
  "cs", "de", "en", "es", "fr", "hu", "id", "it", "ja", "ko",
  "pl", "pt", "ro", "ru", "sk", "th", "tr", "vn", "zh",
] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = { [key: string]: JsonValue };

export interface Envelope {
  data: JsonRecord;
  translations?: string[];
}

export type TranslationDict = Record<string, string>;

/** Cacheable bulk-list endpoints and where their primary id-keyed collection lives within `data`. */
export interface EndpointSpec {
  /** Path segment used in the URL, e.g. "items" -> /{gameMode}/items */
  path: string;
  /** Property path from `data` down to the collection (list or id-keyed dict). Empty = `data` itself. */
  collectionPath: string[];
}

export const ENDPOINT_SPECS: Record<string, EndpointSpec> = {
  items: { path: "items", collectionPath: ["items"] },
  traders: { path: "traders", collectionPath: [] },
  maps: { path: "maps", collectionPath: ["maps"] },
  tasks: { path: "tasks", collectionPath: ["tasks"] },
  hideout: { path: "hideout", collectionPath: [] },
  barters: { path: "barters", collectionPath: [] },
  crafts: { path: "crafts", collectionPath: [] },
};

/** Endpoints whose global id->name map is used to enrich cross-referenced ids found in other records. */
export const GLOBAL_NAME_SOURCES = ["items", "traders", "maps", "hideout"] as const;
