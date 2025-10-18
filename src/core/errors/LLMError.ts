/**
 * LLM Error Classes
 *
 * Comprehensive error hierarchy for LLM-related errors.
 * Each error type provides specific information for debugging and error handling.
 */

/**
 * Base LLM error class
 */
export class LLMError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly provider?: string;
  public readonly requestId?: string;
  public readonly timestamp: number;
  public readonly retryable: boolean;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      provider?: string;
      requestId?: string;
      retryable?: boolean;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'LLMError';
    this.code = options?.code || 'LLM_ERROR';
    this.statusCode = options?.statusCode;
    this.provider = options?.provider;
    this.requestId = options?.requestId;
    this.timestamp = Date.now();
    this.retryable = options?.retryable ?? false;
    this.metadata = options?.metadata;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the cause if provided
    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      provider: this.provider,
      requestId: this.requestId,
      timestamp: this.timestamp,
      retryable: this.retryable,
      metadata: this.metadata,
      stack: this.stack,
    };
  }
}

/**
 * Authentication/Authorization error
 * Thrown when API key is invalid, expired, or missing
 */
export class LLMAuthenticationError extends LLMError {
  constructor(
    message: string,
    options?: {
      statusCode?: number;
      provider?: string;
      requestId?: string;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      ...options,
      code: 'LLM_AUTHENTICATION_ERROR',
      retryable: false, // Auth errors are not retryable
    });
    this.name = 'LLMAuthenticationError';
  }
}

/**
 * Rate limit error
 * Thrown when API rate limits are exceeded
 */
export class LLMRateLimitError extends LLMError {
  public readonly retryAfter?: number; // Seconds until retry is allowed
  public readonly limit?: number;
  public readonly remaining?: number;
  public readonly reset?: number; // Timestamp when limit resets

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      provider?: string;
      requestId?: string;
      retryAfter?: number;
      limit?: number;
      remaining?: number;
      reset?: number;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      ...options,
      code: 'LLM_RATE_LIMIT_ERROR',
      retryable: true, // Can retry after waiting
    });
    this.name = 'LLMRateLimitError';
    this.retryAfter = options?.retryAfter;
    this.limit = options?.limit;
    this.remaining = options?.remaining;
    this.reset = options?.reset;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
      limit: this.limit,
      remaining: this.remaining,
      reset: this.reset,
    };
  }
}

/**
 * Invalid request error
 * Thrown when request parameters are invalid
 */
export class LLMInvalidRequestError extends LLMError {
  public readonly param?: string; // Which parameter caused the error

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      provider?: string;
      requestId?: string;
      param?: string;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      ...options,
      code: 'LLM_INVALID_REQUEST_ERROR',
      retryable: false, // Invalid requests won't succeed on retry
    });
    this.name = 'LLMInvalidRequestError';
    this.param = options?.param;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      param: this.param,
    };
  }
}

/**
 * Server error
 * Thrown when LLM API has internal server errors (5xx)
 */
export class LLMServerError extends LLMError {
  constructor(
    message: string,
    options?: {
      statusCode?: number;
      provider?: string;
      requestId?: string;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      ...options,
      code: 'LLM_SERVER_ERROR',
      retryable: true, // Server errors are often transient
    });
    this.name = 'LLMServerError';
  }
}

/**
 * Timeout error
 * Thrown when request takes too long to complete
 */
export class LLMTimeoutError extends LLMError {
  public readonly timeoutMs: number;

  constructor(
    message: string,
    options: {
      timeoutMs: number;
      provider?: string;
      requestId?: string;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      ...options,
      code: 'LLM_TIMEOUT_ERROR',
      retryable: true, // Timeouts can be retried
    });
    this.name = 'LLMTimeoutError';
    this.timeoutMs = options.timeoutMs;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
    };
  }
}

/**
 * Network error
 * Thrown when network connectivity issues occur
 */
export class LLMNetworkError extends LLMError {
  constructor(
    message: string,
    options?: {
      provider?: string;
      requestId?: string;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      ...options,
      code: 'LLM_NETWORK_ERROR',
      retryable: true, // Network errors can be retried
    });
    this.name = 'LLMNetworkError';
  }
}

/**
 * Connection error
 * Thrown when unable to connect to LLM API
 */
export class LLMConnectionError extends LLMError {
  constructor(
    message: string,
    options?: {
      provider?: string;
      requestId?: string;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      ...options,
      code: 'LLM_CONNECTION_ERROR',
      retryable: true, // Connection errors can be retried
    });
    this.name = 'LLMConnectionError';
  }
}

/**
 * Response parsing error
 * Thrown when unable to parse LLM response
 */
export class LLMResponseParsingError extends LLMError {
  public readonly rawResponse?: string;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      provider?: string;
      requestId?: string;
      rawResponse?: string;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      ...options,
      code: 'LLM_RESPONSE_PARSING_ERROR',
      retryable: false, // Parsing errors indicate malformed response
    });
    this.name = 'LLMResponseParsingError';
    this.rawResponse = options?.rawResponse;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      rawResponse: this.rawResponse,
    };
  }
}

/**
 * Context length exceeded error
 * Thrown when request exceeds model's context window
 */
export class LLMContextLengthError extends LLMError {
  public readonly requestedTokens: number;
  public readonly maxTokens: number;

  constructor(
    message: string,
    options: {
      requestedTokens: number;
      maxTokens: number;
      statusCode?: number;
      provider?: string;
      requestId?: string;
      metadata?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      ...options,
      code: 'LLM_CONTEXT_LENGTH_ERROR',
      retryable: false, // Context length errors require reducing input
    });
    this.name = 'LLMContextLengthError';
    this.requestedTokens = options.requestedTokens;
    this.maxTokens = options.maxTokens;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      requestedTokens: this.requestedTokens,
      maxTokens: this.maxTokens,
    };
  }
}

/**
 * Helper function to create appropriate error from HTTP status code
 */
export function createLLMErrorFromStatus(
  statusCode: number,
  message: string,
  options?: {
    provider?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): LLMError {
  switch (statusCode) {
    case 401:
    case 403:
      return new LLMAuthenticationError(message, { statusCode, ...options });
    case 429:
      return new LLMRateLimitError(message, { statusCode, ...options });
    case 400:
    case 422:
      return new LLMInvalidRequestError(message, { statusCode, ...options });
    case 500:
    case 502:
    case 503:
    case 504:
      return new LLMServerError(message, { statusCode, ...options });
    default:
      return new LLMError(message, { code: 'LLM_HTTP_ERROR', statusCode, ...options });
  }
}

/**
 * Type guard to check if error is an LLMError
 */
export function isLLMError(error: unknown): error is LLMError {
  return error instanceof LLMError;
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return isLLMError(error) && error.retryable;
}
