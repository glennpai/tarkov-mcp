import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findByIdOrName, getCollection } from "../index-builder.js";
import type { JsonRecord, JsonValue } from "../types.js";
import { errorResult, gameModeParam, jsonResult, langParam, resolveGameMode, resolveLang } from "../tool-helpers.js";

function summarize(map: JsonRecord) {
  return {
    id: map.id,
    name: map.name,
    normalizedName: map.normalizedName,
    raidDuration: map.raidDuration,
    players: map.players,
    enemies: map.enemies,
  };
}

const COORDINATE_KEYS = new Set(["position", "outline", "positions"]);
// Pure spawn/loot coordinate dumps — not useful for text Q&A and can be large; omitted by default.
const COORDINATE_ONLY_COLLECTIONS = ["spawns", "lootLoose", "lootContainers"];

function stripCoordinates(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(stripCoordinates);
  if (value && typeof value === "object") {
    const out: JsonRecord = {};
    for (const [k, v] of Object.entries(value)) {
      if (COORDINATE_KEYS.has(k)) continue;
      out[k] = stripCoordinates(v);
    }
    return out;
  }
  return value;
}

function defaultView(map: JsonRecord): JsonRecord {
  const stripped = stripCoordinates(map) as JsonRecord;
  for (const key of COORDINATE_ONLY_COLLECTIONS) delete stripped[key];
  return stripped;
}

export function registerMapTools(server: McpServer): void {
  server.registerTool(
    "list_maps",
    {
      title: "List maps",
      description: "List all Escape from Tarkov maps with raid duration, player count, and enemy types.",
      inputSchema: { gameMode: gameModeParam, lang: langParam },
    },
    async ({ gameMode, lang }) => {
      const maps = await getCollection("maps", resolveGameMode(gameMode), resolveLang(lang));
      return jsonResult([...maps.values()].map(summarize));
    },
  );

  server.registerTool(
    "get_map",
    {
      title: "Get map",
      description:
        "Get detail for one map by id or name (e.g. 'Customs', 'Factory'): extracts, hazards, boss spawn chances " +
        "and zones, transits, access requirements. Raw coordinate/outline data is omitted by default since it's " +
        "not useful for answering questions in text — set includePositions to get exact coordinates instead.",
      inputSchema: {
        idOrName: z.string().describe("Map id or name."),
        includePositions: z.boolean().default(false).describe("Include raw x/y/z coordinates and outlines and loot/spawn point dumps."),
        gameMode: gameModeParam,
        lang: langParam,
      },
    },
    async ({ idOrName, includePositions, gameMode, lang }) => {
      const maps = await getCollection("maps", resolveGameMode(gameMode), resolveLang(lang));
      const map = findByIdOrName(maps, idOrName);
      if (!map) return errorResult(`No map found matching "${idOrName}".`);
      return jsonResult(includePositions ? map : defaultView(map));
    },
  );
}
