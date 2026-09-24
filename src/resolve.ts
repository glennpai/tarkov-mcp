import type { JsonValue, TranslationDict } from "./types.js";

/**
 * The API returns human-readable fields (name, description, ...) as opaque translation
 * keys (e.g. "5447a9cd... Name"). The real text lives in a sibling `<endpoint>_<lang>`
 * dictionary keyed by that same opaque string. Rather than replaying the endpoint-specific
 * JSONPath list the API publishes, we do a blind recursive substitution: any string that
 * happens to be a key in the translation dict gets replaced by its real text. The keys are
 * effectively unique tokens, so this is safe and works uniformly across every endpoint.
 */
export function resolveTranslations<T extends JsonValue>(value: T, dict: TranslationDict): T {
  if (typeof value === "string") {
    return (Object.prototype.hasOwnProperty.call(dict, value) ? dict[value] : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveTranslations(v, dict)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveTranslations(v, dict);
    }
    return out as T;
  }
  return value;
}

const HEX_ID_RE = /^[0-9a-f]{24}$/i;

/**
 * Deep-walks a resolved record and turns any bare 24-hex-char id that resolves in the
 * global id->name map into `{ id, name }`, so an agent sees "Prapor" instead of an opaque
 * trader id. A record's own "id" key is left untouched (it is self-identity, not a reference).
 */
export function enrichReferenceIds<T extends JsonValue>(value: T, idToName: Map<string, string>): T {
  if (typeof value === "string") {
    if (HEX_ID_RE.test(value) && idToName.has(value)) {
      return { id: value, name: idToName.get(value) } as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => enrichReferenceIds(v, idToName)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "id" ? v : enrichReferenceIds(v, idToName);
    }
    return out as T;
  }
  return value;
}
