/**
 * Register Tool Use Case
 *
 * High-level use case for registering custom tools in the system.
 *
 * Features:
 * - Tool validation
 * - Tool registration in registry
 * - Tool configuration
 * - Conflict detection
 * - Tool testing
 */

import type { ITool } from "../../core/interfaces/ITool.js";
import type { ToolFactory } from "../factories/ToolFactory.js";
import type { IToolRegistry } from "../../core/interfaces/ITool.js";

/**
 * Register Tool Input
 */
export interface RegisterToolInput {
  /** Tool instance to register */
  tool: ITool;

  /** Whether to validate tool before registration */
  validate?: boolean;

  /** Whether to test tool after registration */
  test?: boolean;

  /** Test arguments (if testing) */
  testArgs?: Record<string, unknown>;

  /** Whether to replace existing tool with same name */
  replace?: boolean;

  /** Tool-specific configuration overrides */
  config?: {
    enabled?: boolean;
    timeout?: number;
    retry?: {
      maxAttempts: number;
      delayMs: number;
      backoff?: "linear" | "exponential";
    };
  };
}

/**
 * Register Tool Output
 */
export interface RegisterToolOutput {
  /** Whether registration was successful */
  success: boolean;

  /** Tool name */
  toolName: string;

  /** Whether tool was replaced */
  replaced: boolean;

  /** Validation result */
  validation?: {
    valid: boolean;
    errors?: string[];
  };

  /** Test result (if tested) */
  testResult?: {
    success: boolean;
    data?: unknown;
    error?: string;
    executionTime?: number;
  };

  /** Error message if failed */
  error?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Register Tool Use Case
 */
export class RegisterTool {
  private toolFactory: ToolFactory;
  private registry: IToolRegistry;

  constructor(toolFactory: ToolFactory) {
    this.toolFactory = toolFactory;
    this.registry = toolFactory.getRegistry();
  }

  /**
   * Execute the use case
   */
  async execute(input: RegisterToolInput): Promise<RegisterToolOutput> {
    try {
      // Validate input
      this.validateInput(input);

      const toolName = input.tool.name;

      // Check if tool already exists
      const existingTool = this.registry.get(toolName);
      const willReplace = existingTool !== undefined;

      // If tool exists and replace is false, throw error
      if (existingTool && input.replace !== true) {
        throw new Error(
          `Tool "${toolName}" already exists. Set replace=true to replace it.`,
        );
      }

      // Validate tool if requested
      let validationResult:
        | { valid: boolean; errors?: string[] }
        | undefined;
      if (input.validate !== false) {
        validationResult = await this.validateTool(input.tool);
        if (!validationResult.valid) {
          return {
            success: false,
            toolName,
            replaced: false,
            validation: validationResult,
            error: `Tool validation failed: ${validationResult.errors?.join(", ")}`,
          };
        }
      }

      // Unregister existing tool if replacing
      if (willReplace) {
        this.registry.unregister(toolName);
      }

      // Apply configuration overrides
      if (input.config) {
        this.applyConfig(input.tool, input.config);
      }

      // Register tool
      this.toolFactory.registerTool(input.tool);

      // Test tool if requested
      let testResult:
        | {
            success: boolean;
            data?: unknown;
            error?: string;
            executionTime?: number;
          }
        | undefined;
      if (input.test && input.testArgs) {
        testResult = await this.testTool(input.tool, input.testArgs);
        if (!testResult.success) {
          // Unregister if test fails
          this.registry.unregister(toolName);
          return {
            success: false,
            toolName,
            replaced: false,
            validation: validationResult,
            testResult,
            error: `Tool test failed: ${testResult.error}`,
          };
        }
      }

      return {
        success: true,
        toolName,
        replaced: willReplace,
        validation: validationResult,
        testResult,
        metadata: {
          category: input.tool.metadata.category,
          version: input.tool.metadata.version,
          author: input.tool.metadata.author,
          tags: input.tool.metadata.tags,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        toolName: input.tool?.name || "unknown",
        replaced: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate input
   */
  private validateInput(input: RegisterToolInput): void {
    if (!input.tool) {
      throw new Error("Tool is required");
    }

    if (!input.tool.name || input.tool.name.trim().length === 0) {
      throw new Error("Tool must have a name");
    }

    if (!input.tool.description || input.tool.description.trim().length === 0) {
      throw new Error("Tool must have a description");
    }

    if (typeof input.tool.execute !== "function") {
      throw new Error("Tool must have an execute method");
    }

    if (typeof input.tool.getDefinition !== "function") {
      throw new Error("Tool must have a getDefinition method");
    }

    if (input.test && !input.testArgs) {
      throw new Error("Test arguments are required when test=true");
    }
  }

  /**
   * Validate tool
   */
  private async validateTool(
    tool: ITool,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Validate name format
    if (!/^[a-z_][a-z0-9_]*$/.test(tool.name)) {
      errors.push(
        "Tool name must start with lowercase letter or underscore and contain only lowercase letters, numbers, and underscores",
      );
    }

    // Validate description length
    if (tool.description.length < 10) {
      errors.push("Tool description must be at least 10 characters");
    }

    if (tool.description.length > 1000) {
      errors.push("Tool description must be less than 1000 characters");
    }

    // Validate metadata
    if (!tool.metadata) {
      errors.push("Tool must have metadata");
    } else {
      if (!tool.metadata.version) {
        errors.push("Tool metadata must include version");
      }
    }

    // Validate config
    if (!tool.config) {
      errors.push("Tool must have config");
    }

    // Try to get definition
    try {
      const definition = tool.getDefinition();
      if (!definition.name || !definition.description) {
        errors.push("Tool definition must include name and description");
      }
    } catch (error) {
      errors.push(`Failed to get tool definition: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Test tool
   */
  private async testTool(
    tool: ITool,
    args: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    executionTime?: number;
  }> {
    try {
      const startTime = Date.now();

      // Validate arguments
      const validation = tool.validate(args);
      if (validation !== true) {
        return {
          success: false,
          error: `Argument validation failed: ${validation}`,
        };
      }

      // Execute tool
      const result = await tool.execute(args, {
        cwd: process.cwd(),
        timeout: 5000, // 5 second timeout for tests
        dryRun: true, // Run in dry-run mode for safety
      });

      const executionTime = Date.now() - startTime;

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Apply configuration to tool
   */
  private applyConfig(tool: ITool, config: RegisterToolInput["config"]): void {
    if (!config) {
      return;
    }

    const currentConfig = tool.config;

    tool.config = {
      ...currentConfig,
      enabled: config.enabled ?? currentConfig.enabled,
      timeout: config.timeout ?? currentConfig.timeout,
      retry: config.retry
        ? { ...(currentConfig.retry || {}), ...config.retry }
        : currentConfig.retry,
    };

    // Set enabled status
    if (config.enabled !== undefined) {
      if (config.enabled) {
        tool.enable();
      } else {
        tool.disable();
      }
    }
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ITool[] {
    return this.registry.getAll();
  }

  /**
   * Get tool by name
   */
  getTool(name: string): ITool | undefined {
    return this.registry.get(name);
  }

  /**
   * Unregister tool
   */
  unregisterTool(name: string): boolean {
    return this.registry.unregister(name);
  }

  /**
   * Check if tool is registered
   */
  hasToolRegistered(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalTools: number;
    enabledTools: number;
    disabledTools: number;
    toolsByCategory: Record<string, number>;
  } {
    return this.registry.getStats();
  }
}
