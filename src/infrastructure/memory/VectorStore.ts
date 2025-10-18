/**
 * Vector Store
 *
 * Vector embedding storage and similarity search for semantic memory retrieval.
 *
 * Features:
 * - Embedding storage and retrieval
 * - Cosine similarity search
 * - Efficient vector operations
 * - Batch embedding support
 * - Similarity caching
 * - Dimension validation
 */

import type { DatabaseWrapper } from "../storage/Database.js";
import type { Memory } from "./MemoryStore.js";

/**
 * Vector Embedding
 */
export interface VectorEmbedding {
  memory_id: string;
  vector: number[];
  dimension: number;
  model?: string;
}

/**
 * Similarity Result
 */
export interface SimilarityResult {
  memory: Memory;
  similarity: number;
  distance: number;
}

/**
 * Embedding Options
 */
export interface EmbeddingOptions {
  model?: string;
  dimension?: number;
  normalize?: boolean;
}

/**
 * Vector Store Configuration
 */
export interface VectorStoreConfig {
  /** Default embedding dimension */
  defaultDimension: number;

  /** Similarity threshold for filtering results */
  similarityThreshold: number;

  /** Maximum results to return */
  maxResults: number;

  /** Enable caching of similarity calculations */
  enableCache: boolean;
}

/**
 * Vector Store
 */
export class VectorStore {
  private db: DatabaseWrapper;
  private config: VectorStoreConfig;
  private similarityCache: Map<string, number>;

  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG: VectorStoreConfig = {
    defaultDimension: 1536, // OpenAI ada-002 dimension
    similarityThreshold: 0.7,
    maxResults: 10,
    enableCache: true,
  };

  constructor(db: DatabaseWrapper, config?: Partial<VectorStoreConfig>) {
    this.db = db;
    this.config = { ...VectorStore.DEFAULT_CONFIG, ...config };
    this.similarityCache = new Map();
  }

  /**
   * Store an embedding for a memory
   */
  storeEmbedding(
    memoryId: string,
    vector: number[],
    options?: EmbeddingOptions,
  ): void {
    const normalized = options?.normalize ? this.normalize(vector) : vector;
    const dimension = vector.length;

    // Validate dimension
    if (options?.dimension && dimension !== options.dimension) {
      throw new Error(
        `Embedding dimension mismatch: expected ${options.dimension}, got ${dimension}`,
      );
    }

    const sql = `
      UPDATE memories
      SET embedding = ?
      WHERE id = ?
    `;

    this.db.execute(sql, [JSON.stringify(normalized), memoryId]);
  }

  /**
   * Store multiple embeddings in a batch
   */
  storeBatch(
    embeddings: Array<{ memoryId: string; vector: number[] }>,
    options?: EmbeddingOptions,
  ): void {
    this.db.transaction(() => {
      for (const { memoryId, vector } of embeddings) {
        this.storeEmbedding(memoryId, vector, options);
      }
    });
  }

  /**
   * Get embedding for a memory
   */
  getEmbedding(memoryId: string): number[] | null {
    const sql = `SELECT embedding FROM memories WHERE id = ?`;
    const result = this.db.queryOne<{ embedding: string | null }>(sql, [
      memoryId,
    ]);

    if (!result || !result.embedding) {
      return null;
    }

    return JSON.parse(result.embedding);
  }

  /**
   * Check if memory has an embedding
   */
  hasEmbedding(memoryId: string): boolean {
    const sql = `
      SELECT COUNT(*) as count
      FROM memories
      WHERE id = ? AND embedding IS NOT NULL
    `;

    const result = this.db.queryOne<{ count: number }>(sql, [memoryId]);
    return (result?.count ?? 0) > 0;
  }

  /**
   * Find similar memories using cosine similarity
   */
  findSimilar(
    queryVector: number[],
    agentId: string,
    options?: {
      limit?: number;
      threshold?: number;
      types?: string[];
      excludeIds?: string[];
    },
  ): SimilarityResult[] {
    const limit = options?.limit ?? this.config.maxResults;
    const threshold = options?.threshold ?? this.config.similarityThreshold;

    // Build query
    let sql = `
      SELECT id, agent_id, session_id, type, content, embedding,
             importance, access_count, last_accessed_at, created_at,
             expires_at, metadata
      FROM memories
      WHERE agent_id = ?
      AND embedding IS NOT NULL
      AND (expires_at IS NULL OR expires_at > ?)
    `;

    const params: any[] = [agentId, Date.now()];

    if (options?.types && options.types.length > 0) {
      sql += ` AND type IN (${options.types.map(() => "?").join(", ")})`;
      params.push(...options.types);
    }

    if (options?.excludeIds && options.excludeIds.length > 0) {
      sql += ` AND id NOT IN (${options.excludeIds.map(() => "?").join(", ")})`;
      params.push(...options.excludeIds);
    }

    const memories = this.db.query<Memory>(sql, params);

    // Calculate similarities
    const results: SimilarityResult[] = [];
    const normalizedQuery = this.normalize(queryVector);

    for (const memory of memories) {
      if (!memory.embedding) continue;

      const embedding = JSON.parse(memory.embedding);
      const similarity = this.cosineSimilarity(normalizedQuery, embedding);

      if (similarity >= threshold) {
        results.push({
          memory,
          similarity,
          distance: 1 - similarity,
        });
      }
    }

    // Sort by similarity (highest first) and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Find memories similar to another memory
   */
  findSimilarToMemory(
    memoryId: string,
    agentId: string,
    options?: {
      limit?: number;
      threshold?: number;
      types?: string[];
    },
  ): SimilarityResult[] {
    const embedding = this.getEmbedding(memoryId);

    if (!embedding) {
      throw new Error(`Memory ${memoryId} has no embedding`);
    }

    return this.findSimilar(embedding, agentId, {
      ...options,
      excludeIds: [memoryId],
    });
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    // Check cache
    const cacheKey = this.getCacheKey(a, b);
    if (this.config.enableCache && this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
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

    const similarity = dotProduct / (normA * normB);

    // Cache result
    if (this.config.enableCache) {
      this.similarityCache.set(cacheKey, similarity);

      // Limit cache size
      if (this.similarityCache.size > 1000) {
        const firstKey = this.similarityCache.keys().next().value;
        if (firstKey !== undefined) {
          this.similarityCache.delete(firstKey);
        }
      }
    }

    return similarity;
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Calculate dot product
   */
  dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }

    return sum;
  }

  /**
   * Normalize a vector
   */
  normalize(vector: number[]): number[] {
    let norm = 0;
    for (const value of vector) {
      norm += value * value;
    }
    norm = Math.sqrt(norm);

    if (norm === 0) {
      return vector;
    }

    return vector.map((value) => value / norm);
  }

  /**
   * Get vector magnitude
   */
  magnitude(vector: number[]): number {
    let sum = 0;
    for (const value of vector) {
      sum += value * value;
    }
    return Math.sqrt(sum);
  }

  /**
   * Add two vectors
   */
  add(a: number[], b: number[]): number[] {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    return a.map((value, i) => value + b[i]);
  }

  /**
   * Subtract two vectors
   */
  subtract(a: number[], b: number[]): number[] {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    return a.map((value, i) => value - b[i]);
  }

  /**
   * Multiply vector by scalar
   */
  scale(vector: number[], scalar: number): number[] {
    return vector.map((value) => value * scalar);
  }

  /**
   * Calculate average of multiple vectors
   */
  average(vectors: number[][]): number[] {
    if (vectors.length === 0) {
      throw new Error("Cannot calculate average of empty vector array");
    }

    const dimension = vectors[0].length;

    // Validate all vectors have same dimension
    for (const vector of vectors) {
      if (vector.length !== dimension) {
        throw new Error("All vectors must have the same dimension");
      }
    }

    const sum = new Array(dimension).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < dimension; i++) {
        sum[i] += vector[i];
      }
    }

    return sum.map((value) => value / vectors.length);
  }

  /**
   * Get count of memories with embeddings
   */
  getEmbeddingCount(agentId?: string): number {
    let sql = `
      SELECT COUNT(*) as count
      FROM memories
      WHERE embedding IS NOT NULL
    `;

    const params: any[] = [];

    if (agentId) {
      sql += ` AND agent_id = ?`;
      params.push(agentId);
    }

    const result = this.db.queryOne<{ count: number }>(sql, params);
    return result?.count ?? 0;
  }

  /**
   * Get memories without embeddings
   */
  getMemoriesWithoutEmbeddings(
    agentId: string,
    limit?: number,
  ): Array<{ id: string; content: string }> {
    let sql = `
      SELECT id, content
      FROM memories
      WHERE agent_id = ? AND embedding IS NULL
      ORDER BY importance DESC, created_at DESC
    `;

    const params: any[] = [agentId];

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    return this.db.query<{ id: string; content: string }>(sql, params);
  }

  /**
   * Delete embedding for a memory
   */
  deleteEmbedding(memoryId: string): void {
    const sql = `
      UPDATE memories
      SET embedding = NULL
      WHERE id = ?
    `;

    this.db.execute(sql, [memoryId]);
  }

  /**
   * Clear all embeddings for an agent
   */
  clearEmbeddings(agentId: string): number {
    const sql = `
      UPDATE memories
      SET embedding = NULL
      WHERE agent_id = ?
    `;

    this.db.execute(sql, [agentId]);

    const countSql = `SELECT changes() as count`;
    const result = this.db.queryOne<{ count: number }>(countSql, []);
    return result?.count ?? 0;
  }

  /**
   * Clear similarity cache
   */
  clearCache(): void {
    this.similarityCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.similarityCache.size,
      maxSize: 1000,
    };
  }

  /**
   * Generate cache key for two vectors
   */
  private getCacheKey(a: number[], b: number[]): string {
    // Simple hash based on first and last elements
    return `${a[0]}_${a[a.length - 1]}_${b[0]}_${b[b.length - 1]}`;
  }

  /**
   * Validate vector dimension
   */
  validateDimension(vector: number[], expected?: number): boolean {
    const dim = expected ?? this.config.defaultDimension;
    return vector.length === dim;
  }

  /**
   * Get embedding statistics
   */
  getEmbeddingStats(agentId: string): {
    total_memories: number;
    with_embeddings: number;
    without_embeddings: number;
    coverage_percentage: number;
  } {
    const totalSql = `
      SELECT COUNT(*) as count
      FROM memories
      WHERE agent_id = ?
    `;
    const totalResult = this.db.queryOne<{ count: number }>(totalSql, [
      agentId,
    ]);
    const total_memories = totalResult?.count ?? 0;

    const withEmbeddingsSql = `
      SELECT COUNT(*) as count
      FROM memories
      WHERE agent_id = ? AND embedding IS NOT NULL
    `;
    const withResult = this.db.queryOne<{ count: number }>(withEmbeddingsSql, [
      agentId,
    ]);
    const with_embeddings = withResult?.count ?? 0;

    const without_embeddings = total_memories - with_embeddings;
    const coverage_percentage =
      total_memories > 0 ? (with_embeddings / total_memories) * 100 : 0;

    return {
      total_memories,
      with_embeddings,
      without_embeddings,
      coverage_percentage,
    };
  }
}
