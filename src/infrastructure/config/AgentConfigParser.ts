/**
 * Agent Configuration Parser
 *
 * Parses and validates agent configuration files.
 *
 * Features:
 * - Parse agent definitions
 * - Validate agent configuration
 * - Role and capability parsing
 * - LLM configuration
 * - Tool configuration
 * - Memory configuration
 * - Workflow integration
 */

import { ConfigValidator, type ValidationSchema } from "./ConfigValidator.js";

/**
 * Agent Configuration
 */
export interface AgentConfig {
  /** Agent ID */
  id: string;

  /** Agent name */
  name: string;

  /** Agent role */
  role: AgentRole;

  /** Agent type */
  type: AgentType;

  /** Description */
  description?: string;

  /** LLM configuration */
  llm?: AgentLLMConfig;

  /** Tool configuration */
  tools?: AgentToolConfig;

  /** Memory configuration */
  memory?: AgentMemoryConfig;

  /** Capabilities */
  capabilities?: string[];

  /** System prompt */
  systemPrompt?: string;

  /** Temperature (0-1) */
  temperature?: number;

  /** Max tokens */
  maxTokens?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: RetryConfig;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Agent Role
 */
export type AgentRole =
  | "coder"
  | "reviewer"
  | "tester"
  | "architect"
  | "researcher"
  | "planner"
  | "executor"
  | "coordinator"
  | "custom";

/**
 * Agent Type
 */
export type AgentType =
  | "autonomous"
  | "interactive"
  | "reactive"
  | "proactive"
  | "collaborative";

/**
 * Agent LLM Configuration
 */
export interface AgentLLMConfig {
  /** Provider (openai, anthropic, etc.) */
  provider: string;

  /** Model name */
  model: string;

  /** API key (or reference to env var) */
  apiKey?: string;

  /** Base URL */
  baseUrl?: string;

  /** Temperature override */
  temperature?: number;

  /** Max tokens override */
  maxTokens?: number;

  /** Top P */
  topP?: number;

  /** Frequency penalty */
  frequencyPenalty?: number;

  /** Presence penalty */
  presencePenalty?: number;

  /** Stop sequences */
  stop?: string[];
}

/**
 * Agent Tool Configuration
 */
export interface AgentToolConfig {
  /** Enabled tools */
  enabled: string[];

  /** Disabled tools */
  disabled?: string[];

  /** Tool-specific configuration */
  config?: Record<string, any>;

  /** Allow all tools */
  allowAll?: boolean;

  /** Tool execution timeout */
  timeout?: number;

  /** Max concurrent tool calls */
  maxConcurrent?: number;
}

/**
 * Agent Memory Configuration
 */
export interface AgentMemoryConfig {
  /** Enable memory */
  enabled: boolean;

  /** Memory types to use */
  types?: string[];

  /** Max working memory items */
  maxWorkingMemory?: number;

  /** Max long-term memory items */
  maxLongTermMemory?: number;

  /** Memory importance threshold */
  importanceThreshold?: number;

  /** Enable vector embeddings */
  enableEmbeddings?: boolean;

  /** Embedding model */
  embeddingModel?: string;

  /** Memory consolidation interval (ms) */
  consolidationInterval?: number;
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  /** Enable retries */
  enabled: boolean;

  /** Max retry attempts */
  maxAttempts?: number;

  /** Initial delay (ms) */
  initialDelay?: number;

  /** Max delay (ms) */
  maxDelay?: number;

  /** Backoff multiplier */
  backoffMultiplier?: number;

  /** Retry on status codes */
  retryOnStatusCodes?: number[];
}

/**
 * Agent Configuration Parser
 */
export class AgentConfigParser {
  private validator: ConfigValidator;

  /**
   * Agent configuration schema
   */
  private static readonly SCHEMA: ValidationSchema = {
    id: {
      type: "string",
      required: true,
      pattern: /^[a-zA-Z0-9_-]+$/,
      description: "Agent ID (alphanumeric, dash, underscore)",
    },
    name: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 100,
      description: "Agent name",
    },
    role: {
      type: "enum",
      required: true,
      enum: [
        "coder",
        "reviewer",
        "tester",
        "architect",
        "researcher",
        "planner",
        "executor",
        "coordinator",
        "custom",
      ],
      description: "Agent role",
    },
    type: {
      type: "enum",
      required: true,
      enum: ["autonomous", "interactive", "reactive", "proactive", "collaborative"],
      description: "Agent type",
    },
    description: {
      type: "string",
      required: false,
      maxLength: 500,
      description: "Agent description",
    },
    llm: {
      type: "object",
      required: false,
      schema: {
        provider: {
          type: "string",
          required: true,
          enum: ["openai", "anthropic", "azure", "local"],
        },
        model: {
          type: "string",
          required: true,
        },
        apiKey: {
          type: "string",
          required: false,
        },
        baseUrl: {
          type: "string",
          required: false,
        },
        temperature: {
          type: "number",
          required: false,
          min: 0,
          max: 2,
        },
        maxTokens: {
          type: "number",
          required: false,
          min: 1,
          max: 100000,
        },
        topP: {
          type: "number",
          required: false,
          min: 0,
          max: 1,
        },
        frequencyPenalty: {
          type: "number",
          required: false,
          min: -2,
          max: 2,
        },
        presencePenalty: {
          type: "number",
          required: false,
          min: -2,
          max: 2,
        },
        stop: {
          type: "array",
          required: false,
          items: {
            type: "string",
            required: false,
          },
        },
      },
    },
    tools: {
      type: "object",
      required: false,
      schema: {
        enabled: {
          type: "array",
          required: true,
          items: {
            type: "string",
            required: false,
          },
        },
        disabled: {
          type: "array",
          required: false,
          items: {
            type: "string",
            required: false,
          },
        },
        config: {
          type: "object",
          required: false,
        },
        allowAll: {
          type: "boolean",
          required: false,
          default: false,
        },
        timeout: {
          type: "number",
          required: false,
          min: 1000,
          max: 300000,
        },
        maxConcurrent: {
          type: "number",
          required: false,
          min: 1,
          max: 10,
        },
      },
    },
    memory: {
      type: "object",
      required: false,
      schema: {
        enabled: {
          type: "boolean",
          required: true,
        },
        types: {
          type: "array",
          required: false,
          items: {
            type: "string",
            required: false,
          },
        },
        maxWorkingMemory: {
          type: "number",
          required: false,
          min: 1,
          max: 100,
          default: 20,
        },
        maxLongTermMemory: {
          type: "number",
          required: false,
          min: 10,
          max: 10000,
          default: 1000,
        },
        importanceThreshold: {
          type: "number",
          required: false,
          min: 0,
          max: 1,
          default: 0.3,
        },
        enableEmbeddings: {
          type: "boolean",
          required: false,
          default: true,
        },
        embeddingModel: {
          type: "string",
          required: false,
        },
        consolidationInterval: {
          type: "number",
          required: false,
          min: 60000,
          max: 86400000,
        },
      },
    },
    capabilities: {
      type: "array",
      required: false,
      items: {
        type: "string",
        required: false,
      },
    },
    systemPrompt: {
      type: "string",
      required: false,
      maxLength: 5000,
    },
    temperature: {
      type: "number",
      required: false,
      min: 0,
      max: 2,
      default: 0.7,
    },
    maxTokens: {
      type: "number",
      required: false,
      min: 1,
      max: 100000,
      default: 4096,
    },
    timeout: {
      type: "number",
      required: false,
      min: 1000,
      max: 600000,
      default: 60000,
    },
    retry: {
      type: "object",
      required: false,
      schema: {
        enabled: {
          type: "boolean",
          required: true,
          default: true,
        },
        maxAttempts: {
          type: "number",
          required: false,
          min: 1,
          max: 10,
          default: 3,
        },
        initialDelay: {
          type: "number",
          required: false,
          min: 100,
          max: 10000,
          default: 1000,
        },
        maxDelay: {
          type: "number",
          required: false,
          min: 1000,
          max: 60000,
          default: 30000,
        },
        backoffMultiplier: {
          type: "number",
          required: false,
          min: 1,
          max: 5,
          default: 2,
        },
        retryOnStatusCodes: {
          type: "array",
          required: false,
          items: {
            type: "number",
            required: false,
          },
          default: [429, 500, 502, 503, 504],
        },
      },
    },
    metadata: {
      type: "object",
      required: false,
    },
  };

  constructor() {
    this.validator = new ConfigValidator(AgentConfigParser.SCHEMA);
  }

  /**
   * Parse agent configuration
   */
  parse(data: any): { config: AgentConfig; errors: string[]; warnings: string[] } {
    const validation = this.validator.validate(data);

    if (!validation.valid) {
      return {
        config: data,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    const config = validation.data as AgentConfig;

    // Apply defaults
    this.applyDefaults(config);

    // Post-validation checks
    const postErrors = this.postValidate(config);

    return {
      config,
      errors: postErrors,
      warnings: validation.warnings,
    };
  }

  /**
   * Parse multiple agent configurations
   */
  parseMultiple(
    data: any[]
  ): {
    configs: AgentConfig[];
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  } {
    const configs: AgentConfig[] = [];
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    for (let i = 0; i < data.length; i++) {
      const result = this.parse(data[i]);

      if (result.errors.length > 0) {
        errors[`agent_${i}`] = result.errors;
      } else {
        configs.push(result.config);
      }

      if (result.warnings.length > 0) {
        warnings[`agent_${i}`] = result.warnings;
      }
    }

    return { configs, errors, warnings };
  }

  /**
   * Validate agent configuration
   */
  validate(config: AgentConfig): { valid: boolean; errors: string[] } {
    const validation = this.validator.validate(config);
    const postErrors = validation.valid ? this.postValidate(config) : [];

    return {
      valid: validation.valid && postErrors.length === 0,
      errors: [...validation.errors, ...postErrors],
    };
  }

  /**
   * Apply default values
   */
  private applyDefaults(config: AgentConfig): void {
    // Temperature default
    if (config.temperature === undefined) {
      config.temperature = 0.7;
    }

    // Max tokens default
    if (config.maxTokens === undefined) {
      config.maxTokens = 4096;
    }

    // Timeout default
    if (config.timeout === undefined) {
      config.timeout = 60000;
    }

    // Memory defaults
    if (config.memory && config.memory.enabled) {
      if (config.memory.maxWorkingMemory === undefined) {
        config.memory.maxWorkingMemory = 20;
      }
      if (config.memory.maxLongTermMemory === undefined) {
        config.memory.maxLongTermMemory = 1000;
      }
      if (config.memory.importanceThreshold === undefined) {
        config.memory.importanceThreshold = 0.3;
      }
      if (config.memory.enableEmbeddings === undefined) {
        config.memory.enableEmbeddings = true;
      }
    }

    // Retry defaults
    if (config.retry && config.retry.enabled) {
      if (config.retry.maxAttempts === undefined) {
        config.retry.maxAttempts = 3;
      }
      if (config.retry.initialDelay === undefined) {
        config.retry.initialDelay = 1000;
      }
      if (config.retry.maxDelay === undefined) {
        config.retry.maxDelay = 30000;
      }
      if (config.retry.backoffMultiplier === undefined) {
        config.retry.backoffMultiplier = 2;
      }
      if (config.retry.retryOnStatusCodes === undefined) {
        config.retry.retryOnStatusCodes = [429, 500, 502, 503, 504];
      }
    }

    // Tool defaults
    if (config.tools) {
      if (config.tools.allowAll === undefined) {
        config.tools.allowAll = false;
      }
      if (config.tools.maxConcurrent === undefined) {
        config.tools.maxConcurrent = 5;
      }
    }
  }

  /**
   * Post-validation checks
   */
  private postValidate(config: AgentConfig): string[] {
    const errors: string[] = [];

    // Check LLM configuration
    if (config.llm) {
      if (!config.llm.apiKey && !process.env[`${config.llm.provider.toUpperCase()}_API_KEY`]) {
        errors.push(`LLM API key not provided for provider: ${config.llm.provider}`);
      }
    }

    // Check tool configuration conflicts
    if (config.tools) {
      if (config.tools.allowAll && config.tools.disabled && config.tools.disabled.length > 0) {
        errors.push("Cannot use both 'allowAll' and 'disabled' in tool configuration");
      }

      if (config.tools.enabled && config.tools.enabled.length === 0 && !config.tools.allowAll) {
        errors.push("No tools enabled for agent");
      }
    }

    // Check memory configuration
    if (config.memory && config.memory.enabled) {
      if (config.memory.enableEmbeddings && !config.memory.embeddingModel && !config.llm) {
        errors.push("Embedding model required when embeddings are enabled");
      }
    }

    // Check capabilities
    if (config.capabilities && config.capabilities.length === 0) {
      errors.push("Agent has no capabilities defined");
    }

    return errors;
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(id: string, name: string, role: AgentRole): AgentConfig {
    return {
      id,
      name,
      role,
      type: "autonomous",
      temperature: 0.7,
      maxTokens: 4096,
      timeout: 60000,
      capabilities: [],
      tools: {
        enabled: [],
        allowAll: false,
      },
      memory: {
        enabled: true,
        maxWorkingMemory: 20,
        maxLongTermMemory: 1000,
        importanceThreshold: 0.3,
        enableEmbeddings: true,
      },
      retry: {
        enabled: true,
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryOnStatusCodes: [429, 500, 502, 503, 504],
      },
    };
  }
}
