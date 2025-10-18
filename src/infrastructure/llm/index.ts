/**
 * LLM Infrastructure Module
 *
 * Barrel export for all LLM-related infrastructure components.
 */

export { CopilotClient } from './CopilotClient.js';
export { TokenCounter, getTokenCounter, resetTokenCounter } from './TokenCounter.js';

// Re-export types and interfaces for convenience
export type {
  ILLMClient,
  ICachedLLMClient,
  ITokenCounter,
  IEmbeddingClient,
} from '../../core/interfaces/ILLMClient.js';

export type {
  ChatRequest,
  ChatResponse,
  ChatMessage,
  StreamChunk,
  TokenCountRequest,
  TokenCountResponse,
  LLMModel,
  LLMConfig,
  LLMStats,
  LLMRequestOptions,
  ToolCall,
  ToolDefinition,
  TokenUsage,
  FinishReason,
  MessageRole,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../../core/types/llm.types.js';

export {
  LLMError,
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMInvalidRequestError,
  LLMServerError,
  LLMTimeoutError,
  LLMNetworkError,
  LLMConnectionError,
  LLMResponseParsingError,
  LLMContextLengthError,
  createLLMErrorFromStatus,
  isLLMError,
  isRetryableError,
} from '../../core/errors/LLMError.js';
