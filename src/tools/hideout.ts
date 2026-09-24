import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildGlobalNameMap, findByIdOrName, getCollection } from "../index-builder.js";
import { enrichReferenceIds } from "../resolve.js";
import type { JsonRecord } from "../types.js";
import { errorResult, gameModeParam, jsonResult, langParam, resolveGameMode, resolveLang } from "../tool-helpers.js";

function summarize(station: JsonRecord) {
  const levels = Array.isArray(station.levels) ? station.levels : [];
  return {
    id: station.id,
    name: station.name,
    normalizedName: station.normalizedName,
    maxLevel: levels.length,
  };
}

export function registerHideoutTools(server: McpServer): void {
  server.registerTool(
    "list_hideout_stations",
    {
      title: "List hideout stations",
      description: "List all hideout stations (e.g. Workbench, Medstation, Library) with their max level.",
      inputSchema: { gameMode: gameModeParam, lang: langParam },
    },
    async ({ gameMode, lang }) => {
      const stations = await getCollection("hideout", resolveGameMode(gameMode), resolveLang(lang));
      return jsonResult([...stations.values()].map(summarize));
    },
  );

  server.registerTool(
    "get_hideout_station",
    {
      title: "Get hideout station",
      description:
        "Get full detail for one hideout station by id or name, including every level's construction time, " +
        "required items, required trader loyalty, and required other stations. Item/station ids are resolved to names.",
      inputSchema: {
        idOrName: z.string().describe("Hideout station id or name, e.g. 'Workbench'."),
        gameMode: gameModeParam,
        lang: langParam,
      },
    },
    async ({ idOrName, gameMode, lang }) => {
      const resolvedGameMode = resolveGameMode(gameMode);
      const resolvedLang = resolveLang(lang);
      const stations = await getCollection("hideout", resolvedGameMode, resolvedLang);
      const station = findByIdOrName(stations, idOrName);
      if (!station) return errorResult(`No hideout station found matching "${idOrName}".`);

      const names = await buildGlobalNameMap(resolvedGameMode, resolvedLang);
      return jsonResult(enrichReferenceIds(station, names));
    },
  );
}
