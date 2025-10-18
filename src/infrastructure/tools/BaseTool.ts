/**
 * Base Tool
 *
 * Abstract base class for all tools in the NocturneAI system.
 * Provides common functionality for tool implementations.
 *
 * Features:
 * - Statistics tracking
 * - Enable/disable functionality
 * - Configuration management
 * - Validation helpers
 * - Execution timing
 * - Error handling
 */

import type {
  ITool,
  ToolContext,
  ToolResult,
  ToolMetadata,
  ToolStats,
  ToolConfig,
} from "../../core/interfaces/ITool.js";
import type { ToolDefinition } from "../../core/types/llm.types.js";

/**
 * Base Tool Configuration
 */
export interface BaseToolConfig extends ToolConfig {
  enabled: boolean;
  timeout?: number;
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoff?: "linear" | "exponential";
  };
}

/**
 * Default tool configuration
 */
const DEFAULT_CONFIG: BaseToolConfig = {
  enabled: true,
  timeout: 30000, // 30 seconds
  retry: {
    maxAttempts: 1,
    delayMs: 0,
    backoff: "linear",
  },
};

/**
 * Base Tool Abstract Class
 */
export abstract class BaseTool implements ITool {
  public readonly name: string;
  public readonly description: string;
  public readonly metadata: ToolMetadata;
  public config: BaseToolConfig;

  // Statistics
  protected stats: ToolStats = {
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    averageExecutionTime: 0,
    lastExecuted: undefined,
    lastError: undefined,
  };

  // Execution times for average calculation
  private executionTimes: number[] = [];
  private readonly maxExecutionTimeSamples = 100;

  constructor(
    name: string,
    description: string,
    metadata: Partial<ToolMetadata> = {},
    config: Partial<BaseToolConfig> = {},
  ) {
    this.name = name;
    this.description = description;
    this.metadata = {
      version: "1.0.0",
      category: "general",
      tags: [],
      requiresConfirmation: false,
      hasSideEffects: false,
      ...metadata,
    };
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get tool definition for LLM
   * Must be implemented by subclasses
   */
  abstract getDefinition(): ToolDefinition;

  /**
   * Execute the tool (internal implementation)
   * Must be implemented by subclasses
   */
  protected abstract executeInternal(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult>;

  /**
   * Execute the tool with timing, error handling, and retry logic
   */
  async execute(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    // Check if tool is enabled
    if (!this.isEnabled()) {
      return {
        success: false,
        error: `Tool "${this.name}" is disabled`,
        metadata: {
          toolName: this.name,
          toolVersion: this.metadata.version,
        },
      };
    }

    // Validate arguments
    const validationResult = this.validate(args);
    if (validationResult !== true) {
      return {
        success: false,
        error: `Validation failed: ${validationResult}`,
        metadata: {
          toolName: this.name,
          toolVersion: this.metadata.version,
        },
      };
    }

    // Check for dry run
    if (context?.dryRun) {
      return {
        success: true,
        data: { message: "Dry run - tool not actually executed" },
        metadata: {
          toolName: this.name,
          toolVersion: this.metadata.version,
          dryRun: true,
        },
      };
    }

    // Execute with retry logic
    const maxAttempts = this.config.retry?.maxAttempts || 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const startTime = Date.now();

        // Execute with timeout
        const result = await this.executeWithTimeout(args, context);

        const executionTime = Date.now() - startTime;

        // Update statistics on success
        this.updateStatsOnSuccess(executionTime);

        // Add metadata to result
        result.metadata = {
          ...result.metadata,
          executionTime,
          toolName: this.name,
          toolVersion: this.metadata.version,
        };

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If not the last attempt and retry is configured
        if (attempt < maxAttempts && this.config.retry) {
          const delay = this.calculateRetryDelay(
            attempt,
            this.config.retry.delayMs,
            this.config.retry.backoff || "linear",
          );
          await this.sleep(delay);
          continue;
        }

        // Update statistics on failure
        this.updateStatsOnFailure(lastError.message);

        return {
          success: false,
          error: lastError.message,
          metadata: {
            toolName: this.name,
            toolVersion: this.metadata.version,
            attempts: attempt,
          },
        };
      }
    }

    // Should never reach here, but for type safety
    return {
      success: false,
      error: lastError?.message || "Unknown error",
      metadata: {
        toolName: this.name,
        toolVersion: this.metadata.version,
      },
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const timeout = context?.timeout || this.config.timeout || 30000;

    return Promise.race([
      this.executeInternal(args, context),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Tool execution timed out after ${timeout}ms`,
              ),
            ),
          timeout,
        ),
      ),
    ]);
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(
    attempt: number,
    baseDelay: number,
    backoff: "linear" | "exponential",
  ): number {
    if (backoff === "exponential") {
      return baseDelay * Math.pow(2, attempt - 1);
    }
    return baseDelay * attempt;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate tool arguments
   * Can be overridden by subclasses for custom validation
   */
  validate(args: Record<string, unknown>): boolean | string {
    if (!args || typeof args !== "object") {
      return "Arguments must be an object";
    }
    return true;
  }

  /**
   * Get tool statistics
   */
  getStats(): ToolStats {
    return { ...this.stats };
  }

  /**
   * Reset tool statistics
   */
  resetStats(): void {
    this.stats = {
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      lastExecuted: undefined,
      lastError: undefined,
    };
    this.executionTimes = [];
  }

  /**
   * Enable the tool
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable the tool
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Check if tool is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Update statistics on successful execution
   */
  protected updateStatsOnSuccess(executionTime: number): void {
    this.stats.executionCount++;
    this.stats.successCount++;
    this.stats.lastExecuted = Date.now();

    // Track execution time
    this.executionTimes.push(executionTime);
    if (this.executionTimes.length > this.maxExecutionTimeSamples) {
      this.executionTimes.shift();
    }

    // Calculate average
    const sum = this.executionTimes.reduce((a, b) => a + b, 0);
    this.stats.averageExecutionTime = sum / this.executionTimes.length;
  }

  /**
   * Update statistics on failed execution
   */
  protected updateStatsOnFailure(error: string): void {
    this.stats.executionCount++;
    this.stats.failureCount++;
    this.stats.lastExecuted = Date.now();
    this.stats.lastError = error;
  }

  /**
   * Helper: Check if required argument exists
   */
  protected requireArg(
    args: Record<string, unknown>,
    name: string,
  ): boolean | string {
    if (!(name in args)) {
      return `Missing required argument: ${name}`;
    }
    if (args[name] === undefined || args[name] === null) {
      return `Argument "${name}" cannot be null or undefined`;
    }
    return true;
  }

  /**
   * Helper: Check if argument is of expected type
   */
  protected checkArgType(
    args: Record<string, unknown>,
    name: string,
    expectedType: string,
  ): boolean | string {
    const value = args[name];
    const actualType = typeof value;

    if (actualType !== expectedType) {
      return `Argument "${name}" must be of type ${expectedType}, got ${actualType}`;
    }
    return true;
  }

  /**
   * Helper: Validate string argument
   */
  protected validateString(
    args: Record<string, unknown>,
    name: string,
    options?: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
    },
  ): boolean | string {
    if (options?.required) {
      const required = this.requireArg(args, name);
      if (required !== true) return required;
    }

    if (args[name] === undefined) {
      return true; // Optional
    }

    const typeCheck = this.checkArgType(args, name, "string");
    if (typeCheck !== true) return typeCheck;

    const value = args[name] as string;

    if (options?.minLength && value.length < options.minLength) {
      return `Argument "${name}" must be at least ${options.minLength} characters`;
    }

    if (options?.maxLength && value.length > options.maxLength) {
      return `Argument "${name}" must be at most ${options.maxLength} characters`;
    }

    if (options?.pattern && !options.pattern.test(value)) {
      return `Argument "${name}" does not match required pattern`;
    }

    return true;
  }

  /**
   * Helper: Validate number argument
   */
  protected validateNumber(
    args: Record<string, unknown>,
    name: string,
    options?: {
      required?: boolean;
      min?: number;
      max?: number;
      integer?: boolean;
    },
  ): boolean | string {
    if (options?.required) {
      const required = this.requireArg(args, name);
      if (required !== true) return required;
    }

    if (args[name] === undefined) {
      return true; // Optional
    }

    const typeCheck = this.checkArgType(args, name, "number");
    if (typeCheck !== true) return typeCheck;

    const value = args[name] as number;

    if (isNaN(value)) {
      return `Argument "${name}" must be a valid number`;
    }

    if (options?.integer && !Number.isInteger(value)) {
      return `Argument "${name}" must be an integer`;
    }

    if (options?.min !== undefined && value < options.min) {
      return `Argument "${name}" must be at least ${options.min}`;
    }

    if (options?.max !== undefined && value > options.max) {
      return `Argument "${name}" must be at most ${options.max}`;
    }

    return true;
  }

  /**
   * Helper: Validate boolean argument
   */
  protected validateBoolean(
    args: Record<string, unknown>,
    name: string,
    options?: { required?: boolean },
  ): boolean | string {
    if (options?.required) {
      const required = this.requireArg(args, name);
      if (required !== true) return required;
    }

    if (args[name] === undefined) {
      return true; // Optional
    }

    const typeCheck = this.checkArgType(args, name, "boolean");
    if (typeCheck !== true) return typeCheck;

    return true;
  }

  /**
   * Helper: Validate array argument
   */
  protected validateArray(
    args: Record<string, unknown>,
    name: string,
    options?: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
    },
  ): boolean | string {
    if (options?.required) {
      const required = this.requireArg(args, name);
      if (required !== true) return required;
    }

    if (args[name] === undefined) {
      return true; // Optional
    }

    const value = args[name];
    if (!Array.isArray(value)) {
      return `Argument "${name}" must be an array`;
    }

    if (options?.minLength && value.length < options.minLength) {
      return `Argument "${name}" must have at least ${options.minLength} items`;
    }

    if (options?.maxLength && value.length > options.maxLength) {
      return `Argument "${name}" must have at most ${options.maxLength} items`;
    }

    return true;
  }

  /**
   * Helper: Create success result
   */
  protected success(data?: unknown, metadata?: Record<string, unknown>): ToolResult {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Helper: Create error result
   */
  protected error(error: string, metadata?: Record<string, unknown>): ToolResult {
    return {
      success: false,
      error,
      metadata,
    };
  }
}
