/**
 * LLM Types
 *
 * Core type definitions for LLM interactions.
 * These types are used across all LLM client implementations.
 */

/**
 * Message role in a conversation
 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/**
 * Finish reason for LLM response
 */
export type FinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "error";

/**
 * Chat message in a conversation
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tool/function call from LLM
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Tool/function definition
 */
export interface ToolDefinition {
  type?: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  function?: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Chat completion request
 */
export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  tools?: ToolDefinition[];
  toolChoice?:
    | "none"
    | "auto"
    | { type: "function"; function: { name: string } };
  user?: string;
  stream?: boolean;
  n?: number;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chat completion response
 */
export interface ChatResponse {
  id: string;
  model: string;
  created: number;
  message: ChatMessage;
  content?: string;
  finishReason: FinishReason;
  usage: TokenUsage;
  metadata?: Record<string, unknown>;
}

/**
 * Streaming response chunk
 */
export interface StreamChunk {
  id: string;
  model: string;
  created: number;
  delta: {
    role?: MessageRole;
    content?: string;
    tool_calls?: Partial<ToolCall>[];
    function_call?: {
      name?: string;
      arguments?: string;
    };
  };
  finishReason?: FinishReason;
  usage?: Partial<TokenUsage>;
}

/**
 * Token counting request
 */
export interface TokenCountRequest {
  text?: string;
  messages?: ChatMessage[];
  model?: string;
  characters?: number;
}

/**
 * Token counting response
 */
export interface TokenCountResponse {
  tokens: number;
  model: string;
  characters?: number;
}

/**
 * LLM model information
 */
export interface LLMModel {
  id: string;
  name: string;
  provider?: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  supports: {
    functions?: boolean;
    vision?: boolean;
    streaming?: boolean;
  };
  metadata?: Record<string, unknown>;
}

/**
 * LLM configuration
 */
export interface LLMConfig {
  provider: string;
  baseURL: string;
  apiKey?: string;
  model: string;
  defaultModel?: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  streaming?: boolean;
  caching?: boolean;
  customHeaders?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * LLM request options (overrides for individual requests)
 */
export interface LLMRequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  tools?: ToolDefinition[];
  toolChoice?:
    | "none"
    | "auto"
    | { type: "function"; function: { name: string } };
  timeout?: number;
  maxRetries?: number;
  signal?: AbortSignal;
  cache?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * LLM statistics
 */
export interface LLMStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalTokensUsed: number;
  averageLatency: number;
  cacheHitRate: number;
  callsByModel: Record<string, number>;
  errorsByType: Record<string, number>;
}

/**
 * LLM cache entry
 */
export interface LLMCacheEntry {
  key: string;
  response: ChatResponse;
  timestamp: number;
  hits: number;
  size: number;
}

/**
 * LLM cache statistics
 */
export interface LLMCacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
}

/**
 * Embedding request
 */
export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  dimensions?: number;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}
