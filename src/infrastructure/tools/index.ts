/**
 * Tools Module
 *
 * Barrel export for all tool-related components.
 */

export { BaseTool } from "./BaseTool.js";
export type { BaseToolConfig } from "./BaseTool.js";

// Re-export registry
export { ToolRegistry, createToolRegistry } from "./registry/index.js";

// Re-export built-in tools
export * from "./builtin/index.js";

// Re-export interfaces and types
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
} from "../../core/interfaces/ITool.js";

export type { ToolDefinition, ToolCall } from "../../core/types/llm.types.js";
