/**
 * ILLMClient Interface
 *
 * Core interface for LLM (Large Language Model) client implementations.
 * All LLM providers must implement this interface for consistent behavior.
 */

import type {
  ChatRequest,
  ChatResponse,
  StreamChunk,
  TokenCountRequest,
  TokenCountResponse,
  LLMModel,
  LLMConfig,
  LLMStats,
  LLMRequestOptions,
} from '../types/llm.types.js';

/**
 * Main LLM client interface
 */
export interface ILLMClient {
  /**
   * Provider identifier (e.g., 'copilot', 'openai', 'anthropic')
   */
  readonly provider: string;

  /**
   * Base URL for API requests
   */
  readonly baseURL: string;

  /**
   * Current configuration
   */
  readonly config: LLMConfig;

  /**
   * Send a chat completion request
   *
   * @param request - Chat request parameters
   * @param options - Optional request overrides
   * @returns Promise resolving to chat response
   * @throws {LLMError} On any error during request
   */
  chat(request: ChatRequest, options?: LLMRequestOptions): Promise<ChatResponse>;

  /**
   * Stream a chat completion response
   *
   * @param request - Chat request parameters
   * @param options - Optional request overrides
   * @returns AsyncGenerator yielding stream chunks
   * @throws {LLMError} On any error during streaming
   */
  stream(
    request: ChatRequest,
    options?: LLMRequestOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * Count tokens in text or messages
   *
   * @param request - Token counting request
   * @returns Promise resolving to token count
   */
  countTokens(request: TokenCountRequest): Promise<TokenCountResponse>;

  /**
   * Get list of available models
   *
   * @returns Promise resolving to array of models
   */
  getModels(): Promise<LLMModel[]>;

  /**
   * Get information about a specific model
   *
   * @param modelId - Model identifier
   * @returns Promise resolving to model info
   */
  getModel(modelId: string): Promise<LLMModel>;

  /**
   * Test connection to LLM service
   *
   * @returns Promise resolving to true if connection successful
   * @throws {LLMError} If connection fails
   */
  testConnection(): Promise<boolean>;

  /**
   * Get usage statistics
   *
   * @returns Current statistics
   */
  getStats(): LLMStats;

  /**
   * Reset usage statistics
   */
  resetStats(): void;

  /**
   * Update client configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<LLMConfig>): void;

  /**
   * Cleanup resources (abort pending requests, close connections, etc.)
   */
  cleanup(): Promise<void>;
}

/**
 * Extended interface for LLM clients with caching support
 */
export interface ICachedLLMClient extends ILLMClient {
  /**
   * Generate cache key for a request
   *
   * @param request - Chat request
   * @returns Cache key string
   */
  getCacheKey(request: ChatRequest): string;

  /**
   * Check if response is cached
   *
   * @param request - Chat request
   * @returns Promise resolving to true if cached
   */
  isCached(request: ChatRequest): Promise<boolean>;

  /**
   * Clear cache
   *
   * @param pattern - Optional pattern to match cache keys (supports wildcards)
   * @returns Promise resolving to number of entries cleared
   */
  clearCache(pattern?: string): Promise<number>;

  /**
   * Get cache statistics
   *
   * @returns Promise resolving to cache stats
   */
  getCacheStats(): Promise<{
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  }>;
}

/**
 * Interface for token counting functionality
 */
export interface ITokenCounter {
  /**
   * Count tokens in a text string
   *
   * @param text - Text to count tokens in
   * @param model - Model to use for encoding
   * @returns Promise resolving to token count
   */
  countTokens(text: string, model?: string): Promise<number>;

  /**
   * Count tokens in messages array
   *
   * @param messages - Messages to count tokens in
   * @param model - Model to use for encoding
   * @returns Promise resolving to token count
   */
  countMessageTokens(messages: ChatRequest['messages'], model?: string): Promise<number>;

  /**
   * Estimate tokens without loading tokenizer (faster but less accurate)
   *
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number;

  /**
   * Get the encoding for a specific model
   *
   * @param model - Model identifier
   * @returns Encoding name
   */
  getEncodingForModel(model: string): string;
}

/**
 * Interface for embedding generation
 */
export interface IEmbeddingClient {
  /**
   * Generate embeddings for text
   *
   * @param input - Text or array of texts
   * @param options - Optional embedding parameters
   * @returns Promise resolving to embeddings
   */
  embed(
    input: string | string[],
    options?: {
      model?: string;
      dimensions?: number;
    }
  ): Promise<number[][]>;

  /**
   * Calculate cosine similarity between two embeddings
   *
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns Similarity score (0-1)
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number;
}
