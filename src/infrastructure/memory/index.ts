/**
 * Memory System
 *
 * Comprehensive memory management for AI agents including short-term,
 * long-term memory, vector embeddings, and semantic search.
 *
 * Exports:
 * - MemoryStore: Core memory storage and retrieval
 * - VectorStore: Vector embeddings and similarity search
 * - SemanticSearch: Hybrid semantic search capabilities
 */

// Memory Store
export { MemoryStore } from "./MemoryStore.js";
export type {
  Memory,
  MemoryType,
  MemoryRelationship,
  RelationshipType,
  MemoryCreateInput,
  MemoryQueryOptions,
  MemoryStats,
} from "./MemoryStore.js";

// Vector Store
export { VectorStore } from "./VectorStore.js";
export type {
  VectorEmbedding,
  SimilarityResult,
  EmbeddingOptions,
  VectorStoreConfig,
} from "./VectorStore.js";

// Semantic Search
export { SemanticSearch } from "./SemanticSearch.js";
export type {
  SearchQuery,
  SearchResult,
  SemanticSearchConfig,
} from "./SemanticSearch.js";
