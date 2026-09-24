import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchPriceHistory } from "../client.js";
import { buildGlobalNameMap, findByIdOrName, getCollection, searchCollection } from "../index-builder.js";
import { enrichReferenceIds } from "../resolve.js";
import type { JsonRecord } from "../types.js";
import { errorResult, gameModeParam, jsonResult, langParam, resolveGameMode, resolveLang } from "../tool-helpers.js";

function summarize(item: JsonRecord) {
  return {
    id: item.id,
    name: item.name,
    shortName: item.shortName,
    types: item.types,
    basePrice: item.basePrice,
    avg24hPrice: item.avg24hPrice,
    lastLowPrice: item.lastLowPrice,
    changeLast48hPercent: item.changeLast48hPercent,
  };
}

export function registerItemTools(server: McpServer): void {
  server.registerTool(
    "search_items",
    {
      title: "Search items",
      description:
        "Search Escape from Tarkov items by name/short name (substring match). Optionally filter by item type " +
        "(e.g. 'gun', 'ammo', 'armor', 'barter') and/or by a trader that buys or sells the item. Returns compact " +
        "summaries (id, name, prices) — use get_item for full detail on one item.",
      inputSchema: {
        query: z.string().describe("Substring to match against item name/shortName/normalizedName."),
        type: z.string().optional().describe("Filter to items whose `types` array includes this value, e.g. 'gun', 'ammo', 'armor'."),
        trader: z.string().optional().describe("Filter to items bought or sold by this trader (id or name), e.g. 'Prapor'."),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results."),
        gameMode: gameModeParam,
        lang: langParam,
      },
    },
    async ({ query, type, trader, limit, gameMode, lang }) => {
      const resolvedGameMode = resolveGameMode(gameMode);
      const resolvedLang = resolveLang(lang);
      const items = await getCollection("items", resolvedGameMode, resolvedLang);

      let traderId: string | undefined;
      if (trader) {
        const traders = await getCollection("traders", resolvedGameMode, resolvedLang);
        const match = findByIdOrName(traders, trader);
        if (!match) return errorResult(`No trader found matching "${trader}".`);
        traderId = match.id as string;
      }

      const results = searchCollection(items, query, limit, (item) => {
        if (type) {
          const types = Array.isArray(item.types) ? (item.types as string[]) : [];
          if (!types.some((t) => t.toLowerCase() === type.toLowerCase())) return false;
        }
        if (traderId) {
          const buy = Array.isArray(item.buyFromTrader) ? (item.buyFromTrader as JsonRecord[]) : [];
          const sell = Array.isArray(item.sellToTrader) ? (item.sellToTrader as JsonRecord[]) : [];
          const has = [...buy, ...sell].some((offer) => offer.trader === traderId);
          if (!has) return false;
        }
        return true;
      });

      return jsonResult(results.map(summarize));
    },
  );

  server.registerTool(
    "get_item",
    {
      title: "Get item",
      description:
        "Get full detail for one item by id or name, including flea market pricing, trader buy/sell offers, and " +
        "weapon/armor/ammo properties. Trader and item ids referenced within the result are resolved to names.",
      inputSchema: {
        idOrName: z.string().describe("Item id or name, e.g. 'Colt M4A1 5.56x45 assault rifle' or 'm4a1'."),
        gameMode: gameModeParam,
        lang: langParam,
      },
    },
    async ({ idOrName, gameMode, lang }) => {
      const resolvedGameMode = resolveGameMode(gameMode);
      const resolvedLang = resolveLang(lang);
      const items = await getCollection("items", resolvedGameMode, resolvedLang);
      const item = findByIdOrName(items, idOrName);
      if (!item) return errorResult(`No item found matching "${idOrName}".`);

      const names = await buildGlobalNameMap(resolvedGameMode, resolvedLang);
      return jsonResult(enrichReferenceIds(item, names));
    },
  );

  server.registerTool(
    "get_item_price_history",
    {
      title: "Get item price history",
      description:
        "Get flea market price history (min price, average price, timestamp) for one item. The full history can " +
        "span years and thousands of points; by default only the last 30 days are returned — widen with `days`.",
      inputSchema: {
        idOrName: z.string().describe("Item id or name."),
        days: z.number().int().min(1).max(3650).default(30).describe("How many days of history to return, counting back from the most recent point."),
        gameMode: gameModeParam,
      },
    },
    async ({ idOrName, days, gameMode }) => {
      const resolvedGameMode = resolveGameMode(gameMode);
      const items = await getCollection("items", resolvedGameMode, resolveLang(undefined));
      const item = findByIdOrName(items, idOrName);
      const itemId = item ? (item.id as string) : idOrName;

      const fullHistory = await fetchPriceHistory(itemId, resolvedGameMode);
      const points = Array.isArray(fullHistory) ? (fullHistory as JsonRecord[]) : [];
      const mostRecentTimestamp = points.reduce((max, p) => Math.max(max, Number(p.timestamp ?? 0)), 0);
      const cutoff = mostRecentTimestamp - days * 86_400_000;
      const history = points.filter((p) => Number(p.timestamp ?? 0) >= cutoff);

      return jsonResult({
        itemId,
        itemName: item?.name ?? null,
        totalPointsAvailable: points.length,
        pointsReturned: history.length,
        history,
      });
    },
  );
}
