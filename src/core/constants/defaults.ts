/**
 * Default Constants
 *
 * Default configuration values used throughout the application.
 * These can be overridden by user configuration.
 */

import type { LLMConfig } from "../types/llm.types.js";

/**
 * Default LLM configuration
 */
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "copilot",
  baseURL: "http://localhost:3000",
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  streaming: false,
  caching: true,
};

/**
 * Model context windows (in tokens)
 */
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "gpt-4": 8192,
  "gpt-4-32k": 32768,
  "gpt-4-turbo": 128000,
  "gpt-4-turbo-preview": 128000,
  "gpt-3.5-turbo": 4096,
  "gpt-3.5-turbo-16k": 16384,
  "claude-3-opus": 200000,
  "claude-3-sonnet": 200000,
  "claude-3-haiku": 200000,
  "claude-2.1": 200000,
  "claude-2": 100000,
};

/**
 * Model max output tokens
 */
export const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  "gpt-4": 4096,
  "gpt-4-32k": 4096,
  "gpt-4-turbo": 4096,
  "gpt-4-turbo-preview": 4096,
  "gpt-3.5-turbo": 4096,
  "gpt-3.5-turbo-16k": 4096,
  "claude-3-opus": 4096,
  "claude-3-sonnet": 4096,
  "claude-3-haiku": 4096,
  "claude-2.1": 4096,
  "claude-2": 4096,
};

/**
 * Token encoding by model
 */
export const MODEL_ENCODINGS: Record<string, string> = {
  "gpt-4": "cl100k_base",
  "gpt-4-32k": "cl100k_base",
  "gpt-4-turbo": "cl100k_base",
  "gpt-4-turbo-preview": "cl100k_base",
  "gpt-3.5-turbo": "cl100k_base",
  "gpt-3.5-turbo-16k": "cl100k_base",
  "text-davinci-003": "p50k_base",
  "text-davinci-002": "p50k_base",
  "code-davinci-002": "p50k_base",
};

/**
 * Default encoding for unknown models
 */
export const DEFAULT_ENCODING = "cl100k_base";

/**
 * Token overhead per message (for chat format)
 */
export const TOKENS_PER_MESSAGE = 4;

/**
 * Token overhead per message name
 */
export const TOKENS_PER_NAME = 1;

/**
 * Average characters per token (rough estimation)
 */
export const CHARS_PER_TOKEN = 4;

/**
 * Default context strategy
 */
export const DEFAULT_CONTEXT_STRATEGY = "sliding-window";

/**
 * Context strategy configurations
 */
export const CONTEXT_STRATEGY_CONFIGS = {
  "sliding-window": {
    maxMessages: 50,
    preserveSystemMessage: true,
  },
  "priority-based": {
    weights: {
      priorityWeight: 0.4,
      recencyWeight: 0.3,
      roleWeight: 0.3,
    },
    minMessages: 5,
    recencyDecayFactor: 0.95,
  },
  "summary-based": {
    maxMessages: 50,
    preserveSystemMessage: true,
    summaryThreshold: 20,
    keepRecentCount: 10,
  },
  semantic: {
    maxMessages: 50,
    preserveSystemMessage: true,
    relevanceThreshold: 0.7,
    topK: 20,
  },
};

/**
 * Default cache settings
 */
export const DEFAULT_CACHE_CONFIG = {
  maxSize: 100, // Maximum number of cached responses
  maxAge: 3600000, // 1 hour in milliseconds
  enableCompression: true,
};

/**
 * Default retry settings
 */
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2,
  maxRetryDelay: 10000, // 10 seconds
};

/**
 * Default timeout values (milliseconds)
 */
export const DEFAULT_TIMEOUTS = {
  llm: 60000, // 60 seconds
  tool: 30000, // 30 seconds
  workflow: 300000, // 5 minutes
};

/**
 * Default log levels
 */
export const DEFAULT_LOG_LEVEL = "info";

/**
 * Valid log levels
 */
export const LOG_LEVELS = ["error", "warn", "info", "debug", "trace"] as const;

/**
 * Default project structure
 */
export const DEFAULT_PROJECT_STRUCTURE = {
  agents: ".nocturne/agents",
  tools: ".nocturne/tools",
  workflows: ".nocturne/workflows",
  data: ".nocturne/data",
  logs: ".nocturne/logs",
  cache: ".nocturne/cache",
};

/**
 * Default agent configuration
 */
export const DEFAULT_AGENT_CONFIG = {
  name: "default",
  description: "Default autonomous agent",
  systemPrompt: "You are a helpful AI assistant.",
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 4096,
  maxIterations: 10,
  contextStrategy: "sliding-window",
  enabledTools: [],
};

/**
 * Default tool configuration
 */
export const DEFAULT_TOOL_CONFIG = {
  enabled: true,
  timeout: 30000,
  retries: 2,
};

/**
 * Rate limiting defaults
 */
export const DEFAULT_RATE_LIMITS = {
  requestsPerMinute: 60,
  tokensPerMinute: 90000,
  requestsPerDay: 10000,
};

/**
 * Database defaults
 */
export const DEFAULT_DATABASE_CONFIG = {
  path: ".nocturne/data/nocturne.db",
  enableWAL: true,
  busyTimeout: 5000,
};

/**
 * Default colors for terminal UI
 */
export const UI_COLORS = {
  primary: "#00D9FF",
  secondary: "#FF6B9D",
  success: "#00F5A0",
  warning: "#FFA500",
  error: "#FF4757",
  info: "#5352ED",
  muted: "#8B8B8B",
};

/**
 * Default UI settings
 */
export const DEFAULT_UI_CONFIG = {
  theme: "dark",
  showTimestamps: true,
  showTokenCounts: true,
  enableAnimations: true,
  maxMessageLength: 10000,
};

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Common file extensions for code analysis
 */
export const CODE_FILE_EXTENSIONS = [
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".rb",
  ".java",
  ".go",
  ".rs",
  ".c",
  ".cpp",
  ".cs",
  ".php",
  ".swift",
  ".kt",
  ".scala",
  ".sh",
  ".bash",
  ".sql",
  ".html",
  ".css",
  ".scss",
  ".json",
  ".yaml",
  ".yml",
  ".xml",
  ".md",
  ".txt",
];

/**
 * Files to ignore in directory scanning
 */
export const IGNORED_PATHS = [
  "node_modules",
  ".git",
  ".nocturne",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".output",
  "out",
  "target",
  "vendor",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  ".venv",
  "venv",
  "env",
];
