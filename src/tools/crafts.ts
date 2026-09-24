import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildGlobalNameMap, findByIdOrName, getCollection } from "../index-builder.js";
import { enrichReferenceIds } from "../resolve.js";
import type { JsonRecord } from "../types.js";
import { errorResult, gameModeParam, jsonResult, langParam, resolveGameMode, resolveLang } from "../tool-helpers.js";

function involvesItem(craft: JsonRecord, itemId: string): boolean {
  const required = Array.isArray(craft.requiredItems) ? (craft.requiredItems as JsonRecord[]) : [];
  const product = craft.productItem as JsonRecord | undefined;
  return required.some((r) => r.item === itemId) || product?.item === itemId;
}

export function registerCraftTools(server: McpServer): void {
  server.registerTool(
    "search_crafts",
    {
      title: "Search hideout crafts",
      description:
        "Find hideout craft recipes involving a given item and/or hideout station. Item/station ids in the " +
        "results are resolved to names.",
      inputSchema: {
        itemId: z.string().optional().describe("Only return crafts that require or produce this item (id or name)."),
        station: z.string().optional().describe("Only return crafts at this hideout station (id or name)."),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results."),
        gameMode: gameModeParam,
        lang: langParam,
      },
    },
    async ({ itemId, station, limit, gameMode, lang }) => {
      const resolvedGameMode = resolveGameMode(gameMode);
      const resolvedLang = resolveLang(lang);
      const crafts = await getCollection("crafts", resolvedGameMode, resolvedLang);

      let resolvedItemId: string | undefined;
      if (itemId) {
        const items = await getCollection("items", resolvedGameMode, resolvedLang);
        const match = findByIdOrName(items, itemId);
        if (!match) return errorResult(`No item found matching "${itemId}".`);
        resolvedItemId = match.id as string;
      }

      let stationId: string | undefined;
      if (station) {
        const stations = await getCollection("hideout", resolvedGameMode, resolvedLang);
        const match = findByIdOrName(stations, station);
        if (!match) return errorResult(`No hideout station found matching "${station}".`);
        stationId = match.id as string;
      }

      const results: JsonRecord[] = [];
      for (const craft of crafts.values()) {
        if (resolvedItemId && !involvesItem(craft, resolvedItemId)) continue;
        if (stationId && craft.station !== stationId) continue;
        results.push(craft);
        if (results.length >= limit) break;
      }

      const names = await buildGlobalNameMap(resolvedGameMode, resolvedLang);
      return jsonResult(results.map((c) => enrichReferenceIds(c, names)));
    },
  );
}
