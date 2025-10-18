/**
 * Context Management Module
 *
 * Barrel export for all context management components.
 */

export { ContextManager, createContextManager } from "./ContextManager.js";
export { ContextPruner, createContextPruner } from "./ContextPruner.js";
export { ContextSelector } from "./ContextSelector.js";
export type { ContextSelectorConfig } from "./ContextSelector.js";

// Re-export strategies
export * from "./strategies/index.js";

// Re-export types and interfaces
export type {
  IContextManager,
  IContextStrategy,
  IContextPruner,
  IContextSelector,
} from "../../core/interfaces/IContextManager.js";

export type {
  ContextMessage,
  ContextState,
  ContextStats,
  ContextStrategyConfig,
  PruningResult,
  MessageSelectionCriteria,
  ContextSearchResult,
  ContextExport,
  ContextSummary,
  ContextManagerConfig,
  MessagePriority,
  PruningStrategyType,
  SlidingWindowConfig,
  PriorityBasedConfig,
  SummaryBasedConfig,
  SemanticConfig,
  MessageEmbedding,
  PriorityWeights,
} from "../../core/types/context.types.js";
