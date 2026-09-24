import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildGlobalNameMap, findByIdOrName, getCollection, searchCollection } from "../index-builder.js";
import { enrichReferenceIds } from "../resolve.js";
import type { GameMode, JsonRecord, Lang } from "../types.js";
import { errorResult, gameModeParam, jsonResult, langParam, resolveGameMode, resolveLang } from "../tool-helpers.js";

async function summarize(task: JsonRecord, traderNames: Map<string, string>) {
  return {
    id: task.id,
    name: task.name,
    trader: typeof task.trader === "string" ? (traderNames.get(task.trader) ?? task.trader) : task.trader,
    map: task.map,
    minPlayerLevel: task.minPlayerLevel,
    kappaRequired: task.kappaRequired,
  };
}

export function registerTaskTools(server: McpServer): void {
  server.registerTool(
    "search_tasks",
    {
      title: "Search tasks",
      description:
        "Search Escape from Tarkov tasks/quests by name (substring match), optionally filtered by trader and/or " +
        "map. Returns compact summaries — use get_task for full objectives/requirements/rewards.",
      inputSchema: {
        query: z.string().optional().describe("Substring to match against task name."),
        trader: z.string().optional().describe("Filter to tasks given by this trader (id or name)."),
        map: z.string().optional().describe("Filter to tasks that take place on this map (id or name)."),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results."),
        gameMode: gameModeParam,
        lang: langParam,
      },
    },
    async ({ query, trader, map, limit, gameMode, lang }) => {
      const resolvedGameMode: GameMode = resolveGameMode(gameMode);
      const resolvedLang: Lang = resolveLang(lang);
      const [tasks, traders] = await Promise.all([
        getCollection("tasks", resolvedGameMode, resolvedLang),
        getCollection("traders", resolvedGameMode, resolvedLang),
      ]);

      let traderId: string | undefined;
      if (trader) {
        const match = findByIdOrName(traders, trader);
        if (!match) return errorResult(`No trader found matching "${trader}".`);
        traderId = match.id as string;
      }

      let mapId: string | undefined;
      if (map) {
        const maps = await getCollection("maps", resolvedGameMode, resolvedLang);
        const match = findByIdOrName(maps, map);
        if (!match) return errorResult(`No map found matching "${map}".`);
        mapId = match.id as string;
      }

      const results = searchCollection(tasks, query, limit, (task) => {
        if (traderId && task.trader !== traderId) return false;
        if (mapId && task.map !== mapId) return false;
        return true;
      });

      const traderNames = new Map<string, string>();
      for (const t of traders.values()) if (typeof t.name === "string") traderNames.set(t.id as string, t.name);

      return jsonResult(await Promise.all(results.map((task) => summarize(task, traderNames))));
    },
  );

  server.registerTool(
    "get_task",
    {
      title: "Get task",
      description:
        "Get full detail for one task/quest by id or name: objectives, requirements, rewards, and failure " +
        "outcomes. Trader/item/map ids referenced within the result are resolved to names.",
      inputSchema: {
        idOrName: z.string().describe("Task id or name."),
        gameMode: gameModeParam,
        lang: langParam,
      },
    },
    async ({ idOrName, gameMode, lang }) => {
      const resolvedGameMode = resolveGameMode(gameMode);
      const resolvedLang = resolveLang(lang);
      const tasks = await getCollection("tasks", resolvedGameMode, resolvedLang);
      const task = findByIdOrName(tasks, idOrName);
      if (!task) return errorResult(`No task found matching "${idOrName}".`);

      const names = await buildGlobalNameMap(resolvedGameMode, resolvedLang);
      return jsonResult(enrichReferenceIds(task, names));
    },
  );
}
