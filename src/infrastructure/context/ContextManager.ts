/**
 * Context Manager
 *
 * Manages conversation context, message history, and automatic pruning.
 * Implements IContextManager interface with support for multiple pruning strategies.
 *
 * Features:
 * - Message storage with metadata
 * - Automatic pruning when token limit is exceeded
 * - Multiple pruning strategies (sliding window, priority, summary, semantic)
 * - System message management
 * - Token counting integration
 * - Message search and selection
 * - Export/import for persistence
 * - Statistics tracking
 */

import type {
  IContextManager,
  IContextStrategy,
} from "../../core/interfaces/IContextManager.js";
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
  ContextManagerConfig,
  MessagePriority,
} from "../../core/types/context.types.js";
import type { ChatMessage } from "../../core/types/llm.types.js";
import { SlidingWindowStrategy } from "./strategies/SlidingWindowStrategy.js";
import { PriorityBasedStrategy } from "./strategies/PriorityBasedStrategy.js";
import { SummaryBasedStrategy } from "./strategies/SummaryBasedStrategy.js";
import { SemanticStrategy } from "./strategies/SemanticStrategy.js";

/**
 * Context Manager Implementation
 */
export class ContextManager implements IContextManager {
  private _state: ContextState;
  private _config: ContextManagerConfig;
  private _strategy: IContextStrategy;
  private _summaries: ContextSummary[];
  private _stats: {
    pruningCount: number;
    lastPruned?: number;
  };

  constructor(config: ContextManagerConfig) {
    this._config = config;
    this._summaries = [];
    this._stats = {
      pruningCount: 0,
    };

    // Initialize state
    this._state = {
      messages: [],
      totalTokens: 0,
      maxTokens: config.maxTokens,
      systemMessage: undefined,
    };

    // Initialize strategy
    this._strategy = this.createStrategy(config.strategy);
  }

  /**
   * Get current context state
   */
  get state(): ContextState {
    return {
      ...this._state,
      messages: [...this._state.messages],
    };
  }

  /**
   * Get configuration
   */
  get config(): Readonly<{
    maxTokens: number;
    strategy: ContextStrategyConfig;
    autoprune: boolean;
  }> {
    return {
      maxTokens: this._config.maxTokens,
      strategy: this._config.strategy,
      autoprune: this._config.autoprune,
    };
  }

  /**
   * Add a message to the context
   */
  async addMessage(
    message: ChatMessage,
    options?: {
      priority?: MessagePriority;
      metadata?: Record<string, unknown>;
    },
  ): Promise<string> {
    const id = this.generateId();
    const timestamp = Date.now();

    // Count tokens for this message
    let tokens = 0;
    if (this._config.tokenCounter) {
      tokens = await this._config.tokenCounter.countMessageTokens([message]);
    } else {
      // Fallback estimation: ~4 chars per token
      tokens = Math.ceil(message.content.length / 4);
    }

    const contextMessage: ContextMessage = {
      ...message,
      id,
      timestamp,
      priority: options?.priority || "normal",
      tokens,
      metadata: options?.metadata,
    };

    // Handle system messages specially
    if (message.role === "system") {
      this._state.systemMessage = contextMessage;
    } else {
      this._state.messages.push(contextMessage);
    }

    this._state.totalTokens += tokens;

    // Auto-prune if enabled and needed
    if (this._config.autoprune && this.needsPruning()) {
      await this.prune();
    }

    return id;
  }

  /**
   * Add multiple messages to the context
   */
  async addMessages(messages: ChatMessage[]): Promise<string[]> {
    const ids: string[] = [];
    for (const message of messages) {
      const id = await this.addMessage(message);
      ids.push(id);
    }
    return ids;
  }

  /**
   * Get a message by ID
   */
  getMessage(id: string): ContextMessage | null {
    if (this._state.systemMessage?.id === id) {
      return this._state.systemMessage;
    }

    const message = this._state.messages.find((m) => m.id === id);
    return message || null;
  }

  /**
   * Get all messages in context
   */
  getMessages(options?: MessageSelectionCriteria): ContextMessage[] {
    let messages = [...this._state.messages];

    // Apply filters
    if (options) {
      if (options.roles) {
        messages = messages.filter((m) => options.roles!.includes(m.role));
      }

      if (options.priority) {
        messages = messages.filter((m) => m.priority === options.priority);
      }

      if (options.after) {
        messages = messages.filter((m) => m.timestamp > options.after!);
      }

      if (options.before) {
        messages = messages.filter((m) => m.timestamp < options.before!);
      }

      if (options.limit) {
        messages = messages.slice(-options.limit);
      }
    }

    return messages;
  }

  /**
   * Get messages formatted for LLM
   */
  getMessagesForLLM(): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Add system message first if present
    if (this._state.systemMessage) {
      messages.push({
        role: this._state.systemMessage.role,
        content: this._state.systemMessage.content,
        name: this._state.systemMessage.name,
        tool_calls: this._state.systemMessage.tool_calls,
        tool_call_id: this._state.systemMessage.tool_call_id,
      });
    }

    // Add all other messages
    for (const msg of this._state.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
        name: msg.name,
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id,
      });
    }

    return messages;
  }

  /**
   * Remove a message by ID
   */
  removeMessage(id: string): boolean {
    const index = this._state.messages.findIndex((m) => m.id === id);
    if (index === -1) {
      return false;
    }

    const removed = this._state.messages.splice(index, 1)[0];
    this._state.totalTokens -= removed.tokens || 0;
    return true;
  }

  /**
   * Remove multiple messages by IDs
   */
  removeMessages(ids: string[]): number {
    let removed = 0;
    for (const id of ids) {
      if (this.removeMessage(id)) {
        removed++;
      }
    }
    return removed;
  }

  /**
   * Clear all messages
   */
  clear(keepSystemMessage = true): void {
    this._state.messages = [];
    this._state.totalTokens = this._state.systemMessage?.tokens || 0;

    if (!keepSystemMessage) {
      this._state.systemMessage = undefined;
      this._state.totalTokens = 0;
    }
  }

  /**
   * Set or update the system message
   */
  async setSystemMessage(
    content: string,
    options?: {
      priority?: MessagePriority;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const oldTokens = this._state.systemMessage?.tokens || 0;

    await this.addMessage(
      {
        role: "system",
        content,
      },
      options,
    );

    // Adjust total tokens (subtract old, new was already added)
    this._state.totalTokens -= oldTokens;
  }

  /**
   * Get the system message
   */
  getSystemMessage(): ContextMessage | null {
    return this._state.systemMessage || null;
  }

  /**
   * Manually trigger context pruning
   */
  async prune(): Promise<PruningResult> {
    const allMessages = this._state.systemMessage
      ? [this._state.systemMessage, ...this._state.messages]
      : [...this._state.messages];

    const result = await this._strategy.prune(
      allMessages,
      this._state.maxTokens,
      this._state.totalTokens,
    );

    // Update state with pruned messages
    let systemMessage: ContextMessage | undefined;
    const regularMessages: ContextMessage[] = [];

    for (const msg of result.messages) {
      if (msg.role === "system") {
        systemMessage = msg;
      } else {
        regularMessages.push(msg);
      }
    }

    this._state.systemMessage = systemMessage;
    this._state.messages = regularMessages;
    this._state.totalTokens -= result.removedTokens;

    // Update stats
    this._stats.pruningCount++;
    this._stats.lastPruned = Date.now();

    return result;
  }

  /**
   * Check if pruning is needed
   */
  needsPruning(): boolean {
    return this._state.totalTokens > this._state.maxTokens;
  }

  /**
   * Get current token count
   */
  getTokenCount(): number {
    return this._state.totalTokens;
  }

  /**
   * Get context statistics
   */
  getStats(): ContextStats {
    const messageCount = this._state.messages.length;
    const totalTokens = this._state.totalTokens;
    const averageTokensPerMessage =
      messageCount > 0 ? totalTokens / messageCount : 0;

    return {
      messageCount,
      totalTokens,
      averageTokensPerMessage,
      pruningCount: this._stats.pruningCount,
      lastPruned: this._stats.lastPruned,
      strategyUsed: this._config.strategy.type as any,
    };
  }

  /**
   * Search messages by content
   */
  async search(
    query: string,
    options?: {
      limit?: number;
      threshold?: number;
      semantic?: boolean;
    },
  ): Promise<ContextSearchResult[]> {
    const results: ContextSearchResult[] = [];
    const limit = options?.limit || 10;
    const threshold = options?.threshold || 0.5;

    // Simple keyword-based search for now
    // TODO: Implement semantic search when embedding support is added
    const queryLower = query.toLowerCase();

    for (const message of this._state.messages) {
      const contentLower = message.content.toLowerCase();

      // Calculate simple relevance score based on keyword matching
      let score = 0;
      const queryWords = queryLower.split(/\s+/);

      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 1;
        }
      }

      // Normalize score
      score = score / queryWords.length;

      if (score >= threshold) {
        results.push({
          message,
          score,
          reason: "keyword-match",
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Limit results
    return results.slice(0, limit);
  }

  /**
   * Update strategy configuration
   */
  updateStrategy(config: ContextStrategyConfig): void {
    this._config.strategy = config;
    this._strategy = this.createStrategy(config);
  }

  /**
   * Update max token limit
   */
  updateMaxTokens(maxTokens: number): void {
    this._config.maxTokens = maxTokens;
    this._state.maxTokens = maxTokens;
  }

  /**
   * Export context state
   */
  export(): ContextExport {
    return {
      version: "1.0.0",
      timestamp: Date.now(),
      state: this.state,
      summaries: [...this._summaries],
      stats: this.getStats(),
    };
  }

  /**
   * Import context state
   */
  async import(data: ContextExport): Promise<void> {
    // Validate version compatibility
    if (!data.version.startsWith("1.")) {
      throw new Error(`Unsupported export version: ${data.version}`);
    }

    // Clear current state
    this.reset();

    // Import state
    this._state = {
      ...data.state,
      messages: [...data.state.messages],
    };

    // Import summaries
    if (data.summaries) {
      this._summaries = [...data.summaries];
    }
  }

  /**
   * Get all summaries
   */
  getSummaries(): ContextSummary[] {
    return [...this._summaries];
  }

  /**
   * Add a summary
   */
  addSummary(summary: ContextSummary): void {
    this._summaries.push(summary);
  }

  /**
   * Reset context manager
   */
  reset(): void {
    this._state = {
      messages: [],
      totalTokens: 0,
      maxTokens: this._config.maxTokens,
      systemMessage: undefined,
    };
    this._summaries = [];
    this._stats = {
      pruningCount: 0,
    };
  }

  /**
   * Create a strategy instance from configuration
   */
  private createStrategy(config: ContextStrategyConfig): IContextStrategy {
    switch (config.type) {
      case "sliding-window":
        return new SlidingWindowStrategy(config);
      case "priority-based":
        return new PriorityBasedStrategy(config);
      case "summary-based":
        return new SummaryBasedStrategy(
          config,
          this._config.tokenCounter as any,
        );
      case "semantic":
        return new SemanticStrategy(config, this._config.tokenCounter as any);
      default:
        throw new Error(`Unknown strategy type: ${(config as any).type}`);
    }
  }

  /**
   * Generate a unique ID for messages
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Create a context manager with default configuration
 */
export function createContextManager(
  config?: Partial<ContextManagerConfig>,
): ContextManager {
  const defaultConfig: ContextManagerConfig = {
    maxTokens: config?.maxTokens || 4096,
    strategy: config?.strategy || {
      type: "sliding-window",
      maxMessages: 50,
      preserveSystemMessage: true,
    },
    autoprune: config?.autoprune !== false,
    tokenCounter: config?.tokenCounter,
  };

  return new ContextManager(defaultConfig);
}
