/**
 * Semantic Search
 *
 * Hybrid search system combining text-based and vector-based similarity search.
 *
 * Features:
 * - Hybrid search (text + vector similarity)
 * - Reranking based on multiple factors
 * - Temporal relevance scoring
 * - Importance weighting
 * - Context-aware retrieval
 * - Query expansion
 */

import type { DatabaseWrapper } from "../storage/Database.js";
import { MemoryStore, type Memory, type MemoryType } from "./MemoryStore.js";
import { VectorStore, type SimilarityResult } from "./VectorStore.js";

/**
 * Search Query
 */
export interface SearchQuery {
  /** Query text */
  text: string;

  /** Query vector (optional) */
  vector?: number[];

  /** Agent ID */
  agentId: string;

  /** Session ID (optional) */
  sessionId?: string;

  /** Memory types to search */
  types?: MemoryType[];

  /** Minimum importance threshold */
  minImportance?: number;

  /** Maximum results */
  limit?: number;

  /** Enable temporal weighting */
  temporalWeighting?: boolean;

  /** Enable importance weighting */
  importanceWeighting?: boolean;

  /** Text weight (0-1) */
  textWeight?: number;

  /** Vector weight (0-1) */
  vectorWeight?: number;
}

/**
 * Search Result
 */
export interface SearchResult {
  memory: Memory;
  score: number;
  textScore: number;
  vectorScore: number;
  temporalScore: number;
  importanceScore: number;
  rank: number;
}

/**
 * Search Configuration
 */
export interface SemanticSearchConfig {
  /** Default text weight */
  defaultTextWeight: number;

  /** Default vector weight */
  defaultVectorWeight: number;

  /** Temporal decay factor (days) */
  temporalDecayDays: number;

  /** Minimum relevance score */
  minRelevanceScore: number;

  /** Enable query expansion */
  enableQueryExpansion: boolean;

  /** Maximum expanded query terms */
  maxExpandedTerms: number;
}

/**
 * Semantic Search
 */
export class SemanticSearch {
  private db: DatabaseWrapper;
  private memoryStore: MemoryStore;
  private vectorStore: VectorStore;
  private config: SemanticSearchConfig;

  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG: SemanticSearchConfig = {
    defaultTextWeight: 0.4,
    defaultVectorWeight: 0.6,
    temporalDecayDays: 30,
    minRelevanceScore: 0.3,
    enableQueryExpansion: true,
    maxExpandedTerms: 5,
  };

  constructor(
    db: DatabaseWrapper,
    memoryStore: MemoryStore,
    vectorStore: VectorStore,
    config?: Partial<SemanticSearchConfig>
  ) {
    this.db = db;
    this.memoryStore = memoryStore;
    this.vectorStore = vectorStore;
    this.config = { ...SemanticSearch.DEFAULT_CONFIG, ...config };
  }

  /**
   * Perform hybrid semantic search
   */
  search(query: SearchQuery): SearchResult[] {
    const textWeight = query.textWeight ?? this.config.defaultTextWeight;
    const vectorWeight = query.vectorWeight ?? this.config.defaultVectorWeight;
    const limit = query.limit ?? 10;

    // Normalize weights
    const totalWeight = textWeight + vectorWeight;
    const normalizedTextWeight = textWeight / totalWeight;
    const normalizedVectorWeight = vectorWeight / totalWeight;

    // Get candidates from text search
    const textResults = this.textSearch(query);

    // Get candidates from vector search
    const vectorResults = query.vector
      ? this.vectorSearch(query)
      : new Map<string, number>();

    // Combine results
    const combinedResults = new Map<string, Memory>();
    const scores = new Map<string, SearchScore>();

    // Process text results
    for (const memory of textResults) {
      combinedResults.set(memory.id, memory);
      scores.set(memory.id, {
        textScore: this.calculateTextScore(memory.content, query.text),
        vectorScore: 0,
        temporalScore: 0,
        importanceScore: 0,
      });
    }

    // Process vector results
    for (const [memoryId, vectorScore] of vectorResults.entries()) {
      const memory = this.memoryStore.retrieve(memoryId, query.agentId);
      if (memory) {
        combinedResults.set(memoryId, memory);
        const existing = scores.get(memoryId) || {
          textScore: 0,
          vectorScore: 0,
          temporalScore: 0,
          importanceScore: 0,
        };
        existing.vectorScore = vectorScore;
        scores.set(memoryId, existing);
      }
    }

    // Calculate final scores
    const results: SearchResult[] = [];

    for (const [memoryId, memory] of combinedResults.entries()) {
      const scoreData = scores.get(memoryId)!;

      // Calculate temporal score
      const temporalScore = query.temporalWeighting
        ? this.calculateTemporalScore(memory.created_at)
        : 1.0;

      // Calculate importance score
      const importanceScore = query.importanceWeighting
        ? memory.importance
        : 1.0;

      // Combine scores
      const textScore = scoreData.textScore * normalizedTextWeight;
      const vecScore = scoreData.vectorScore * normalizedVectorWeight;
      const baseScore = textScore + vecScore;
      const finalScore = baseScore * temporalScore * importanceScore;

      // Filter by minimum score
      if (finalScore >= this.config.minRelevanceScore) {
        results.push({
          memory,
          score: finalScore,
          textScore: scoreData.textScore,
          vectorScore: scoreData.vectorScore,
          temporalScore,
          importanceScore,
          rank: 0, // Will be set after sorting
        });
      }
    }

    // Sort by score and assign ranks
    results.sort((a, b) => b.score - a.score);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results.slice(0, limit);
  }

  /**
   * Search by text only
   */
  searchByText(
    agentId: string,
    text: string,
    options?: {
      types?: MemoryType[];
      limit?: number;
      minImportance?: number;
    }
  ): SearchResult[] {
    return this.search({
      text,
      agentId,
      types: options?.types,
      limit: options?.limit,
      minImportance: options?.minImportance,
      textWeight: 1.0,
      vectorWeight: 0.0,
    });
  }

  /**
   * Search by vector only
   */
  searchByVector(
    agentId: string,
    vector: number[],
    options?: {
      types?: MemoryType[];
      limit?: number;
      threshold?: number;
    }
  ): SearchResult[] {
    const vectorResults = this.vectorStore.findSimilar(vector, agentId, {
      limit: options?.limit,
      threshold: options?.threshold,
      types: options?.types,
    });

    return vectorResults.map((result, index) => ({
      memory: result.memory,
      score: result.similarity,
      textScore: 0,
      vectorScore: result.similarity,
      temporalScore: 1.0,
      importanceScore: result.memory.importance,
      rank: index + 1,
    }));
  }

  /**
   * Find related memories (contextual search)
   */
  findRelated(
    memoryId: string,
    agentId: string,
    options?: {
      limit?: number;
      threshold?: number;
      includeText?: boolean;
    }
  ): SearchResult[] {
    const memory = this.memoryStore.retrieve(memoryId, agentId);
    if (!memory) {
      return [];
    }

    // Get vector-based similar memories
    const embedding = this.vectorStore.getEmbedding(memoryId);
    let results: SearchResult[] = [];

    if (embedding) {
      results = this.searchByVector(agentId, embedding, {
        limit: options?.limit,
        threshold: options?.threshold,
      });
    }

    // Optionally include text-based related memories
    if (options?.includeText) {
      const textResults = this.searchByText(agentId, memory.content, {
        limit: 5,
      });

      // Merge results
      const mergedMap = new Map<string, SearchResult>();
      for (const result of results) {
        mergedMap.set(result.memory.id, result);
      }
      for (const result of textResults) {
        if (!mergedMap.has(result.memory.id)) {
          mergedMap.set(result.memory.id, result);
        }
      }

      results = Array.from(mergedMap.values());
      results.sort((a, b) => b.score - a.score);

      if (options?.limit) {
        results = results.slice(0, options.limit);
      }
    }

    return results;
  }

  /**
   * Search with temporal focus (recent or historical)
   */
  searchTemporal(
    agentId: string,
    text: string,
    focus: "recent" | "historical",
    options?: {
      types?: MemoryType[];
      limit?: number;
    }
  ): SearchResult[] {
    const results = this.search({
      text,
      agentId,
      types: options?.types,
      limit: options?.limit ? options.limit * 2 : 20,
      temporalWeighting: true,
    });

    // Rerank based on temporal focus
    if (focus === "recent") {
      results.sort((a, b) => {
        const timeDiff = b.memory.created_at - a.memory.created_at;
        return timeDiff !== 0 ? timeDiff : b.score - a.score;
      });
    } else {
      results.sort((a, b) => {
        const timeDiff = a.memory.created_at - b.memory.created_at;
        return timeDiff !== 0 ? timeDiff : b.score - a.score;
      });
    }

    return results.slice(0, options?.limit ?? 10);
  }

  /**
   * Search for patterns or trends
   */
  searchPatterns(
    agentId: string,
    pattern: string,
    options?: {
      timeWindow?: number; // milliseconds
      minOccurrences?: number;
      types?: MemoryType[];
    }
  ): Array<{ pattern: string; memories: Memory[]; frequency: number }> {
    const timeWindow = options?.timeWindow ?? 7 * 24 * 60 * 60 * 1000; // 7 days
    const minOccurrences = options?.minOccurrences ?? 2;

    // Search for pattern
    const results = this.memoryStore.search(agentId, pattern, 100);

    // Group by time windows
    const patterns = new Map<string, Memory[]>();
    const now = Date.now();

    for (const memory of results) {
      if (now - memory.created_at <= timeWindow) {
        const key = this.extractPattern(memory.content, pattern);
        if (key) {
          if (!patterns.has(key)) {
            patterns.set(key, []);
          }
          patterns.get(key)!.push(memory);
        }
      }
    }

    // Filter and format results
    const patternResults: Array<{
      pattern: string;
      memories: Memory[];
      frequency: number;
    }> = [];

    for (const [pat, memories] of patterns.entries()) {
      if (memories.length >= minOccurrences) {
        patternResults.push({
          pattern: pat,
          memories,
          frequency: memories.length,
        });
      }
    }

    // Sort by frequency
    patternResults.sort((a, b) => b.frequency - a.frequency);

    return patternResults;
  }

  /**
   * Get conversation context (recent conversation memories)
   */
  getConversationContext(
    agentId: string,
    sessionId: string,
    limit: number = 10
  ): Memory[] {
    return this.memoryStore.query({
      agent_id: agentId,
      session_id: sessionId,
      types: ["conversation", "working"],
      limit,
      sort_by: "created_at",
      sort_order: "DESC",
    });
  }

  /**
   * Get relevant context for a query
   */
  getRelevantContext(
    agentId: string,
    query: string,
    options?: {
      vector?: number[];
      sessionId?: string;
      limit?: number;
      types?: MemoryType[];
    }
  ): Memory[] {
    const results = this.search({
      text: query,
      vector: options?.vector,
      agentId,
      sessionId: options?.sessionId,
      types: options?.types,
      limit: options?.limit ?? 10,
      temporalWeighting: true,
      importanceWeighting: true,
    });

    return results.map((result) => result.memory);
  }

  /**
   * Perform text-based search
   */
  private textSearch(query: SearchQuery): Memory[] {
    let expandedTerms = [query.text];

    // Query expansion (simple approach)
    if (this.config.enableQueryExpansion) {
      expandedTerms = this.expandQuery(query.text);
    }

    // Search for each term
    const results = new Map<string, Memory>();

    for (const term of expandedTerms) {
      const memories = this.memoryStore.search(
        query.agentId,
        term,
        query.limit ? query.limit * 2 : 20
      );

      for (const memory of memories) {
        // Apply filters
        if (query.types && !query.types.includes(memory.type)) {
          continue;
        }

        if (
          query.minImportance !== undefined &&
          memory.importance < query.minImportance
        ) {
          continue;
        }

        if (
          query.sessionId !== undefined &&
          memory.session_id !== query.sessionId
        ) {
          continue;
        }

        results.set(memory.id, memory);
      }
    }

    return Array.from(results.values());
  }

  /**
   * Perform vector-based search
   */
  private vectorSearch(query: SearchQuery): Map<string, number> {
    if (!query.vector) {
      return new Map();
    }

    const results = this.vectorStore.findSimilar(query.vector, query.agentId, {
      limit: query.limit ? query.limit * 2 : 20,
      types: query.types,
    });

    const scores = new Map<string, number>();
    for (const result of results) {
      scores.set(result.memory.id, result.similarity);
    }

    return scores;
  }

  /**
   * Calculate text similarity score
   */
  private calculateTextScore(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    let matchCount = 0;
    let totalTerms = queryTerms.length;

    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        matchCount++;
      }
    }

    // Exact match bonus
    if (contentLower.includes(queryLower)) {
      matchCount += queryTerms.length * 0.5;
    }

    return totalTerms > 0 ? matchCount / totalTerms : 0;
  }

  /**
   * Calculate temporal score (decay over time)
   */
  private calculateTemporalScore(createdAt: number): number {
    const now = Date.now();
    const ageInDays = (now - createdAt) / (24 * 60 * 60 * 1000);

    // Exponential decay
    const decayFactor = Math.exp(-ageInDays / this.config.temporalDecayDays);

    return Math.max(0.1, decayFactor); // Minimum score of 0.1
  }

  /**
   * Expand query with related terms
   */
  private expandQuery(query: string): string[] {
    const terms = [query];
    const words = query.toLowerCase().split(/\s+/);

    // Add individual words for multi-word queries
    if (words.length > 1) {
      terms.push(...words);
    }

    return terms.slice(0, this.config.maxExpandedTerms);
  }

  /**
   * Extract pattern from content
   */
  private extractPattern(content: string, pattern: string): string | null {
    const lowerContent = content.toLowerCase();
    const lowerPattern = pattern.toLowerCase();

    if (lowerContent.includes(lowerPattern)) {
      return pattern;
    }

    return null;
  }

  /**
   * Get search statistics
   */
  getSearchStats(agentId: string): {
    total_memories: number;
    with_embeddings: number;
    searchable_percentage: number;
    by_type: Record<string, number>;
  } {
    const stats = this.memoryStore.getStatistics(agentId);
    const embeddingStats = this.vectorStore.getEmbeddingStats(agentId);

    return {
      total_memories: stats.total,
      with_embeddings: embeddingStats.with_embeddings,
      searchable_percentage: embeddingStats.coverage_percentage,
      by_type: stats.by_type as Record<string, number>,
    };
  }
}

/**
 * Internal search score
 */
interface SearchScore {
  textScore: number;
  vectorScore: number;
  temporalScore: number;
  importanceScore: number;
}
