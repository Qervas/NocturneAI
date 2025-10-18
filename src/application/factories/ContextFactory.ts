/**
 * Context Factory
 *
 * Factory for creating and configuring context manager instances with different strategies.
 *
 * Features:
 * - Create context managers with various strategies
 * - Configure token limits and optimization
 * - Support for sliding window, priority-based, summary-based, and semantic strategies
 * - Hybrid strategy support
 * - Token counter integration
 * - Context state persistence
 */

import type { IContextManager } from "../../core/interfaces/IContextManager.js";
import type {
  ContextManagerConfig,
  ContextStrategyConfig,
  SlidingWindowConfig,
  PriorityBasedConfig,
  SummaryBasedConfig,
  SemanticConfig,
} from "../../core/types/context.types.js";
import { ContextManager } from "../../infrastructure/context/ContextManager.js";
import { TokenCounter } from "../../infrastructure/llm/TokenCounter.js";

/**
 * Context Factory Configuration
 */
export interface ContextFactoryConfig {
  /** Default max tokens for context */
  defaultMaxTokens?: number;

  /** Default strategy type */
  defaultStrategy?:
    | "sliding-window"
    | "priority-based"
    | "summary-based"
    | "semantic";

  /** Whether to enable auto-pruning by default */
  defaultAutoPrune?: boolean;
}

/**
 * Context Creation Options
 */
export interface ContextCreationOptions {
  /** Max tokens override */
  maxTokens?: number;

  /** Strategy configuration */
  strategy?: ContextStrategyConfig;

  /** Auto-prune override */
  autoprune?: boolean;

  /** Initial system message */
  systemMessage?: string;
}

/**
 * Context Factory
 */
export class ContextFactory {
  private config: ContextFactoryConfig;
  private tokenCounter?: TokenCounter;

  constructor(config: ContextFactoryConfig = {}) {
    this.config = {
      defaultMaxTokens: config.defaultMaxTokens || 4096,
      defaultStrategy: config.defaultStrategy || "sliding-window",
      defaultAutoPrune: config.defaultAutoPrune !== false,
    };

    // Initialize token counter
    this.tokenCounter = new TokenCounter();
  }

  /**
   * Create a context manager
   */
  async createContextManager(
    options: ContextCreationOptions = {},
  ): Promise<IContextManager> {
    const config: ContextManagerConfig = {
      maxTokens: options.maxTokens || this.config.defaultMaxTokens!,
      strategy: options.strategy || this.createDefaultStrategy(),
      autoprune: options.autoprune ?? this.config.defaultAutoPrune!,
      tokenCounter: this.tokenCounter,
    };

    const contextManager = new ContextManager(config);

    // Add initial system message if provided
    if (options.systemMessage) {
      await contextManager.addMessage({
        role: "system",
        content: options.systemMessage,
      });
    }

    return contextManager;
  }

  /**
   * Create a context manager with sliding window strategy
   */
  async createSlidingWindowContext(
    maxTokens: number = 4096,
    maxMessages: number = 50,
    options: Partial<SlidingWindowConfig> = {},
  ): Promise<IContextManager> {
    const strategy: SlidingWindowConfig = {
      type: "sliding-window",
      maxMessages,
      preserveSystemMessage: options.preserveSystemMessage ?? true,
    };

    return this.createContextManager({
      maxTokens,
      strategy,
    });
  }

  /**
   * Create a context manager with priority-based strategy
   */
  async createPriorityBasedContext(
    maxTokens: number = 4096,
    options: Partial<PriorityBasedConfig> = {},
  ): Promise<IContextManager> {
    const strategy: PriorityBasedConfig = {
      type: "priority-based",
      weights: options.weights || {
        priorityWeight: 0.5,
        recencyWeight: 0.3,
        roleWeight: 0.2,
      },
      minMessages: options.minMessages || 5,
      recencyDecayFactor: options.recencyDecayFactor || 0.95,
    };

    return this.createContextManager({
      maxTokens,
      strategy,
    });
  }

  /**
   * Create a context manager with summary-based strategy
   */
  async createSummaryBasedContext(
    maxTokens: number = 4096,
    options: Partial<SummaryBasedConfig> = {},
  ): Promise<IContextManager> {
    const strategy: SummaryBasedConfig = {
      type: "summary-based",
      maxMessages: options.maxMessages || 20,
      preserveSystemMessage: options.preserveSystemMessage ?? true,
      summaryThreshold: options.summaryThreshold || 30,
      keepRecentCount: options.keepRecentCount || 5,
      summaryModel: options.summaryModel,
    };

    return this.createContextManager({
      maxTokens,
      strategy,
    });
  }

  /**
   * Create a context manager with semantic strategy
   */
  async createSemanticContext(
    maxTokens: number = 4096,
    options: Partial<SemanticConfig> = {},
  ): Promise<IContextManager> {
    const strategy: SemanticConfig = {
      type: "semantic",
      maxMessages: options.maxMessages || 30,
      preserveSystemMessage: options.preserveSystemMessage ?? true,
      relevanceThreshold: options.relevanceThreshold || 0.7,
      topK: options.topK || 10,
      embeddingModel: options.embeddingModel || "text-embedding-ada-002",
    };

    return this.createContextManager({
      maxTokens,
      strategy,
    });
  }

  /**
   * Create a context manager from configuration object
   */
  async createFromConfig(
    config: ContextManagerConfig,
  ): Promise<IContextManager> {
    // Use factory's token counter if not provided in config
    if (!config.tokenCounter && this.tokenCounter) {
      config.tokenCounter = this.tokenCounter;
    }

    return new ContextManager(config);
  }

  /**
   * Create a context manager for a specific agent role
   */
  async createForAgentRole(
    role: "coder" | "reviewer" | "tester" | "researcher" | "planner",
    maxTokens?: number,
  ): Promise<IContextManager> {
    const tokens = maxTokens || this.config.defaultMaxTokens!;

    switch (role) {
      case "coder":
        // Coders need to see recent code and maintain context of current task
        return this.createPriorityBasedContext(tokens, {
          weights: {
            priorityWeight: 0.4,
            recencyWeight: 0.5,
            roleWeight: 0.1,
          },
          minMessages: 10,
        });

      case "reviewer":
        // Reviewers benefit from semantic similarity to find related discussions
        return this.createSemanticContext(tokens, {
          relevanceThreshold: 0.75,
          maxMessages: 40,
          topK: 10,
        });

      case "tester":
        // Testers need sliding window to focus on current test cases
        return this.createSlidingWindowContext(tokens, 30);

      case "researcher":
        // Researchers benefit from summaries of long discussions
        return this.createSummaryBasedContext(tokens, {
          summaryThreshold: 25,
          keepRecentCount: 10,
          maxMessages: 20,
        });

      case "planner":
        // Planners need priority-based approach for important items
        return this.createPriorityBasedContext(tokens, {
          weights: {
            priorityWeight: 0.7,
            recencyWeight: 0.2,
            roleWeight: 0.1,
          },
          minMessages: 10,
          recencyDecayFactor: 0.9,
        });

      default:
        return this.createContextManager();
    }
  }

  /**
   * Create default strategy configuration
   */
  private createDefaultStrategy(): ContextStrategyConfig {
    const strategyType = this.config.defaultStrategy!;

    switch (strategyType) {
      case "sliding-window":
        return {
          type: "sliding-window",
          maxMessages: 50,
          preserveSystemMessage: true,
        };

      case "priority-based":
        return {
          type: "priority-based",
          weights: {
            priorityWeight: 0.5,
            recencyWeight: 0.3,
            roleWeight: 0.2,
          },
          minMessages: 5,
          recencyDecayFactor: 0.95,
        };

      case "summary-based":
        return {
          type: "summary-based",
          maxMessages: 20,
          preserveSystemMessage: true,
          summaryThreshold: 30,
          keepRecentCount: 5,
        };

      case "semantic":
        return {
          type: "semantic",
          maxMessages: 30,
          preserveSystemMessage: true,
          relevanceThreshold: 0.7,
          topK: 10,
          embeddingModel: "text-embedding-ada-002",
        };

      default:
        return {
          type: "sliding-window",
          maxMessages: 50,
          preserveSystemMessage: true,
        };
    }
  }

  /**
   * Get factory configuration
   */
  getConfig(): Readonly<ContextFactoryConfig> {
    return { ...this.config };
  }

  /**
   * Get token counter
   */
  getTokenCounter(): TokenCounter | undefined {
    return this.tokenCounter;
  }
}
