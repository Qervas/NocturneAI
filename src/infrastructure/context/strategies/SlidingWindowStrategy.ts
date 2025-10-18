/**
 * Sliding Window Strategy
 *
 * Simple FIFO (First-In-First-Out) pruning strategy that keeps
 * the most recent messages within the token limit.
 *
 * Features:
 * - Removes oldest messages first
 * - Always preserves system message (if configured)
 * - Simple and predictable behavior
 * - Fast performance
 */

import type { IContextStrategy } from "../../../core/interfaces/IContextManager.js";
import type {
  ContextMessage,
  PruningResult,
  SlidingWindowConfig,
} from "../../../core/types/context.types.js";

/**
 * Sliding Window Strategy Implementation
 */
export class SlidingWindowStrategy implements IContextStrategy {
  public readonly type = "sliding-window";
  public readonly config: SlidingWindowConfig;

  private pruneCount: number = 0;
  private totalRemoved: number = 0;
  private totalTokensRemoved: number = 0;

  constructor(config: SlidingWindowConfig) {
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
    if (this.config.maxMessages < 1) {
      throw new Error("maxMessages must be at least 1");
    }

    if (typeof this.config.preserveSystemMessage !== "boolean") {
      throw new Error("preserveSystemMessage must be a boolean");
    }
  }

  /**
   * Prune messages using sliding window approach
   *
   * Algorithm:
   * 1. Separate system message (if preserve is enabled)
   * 2. Keep most recent messages up to maxMessages
   * 3. Ensure total doesn't exceed maxTokens
   * 4. Add system message back if preserved
   */
  async prune(
    messages: ContextMessage[],
    maxTokens: number,
    currentTokens: number,
  ): Promise<PruningResult> {
    // If we're already within limits, no pruning needed
    if (
      messages.length <= this.config.maxMessages &&
      currentTokens <= maxTokens
    ) {
      return {
        messages: [...messages],
        removedCount: 0,
        removedTokens: 0,
        strategy: "sliding-window",
        metadata: {
          maxMessages: this.config.maxMessages,
          preservedSystem: false,
        },
      };
    }

    let systemMessage: ContextMessage | null = null;
    let regularMessages: ContextMessage[] = [];

    // Separate system message if preserve is enabled
    if (this.config.preserveSystemMessage) {
      for (const msg of messages) {
        if (msg.role === "system") {
          if (!systemMessage) {
            systemMessage = msg;
          }
        } else {
          regularMessages.push(msg);
        }
      }
    } else {
      regularMessages = [...messages];
    }

    // Keep only the most recent messages up to maxMessages
    let messagesToKeep = regularMessages;
    if (regularMessages.length > this.config.maxMessages) {
      // Keep last N messages (most recent)
      const startIndex = regularMessages.length - this.config.maxMessages;
      messagesToKeep = regularMessages.slice(startIndex);
    }

    // Calculate tokens and ensure we're under the limit
    let totalTokens = 0;
    const finalMessages: ContextMessage[] = [];

    // Add system message first if preserved
    if (systemMessage) {
      totalTokens += systemMessage.tokens || 0;
      finalMessages.push(systemMessage);
    }

    // Add messages from oldest to newest, checking token limit
    for (const msg of messagesToKeep) {
      const msgTokens = msg.tokens || 0;

      // Check if adding this message would exceed token limit
      if (totalTokens + msgTokens > maxTokens && finalMessages.length > 0) {
        // If we have at least one message (or system message), stop here
        // But if this is the first regular message, we need to keep it
        if (finalMessages.length > (systemMessage ? 1 : 0)) {
          break;
        }
      }

      totalTokens += msgTokens;
      finalMessages.push(msg);
    }

    // Calculate what was removed
    const removedCount = messages.length - finalMessages.length;
    const removedTokens = currentTokens - totalTokens;

    // Update statistics
    this.pruneCount++;
    this.totalRemoved += removedCount;
    this.totalTokensRemoved += removedTokens;

    return {
      messages: finalMessages,
      removedCount,
      removedTokens,
      strategy: "sliding-window",
      metadata: {
        maxMessages: this.config.maxMessages,
        preservedSystem: systemMessage !== null,
        keptMessages: finalMessages.length,
        totalTokens,
      },
    };
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
      config: {
        maxMessages: this.config.maxMessages,
        preserveSystemMessage: this.config.preserveSystemMessage,
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
  }

  /**
   * Get a copy of the configuration
   */
  getConfig(): SlidingWindowConfig {
    return {
      type: "sliding-window",
      maxMessages: this.config.maxMessages,
      preserveSystemMessage: this.config.preserveSystemMessage,
    };
  }

  /**
   * Update configuration
   *
   * @param config - New configuration values
   */
  updateConfig(config: Partial<Omit<SlidingWindowConfig, "type">>): void {
    if (config.maxMessages !== undefined) {
      if (config.maxMessages < 1) {
        throw new Error("maxMessages must be at least 1");
      }
      this.config.maxMessages = config.maxMessages;
    }

    if (config.preserveSystemMessage !== undefined) {
      this.config.preserveSystemMessage = config.preserveSystemMessage;
    }
  }
}

/**
 * Create a sliding window strategy with default configuration
 */
export function createSlidingWindowStrategy(
  config?: Partial<Omit<SlidingWindowConfig, "type">>,
): SlidingWindowStrategy {
  return new SlidingWindowStrategy({
    type: "sliding-window",
    maxMessages: config?.maxMessages || 50,
    preserveSystemMessage: config?.preserveSystemMessage !== false,
  });
}
