/**
 * Context Selector
 *
 * Selects relevant messages from context based on semantic similarity,
 * keyword matching, and temporal relevance.
 *
 * Features:
 * - Semantic search using embeddings (if available)
 * - Keyword-based similarity (Jaccard index)
 * - Temporal relevance scoring
 * - Combined scoring with configurable weights
 * - Embedding caching for performance
 * - Token limit enforcement
 * - Fallback to keyword matching without embeddings
 */

import type { IContextSelector } from "../../core/interfaces/IContextManager.js";
import type {
  ContextMessage,
  ContextSearchResult,
  MessageEmbedding,
} from "../../core/types/context.types.js";
import type { IEmbeddingClient } from "../../core/interfaces/ILLMClient.js";

/**
 * Context selector configuration
 */
export interface ContextSelectorConfig {
  /** Use embeddings for semantic search (requires embedding client) */
  useEmbeddings: boolean;

  /** Scoring weights (must sum to 1.0) */
  weights: {
    semantic: number; // Weight for semantic similarity
    keyword: number; // Weight for keyword matching
    temporal: number; // Weight for recency
  };

  /** Recency decay factor (0-1, higher = less decay) */
  recencyDecayFactor: number;

  /** Maximum results to return */
  maxResults: number;

  /** Minimum relevance score threshold (0-1) */
  minScore: number;

  /** Embedding model to use */
  embeddingModel?: string;
}

/**
 * Embedding cache entry
 */
interface EmbeddingCacheEntry {
  embedding: MessageEmbedding;
  createdAt: number;
}

/**
 * Message with relevance score
 */
interface ScoredMessage {
  message: ContextMessage;
  score: number;
  breakdown: {
    semantic?: number;
    keyword?: number;
    temporal?: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ContextSelectorConfig = {
  useEmbeddings: true,
  weights: {
    semantic: 0.5,
    keyword: 0.3,
    temporal: 0.2,
  },
  recencyDecayFactor: 0.95,
  maxResults: 10,
  minScore: 0.3,
  embeddingModel: "text-embedding-ada-002",
};

/**
 * Context Selector Implementation
 */
export class ContextSelector implements IContextSelector {
  public readonly config: ContextSelectorConfig;

  private embeddingClient?: IEmbeddingClient;
  private embeddingCache: Map<string, EmbeddingCacheEntry> = new Map();
  private queryEmbeddingCache: Map<string, MessageEmbedding> = new Map();
  private selectionCount: number = 0;
  private totalMessagesProcessed: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(
    config?: Partial<ContextSelectorConfig>,
    embeddingClient?: IEmbeddingClient,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.embeddingClient = embeddingClient;
    this.validateConfig();
  }

  /**
   * Select relevant messages based on query
   */
  async selectRelevant(
    messages: ContextMessage[],
    query: string,
    maxTokens: number,
  ): Promise<ContextSearchResult[]> {
    this.selectionCount++;
    this.totalMessagesProcessed += messages.length;

    if (messages.length === 0) {
      return [];
    }

    if (!query || query.trim().length === 0) {
      // No query, return most recent messages within token limit
      return this.selectByRecency(messages, maxTokens);
    }

    // Score all messages
    const scoredMessages: ScoredMessage[] = await Promise.all(
      messages.map(async (message) => {
        const score = await this.calculateRelevance(query, message);
        const breakdown = await this.calculateScoreBreakdown(query, message);
        return { message, score, breakdown };
      }),
    );

    // Filter by minimum score
    const filtered = scoredMessages.filter(
      (sm) => sm.score >= this.config.minScore,
    );

    // Sort by score (descending)
    filtered.sort((a, b) => b.score - a.score);

    // Take top results
    const topResults = filtered.slice(0, this.config.maxResults);

    // Enforce token limit
    const withinTokenLimit = this.enforceTokenLimit(topResults, maxTokens);

    // Convert to ContextSearchResult
    return withinTokenLimit.map((sm) => ({
      message: sm.message,
      score: sm.score,
      reason: this.generateReason(sm),
    }));
  }

  /**
   * Calculate relevance score between query and message
   */
  async calculateRelevance(
    query: string,
    message: ContextMessage,
  ): Promise<number> {
    const breakdown = await this.calculateScoreBreakdown(query, message);

    // Combine scores using weights
    let totalScore = 0;

    if (breakdown.semantic !== undefined) {
      totalScore += breakdown.semantic * this.config.weights.semantic;
    }

    if (breakdown.keyword !== undefined) {
      totalScore += breakdown.keyword * this.config.weights.keyword;
    }

    if (breakdown.temporal !== undefined) {
      totalScore += breakdown.temporal * this.config.weights.temporal;
    }

    // Normalize if not all factors were used
    const usedWeights =
      (breakdown.semantic !== undefined ? this.config.weights.semantic : 0) +
      (breakdown.keyword !== undefined ? this.config.weights.keyword : 0) +
      (breakdown.temporal !== undefined ? this.config.weights.temporal : 0);

    if (usedWeights > 0 && usedWeights < 1) {
      totalScore = totalScore / usedWeights;
    }

    return Math.max(0, Math.min(1, totalScore));
  }

  /**
   * Calculate score breakdown for debugging
   */
  private async calculateScoreBreakdown(
    query: string,
    message: ContextMessage,
  ): Promise<{
    semantic?: number;
    keyword?: number;
    temporal?: number;
  }> {
    const breakdown: {
      semantic?: number;
      keyword?: number;
      temporal?: number;
    } = {};

    // Semantic similarity (if embeddings enabled and client available)
    if (
      this.config.useEmbeddings &&
      this.embeddingClient &&
      this.config.weights.semantic > 0
    ) {
      breakdown.semantic = await this.calculateSemanticSimilarity(
        query,
        message,
      );
    }

    // Keyword similarity
    if (this.config.weights.keyword > 0) {
      breakdown.keyword = this.calculateKeywordSimilarity(query, message);
    }

    // Temporal relevance
    if (this.config.weights.temporal > 0) {
      breakdown.temporal = this.calculateTemporalRelevance(message);
    }

    return breakdown;
  }

  /**
   * Calculate semantic similarity using embeddings
   */
  private async calculateSemanticSimilarity(
    query: string,
    message: ContextMessage,
  ): Promise<number> {
    if (!this.embeddingClient) {
      return 0;
    }

    try {
      // Get query embedding (with caching)
      const queryEmbedding = await this.getQueryEmbedding(query);

      // Get message embedding (with caching)
      const messageEmbedding = await this.getMessageEmbedding(message);

      // Calculate cosine similarity
      return this.cosineSimilarity(
        queryEmbedding.embedding,
        messageEmbedding.embedding,
      );
    } catch (error) {
      console.warn("Failed to calculate semantic similarity:", error);
      return 0;
    }
  }

  /**
   * Calculate keyword similarity using Jaccard index
   */
  private calculateKeywordSimilarity(
    query: string,
    message: ContextMessage,
  ): number {
    const queryTokens = this.tokenize(query);
    const messageTokens = this.tokenize(
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content),
    );

    if (queryTokens.size === 0 || messageTokens.size === 0) {
      return 0;
    }

    // Calculate Jaccard index
    const intersection = new Set(
      [...queryTokens].filter((token) => messageTokens.has(token)),
    );
    const union = new Set([...queryTokens, ...messageTokens]);

    return intersection.size / union.size;
  }

  /**
   * Calculate temporal relevance (recency score)
   */
  private calculateTemporalRelevance(message: ContextMessage): number {
    const now = Date.now();
    const age = now - message.timestamp;

    // Convert age to hours
    const ageInHours = age / (1000 * 60 * 60);

    // Apply exponential decay
    return Math.exp(-ageInHours * (1 - this.config.recencyDecayFactor));
  }

  /**
   * Get query embedding with caching
   */
  private async getQueryEmbedding(query: string): Promise<MessageEmbedding> {
    // Check cache
    const cached = this.queryEmbeddingCache.get(query);
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    this.cacheMisses++;

    // Generate embedding
    if (!this.embeddingClient) {
      throw new Error("Embedding client not available");
    }

    const embeddings = await this.embeddingClient.embed(query, {
      model: this.config.embeddingModel,
    });

    const messageEmbedding: MessageEmbedding = {
      messageId: `query-${Date.now()}`,
      embedding: embeddings[0],
      model: this.config.embeddingModel || "unknown",
      timestamp: Date.now(),
    };

    // Cache it
    this.queryEmbeddingCache.set(query, messageEmbedding);

    return messageEmbedding;
  }

  /**
   * Get message embedding with caching
   */
  private async getMessageEmbedding(
    message: ContextMessage,
  ): Promise<MessageEmbedding> {
    // Check cache
    const cached = this.embeddingCache.get(message.id);
    if (cached) {
      this.cacheHits++;
      return cached.embedding;
    }

    this.cacheMisses++;

    // Generate embedding
    if (!this.embeddingClient) {
      throw new Error("Embedding client not available");
    }

    const content =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);

    const embeddings = await this.embeddingClient.embed(content, {
      model: this.config.embeddingModel,
    });

    const messageEmbedding: MessageEmbedding = {
      messageId: message.id,
      embedding: embeddings[0],
      model: this.config.embeddingModel || "unknown",
      timestamp: Date.now(),
    };

    // Cache it
    this.embeddingCache.set(message.id, {
      embedding: messageEmbedding,
      createdAt: Date.now(),
    });

    return messageEmbedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have same length");
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Tokenize text for keyword matching
   */
  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2),
    );
  }

  /**
   * Select messages by recency (fallback when no query)
   */
  private selectByRecency(
    messages: ContextMessage[],
    maxTokens: number,
  ): ContextSearchResult[] {
    // Sort by timestamp (descending)
    const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp);

    // Take up to maxResults
    const limited = sorted.slice(0, this.config.maxResults);

    // Score by recency
    const scored: ScoredMessage[] = limited.map((message) => ({
      message,
      score: this.calculateTemporalRelevance(message),
      breakdown: {
        temporal: this.calculateTemporalRelevance(message),
      },
    }));

    // Enforce token limit
    const withinTokenLimit = this.enforceTokenLimit(scored, maxTokens);

    // Convert to ContextSearchResult
    return withinTokenLimit.map((sm) => ({
      message: sm.message,
      score: sm.score,
      reason: "Selected by recency",
    }));
  }

  /**
   * Enforce token limit on selected messages
   */
  private enforceTokenLimit(
    scoredMessages: ScoredMessage[],
    maxTokens: number,
  ): ScoredMessage[] {
    const result: ScoredMessage[] = [];
    let totalTokens = 0;

    for (const sm of scoredMessages) {
      const messageTokens = sm.message.tokens || 0;

      if (totalTokens + messageTokens <= maxTokens) {
        result.push(sm);
        totalTokens += messageTokens;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Generate human-readable reason for selection
   */
  private generateReason(sm: ScoredMessage): string {
    const parts: string[] = [];

    if (sm.breakdown.semantic !== undefined && sm.breakdown.semantic > 0.7) {
      parts.push("high semantic relevance");
    } else if (
      sm.breakdown.semantic !== undefined &&
      sm.breakdown.semantic > 0.4
    ) {
      parts.push("semantic relevance");
    }

    if (sm.breakdown.keyword !== undefined && sm.breakdown.keyword > 0.5) {
      parts.push("keyword match");
    } else if (
      sm.breakdown.keyword !== undefined &&
      sm.breakdown.keyword > 0.3
    ) {
      parts.push("partial keyword match");
    }

    if (sm.breakdown.temporal !== undefined && sm.breakdown.temporal > 0.8) {
      parts.push("very recent");
    } else if (
      sm.breakdown.temporal !== undefined &&
      sm.breakdown.temporal > 0.5
    ) {
      parts.push("recent");
    }

    if (parts.length === 0) {
      return "Relevant to query";
    }

    return parts.join(", ");
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const { weights, recencyDecayFactor, maxResults, minScore } = this.config;

    // Validate weights sum to 1.0 (with small tolerance for floating point)
    const weightSum = weights.semantic + weights.keyword + weights.temporal;
    if (Math.abs(weightSum - 1.0) > 0.001) {
      throw new Error(`Weights must sum to 1.0, got ${weightSum.toFixed(3)}`);
    }

    // Validate individual weights
    if (
      weights.semantic < 0 ||
      weights.semantic > 1 ||
      weights.keyword < 0 ||
      weights.keyword > 1 ||
      weights.temporal < 0 ||
      weights.temporal > 1
    ) {
      throw new Error("All weights must be between 0 and 1");
    }

    // Validate recency decay factor
    if (recencyDecayFactor < 0 || recencyDecayFactor > 1) {
      throw new Error("recencyDecayFactor must be between 0 and 1");
    }

    // Validate maxResults
    if (maxResults < 1) {
      throw new Error("maxResults must be at least 1");
    }

    // Validate minScore
    if (minScore < 0 || minScore > 1) {
      throw new Error("minScore must be between 0 and 1");
    }

    // Validate embeddings requirement
    if (this.config.useEmbeddings && !this.embeddingClient) {
      console.warn(
        "useEmbeddings is true but no embedding client provided, will fall back to keyword matching",
      );
    }
  }

  /**
   * Clear embedding caches
   */
  clearCache(): void {
    this.embeddingCache.clear();
    this.queryEmbeddingCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cached embeddings
   */
  getCachedEmbeddings(): MessageEmbedding[] {
    return Array.from(this.embeddingCache.values()).map(
      (entry) => entry.embedding,
    );
  }

  /**
   * Get statistics
   */
  getStats(): Record<string, unknown> {
    const cacheHitRate =
      this.cacheHits + this.cacheMisses > 0
        ? this.cacheHits / (this.cacheHits + this.cacheMisses)
        : 0;

    return {
      selectionCount: this.selectionCount,
      totalMessagesProcessed: this.totalMessagesProcessed,
      averageMessagesPerSelection:
        this.selectionCount > 0
          ? this.totalMessagesProcessed / this.selectionCount
          : 0,
      embeddingCacheSize: this.embeddingCache.size,
      queryCacheSize: this.queryEmbeddingCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate,
      config: {
        useEmbeddings: this.config.useEmbeddings,
        weights: this.config.weights,
        recencyDecayFactor: this.config.recencyDecayFactor,
        maxResults: this.config.maxResults,
        minScore: this.config.minScore,
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextSelectorConfig>): void {
    Object.assign(this.config, config);
    this.validateConfig();
  }

  /**
   * Set embedding client
   */
  setEmbeddingClient(client: IEmbeddingClient | undefined): void {
    this.embeddingClient = client;
    if (!client && this.config.useEmbeddings) {
      console.warn(
        "Embedding client removed but useEmbeddings is true, will fall back to keyword matching",
      );
    }
  }
}
