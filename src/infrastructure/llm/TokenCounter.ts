/**
 * TokenCounter - Token counting with tiktoken
 *
 * Provides accurate token counting for various models using tiktoken.
 * Implements ITokenCounter interface with caching for performance.
 */

import { encoding_for_model, get_encoding, type TiktokenModel, type Tiktoken } from 'tiktoken';
import type { ITokenCounter } from '../../core/interfaces/ILLMClient.js';
import type { ChatMessage } from '../../core/types/llm.types.js';
import {
  MODEL_ENCODINGS,
  DEFAULT_ENCODING,
  TOKENS_PER_MESSAGE,
  TOKENS_PER_NAME,
  CHARS_PER_TOKEN,
} from '../../core/constants/defaults.js';

/**
 * Cache entry for tokenizer instances
 */
interface TokenizerCacheEntry {
  encoding: Tiktoken;
  lastUsed: number;
}

/**
 * TokenCounter implementation with tiktoken
 */
export class TokenCounter implements ITokenCounter {
  private encodingCache: Map<string, TokenizerCacheEntry>;
  private tokenCountCache: Map<string, { count: number; timestamp: number }>;
  private cacheMaxAge: number;
  private cacheCleanupInterval: NodeJS.Timeout | null;

  constructor(options?: { cacheMaxAge?: number; enableCacheCleanup?: boolean }) {
    this.encodingCache = new Map();
    this.tokenCountCache = new Map();
    this.cacheMaxAge = options?.cacheMaxAge || 3600000; // 1 hour default

    // Setup periodic cache cleanup if enabled
    if (options?.enableCacheCleanup !== false) {
      this.cacheCleanupInterval = setInterval(
        () => this.cleanupCache(),
        300000 // 5 minutes
      );
    } else {
      this.cacheCleanupInterval = null;
    }
  }

  /**
   * Count tokens in a text string
   */
  async countTokens(text: string, model?: string): Promise<number> {
    // Check cache first
    const cacheKey = this.getCacheKey(text, model);
    const cached = this.tokenCountCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      return cached.count;
    }

    try {
      const encoding = await this.getEncoding(model);
      const tokens = encoding.encode(text);
      const count = tokens.length;

      // Cache the result
      this.tokenCountCache.set(cacheKey, { count, timestamp: Date.now() });

      return count;
    } catch (error) {
      // Fallback to estimation if tiktoken fails
      console.warn(`Failed to count tokens with tiktoken, falling back to estimation:`, error);
      return this.estimateTokens(text);
    }
  }

  /**
   * Count tokens in messages array
   * Accounts for message format overhead
   */
  async countMessageTokens(
    messages: ChatMessage[],
    model?: string
  ): Promise<number> {
    if (messages.length === 0) {
      return 0;
    }

    try {
      const encoding = await this.getEncoding(model);
      let totalTokens = 0;

      for (const message of messages) {
        // Base message overhead
        totalTokens += TOKENS_PER_MESSAGE;

        // Role tokens
        const roleTokens = encoding.encode(message.role);
        totalTokens += roleTokens.length;

        // Content tokens
        if (message.content) {
          const contentTokens = encoding.encode(message.content);
          totalTokens += contentTokens.length;
        }

        // Name tokens (if present)
        if (message.name) {
          const nameTokens = encoding.encode(message.name);
          totalTokens += nameTokens.length + TOKENS_PER_NAME;
        }

        // Tool calls tokens (if present)
        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            const toolNameTokens = encoding.encode(toolCall.function.name);
            const toolArgsTokens = encoding.encode(toolCall.function.arguments);
            totalTokens += toolNameTokens.length + toolArgsTokens.length + 3; // 3 for formatting
          }
        }

        // Tool call ID tokens (for tool response messages)
        if (message.tool_call_id) {
          const toolCallIdTokens = encoding.encode(message.tool_call_id);
          totalTokens += toolCallIdTokens.length;
        }
      }

      // Add 3 tokens for the assistant's reply priming
      totalTokens += 3;

      return totalTokens;
    } catch (error) {
      // Fallback to estimation
      console.warn(`Failed to count message tokens with tiktoken, falling back to estimation:`, error);
      return this.estimateMessageTokens(messages);
    }
  }

  /**
   * Estimate tokens without loading tokenizer (faster but less accurate)
   * Uses character-based heuristic
   */
  estimateTokens(text: string): number {
    if (!text) {
      return 0;
    }
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Estimate tokens in messages
   */
  private estimateMessageTokens(messages: ChatMessage[]): number {
    let totalChars = 0;

    for (const message of messages) {
      totalChars += message.role.length;
      totalChars += message.content?.length || 0;
      totalChars += message.name?.length || 0;

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          totalChars += toolCall.function.name.length;
          totalChars += toolCall.function.arguments.length;
        }
      }

      if (message.tool_call_id) {
        totalChars += message.tool_call_id.length;
      }

      // Add overhead for message structure
      totalChars += 20; // Approximate overhead
    }

    return Math.ceil(totalChars / CHARS_PER_TOKEN);
  }

  /**
   * Get the encoding name for a specific model
   */
  getEncodingForModel(model: string): string {
    return MODEL_ENCODINGS[model] || DEFAULT_ENCODING;
  }

  /**
   * Get or create encoding instance
   */
  private async getEncoding(model?: string): Promise<Tiktoken> {
    const encodingName = model ? this.getEncodingForModel(model) : DEFAULT_ENCODING;

    // Check cache
    const cached = this.encodingCache.get(encodingName);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.encoding;
    }

    // Create new encoding
    let encoding: Tiktoken;

    try {
      // Try to get encoding for specific model first
      if (model && this.isValidTiktokenModel(model)) {
        encoding = encoding_for_model(model as TiktokenModel);
      } else {
        // Fall back to encoding by name
        encoding = get_encoding(encodingName as any);
      }
    } catch (error) {
      // If model not found, use default encoding
      console.warn(`Failed to get encoding for model '${model}', using default:`, error);
      encoding = get_encoding(DEFAULT_ENCODING as any);
    }

    // Cache the encoding
    this.encodingCache.set(encodingName, {
      encoding,
      lastUsed: Date.now(),
    });

    return encoding;
  }

  /**
   * Check if model is a valid tiktoken model
   */
  private isValidTiktokenModel(model: string): boolean {
    const validModels = [
      'gpt-4',
      'gpt-4-32k',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'text-davinci-003',
      'text-davinci-002',
      'code-davinci-002',
    ];
    return validModels.includes(model);
  }

  /**
   * Generate cache key for token count
   */
  private getCacheKey(text: string, model?: string): string {
    const modelPart = model || 'default';
    // Use a simple hash for the text to keep cache keys manageable
    const textHash = this.simpleHash(text);
    return `${modelPart}:${textHash}`;
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();

    // Clean token count cache
    for (const [key, value] of this.tokenCountCache.entries()) {
      if (now - value.timestamp > this.cacheMaxAge) {
        this.tokenCountCache.delete(key);
      }
    }

    // Clean encoding cache (keep recently used)
    const encodingMaxAge = this.cacheMaxAge * 2; // Keep encodings longer
    for (const [key, value] of this.encodingCache.entries()) {
      if (now - value.lastUsed > encodingMaxAge) {
        value.encoding.free(); // Free tiktoken resources
        this.encodingCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    tokenCountCacheSize: number;
    encodingCacheSize: number;
  } {
    return {
      tokenCountCacheSize: this.tokenCountCache.size,
      encodingCacheSize: this.encodingCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    // Free all encodings
    for (const entry of this.encodingCache.values()) {
      entry.encoding.free();
    }

    this.tokenCountCache.clear();
    this.encodingCache.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Stop cleanup interval
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }

    // Clear caches and free resources
    this.clearCache();
  }
}

/**
 * Create a singleton token counter instance
 */
let globalTokenCounter: TokenCounter | null = null;

/**
 * Get or create the global token counter instance
 */
export function getTokenCounter(): TokenCounter {
  if (!globalTokenCounter) {
    globalTokenCounter = new TokenCounter();
  }
  return globalTokenCounter;
}

/**
 * Reset the global token counter (useful for testing)
 */
export function resetTokenCounter(): void {
  if (globalTokenCounter) {
    globalTokenCounter.cleanup();
    globalTokenCounter = null;
  }
}
