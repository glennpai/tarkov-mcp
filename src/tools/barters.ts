import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildGlobalNameMap, findByIdOrName, getCollection } from "../index-builder.js";
import { enrichReferenceIds } from "../resolve.js";
import type { JsonRecord } from "../types.js";
import { errorResult, gameModeParam, jsonResult, langParam, resolveGameMode, resolveLang } from "../tool-helpers.js";

function involvesItem(barter: JsonRecord, itemId: string): boolean {
  const required = Array.isArray(barter.requiredItems) ? (barter.requiredItems as JsonRecord[]) : [];
  const offered = barter.offeredItem as JsonRecord | undefined;
  return required.some((r) => r.item === itemId) || offered?.item === itemId;
}

export function registerBarterTools(server: McpServer): void {
  server.registerTool(
    "search_barters",
    {
      title: "Search trader barters",
      description:
        "Find trader barter offers (trade items instead of paying cash) involving a given item and/or trader. " +
        "Item/trader ids in the results are resolved to names.",
      inputSchema: {
        itemId: z.string().optional().describe("Only return barters that require or offer this item (id or name)."),
        trader: z.string().optional().describe("Only return barters from this trader (id or name)."),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results."),
        gameMode: gameModeParam,
        lang: langParam,
      },
    },
    async ({ itemId, trader, limit, gameMode, lang }) => {
      const resolvedGameMode = resolveGameMode(gameMode);
      const resolvedLang = resolveLang(lang);
      const barters = await getCollection("barters", resolvedGameMode, resolvedLang);

      let resolvedItemId: string | undefined;
      if (itemId) {
        const items = await getCollection("items", resolvedGameMode, resolvedLang);
        const match = findByIdOrName(items, itemId);
        if (!match) return errorResult(`No item found matching "${itemId}".`);
        resolvedItemId = match.id as string;
      }

      let traderId: string | undefined;
      if (trader) {
        const traders = await getCollection("traders", resolvedGameMode, resolvedLang);
        const match = findByIdOrName(traders, trader);
        if (!match) return errorResult(`No trader found matching "${trader}".`);
        traderId = match.id as string;
      }

      const results: JsonRecord[] = [];
      for (const barter of barters.values()) {
        if (resolvedItemId && !involvesItem(barter, resolvedItemId)) continue;
        if (traderId && barter.trader !== traderId) continue;
        results.push(barter);
        if (results.length >= limit) break;
      }

      const names = await buildGlobalNameMap(resolvedGameMode, resolvedLang);
      return jsonResult(results.map((b) => enrichReferenceIds(b, names)));
    },
  );
}
