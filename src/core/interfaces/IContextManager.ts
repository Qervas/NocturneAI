/**
 * Context Manager Interfaces
 *
 * Interfaces for managing conversation context, message history,
 * and context pruning strategies.
 */

import type {
  ContextMessage,
  ContextState,
  ContextStats,
  ContextStrategyConfig,
  PruningResult,
  MessageSelectionCriteria,
  ContextSearchResult,
  ContextExport,
  ContextSummary,
} from '../types/context.types.js';
import type { ChatMessage } from '../types/llm.types.js';

/**
 * Context pruning strategy interface
 */
export interface IContextStrategy {
  /**
   * Strategy type identifier
   */
  readonly type: string;

  /**
   * Strategy configuration
   */
  readonly config: ContextStrategyConfig;

  /**
   * Prune messages to fit within token limit
   *
   * @param messages - Messages to prune
   * @param maxTokens - Maximum token limit
   * @param currentTokens - Current total tokens
   * @returns Pruning result with selected messages
   */
  prune(
    messages: ContextMessage[],
    maxTokens: number,
    currentTokens: number
  ): Promise<PruningResult>;

  /**
   * Validate strategy configuration
   *
   * @returns True if configuration is valid
   */
  validate(): boolean;

  /**
   * Get strategy statistics
   *
   * @returns Strategy-specific statistics
   */
  getStats(): Record<string, unknown>;
}

/**
 * Context manager interface
 */
export interface IContextManager {
  /**
   * Current context state
   */
  readonly state: ContextState;

  /**
   * Context configuration
   */
  readonly config: Readonly<{
    maxTokens: number;
    strategy: ContextStrategyConfig;
    autoprune: boolean;
  }>;

  /**
   * Add a message to the context
   *
   * @param message - Message to add
   * @param options - Optional message options
   * @returns Message ID
   */
  addMessage(
    message: ChatMessage,
    options?: {
      priority?: ContextMessage['priority'];
      metadata?: Record<string, unknown>;
    }
  ): Promise<string>;

  /**
   * Add multiple messages to the context
   *
   * @param messages - Messages to add
   * @returns Array of message IDs
   */
  addMessages(messages: ChatMessage[]): Promise<string[]>;

  /**
   * Get a message by ID
   *
   * @param id - Message ID
   * @returns Message or null if not found
   */
  getMessage(id: string): ContextMessage | null;

  /**
   * Get all messages in context
   *
   * @param options - Optional filtering options
   * @returns Array of messages
   */
  getMessages(options?: MessageSelectionCriteria): ContextMessage[];

  /**
   * Get messages formatted for LLM
   *
   * @returns Array of chat messages
   */
  getMessagesForLLM(): ChatMessage[];

  /**
   * Remove a message by ID
   *
   * @param id - Message ID
   * @returns True if removed, false if not found
   */
  removeMessage(id: string): boolean;

  /**
   * Remove multiple messages by IDs
   *
   * @param ids - Message IDs to remove
   * @returns Number of messages removed
   */
  removeMessages(ids: string[]): number;

  /**
   * Clear all messages (except system message if configured)
   *
   * @param keepSystemMessage - Whether to preserve system message
   */
  clear(keepSystemMessage?: boolean): void;

  /**
   * Set or update the system message
   *
   * @param content - System message content
   * @param options - Optional message options
   */
  setSystemMessage(
    content: string,
    options?: {
      priority?: ContextMessage['priority'];
      metadata?: Record<string, unknown>;
    }
  ): Promise<void>;

  /**
   * Get the system message
   *
   * @returns System message or null
   */
  getSystemMessage(): ContextMessage | null;

  /**
   * Manually trigger context pruning
   *
   * @returns Pruning result
   */
  prune(): Promise<PruningResult>;

  /**
   * Check if pruning is needed
   *
   * @returns True if current tokens exceed max tokens
   */
  needsPruning(): boolean;

  /**
   * Get current token count
   *
   * @returns Total tokens in context
   */
  getTokenCount(): number;

  /**
   * Get context statistics
   *
   * @returns Context statistics
   */
  getStats(): ContextStats;

  /**
   * Search messages by content
   *
   * @param query - Search query
   * @param options - Search options
   * @returns Array of search results with scores
   */
  search(
    query: string,
    options?: {
      limit?: number;
      threshold?: number;
      semantic?: boolean;
    }
  ): Promise<ContextSearchResult[]>;

  /**
   * Update strategy configuration
   *
   * @param config - New strategy configuration
   */
  updateStrategy(config: ContextStrategyConfig): void;

  /**
   * Update max token limit
   *
   * @param maxTokens - New max token limit
   */
  updateMaxTokens(maxTokens: number): void;

  /**
   * Export context state
   *
   * @returns Context export data
   */
  export(): ContextExport;

  /**
   * Import context state
   *
   * @param data - Context export data
   */
  import(data: ContextExport): Promise<void>;

  /**
   * Get all summaries
   *
   * @returns Array of context summaries
   */
  getSummaries(): ContextSummary[];

  /**
   * Add a summary
   *
   * @param summary - Summary to add
   */
  addSummary(summary: ContextSummary): void;

  /**
   * Reset context manager
   *
   * Clears all messages, summaries, and statistics
   */
  reset(): void;
}

/**
 * Context selector interface for semantic/relevance-based selection
 */
export interface IContextSelector {
  /**
   * Select relevant messages based on query
   *
   * @param messages - Available messages
   * @param query - Current query or task
   * @param maxTokens - Maximum tokens to select
   * @returns Selected messages with relevance scores
   */
  selectRelevant(
    messages: ContextMessage[],
    query: string,
    maxTokens: number
  ): Promise<ContextSearchResult[]>;

  /**
   * Calculate relevance score between query and message
   *
   * @param query - Query text
   * @param message - Message to score
   * @returns Relevance score (0-1)
   */
  calculateRelevance(query: string, message: ContextMessage): Promise<number>;
}

/**
 * Context pruner interface for delegating to strategies
 */
export interface IContextPruner {
  /**
   * Register a pruning strategy
   *
   * @param strategy - Strategy to register
   */
  registerStrategy(strategy: IContextStrategy): void;

  /**
   * Get a registered strategy by type
   *
   * @param type - Strategy type
   * @returns Strategy or null if not found
   */
  getStrategy(type: string): IContextStrategy | null;

  /**
   * Prune messages using specified strategy
   *
   * @param messages - Messages to prune
   * @param strategyType - Strategy to use
   * @param maxTokens - Maximum tokens
   * @param currentTokens - Current total tokens
   * @returns Pruning result
   */
  prune(
    messages: ContextMessage[],
    strategyType: string,
    maxTokens: number,
    currentTokens: number
  ): Promise<PruningResult>;

  /**
   * Get list of available strategy types
   *
   * @returns Array of strategy type names
   */
  getAvailableStrategies(): string[];
}
