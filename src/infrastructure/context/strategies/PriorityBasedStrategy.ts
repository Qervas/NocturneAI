/**
 * Priority-Based Strategy
 *
 * Intelligent pruning strategy that keeps high-priority messages
 * using a scoring algorithm that considers:
 * - Message priority level (low, normal, high, critical)
 * - Recency (newer messages get higher scores)
 * - Role importance (system > assistant > user > tool)
 * - Metadata priority overrides
 *
 * Features:
 * - Sophisticated priority scoring
 * - Configurable weights for each factor
 * - Always preserves system messages
 * - Metadata-based priority overrides
 * - Time-decay for recency
 */

import type { IContextStrategy } from "../../../core/interfaces/IContextManager.js";
import type {
  ContextMessage,
  PruningResult,
  PriorityBasedConfig,
  MessagePriority,
} from "../../../core/types/context.types.js";

/**
 * Priority weights for scoring
 */
const PRIORITY_WEIGHTS: Record<MessagePriority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
};

/**
 * Role importance weights
 */
const ROLE_WEIGHTS: Record<string, number> = {
  system: 100,
  assistant: 75,
  user: 60,
  tool: 50,
  function: 50,
};

/**
 * Message with calculated score
 */
interface ScoredMessage {
  message: ContextMessage;
  score: number;
  breakdown: {
    priorityScore: number;
    recencyScore: number;
    roleScore: number;
    metadataBonus: number;
    totalScore: number;
  };
}

/**
 * Priority-Based Strategy Implementation
 */
export class PriorityBasedStrategy implements IContextStrategy {
  public readonly type = "priority-based";
  public readonly config: PriorityBasedConfig;

  private pruneCount: number = 0;
  private totalRemoved: number = 0;
  private totalTokensRemoved: number = 0;
  private lastPruneTime: number = 0;

  constructor(config: PriorityBasedConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate configuration
   */
  validate(): boolean {
    try {
      this.validateConfig();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Internal validation with error throwing
   */
  private validateConfig(): void {
    const { priorityWeight, recencyWeight, roleWeight } = this.config.weights;

    if (priorityWeight < 0 || priorityWeight > 1) {
      throw new Error("priorityWeight must be between 0 and 1");
    }

    if (recencyWeight < 0 || recencyWeight > 1) {
      throw new Error("recencyWeight must be between 0 and 1");
    }

    if (roleWeight < 0 || roleWeight > 1) {
      throw new Error("roleWeight must be between 0 and 1");
    }

    const totalWeight = priorityWeight + recencyWeight + roleWeight;
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error(
        `Weights must sum to 1.0 (current: ${totalWeight.toFixed(3)})`,
      );
    }

    if (this.config.minMessages < 1) {
      throw new Error("minMessages must be at least 1");
    }

    if (
      this.config.recencyDecayFactor < 0 ||
      this.config.recencyDecayFactor > 1
    ) {
      throw new Error("recencyDecayFactor must be between 0 and 1");
    }
  }

  /**
   * Prune messages using priority-based scoring
   *
   * Algorithm:
   * 1. Always preserve system messages
   * 2. Calculate scores for all other messages
   * 3. Sort by score (highest first)
   * 4. Keep messages until token limit is reached
   * 5. Ensure at least minMessages are kept
   */
  async prune(
    messages: ContextMessage[],
    maxTokens: number,
    currentTokens: number,
  ): Promise<PruningResult> {
    const startTime = Date.now();

    // If we're already within limits, no pruning needed
    if (currentTokens <= maxTokens) {
      return {
        messages: [...messages],
        removedCount: 0,
        removedTokens: 0,
        strategy: "priority-based",
        metadata: {
          avgScore: 0,
          minScore: 0,
          maxScore: 0,
          preservedSystem: false,
        },
      };
    }

    // Separate system messages from regular messages
    const systemMessages: ContextMessage[] = [];
    const regularMessages: ContextMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemMessages.push(msg);
      } else {
        regularMessages.push(msg);
      }
    }

    // Calculate system message tokens
    const systemTokens = systemMessages.reduce(
      (sum, msg) => sum + (msg.tokens || 0),
      0,
    );

    // Available tokens for regular messages
    const availableTokens = maxTokens - systemTokens;

    if (availableTokens <= 0) {
      throw new Error(
        "System messages exceed token limit. Cannot prune further.",
      );
    }

    // Score all regular messages
    const scoredMessages = this.scoreMessages(regularMessages);

    // Sort by score (highest first)
    scoredMessages.sort((a, b) => b.score - a.score);

    // Select messages to keep
    const keptMessages: ContextMessage[] = [...systemMessages];
    let keptTokens = systemTokens;
    const scores: number[] = [];

    for (const scored of scoredMessages) {
      const msgTokens = scored.message.tokens || 0;

      // Always keep at least minMessages (excluding system)
      if (
        keptMessages.length - systemMessages.length <
        this.config.minMessages
      ) {
        keptMessages.push(scored.message);
        keptTokens += msgTokens;
        scores.push(scored.score);
      }
      // Keep if it fits within token limit
      else if (keptTokens + msgTokens <= maxTokens) {
        keptMessages.push(scored.message);
        keptTokens += msgTokens;
        scores.push(scored.score);
      }
    }

    // Sort messages back to chronological order
    keptMessages.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate statistics
    const removedCount = messages.length - keptMessages.length;
    const removedTokens = currentTokens - keptTokens;

    this.pruneCount++;
    this.totalRemoved += removedCount;
    this.totalTokensRemoved += removedTokens;
    this.lastPruneTime = startTime;

    const avgScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    return {
      messages: keptMessages,
      removedCount,
      removedTokens,
      strategy: "priority-based",
      metadata: {
        avgScore: Math.round(avgScore * 100) / 100,
        minScore: Math.round(minScore * 100) / 100,
        maxScore: Math.round(maxScore * 100) / 100,
        preservedSystem: systemMessages.length > 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Score all messages based on priority, recency, and role
   */
  private scoreMessages(messages: ContextMessage[]): ScoredMessage[] {
    if (messages.length === 0) {
      return [];
    }

    const oldestTimestamp = Math.min(...messages.map((m) => m.timestamp));
    const newestTimestamp = Math.max(...messages.map((m) => m.timestamp));
    const timeRange = newestTimestamp - oldestTimestamp || 1;

    return messages.map((message) => {
      // Priority score (0-100)
      const priority = message.priority || "normal";
      const priorityScore = PRIORITY_WEIGHTS[priority];

      // Recency score (0-100) with decay
      const normalizedAge = (message.timestamp - oldestTimestamp) / timeRange;
      const decayFactor = Math.pow(
        this.config.recencyDecayFactor,
        1 - normalizedAge,
      );
      const recencyScore = normalizedAge * 100 * decayFactor;

      // Role score (0-100)
      const roleScore = ROLE_WEIGHTS[message.role] || 50;

      // Metadata bonus (from custom priority field)
      let metadataBonus = 0;
      if (message.metadata?.priorityBonus) {
        const bonus = Number(message.metadata.priorityBonus);
        if (!isNaN(bonus)) {
          metadataBonus = Math.max(0, Math.min(100, bonus));
        }
      }

      // Calculate weighted total score
      const { priorityWeight, recencyWeight, roleWeight } = this.config.weights;
      const baseScore =
        priorityScore * priorityWeight +
        recencyScore * recencyWeight +
        roleScore * roleWeight;

      const totalScore = baseScore + metadataBonus;

      return {
        message,
        score: totalScore,
        breakdown: {
          priorityScore,
          recencyScore,
          roleScore,
          metadataBonus,
          totalScore,
        },
      };
    });
  }

  /**
   * Get strategy statistics
   */
  getStats(): Record<string, unknown> {
    return {
      type: this.type,
      pruneCount: this.pruneCount,
      totalRemoved: this.totalRemoved,
      totalTokensRemoved: this.totalTokensRemoved,
      avgRemovedPerPrune:
        this.pruneCount > 0
          ? Math.round((this.totalRemoved / this.pruneCount) * 100) / 100
          : 0,
      avgTokensRemovedPerPrune:
        this.pruneCount > 0
          ? Math.round((this.totalTokensRemoved / this.pruneCount) * 100) / 100
          : 0,
      lastPruneTime: this.lastPruneTime,
      config: {
        weights: this.config.weights,
        minMessages: this.config.minMessages,
        recencyDecayFactor: this.config.recencyDecayFactor,
      },
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.pruneCount = 0;
    this.totalRemoved = 0;
    this.totalTokensRemoved = 0;
    this.lastPruneTime = 0;
  }

  /**
   * Calculate score for a single message (useful for debugging)
   */
  calculateMessageScore(
    message: ContextMessage,
    allMessages: ContextMessage[],
  ): ScoredMessage {
    const scored = this.scoreMessages([...allMessages, message]);
    return scored[scored.length - 1];
  }
}
