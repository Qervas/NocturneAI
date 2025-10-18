/**
 * Tool Configuration Parser
 *
 * Parses and validates tool configuration files.
 *
 * Features:
 * - Parse tool definitions
 * - Validate tool configuration
 * - Tool parameter validation
 * - Tool permissions and security
 * - Tool dependencies
 */

import { ConfigValidator, type ValidationSchema } from "./ConfigValidator.js";

/**
 * Tool Configuration
 */
export interface ToolConfig {
  /** Tool ID */
  id: string;

  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Tool category */
  category: ToolCategory;

  /** Tool parameters */
  parameters: ToolParameter[];

  /** Required permissions */
  permissions?: string[];

  /** Tool dependencies */
  dependencies?: string[];

  /** Enable tool */
  enabled?: boolean;

  /** Tool timeout (ms) */
  timeout?: number;

  /** Max retries */
  maxRetries?: number;

  /** Dangerous tool flag */
  dangerous?: boolean;

  /** Requires confirmation */
  requiresConfirmation?: boolean;

  /** Rate limit (calls per minute) */
  rateLimit?: number;

  /** Custom configuration */
  config?: Record<string, any>;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Tool Category
 */
export type ToolCategory =
  | "file"
  | "command"
  | "git"
  | "search"
  | "analysis"
  | "web"
  | "database"
  | "custom";

/**
 * Tool Parameter
 */
export interface ToolParameter {
  /** Parameter name */
  name: string;

  /** Parameter type */
  type: ToolParameterType;

  /** Parameter description */
  description: string;

  /** Is required? */
  required: boolean;

  /** Default value */
  default?: any;

  /** Allowed values (for enum) */
  enum?: any[];

  /** Minimum value (for number) */
  min?: number;

  /** Maximum value (for number) */
  max?: number;

  /** Pattern (for string) */
  pattern?: string;

  /** Validation function */
  validator?: string;
}

/**
 * Tool Parameter Type
 */
export type ToolParameterType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "enum";

/**
 * Tool Registry Configuration
 */
export interface ToolRegistryConfig {
  /** Tools */
  tools: ToolConfig[];

  /** Global timeout */
  globalTimeout?: number;

  /** Global rate limit */
  globalRateLimit?: number;

  /** Allow dangerous tools */
  allowDangerous?: boolean;

  /** Auto-load builtin tools */
  autoLoadBuiltin?: boolean;

  /** Tool directories */
  toolDirectories?: string[];
}

/**
 * Tool Configuration Parser
 */
export class ToolConfigParser {
  private validator: ConfigValidator;

  /**
   * Tool configuration schema
   */
  private static readonly TOOL_SCHEMA: ValidationSchema = {
    id: {
      type: "string",
      required: true,
      pattern: /^[a-zA-Z0-9_-]+$/,
      description: "Tool ID",
    },
    name: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 100,
      description: "Tool name",
    },
    description: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 500,
      description: "Tool description",
    },
    category: {
      type: "enum",
      required: true,
      enum: ["file", "command", "git", "search", "analysis", "web", "database", "custom"],
      description: "Tool category",
    },
    parameters: {
      type: "array",
      required: true,
      items: {
        type: "object",
        required: true,
        schema: {
          name: {
            type: "string",
            required: true,
          },
          type: {
            type: "enum",
            required: true,
            enum: ["string", "number", "boolean", "array", "object", "enum"],
          },
          description: {
            type: "string",
            required: true,
          },
          required: {
            type: "boolean",
            required: true,
          },
          default: {
            type: "any",
            required: false,
          },
          enum: {
            type: "array",
            required: false,
          },
          min: {
            type: "number",
            required: false,
          },
          max: {
            type: "number",
            required: false,
          },
          pattern: {
            type: "string",
            required: false,
          },
          validator: {
            type: "string",
            required: false,
          },
        },
      },
    },
    permissions: {
      type: "array",
      required: false,
      items: {
        type: "string",
        required: false,
      },
    },
    dependencies: {
      type: "array",
      required: false,
      items: {
        type: "string",
        required: false,
      },
    },
    enabled: {
      type: "boolean",
      required: false,
      default: true,
    },
    timeout: {
      type: "number",
      required: false,
      min: 100,
      max: 300000,
      default: 30000,
    },
    maxRetries: {
      type: "number",
      required: false,
      min: 0,
      max: 10,
      default: 3,
    },
    dangerous: {
      type: "boolean",
      required: false,
      default: false,
    },
    requiresConfirmation: {
      type: "boolean",
      required: false,
      default: false,
    },
    rateLimit: {
      type: "number",
      required: false,
      min: 1,
      max: 1000,
    },
    config: {
      type: "object",
      required: false,
    },
    metadata: {
      type: "object",
      required: false,
    },
  };

  /**
   * Registry configuration schema
   */
  private static readonly REGISTRY_SCHEMA: ValidationSchema = {
    tools: {
      type: "array",
      required: true,
      items: {
        type: "object",
        required: true,
      },
    },
    globalTimeout: {
      type: "number",
      required: false,
      min: 1000,
      max: 600000,
      default: 60000,
    },
    globalRateLimit: {
      type: "number",
      required: false,
      min: 1,
      max: 10000,
    },
    allowDangerous: {
      type: "boolean",
      required: false,
      default: false,
    },
    autoLoadBuiltin: {
      type: "boolean",
      required: false,
      default: true,
    },
    toolDirectories: {
      type: "array",
      required: false,
      items: {
        type: "string",
        required: false,
      },
    },
  };

  constructor() {
    this.validator = new ConfigValidator(ToolConfigParser.TOOL_SCHEMA);
  }

  /**
   * Parse tool configuration
   */
  parse(data: any): { config: ToolConfig; errors: string[]; warnings: string[] } {
    const validation = this.validator.validate(data);

    if (!validation.valid) {
      return {
        config: data,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    const config = validation.data as ToolConfig;

    // Apply defaults
    this.applyDefaults(config);

    // Post-validation
    const postErrors = this.postValidate(config);

    return {
      config,
      errors: postErrors,
      warnings: validation.warnings,
    };
  }

  /**
   * Parse tool registry configuration
   */
  parseRegistry(
    data: any
  ): { config: ToolRegistryConfig; errors: string[]; warnings: string[] } {
    const registryValidator = new ConfigValidator(
      ToolConfigParser.REGISTRY_SCHEMA
    );
    const validation = registryValidator.validate(data);

    if (!validation.valid) {
      return {
        config: data,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    const config = validation.data as ToolRegistryConfig;
    const errors: string[] = [];
    const warnings: string[] = [...validation.warnings];

    // Parse individual tools
    const tools: ToolConfig[] = [];
    for (let i = 0; i < config.tools.length; i++) {
      const toolResult = this.parse(config.tools[i]);
      if (toolResult.errors.length > 0) {
        errors.push(`Tool ${i}: ${toolResult.errors.join(", ")}`);
      } else {
        tools.push(toolResult.config);
      }
      warnings.push(...toolResult.warnings.map((w) => `Tool ${i}: ${w}`));
    }

    config.tools = tools;

    return { config, errors, warnings };
  }

  /**
   * Validate tool configuration
   */
  validate(config: ToolConfig): { valid: boolean; errors: string[] } {
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
  private applyDefaults(config: ToolConfig): void {
    if (config.enabled === undefined) {
      config.enabled = true;
    }

    if (config.timeout === undefined) {
      config.timeout = 30000;
    }

    if (config.maxRetries === undefined) {
      config.maxRetries = 3;
    }

    if (config.dangerous === undefined) {
      config.dangerous = false;
    }

    if (config.requiresConfirmation === undefined) {
      config.requiresConfirmation = config.dangerous;
    }
  }

  /**
   * Post-validation checks
   */
  private postValidate(config: ToolConfig): string[] {
    const errors: string[] = [];

    // Check parameter names are unique
    const paramNames = new Set<string>();
    for (const param of config.parameters) {
      if (paramNames.has(param.name)) {
        errors.push(`Duplicate parameter name: ${param.name}`);
      }
      paramNames.add(param.name);
    }

    // Check dangerous tools require confirmation
    if (config.dangerous && !config.requiresConfirmation) {
      errors.push("Dangerous tools must require confirmation");
    }

    // Validate parameter constraints
    for (const param of config.parameters) {
      if (param.type === "enum" && (!param.enum || param.enum.length === 0)) {
        errors.push(`Parameter ${param.name}: enum type requires enum values`);
      }

      if (param.type === "number") {
        if (param.min !== undefined && param.max !== undefined && param.min > param.max) {
          errors.push(`Parameter ${param.name}: min cannot be greater than max`);
        }
      }

      if (param.required && param.default !== undefined) {
        errors.push(`Parameter ${param.name}: required parameters cannot have defaults`);
      }
    }

    return errors;
  }

  /**
   * Get default tool configuration
   */
  static getDefaultConfig(id: string, name: string, category: ToolCategory): ToolConfig {
    return {
      id,
      name,
      description: "",
      category,
      parameters: [],
      enabled: true,
      timeout: 30000,
      maxRetries: 3,
      dangerous: false,
      requiresConfirmation: false,
    };
  }
}
