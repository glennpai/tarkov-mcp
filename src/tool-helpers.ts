import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GAME_MODE_VALUES, SUPPORTED_LANGS } from "./types.js";
import type { GameMode, Lang } from "./types.js";

export function defaultGameMode(): GameMode {
  const env = process.env.TARKOV_GAME_MODE;
  return (GAME_MODE_VALUES as readonly string[]).includes(env ?? "") ? (env as GameMode) : "regular";
}

export function defaultLang(): Lang {
  const env = process.env.TARKOV_LANG;
  return (SUPPORTED_LANGS as readonly string[]).includes(env ?? "") ? (env as Lang) : "en";
}

export const gameModeParam = z
  .enum(GAME_MODE_VALUES)
  .optional()
  .describe(`Game mode to query. Defaults to the server's configured game mode ("${defaultGameMode()}").`);

export const langParam = z
  .enum(SUPPORTED_LANGS)
  .optional()
  .describe(`Language for names/descriptions. Defaults to "${defaultLang()}".`);

export function resolveGameMode(value: GameMode | undefined): GameMode {
  return value ?? defaultGameMode();
}

export function resolveLang(value: Lang | undefined): Lang {
  return value ?? defaultLang();
}

export function jsonResult(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
