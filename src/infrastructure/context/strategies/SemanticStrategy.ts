/**
 * Semantic Strategy
 *
 * Advanced pruning strategy that uses embeddings and semantic similarity
 * to keep the most relevant messages for the current context.
 *
 * Features:
 * - Embedding-based relevance scoring
 * - Cosine similarity calculation
 * - Keep top-K most relevant messages
 * - Embedding caching for performance
 * - Configurable relevance threshold
 * - Fallback to keyword-based similarity
 * - System message preservation
 */

import type { IContextStrategy } from "../../../core/interfaces/IContextManager.js";
import type {
  ContextMessage,
  PruningResult,
  SemanticConfig,
  MessageEmbedding,
} from "../../../core/types/context.types.js";
import type { IEmbeddingClient } from "../../../core/interfaces/ILLMClient.js";

/**
 * Embedding cache entry
 */
interface EmbeddingCacheEntry {
  embedding: MessageEmbedding;
  createdAt: number;
}

/**
 * Message with similarity score
 */
interface ScoredMessage {
  message: ContextMessage;
  score: number;
}

/**
 * Semantic Strategy Implementation
 */
export class SemanticStrategy implements IContextStrategy {
  public readonly type = "semantic";
  public readonly config: SemanticConfig;

  private embeddingClient?: IEmbeddingClient;
  private embeddingCache: Map<string, EmbeddingCacheEntry> = new Map();
  private pruneCount: number = 0;
  private totalRemoved: number = 0;
  private totalTokensRemoved: number = 0;
  private totalEmbeddingsGenerated: number = 0;
  private lastPruneTime: number = 0;

  constructor(config: SemanticConfig, embeddingClient?: IEmbeddingClient) {
    this.config = config;
    this.embeddingClient = embeddingClient;
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

    if (this.config.topK < 1) {
      throw new Error("topK must be at least 1");
    }

    if (this.config.topK > this.config.maxMessages) {
      throw new Error("topK cannot be greater than maxMessages");
    }

    if (
      this.config.relevanceThreshold < 0 ||
      this.config.relevanceThreshold > 1
    ) {
      throw new Error("relevanceThreshold must be between 0 and 1");
    }

    if (typeof this.config.preserveSystemMessage !== "boolean") {
      throw new Error("preserveSystemMessage must be a boolean");
    }
  }

  /**
   * Set embedding client
   */
  setEmbeddingClient(client: IEmbeddingClient): void {
    this.embeddingClient = client;
  }

  /**
   * Prune messages using semantic similarity
   *
   * Algorithm:
   * 1. Separate system messages (if preserve is enabled)
   * 2. Get embeddings for all messages
   * 3. Calculate relevance scores based on recent context
   * 4. Keep top-K most relevant messages
   * 5. Filter by relevance threshold
   * 6. Ensure total doesn't exceed maxTokens
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
        strategy: "semantic",
        metadata: {
          avgRelevance: 0,
          minRelevance: 0,
          maxRelevance: 0,
          preservedSystem: false,
          usedEmbeddings: false,
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

    // If we have fewer messages than topK, just use sliding window
    if (regularMessages.length <= this.config.topK) {
      return this.slidingWindowFallback(messages, currentTokens, systemMessage);
    }

    // Use most recent messages as the reference context
    const recentCount = Math.min(5, regularMessages.length);
    const recentMessages = regularMessages.slice(-recentCount);
    const candidateMessages = regularMessages.slice(
      0,
      regularMessages.length - recentCount,
    );

    // Score messages by relevance to recent context
    let scoredMessages: ScoredMessage[];
    let usedEmbeddings = false;

    if (this.embeddingClient) {
      // Use embedding-based similarity
      try {
        scoredMessages = await this.scoreMessagesWithEmbeddings(
          candidateMessages,
          recentMessages,
        );
        usedEmbeddings = true;
      } catch (error) {
        // Fallback to keyword-based similarity
        scoredMessages = this.scoreMessagesWithKeywords(
          candidateMessages,
          recentMessages,
        );
      }
    } else {
      // Use keyword-based similarity
      scoredMessages = this.scoreMessagesWithKeywords(
        candidateMessages,
        recentMessages,
      );
    }

    // Sort by relevance score (highest first)
    scoredMessages.sort((a, b) => b.score - a.score);

    // Keep top-K messages above threshold
    const keptCandidates: ContextMessage[] = [];
    const scores: number[] = [];

    for (const scored of scoredMessages) {
      if (
        keptCandidates.length < this.config.topK &&
        scored.score >= this.config.relevanceThreshold
      ) {
        keptCandidates.push(scored.message);
        scores.push(scored.score);
      }
    }

    // Build final message list (chronological order)
    const resultMessages: ContextMessage[] = [];
    if (systemMessage) {
      resultMessages.push(systemMessage);
    }

    // Sort kept candidates back to chronological order
    keptCandidates.sort((a, b) => a.timestamp - b.timestamp);
    resultMessages.push(...keptCandidates);
    resultMessages.push(...recentMessages);

    // Calculate tokens
    let resultTokens = resultMessages.reduce(
      (sum, msg) => sum + (msg.tokens || 0),
      0,
    );

    // If still over limit, trim from kept candidates
    if (resultTokens > maxTokens) {
      const systemTokens = systemMessage ? systemMessage.tokens || 0 : 0;
      const recentTokens = recentMessages.reduce(
        (sum, msg) => sum + (msg.tokens || 0),
        0,
      );
      const availableForCandidates = maxTokens - systemTokens - recentTokens;

      const trimmedCandidates = this.trimToTokenLimit(
        keptCandidates,
        availableForCandidates,
      );

      const finalMessages: ContextMessage[] = [];
      if (systemMessage) {
        finalMessages.push(systemMessage);
      }
      finalMessages.push(...trimmedCandidates);
      finalMessages.push(...recentMessages);

      resultTokens = finalMessages.reduce(
        (sum, msg) => sum + (msg.tokens || 0),
        0,
      );

      return this.buildResult(
        finalMessages,
        messages,
        currentTokens,
        resultTokens,
        scores,
        startTime,
        systemMessage !== null,
        usedEmbeddings,
      );
    }

    return this.buildResult(
      resultMessages,
      messages,
      currentTokens,
      resultTokens,
      scores,
      startTime,
      systemMessage !== null,
      usedEmbeddings,
    );
  }

  /**
   * Score messages using embeddings and cosine similarity
   */
  private async scoreMessagesWithEmbeddings(
    candidateMessages: ContextMessage[],
    referenceMessages: ContextMessage[],
  ): Promise<ScoredMessage[]> {
    // Get embeddings for all messages
    const candidateEmbeddings = await this.getEmbeddings(candidateMessages);
    const referenceEmbeddings = await this.getEmbeddings(referenceMessages);

    // Calculate average reference embedding
    const avgReferenceEmbedding = this.averageEmbeddings(referenceEmbeddings);

    // Score each candidate by similarity to reference
    return candidateMessages.map((message, idx) => {
      const embedding = candidateEmbeddings[idx];
      const similarity = this.cosineSimilarity(
        embedding.embedding,
        avgReferenceEmbedding,
      );

      return {
        message,
        score: similarity,
      };
    });
  }

  /**
   * Score messages using keyword-based similarity (fallback)
   */
  private scoreMessagesWithKeywords(
    candidateMessages: ContextMessage[],
    referenceMessages: ContextMessage[],
  ): ScoredMessage[] {
    // Extract keywords from reference messages
    const referenceText = referenceMessages
      .map((m) => m.content.toLowerCase())
      .join(" ");
    const referenceKeywords = this.extractKeywords(referenceText);

    return candidateMessages.map((message) => {
      const messageKeywords = this.extractKeywords(
        message.content.toLowerCase(),
      );
      const score = this.keywordSimilarity(referenceKeywords, messageKeywords);

      return {
        message,
        score,
      };
    });
  }

  /**
   * Get or generate embeddings for messages
   */
  private async getEmbeddings(
    messages: ContextMessage[],
  ): Promise<MessageEmbedding[]> {
    const embeddings: MessageEmbedding[] = [];

    for (const message of messages) {
      // Check cache first
      const cached = this.embeddingCache.get(message.id);
      if (cached) {
        embeddings.push(cached.embedding);
        continue;
      }

      // Generate new embedding
      if (!this.embeddingClient) {
        throw new Error("Embedding client not available");
      }

      const result = await this.embeddingClient.embed(message.content, {
        model: this.config.embeddingModel,
      });

      const embedding: MessageEmbedding = {
        messageId: message.id,
        embedding: result[0], // result is number[][], take first embedding
        model: this.config.embeddingModel || "default",
        timestamp: Date.now(),
      };

      // Cache the embedding
      this.embeddingCache.set(message.id, {
        embedding,
        createdAt: Date.now(),
      });

      embeddings.push(embedding);
      this.totalEmbeddingsGenerated++;
    }

    return embeddings;
  }

  /**
   * Calculate average of multiple embeddings
   */
  private averageEmbeddings(embeddings: MessageEmbedding[]): number[] {
    if (embeddings.length === 0) {
      return [];
    }

    const dimension = embeddings[0].embedding.length;
    const sum = new Array(dimension).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dimension; i++) {
        sum[i] += emb.embedding[i];
      }
    }

    return sum.map((val) => val / embeddings.length);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  private extractKeywords(text: string): Set<string> {
    // Remove common stop words
    const stopWords = new Set([
      "a",
      "an",
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "should",
      "could",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    return new Set(words);
  }

  /**
   * Calculate keyword-based similarity (Jaccard similarity)
   */
  private keywordSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) {
      return 0;
    }

    const intersection = new Set([...a].filter((x) => b.has(x)));
    const union = new Set([...a, ...b]);

    return intersection.size / union.size;
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

    for (const msg of messages) {
      const msgTokens = msg.tokens || 0;
      if (currentTokens + msgTokens <= maxTokens) {
        result.push(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Fallback to sliding window when semantic analysis not available
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

    const resultTokens = result.reduce(
      (sum, msg) => sum + (msg.tokens || 0),
      0,
    );

    return this.buildResult(
      result,
      messages,
      currentTokens,
      resultTokens,
      [],
      Date.now(),
      systemMessage !== null,
      false,
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
    scores: number[],
    startTime: number,
    preservedSystem: boolean,
    usedEmbeddings: boolean,
  ): PruningResult {
    const removedCount = originalMessages.length - keptMessages.length;
    const removedTokens = originalTokens - resultTokens;

    this.pruneCount++;
    this.totalRemoved += removedCount;
    this.totalTokensRemoved += removedTokens;
    this.lastPruneTime = startTime;

    const avgRelevance =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const minRelevance = scores.length > 0 ? Math.min(...scores) : 0;
    const maxRelevance = scores.length > 0 ? Math.max(...scores) : 0;

    return {
      messages: keptMessages,
      removedCount,
      removedTokens,
      strategy: "semantic",
      metadata: {
        avgRelevance: Math.round(avgRelevance * 1000) / 1000,
        minRelevance: Math.round(minRelevance * 1000) / 1000,
        maxRelevance: Math.round(maxRelevance * 1000) / 1000,
        preservedSystem,
        usedEmbeddings,
        processingTimeMs: Date.now() - startTime,
        cacheSize: this.embeddingCache.size,
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
      totalEmbeddingsGenerated: this.totalEmbeddingsGenerated,
      avgRemovedPerPrune:
        this.pruneCount > 0
          ? Math.round((this.totalRemoved / this.pruneCount) * 100) / 100
          : 0,
      avgTokensRemovedPerPrune:
        this.pruneCount > 0
          ? Math.round((this.totalTokensRemoved / this.pruneCount) * 100) / 100
          : 0,
      cacheSize: this.embeddingCache.size,
      lastPruneTime: this.lastPruneTime,
      config: {
        maxMessages: this.config.maxMessages,
        topK: this.config.topK,
        relevanceThreshold: this.config.relevanceThreshold,
        preserveSystemMessage: this.config.preserveSystemMessage,
        embeddingModel: this.config.embeddingModel,
      },
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
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
   * Reset statistics
   */
  resetStats(): void {
    this.pruneCount = 0;
    this.totalRemoved = 0;
    this.totalTokensRemoved = 0;
    this.totalEmbeddingsGenerated = 0;
    this.lastPruneTime = 0;
  }
}

/**
 * Factory function to create a semantic strategy
 */
export function createSemanticStrategy(
  config: Partial<SemanticConfig> & { type: "semantic" },
  embeddingClient?: IEmbeddingClient,
): SemanticStrategy {
  const fullConfig: SemanticConfig = {
    maxMessages: 50,
    preserveSystemMessage: true,
    relevanceThreshold: 0.7,
    topK: 20,
    ...config,
  };

  return new SemanticStrategy(fullConfig, embeddingClient);
}
