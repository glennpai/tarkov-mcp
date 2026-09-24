import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchStatus } from "../client.js";
import { jsonResult } from "../tool-helpers.js";

export function registerStatusTools(server: McpServer): void {
  server.registerTool(
    "get_server_status",
    {
      title: "Get EFT server status",
      description: "Get the current live status of Escape from Tarkov's servers (website, launcher, game servers, etc.). Always fetched fresh, not cached.",
      inputSchema: {},
    },
    async () => {
      const status = await fetchStatus();
      return jsonResult(status);
    },
  );
}
