/**
 * Core Interfaces Module
 *
 * Barrel export for all core interface definitions.
 */

export type {
  ILLMClient,
  ICachedLLMClient,
  ITokenCounter,
  IEmbeddingClient,
} from "./ILLMClient.js";

export type {
  IContextManager,
  IContextStrategy,
  IContextPruner,
  IContextSelector,
} from "./IContextManager.js";

export type {
  ITool,
  IToolRegistry,
  IToolExecutor,
  IToolLoader,
  IToolValidator,
  ToolContext,
  ToolResult,
  ToolMetadata,
  ToolStats,
  ToolConfig,
  ToolFilterCriteria,
  ToolRegistryStats,
} from "./ITool.js";

export type {
  IModeHandler,
  InteractionMode,
  ModeContext,
  ModeSwitchEvent,
} from "./IModeHandler.js";
