/**
 * Context Pruner
 *
 * Manages multiple pruning strategies and delegates pruning operations
 * to the appropriate strategy based on configuration.
 *
 * Features:
 * - Strategy registration and lookup
 * - Strategy validation
 * - Delegation to appropriate strategy
 * - Statistics tracking across strategies
 */

import type {
  IContextPruner,
  IContextStrategy,
} from "../../core/interfaces/IContextManager.js";
import type {
  ContextMessage,
  PruningResult,
} from "../../core/types/context.types.js";

/**
 * Context Pruner Implementation
 */
export class ContextPruner implements IContextPruner {
  private strategies: Map<string, IContextStrategy>;
  private pruneHistory: Array<{
    timestamp: number;
    strategy: string;
    removedCount: number;
    removedTokens: number;
  }>;

  constructor() {
    this.strategies = new Map();
    this.pruneHistory = [];
  }

  /**
   * Register a pruning strategy
   */
  registerStrategy(strategy: IContextStrategy): void {
    if (!strategy.type) {
      throw new Error("Strategy must have a type identifier");
    }

    if (!strategy.validate()) {
      throw new Error(
        `Invalid strategy configuration for type: ${strategy.type}`,
      );
    }

    this.strategies.set(strategy.type, strategy);
  }

  /**
   * Get a registered strategy by type
   */
  getStrategy(type: string): IContextStrategy | null {
    return this.strategies.get(type) || null;
  }

  /**
   * Prune messages using specified strategy
   */
  async prune(
    messages: ContextMessage[],
    strategyType: string,
    maxTokens: number,
    currentTokens: number,
  ): Promise<PruningResult> {
    const strategy = this.getStrategy(strategyType);

    if (!strategy) {
      throw new Error(
        `Strategy not found: ${strategyType}. Available strategies: ${this.getAvailableStrategies().join(", ")}`,
      );
    }

    // Validate inputs
    if (maxTokens <= 0) {
      throw new Error("maxTokens must be greater than 0");
    }

    if (currentTokens < 0) {
      throw new Error("currentTokens cannot be negative");
    }

    if (messages.length === 0) {
      return {
        messages: [],
        removedCount: 0,
        removedTokens: 0,
        strategy: strategyType as any,
        metadata: {
          reason: "no-messages",
        },
      };
    }

    // Delegate to strategy
    const result = await strategy.prune(messages, maxTokens, currentTokens);

    // Record in history
    this.pruneHistory.push({
      timestamp: Date.now(),
      strategy: strategyType,
      removedCount: result.removedCount,
      removedTokens: result.removedTokens,
    });

    // Keep only last 100 entries
    if (this.pruneHistory.length > 100) {
      this.pruneHistory = this.pruneHistory.slice(-100);
    }

    return result;
  }

  /**
   * Get list of available strategy types
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Unregister a strategy
   */
  unregisterStrategy(type: string): boolean {
    return this.strategies.delete(type);
  }

  /**
   * Clear all registered strategies
   */
  clearStrategies(): void {
    this.strategies.clear();
  }

  /**
   * Get statistics for all strategies
   */
  getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {
      registeredStrategies: this.getAvailableStrategies(),
      totalPruningOperations: this.pruneHistory.length,
      pruneHistory: this.pruneHistory.slice(-10), // Last 10 operations
    };

    // Add per-strategy statistics
    const strategyStats: Record<string, unknown> = {};
    for (const [type, strategy] of this.strategies.entries()) {
      strategyStats[type] = strategy.getStats();
    }
    stats.strategies = strategyStats;

    // Calculate aggregate statistics from history
    if (this.pruneHistory.length > 0) {
      const totalRemoved = this.pruneHistory.reduce(
        (sum, entry) => sum + entry.removedCount,
        0,
      );
      const totalTokensRemoved = this.pruneHistory.reduce(
        (sum, entry) => sum + entry.removedTokens,
        0,
      );

      stats.aggregate = {
        totalMessagesRemoved: totalRemoved,
        totalTokensRemoved,
        averageMessagesPerPrune:
          this.pruneHistory.length > 0
            ? totalRemoved / this.pruneHistory.length
            : 0,
        averageTokensPerPrune:
          this.pruneHistory.length > 0
            ? totalTokensRemoved / this.pruneHistory.length
            : 0,
      };
    }

    return stats;
  }

  /**
   * Get pruning history
   */
  getHistory(limit?: number): Array<{
    timestamp: number;
    strategy: string;
    removedCount: number;
    removedTokens: number;
  }> {
    const history = [...this.pruneHistory];
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Clear pruning history
   */
  clearHistory(): void {
    this.pruneHistory = [];
  }

  /**
   * Validate a strategy without registering it
   */
  validateStrategy(strategy: IContextStrategy): boolean {
    try {
      if (!strategy.type) {
        return false;
      }
      return strategy.validate();
    } catch {
      return false;
    }
  }

  /**
   * Check if a strategy type is registered
   */
  hasStrategy(type: string): boolean {
    return this.strategies.has(type);
  }

  /**
   * Get the number of registered strategies
   */
  getStrategyCount(): number {
    return this.strategies.size;
  }
}

/**
 * Create a context pruner with default strategies
 */
export function createContextPruner(
  strategies?: IContextStrategy[],
): ContextPruner {
  const pruner = new ContextPruner();

  if (strategies) {
    for (const strategy of strategies) {
      pruner.registerStrategy(strategy);
    }
  }

  return pruner;
}
