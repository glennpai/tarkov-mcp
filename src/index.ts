#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerItemTools } from "./tools/items.js";
import { registerTraderTools } from "./tools/traders.js";
import { registerMapTools } from "./tools/maps.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerHideoutTools } from "./tools/hideout.js";
import { registerBarterTools } from "./tools/barters.js";
import { registerCraftTools } from "./tools/crafts.js";
import { registerStatusTools } from "./tools/status.js";

const server = new McpServer({
  name: "tarkov-mcp",
  version: "0.1.0",
});

registerItemTools(server);
registerTraderTools(server);
registerMapTools(server);
registerTaskTools(server);
registerHideoutTools(server);
registerBarterTools(server);
registerCraftTools(server);
registerStatusTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
