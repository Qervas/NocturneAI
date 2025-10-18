/**
 * Summary-Based Strategy
 *
 * Intelligent pruning strategy that uses LLM to summarize old messages
 * while keeping recent messages intact.
 *
 * Features:
 * - LLM-powered message summarization
 * - Keeps recent N messages untouched
 * - Summary caching to avoid re-summarization
 * - Configurable summary threshold
 * - System message preservation
 * - Token-aware summarization
 * - Batch summarization for efficiency
 */

import type { IContextStrategy } from "../../../core/interfaces/IContextManager.js";
import type {
  ContextMessage,
  PruningResult,
  SummaryBasedConfig,
  ContextSummary,
} from "../../../core/types/context.types.js";
import type { ILLMClient } from "../../../core/interfaces/ILLMClient.js";

/**
 * Summary cache entry
 */
interface SummaryCacheEntry {
  summary: ContextSummary;
  createdAt: number;
}

/**
 * Summary-Based Strategy Implementation
 */
export class SummaryBasedStrategy implements IContextStrategy {
  public readonly type = "summary-based";
  public readonly config: SummaryBasedConfig;

  private llmClient?: ILLMClient;
  private summaryCache: Map<string, SummaryCacheEntry> = new Map();
  private pruneCount: number = 0;
  private totalRemoved: number = 0;
  private totalTokensRemoved: number = 0;
  private totalSummariesCreated: number = 0;
  private lastPruneTime: number = 0;

  constructor(config: SummaryBasedConfig, llmClient?: ILLMClient) {
    this.config = config;
    this.llmClient = llmClient;
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

    if (this.config.summaryThreshold < 2) {
      throw new Error("summaryThreshold must be at least 2");
    }

    if (this.config.keepRecentCount < 1) {
      throw new Error("keepRecentCount must be at least 1");
    }

    if (this.config.keepRecentCount >= this.config.summaryThreshold) {
      throw new Error("keepRecentCount must be less than summaryThreshold");
    }

    if (typeof this.config.preserveSystemMessage !== "boolean") {
      throw new Error("preserveSystemMessage must be a boolean");
    }
  }

  /**
   * Set LLM client for summarization
   */
  setLLMClient(client: ILLMClient): void {
    this.llmClient = client;
  }

  /**
   * Prune messages using summary-based approach
   *
   * Algorithm:
   * 1. Separate system messages (if preserve is enabled)
   * 2. Keep the most recent N messages
   * 3. Identify old messages for summarization
   * 4. Check if summary exists in cache
   * 5. If not, use LLM to create summary
   * 6. Replace old messages with summary
   * 7. Ensure total doesn't exceed maxTokens
   */
  async prune(
    messages: ContextMessage[],
    maxTokens: number,
    currentTokens: number,
  ): Promise<PruningResult> {
    const startTime = Date.now();

    // If we're already within limits, no pruning needed
    if (
      messages.length <= this.config.maxMessages &&
      currentTokens <= maxTokens
    ) {
      return {
        messages: [...messages],
        removedCount: 0,
        removedTokens: 0,
        strategy: "summary-based",
        metadata: {
          summariesCreated: 0,
          cacheHits: 0,
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

    // If we have fewer messages than the threshold, just use sliding window
    if (regularMessages.length <= this.config.summaryThreshold) {
      return this.slidingWindowFallback(messages, currentTokens, systemMessage);
    }

    // Split into recent messages (keep) and old messages (summarize)
    const recentMessages = regularMessages.slice(-this.config.keepRecentCount);
    const oldMessages = regularMessages.slice(
      0,
      regularMessages.length - this.config.keepRecentCount,
    );

    // Try to get or create summary
    let summaryMessage: ContextMessage;
    let cacheHit = false;
    let summariesCreated = 0;

    const cacheKey = this.getCacheKey(oldMessages);
    const cached = this.summaryCache.get(cacheKey);

    if (cached) {
      // Use cached summary
      summaryMessage = this.summaryToMessage(cached.summary);
      cacheHit = true;
    } else {
      // Create new summary
      if (!this.llmClient) {
        // No LLM client available, fallback to sliding window
        return this.slidingWindowFallback(
          messages,
          currentTokens,
          systemMessage,
        );
      }

      const summary = await this.createSummary(oldMessages);
      summaryMessage = this.summaryToMessage(summary);

      // Cache the summary
      this.summaryCache.set(cacheKey, {
        summary,
        createdAt: Date.now(),
      });

      summariesCreated = 1;
      this.totalSummariesCreated++;
    }

    // Build final message list
    const resultMessages: ContextMessage[] = [];
    if (systemMessage) {
      resultMessages.push(systemMessage);
    }
    resultMessages.push(summaryMessage);
    resultMessages.push(...recentMessages);

    // Calculate tokens for result
    let resultTokens = resultMessages.reduce(
      (sum, msg) => sum + (msg.tokens || 0),
      0,
    );

    // If still over limit, trim recent messages
    if (resultTokens > maxTokens) {
      const trimmedRecent = this.trimToTokenLimit(
        recentMessages,
        maxTokens - (resultTokens - this.countTokens(recentMessages)),
      );

      const finalMessages: ContextMessage[] = [];
      if (systemMessage) {
        finalMessages.push(systemMessage);
      }
      finalMessages.push(summaryMessage);
      finalMessages.push(...trimmedRecent);

      resultTokens = finalMessages.reduce(
        (sum, msg) => sum + (msg.tokens || 0),
        0,
      );

      return this.buildResult(
        finalMessages,
        messages,
        currentTokens,
        resultTokens,
        startTime,
        summariesCreated,
        cacheHit,
        systemMessage !== null,
      );
    }

    return this.buildResult(
      resultMessages,
      messages,
      currentTokens,
      resultTokens,
      startTime,
      summariesCreated,
      cacheHit,
      systemMessage !== null,
    );
  }

  /**
   * Create a summary of messages using LLM
   */
  private async createSummary(
    messages: ContextMessage[],
  ): Promise<ContextSummary> {
    if (!this.llmClient) {
      throw new Error("LLM client not available for summarization");
    }

    // Format messages for summarization
    const conversationText = messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");

    const summaryPrompt = `Please provide a concise summary of the following conversation. Focus on key points, decisions, and important context that should be preserved:

${conversationText}

Summary:`;

    try {
      const response = await this.llmClient.chat({
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that creates concise, informative summaries of conversations.",
          },
          {
            role: "user",
            content: summaryPrompt,
          },
        ],
        model: this.config.summaryModel,
        temperature: 0.3, // Lower temperature for consistent summaries
        maxTokens: 500, // Reasonable summary length
      });

      const summaryContent =
        response.message?.content || response.content || "Summary unavailable.";

      // Estimate tokens (rough approximation)
      const tokens = Math.ceil(summaryContent.length / 4);

      return {
        id: this.generateSummaryId(),
        content: summaryContent,
        messageIds: messages.map((m) => m.id),
        tokens,
        timestamp: Date.now(),
        model: this.config.summaryModel || "default",
      };
    } catch (error) {
      // Fallback to simple concatenation if LLM fails
      const fallbackContent = `[Summary of ${messages.length} messages from earlier in the conversation]`;
      return {
        id: this.generateSummaryId(),
        content: fallbackContent,
        messageIds: messages.map((m) => m.id),
        tokens: Math.ceil(fallbackContent.length / 4),
        timestamp: Date.now(),
        model: "fallback",
      };
    }
  }

  /**
   * Convert summary to context message
   */
  private summaryToMessage(summary: ContextSummary): ContextMessage {
    return {
      id: summary.id,
      role: "assistant",
      content: `📝 Summary: ${summary.content}`,
      timestamp: summary.timestamp,
      tokens: summary.tokens,
      metadata: {
        isSummary: true,
        summarizedMessageIds: summary.messageIds,
        summaryModel: summary.model,
      },
    };
  }

  /**
   * Generate cache key from messages
   */
  private getCacheKey(messages: ContextMessage[]): string {
    const ids = messages.map((m) => m.id).join(",");
    return `summary_${ids}`;
  }

  /**
   * Generate unique summary ID
   */
  private generateSummaryId(): string {
    return `summary_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Count tokens in messages
   */
  private countTokens(messages: ContextMessage[]): number {
    return messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
  }

  /**
   * Trim messages to fit token limit
   */
  private trimToTokenLimit(
    messages: ContextMessage[],
    maxTokens: number,
  ): ContextMessage[] {
    const result: ContextMessage[] = [];
    let currentTokens = 0;

    // Keep most recent messages that fit
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = msg.tokens || 0;

      if (currentTokens + msgTokens <= maxTokens) {
        result.unshift(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Fallback to sliding window when summarization not available
   */
  private slidingWindowFallback(
    messages: ContextMessage[],
    currentTokens: number,
    systemMessage: ContextMessage | null,
  ): PruningResult {
    const regularMessages = messages.filter((m) => m.role !== "system");
    const keptMessages = regularMessages.slice(-this.config.maxMessages);

    const result: ContextMessage[] = [];
    if (systemMessage) {
      result.push(systemMessage);
    }
    result.push(...keptMessages);

    const resultTokens = this.countTokens(result);

    return this.buildResult(
      result,
      messages,
      currentTokens,
      resultTokens,
      Date.now(),
      0,
      false,
      systemMessage !== null,
    );
  }

  /**
   * Build pruning result
   */
  private buildResult(
    keptMessages: ContextMessage[],
    originalMessages: ContextMessage[],
    originalTokens: number,
    resultTokens: number,
    startTime: number,
    summariesCreated: number,
    cacheHit: boolean,
    preservedSystem: boolean,
  ): PruningResult {
    const removedCount = originalMessages.length - keptMessages.length;
    const removedTokens = originalTokens - resultTokens;

    this.pruneCount++;
    this.totalRemoved += removedCount;
    this.totalTokensRemoved += removedTokens;
    this.lastPruneTime = startTime;

    return {
      messages: keptMessages,
      removedCount,
      removedTokens,
      strategy: "summary-based",
      metadata: {
        summariesCreated,
        cacheHit,
        preservedSystem,
        processingTimeMs: Date.now() - startTime,
        cacheSize: this.summaryCache.size,
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
      totalSummariesCreated: this.totalSummariesCreated,
      avgRemovedPerPrune:
        this.pruneCount > 0
          ? Math.round((this.totalRemoved / this.pruneCount) * 100) / 100
          : 0,
      avgTokensRemovedPerPrune:
        this.pruneCount > 0
          ? Math.round((this.totalTokensRemoved / this.pruneCount) * 100) / 100
          : 0,
      cacheSize: this.summaryCache.size,
      lastPruneTime: this.lastPruneTime,
      config: {
        maxMessages: this.config.maxMessages,
        summaryThreshold: this.config.summaryThreshold,
        keepRecentCount: this.config.keepRecentCount,
        preserveSystemMessage: this.config.preserveSystemMessage,
        summaryModel: this.config.summaryModel,
      },
    };
  }

  /**
   * Clear summary cache
   */
  clearCache(): void {
    this.summaryCache.clear();
  }

  /**
   * Get cached summaries
   */
  getCachedSummaries(): ContextSummary[] {
    return Array.from(this.summaryCache.values()).map((entry) => entry.summary);
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.pruneCount = 0;
    this.totalRemoved = 0;
    this.totalTokensRemoved = 0;
    this.totalSummariesCreated = 0;
    this.lastPruneTime = 0;
  }
}

/**
 * Factory function to create a summary-based strategy
 */
export function createSummaryBasedStrategy(
  config: Partial<SummaryBasedConfig> & { type: "summary-based" },
  llmClient?: ILLMClient,
): SummaryBasedStrategy {
  const fullConfig: SummaryBasedConfig = {
    maxMessages: 50,
    preserveSystemMessage: true,
    summaryThreshold: 20,
    keepRecentCount: 10,
    ...config,
  };

  return new SummaryBasedStrategy(fullConfig, llmClient);
}
