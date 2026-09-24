# tarkov-mcp

An MCP server that lets an AI agent answer factual questions about Escape from Tarkov, including items, flea market prices, traders, maps, tasks/quests, hideout stations, barters, crafts, and live server status, by querying the live [json.tarkov.dev](https://json.tarkov.dev) API.

## How it resolves real names

The API returns human-readable fields (`name`, `description`, `shortName`, ...) as opaque translation keys, e.g. `"5447a9cd... Name"`. The real text lives in a sibling `<endpoint>_<lang>` resource (e.g. `items_en`), a flat dictionary keyed by that same string. This server fetches both, resolves every translatable field to real text, and caches the result in memory (default TTL: 1 hour). Cross-referenced ids (a trader id inside a barter, an item id inside a craft recipe, etc.) are additionally enriched with a `name` field wherever the referenced entity is one the server has already indexed.

Large datasets (`items` ~17MB, `maps` ~8.5MB) are never handed to the agent whole; every tool returns a compact, targeted slice.

## Setup

```bash
npm install
npm run build
```

## Running

```bash
npm start
```

### Claude Code / Claude Desktop config

Add to your MCP server config (`claude_desktop_config.json` or the equivalent for Claude Code):

```json
{
  "mcpServers": {
    "tarkov": {
      "command": "node",
      "args": ["/absolute/path/to/tarkov-mcp/dist/index.js"]
    }
  }
}
```

## Configuration (env vars)

| Var | Default | Purpose |
| --- | --- | --- |
| `TARKOV_API_BASE` | `https://json.tarkov.dev` | Base URL of the API |
| `TARKOV_GAME_MODE` | `regular` | One of `regular`, `pve`, `pvp-season` |
| `TARKOV_LANG` | `en` | One of the API's supported language codes |
| `TARKOV_CACHE_TTL_MS` | `3600000` (1 hour) | How long cached bulk datasets stay fresh |

Every tool also accepts optional per-call `gameMode`/`lang` overrides.

## Tools

- `search_items` / `get_item` / `get_item_price_history`
- `list_traders` / `get_trader`
- `list_maps` / `get_map`
- `search_tasks` / `get_task`
- `list_hideout_stations` / `get_hideout_station`
- `search_barters`
- `search_crafts`
- `get_server_status`

## Disclaimer

This is an unofficial, fan-made project, not affiliated with, endorsed by, or connected to Battlestate Games. "Escape from Tarkov" is a trademark of Battlestate Games. Game data is fetched at runtime from the third-party [tarkov.dev](https://tarkov.dev) API and is used here under fair use for informational purposes; this project claims no ownership over that data.

Portions of this project's code were generated with AI assistance. It has not been audited for production use; review the source before relying on it for anything beyond personal/local use.

This software is provided "as is", without warranty of any kind, express or implied. Use it at your own risk. See [LICENSE](LICENSE) for the full terms.

## License

[MIT](LICENSE)
