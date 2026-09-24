import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildGlobalNameMap, findByIdOrName, getCollection } from "../index-builder.js";
import { enrichReferenceIds } from "../resolve.js";
import type { JsonRecord } from "../types.js";
import { errorResult, gameModeParam, jsonResult, langParam, resolveGameMode, resolveLang } from "../tool-helpers.js";

function summarize(trader: JsonRecord) {
  return {
    id: trader.id,
    name: trader.name,
    currency: trader.currency,
    resetTime: trader.resetTime,
  };
}

export function registerTraderTools(server: McpServer): void {
  server.registerTool(
    "list_traders",
    {
      title: "List traders",
      description: "List all Escape from Tarkov traders with their currency and next restock/reset time.",
      inputSchema: { gameMode: gameModeParam, lang: langParam },
    },
    async ({ gameMode, lang }) => {
      const traders = await getCollection("traders", resolveGameMode(gameMode), resolveLang(lang));
      return jsonResult([...traders.values()].map(summarize));
    },
  );

  server.registerTool(
    "get_trader",
    {
      title: "Get trader",
      description:
        "Get full detail for one trader by id or name (e.g. 'Prapor', 'Therapist'), including loyalty levels " +
        "(pay rate, insurance rate, required reputation) and buy/sell restrictions.",
      inputSchema: {
        idOrName: z.string().describe("Trader id or name."),
        gameMode: gameModeParam,
        lang: langParam,
      },
    },
    async ({ idOrName, gameMode, lang }) => {
      const resolvedGameMode = resolveGameMode(gameMode);
      const resolvedLang = resolveLang(lang);
      const traders = await getCollection("traders", resolvedGameMode, resolvedLang);
      const trader = findByIdOrName(traders, idOrName);
      if (!trader) return errorResult(`No trader found matching "${idOrName}".`);

      const names = await buildGlobalNameMap(resolvedGameMode, resolvedLang);
      return jsonResult(enrichReferenceIds(trader, names));
    },
  );
}
