/**
 * CopilotClient - GitHub Copilot API Client
 *
 * Implementation of ILLMClient for GitHub Copilot API.
 * Uses copilot-api server for OpenAI-compatible interface.
 */

import type {
  ILLMClient,
  ICachedLLMClient,
} from "../../core/interfaces/ILLMClient.js";
import type {
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
  FinishReason,
  TokenUsage,
} from "../../core/types/llm.types.js";
import {
  LLMError,
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMInvalidRequestError,
  LLMServerError,
  LLMTimeoutError,
  LLMNetworkError,
  LLMResponseParsingError,
  LLMContextLengthError,
} from "../../core/errors/LLMError.js";
import { DEFAULT_LLM_CONFIG } from "../../core/constants/defaults.js";

/**
 * Response from OpenAI-compatible API
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Error response from API
 */
interface APIErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
    param?: string;
  };
}

/**
 * CopilotClient - Main LLM client implementation
 */
export class CopilotClient implements ILLMClient, ICachedLLMClient {
  public readonly provider = "copilot";
  public readonly baseURL: string;
  public readonly config: LLMConfig;

  private stats: LLMStats;
  private cache: Map<string, ChatResponse>;
  private abortControllers: Map<string, AbortController>;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      ...DEFAULT_LLM_CONFIG,
      ...config,
    } as LLMConfig;

    this.baseURL = this.config.baseURL;

    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalTokensUsed: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      callsByModel: {},
      errorsByType: {},
    };

    this.cache = new Map();
    this.abortControllers = new Map();
  }

  /**
   * Send a chat completion request
   */
  async chat(
    request: ChatRequest,
    options?: LLMRequestOptions,
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Update stats
      this.stats.totalCalls++;
      const model =
        request.model || this.config.defaultModel || this.config.model;
      this.stats.callsByModel[model] =
        (this.stats.callsByModel[model] || 0) + 1;

      // Check cache if enabled
      if (options?.cache !== false) {
        const cacheKey = this.getCacheKey(request);
        if (cacheKey) {
          const cached = await this.getCached(cacheKey);
          if (cached) {
            return cached;
          }
        }
      }

      // Prepare request body
      const body = this.prepareRequestBody(request);

      // Make HTTP request with retries
      const response = await this.makeRequest(
        "/v1/chat/completions",
        body,
        options,
        requestId,
      );

      // Parse response
      const chatResponse = this.parseResponse(response, requestId);

      // Update stats
      this.stats.successfulCalls++;
      this.stats.totalTokensUsed += chatResponse.usage.totalTokens;
      this.updateAverageLatency(Date.now() - startTime);

      // Cache if enabled
      if (options?.cache !== false) {
        const cacheKey = this.getCacheKey(request);
        if (cacheKey) {
          this.cache.set(cacheKey, chatResponse);
        }
      }

      return chatResponse;
    } catch (error) {
      this.stats.failedCalls++;
      if (error instanceof LLMError) {
        this.stats.errorsByType[error.code] =
          (this.stats.errorsByType[error.code] || 0) + 1;
      }
      throw error;
    }
  }

  /**
   * Stream a chat completion response
   */
  async *stream(
    request: ChatRequest,
    options?: LLMRequestOptions,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const requestId = this.generateRequestId();

    try {
      // Prepare request body with streaming enabled
      const body = this.prepareRequestBody({ ...request, stream: true });

      // Create abort controller
      const abortController = new AbortController();
      this.abortControllers.set(requestId, abortController);

      // Make streaming request
      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey || "dummy"}`,
          ...this.config.customHeaders,
        },
        body: JSON.stringify(body),
        signal: options?.signal || abortController.signal,
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response, requestId);
      }

      if (!response.body) {
        throw new LLMResponseParsingError("No response body for streaming", {
          provider: this.provider,
          requestId,
        });
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const chunk = JSON.parse(data);
              yield this.parseStreamChunk(chunk);
            } catch (error) {
              // Skip malformed chunks
              continue;
            }
          }
        }
      }
    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Count tokens in text
   */
  async countTokens(request: TokenCountRequest): Promise<TokenCountResponse> {
    // For now, use rough estimation (will be replaced with tiktoken)
    const text = request.text || "";
    const tokens = Math.ceil(text.length / 4); // Rough estimate: ~4 chars per token
    return {
      tokens,
      model: request.model || this.config.model,
      characters: text.length,
    };
  }

  /**
   * Count tokens in messages
   */
  async countMessageTokens(messages: ChatMessage[]): Promise<number> {
    let total = 0;
    for (const message of messages) {
      // Message overhead: ~4 tokens per message
      total += 4;
      const result = await this.countTokens({ text: message.content });
      total += result.tokens;
      if (message.role) {
        total += 1; // Role token
      }
    }
    return total;
  }

  /**
   * Get available models
   */
  async getModels(): Promise<LLMModel[]> {
    try {
      const response = await fetch(`${this.baseURL}/v1/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey || "dummy"}`,
        },
      });

      if (!response.ok) {
        throw new LLMServerError("Failed to fetch models", {
          provider: this.provider,
        });
      }

      const data = (await response.json()) as { data: any[] };
      return data.data.map((model: any) => this.mapToLLMModel(model));
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMNetworkError("Failed to fetch models", {
        provider: this.provider,
        cause: error as Error,
      });
    }
  }

  /**
   * Get model info
   */
  async getModel(modelId: string): Promise<LLMModel> {
    const models = await this.getModels();
    const model = models.find((m) => m.id === modelId);
    if (!model) {
      throw new LLMError(`Model not found: ${modelId}`, {
        code: "MODEL_NOT_FOUND",
        provider: this.provider,
      });
    }
    return model;
  }

  /**
   * Test connection to LLM provider
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/v1/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey || "dummy"}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get client statistics
   */
  getStats(): LLMStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalTokensUsed: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      callsByModel: {},
      errorsByType: {},
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Abort all pending requests
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
    this.cache.clear();
  }

  // ICachedLLMClient implementation

  /**
   * Get cache key for request
   */
  getCacheKey(request: ChatRequest): string {
    if (request.stream) return ""; // Don't cache streaming requests

    const key = JSON.stringify({
      messages: request.messages,
      model: request.model || this.config.defaultModel || this.config.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });

    return this.hashString(key);
  }

  /**
   * Check if response is cached
   */
  async isCached(request: ChatRequest): Promise<boolean> {
    const key = this.getCacheKey(request);
    return key ? this.cache.has(key) : false;
  }

  /**
   * Clear cache
   */
  async clearCache(pattern?: string): Promise<number> {
    let count = 0;
    if (!pattern) {
      count = this.cache.size;
      this.cache.clear();
      return count;
    }

    // Clear matching patterns
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    const hits = Math.round(this.stats.totalCalls * this.stats.cacheHitRate);
    const misses = this.stats.totalCalls - hits;
    return {
      size: this.cache.size,
      hitRate: this.stats.cacheHitRate,
      hits,
      misses,
    };
  }

  // Private helper methods

  private prepareRequestBody(request: ChatRequest): any {
    const messages = [...request.messages];

    // Add system prompt if provided
    if (request.systemPrompt) {
      messages.unshift({
        role: "system",
        content: request.systemPrompt,
      });
    }

    const body: any = {
      model: request.model || this.config.defaultModel || this.config.model,
      messages,
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      stream: request.stream || false,
    };

    // Add optional parameters
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.frequencyPenalty !== undefined)
      body.frequency_penalty = request.frequencyPenalty;
    if (request.presencePenalty !== undefined)
      body.presence_penalty = request.presencePenalty;
    if (request.stop) body.stop = request.stop;
    if (request.user) body.user = request.user;

    // Add tools/functions if provided
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }

    if (request.toolChoice) {
      body.tool_choice = request.toolChoice;
    }

    return body;
  }

  private async makeRequest(
    endpoint: string,
    body: any,
    options?: LLMRequestOptions,
    requestId?: string,
  ): Promise<OpenAIResponse> {
    const maxRetries = options?.maxRetries ?? this.config.maxRetries;
    const timeout = options?.timeout ?? this.config.timeout;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${this.baseURL}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey || "dummy"}`,
            ...this.config.customHeaders,
          },
          body: JSON.stringify(body),
          signal: options?.signal || controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await this.handleErrorResponse(response, requestId);
        }

        return (await response.json()) as OpenAIResponse;
      } catch (error) {
        lastError = error as Error;

        // Don't retry certain errors
        if (
          error instanceof LLMAuthenticationError ||
          error instanceof LLMInvalidRequestError ||
          error instanceof LLMContextLengthError
        ) {
          throw error;
        }

        // Wait before retry
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new LLMError("Unknown error", { code: "UNKNOWN" });
  }

  private async handleErrorResponse(
    response: Response,
    requestId?: string,
  ): Promise<LLMError> {
    let errorData: APIErrorResponse | null = null;

    try {
      errorData = (await response.json()) as APIErrorResponse;
    } catch {
      // Couldn't parse error response
    }

    const message = errorData?.error?.message || response.statusText;
    const statusCode = response.status;

    switch (statusCode) {
      case 401:
        return new LLMAuthenticationError(message, {
          provider: this.provider,
          requestId,
          statusCode,
        });
      case 429:
        const retryAfter = response.headers.get("Retry-After");
        return new LLMRateLimitError(message, {
          provider: this.provider,
          requestId,
          statusCode,
          retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
        });
      case 400:
        return new LLMInvalidRequestError(message, {
          provider: this.provider,
          requestId,
          statusCode,
        });
      case 408:
        return new LLMTimeoutError(message, {
          timeoutMs: this.config.timeout,
          provider: this.provider,
          requestId,
        });
      case 500:
      case 502:
      case 503:
      case 504:
        return new LLMServerError(message, {
          provider: this.provider,
          requestId,
          statusCode,
        });
      default:
        return new LLMError(message, {
          code: "LLM_ERROR",
          provider: this.provider,
          requestId,
          statusCode,
        });
    }
  }

  private parseResponse(
    response: OpenAIResponse,
    requestId: string,
  ): ChatResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new LLMResponseParsingError("No choices in response", {
        provider: this.provider,
        requestId,
      });
    }

    const message = choice.message;
    const usage: TokenUsage = {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    };

    return {
      id: response.id,
      model: response.model,
      created: response.created,
      message: {
        role: message.role as import("../../core/types/llm.types.js").MessageRole,
        content: message.content || "",
        tool_calls: message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      },
      content: message.content || "",
      finishReason: choice.finish_reason as FinishReason,
      usage,
      metadata: {
        model: response.model,
      },
    };
  }

  private parseStreamChunk(chunk: any): StreamChunk {
    const choice = chunk.choices?.[0];
    return {
      id: chunk.id,
      model: chunk.model || this.config.model,
      created: chunk.created || Date.now(),
      delta: {
        role: choice?.delta?.role as
          | import("../../core/types/llm.types.js").MessageRole
          | undefined,
        content: choice?.delta?.content,
        function_call: choice?.delta?.function_call,
        tool_calls: choice?.delta?.tool_calls,
      },
      finishReason: choice?.finish_reason as FinishReason | undefined,
    };
  }

  private mapToLLMModel(apiModel: any): LLMModel {
    return {
      id: apiModel.id,
      name: apiModel.id,
      provider: this.provider,
      contextWindow: 128000, // Default for GPT-4
      maxOutputTokens: 4096,
      supports: {
        streaming: true,
        functions: true,
        vision: false,
      },
    };
  }

  private async getCached(key: string): Promise<ChatResponse | null> {
    return this.cache.get(key) || null;
  }

  private updateAverageLatency(latency: number): void {
    const total = this.stats.totalCalls;
    this.stats.averageLatency =
      (this.stats.averageLatency * (total - 1) + latency) / total;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
