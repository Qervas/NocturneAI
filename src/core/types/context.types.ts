/**
 * Context Management Types
 *
 * Type definitions for context management, message storage,
 * and pruning strategies.
 */

import type { ChatMessage } from "./llm.types.js";

/**
 * Context pruning strategy type
 */
export type PruningStrategyType =
  | "sliding-window"
  | "priority-based"
  | "summary-based"
  | "semantic";

/**
 * Message priority level
 */
export type MessagePriority = "low" | "normal" | "high" | "critical";

/**
 * Context message with metadata
 */
export interface ContextMessage extends ChatMessage {
  id: string;
  timestamp: number;
  priority?: MessagePriority;
  tokens?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Context state
 */
export interface ContextState {
  messages: ContextMessage[];
  totalTokens: number;
  maxTokens: number;
  systemMessage?: ContextMessage;
  metadata?: Record<string, unknown>;
}

/**
 * Pruning result
 */
export interface PruningResult {
  messages: ContextMessage[];
  removedCount: number;
  removedTokens: number;
  strategy: PruningStrategyType;
  metadata?: Record<string, unknown>;
}

/**
 * Context statistics
 */
export interface ContextStats {
  messageCount: number;
  totalTokens: number;
  averageTokensPerMessage: number;
  pruningCount: number;
  lastPruned?: number;
  strategyUsed: PruningStrategyType;
}

/**
 * Sliding window strategy config
 */
export interface SlidingWindowConfig {
  type: "sliding-window";
  maxMessages: number;
  preserveSystemMessage: boolean;
}

/**
 * Priority-based strategy config
 */
export interface PriorityBasedConfig {
  type: "priority-based";
  weights: {
    priorityWeight: number; // 0-1, weight for priority level
    recencyWeight: number; // 0-1, weight for recent messages
    roleWeight: number; // 0-1, weight for message role
  };
  minMessages: number; // Minimum messages to keep
  recencyDecayFactor: number; // 0-1, decay factor for older messages
}

/**
 * Summary-based strategy config
 */
export interface SummaryBasedConfig {
  type: "summary-based";
  maxMessages: number;
  preserveSystemMessage: boolean;
  summaryThreshold: number; // Number of messages before summarizing
  keepRecentCount: number; // Always keep N most recent messages
  summaryModel?: string;
}

/**
 * Semantic strategy config
 */
export interface SemanticConfig {
  type: "semantic";
  maxMessages: number;
  preserveSystemMessage: boolean;
  relevanceThreshold: number; // 0-1, minimum similarity score
  topK: number; // Keep top K most relevant messages
  embeddingModel?: string;
}

/**
 * Union type for all strategy configs
 */
export type ContextStrategyConfig =
  | SlidingWindowConfig
  | PriorityBasedConfig
  | SummaryBasedConfig
  | SemanticConfig;

/**
 * Context manager configuration
 */
export interface ContextManagerConfig {
  maxTokens: number;
  strategy: ContextStrategyConfig;
  autoprune: boolean;
  tokenCounter?: {
    countTokens: (text: string, model?: string) => Promise<number>;
    countMessageTokens: (
      messages: ChatMessage[],
      model?: string,
    ) => Promise<number>;
  };
}

/**
 * Message selection criteria
 */
export interface MessageSelectionCriteria {
  query?: string;
  roles?: Array<"system" | "user" | "assistant" | "tool">;
  priority?: MessagePriority;
  after?: number; // timestamp
  before?: number; // timestamp
  limit?: number;
  includeMetadata?: boolean;
}

/**
 * Context search result
 */
export interface ContextSearchResult {
  message: ContextMessage;
  score: number;
  reason?: string;
}

/**
 * Embedding vector
 */
export interface MessageEmbedding {
  messageId: string;
  embedding: number[];
  model: string;
  timestamp: number;
}

/**
 * Summary information
 */
export interface ContextSummary {
  id: string;
  content: string;
  messageIds: string[]; // IDs of messages that were summarized
  tokens: number;
  timestamp: number;
  model?: string;
}

/**
 * Context export format
 */
export interface ContextExport {
  version: string;
  timestamp: number;
  state: ContextState;
  summaries?: ContextSummary[];
  embeddings?: MessageEmbedding[];
  stats: ContextStats;
}

/**
 * Priority scoring weights
 */
export interface PriorityWeights {
  system: number;
  user: number;
  assistant: number;
  tool: number;
  priority: {
    low: number;
    normal: number;
    high: number;
    critical: number;
  };
  recency: number;
}
