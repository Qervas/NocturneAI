/**
 * Base Command
 *
 * Abstract base class for all CLI commands.
 *
 * Features:
 * - Common command infrastructure
 * - Error handling and logging
 * - Progress reporting
 * - Configuration management
 * - Dependency injection support
 */

import type { Command } from "commander";
import chalk from "chalk";

/**
 * Command Options
 */
export interface CommandOptions {
  /** Enable verbose output */
  verbose?: boolean;

  /** Suppress output */
  quiet?: boolean;

  /** Enable debug mode */
  debug?: boolean;

  /** Output format */
  format?: "text" | "json" | "yaml";

  /** Configuration file path */
  config?: string;

  /** Working directory */
  cwd?: string;
}

/**
 * Command Result
 */
export interface CommandResult<T = any> {
  /** Whether command succeeded */
  success: boolean;

  /** Result data */
  data?: T;

  /** Error message (if failed) */
  error?: string;

  /** Error details */
  errorDetails?: any;

  /** Execution time (ms) */
  executionTime?: number;
}

/**
 * Command Context
 */
export interface CommandContext {
  /** Current working directory */
  cwd: string;

  /** Command options */
  options: CommandOptions;

  /** Start time */
  startTime: number;

  /** Configuration */
  config?: any;
}

/**
 * Base Command
 *
 * Abstract base class for implementing CLI commands
 */
export abstract class BaseCommand {
  protected name: string;
  protected description: string;
  protected context?: CommandContext;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  /**
   * Register command with Commander
   */
  abstract register(program: Command): void;

  /**
   * Execute command
   */
  protected abstract execute(
    context: CommandContext,
    ...args: any[]
  ): Promise<CommandResult>;

  /**
   * Run command with context setup
   */
  protected async run(
    options: CommandOptions,
    ...args: any[]
  ): Promise<CommandResult> {
    const startTime = Date.now();

    // Create command context
    const context: CommandContext = {
      cwd: options.cwd || process.cwd(),
      options,
      startTime,
    };

    this.context = context;

    try {
      // Execute command
      const result = await this.execute(context, ...args);

      // Add execution time
      result.executionTime = Date.now() - startTime;

      // Handle result output
      if (!options.quiet) {
        this.handleResult(result);
      }

      return result;
    } catch (error) {
      const errorResult: CommandResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
        executionTime: Date.now() - startTime,
      };

      if (!options.quiet) {
        this.handleError(error);
      }

      return errorResult;
    }
  }

  /**
   * Handle successful result
   */
  protected handleResult(result: CommandResult): void {
    if (this.context?.options.format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.success) {
      this.success("Command completed successfully");
      if (result.data && this.context?.options.verbose) {
        console.log(result.data);
      }
    }
  }

  /**
   * Handle error
   */
  protected handleError(error: any): void {
    const message = error instanceof Error ? error.message : String(error);
    this.error(`Command failed: ${message}`);

    if (this.context?.options.debug && error instanceof Error && error.stack) {
      console.error(chalk.gray(error.stack));
    }
  }

  /**
   * Log info message
   */
  protected info(message: string): void {
    if (!this.context?.options.quiet) {
      console.log(chalk.blue("ℹ"), message);
    }
  }

  /**
   * Log success message
   */
  protected success(message: string): void {
    if (!this.context?.options.quiet) {
      console.log(chalk.green("✓"), message);
    }
  }

  /**
   * Log warning message
   */
  protected warn(message: string): void {
    if (!this.context?.options.quiet) {
      console.warn(chalk.yellow("⚠"), message);
    }
  }

  /**
   * Log error message
   */
  protected error(message: string): void {
    console.error(chalk.red("✗"), message);
  }

  /**
   * Log debug message
   */
  protected debug(message: string): void {
    if (this.context?.options.debug) {
      console.log(chalk.gray("🐛"), chalk.gray(message));
    }
  }

  /**
   * Log verbose message
   */
  protected verbose(message: string): void {
    if (this.context?.options.verbose) {
      console.log(chalk.gray(message));
    }
  }

  /**
   * Display spinner with message
   */
  protected spinner(message: string): {
    succeed: (msg?: string) => void;
    fail: (msg?: string) => void;
    warn: (msg?: string) => void;
    info: (msg?: string) => void;
    stop: () => void;
  } {
    // Simple implementation - can be enhanced with actual spinner
    console.log(chalk.blue("⟳"), message);

    return {
      succeed: (msg?: string) => this.success(msg || message),
      fail: (msg?: string) => this.error(msg || message),
      warn: (msg?: string) => this.warn(msg || message),
      info: (msg?: string) => this.info(msg || message),
      stop: () => {},
    };
  }

  /**
   * Prompt user for input
   */
  protected async prompt(
    question: string,
    defaultValue?: string
  ): Promise<string> {
    // Simple implementation using readline
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      const promptText = defaultValue
        ? `${question} (${defaultValue}): `
        : `${question}: `;

      rl.question(promptText, (answer) => {
        rl.close();
        resolve(answer || defaultValue || "");
      });
    });
  }

  /**
   * Prompt user for confirmation
   */
  protected async confirm(
    question: string,
    defaultValue: boolean = false
  ): Promise<boolean> {
    const answer = await this.prompt(
      `${question} (y/n)`,
      defaultValue ? "y" : "n"
    );
    return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
  }

  /**
   * Display table
   */
  protected table(data: any[], columns?: string[]): void {
    if (data.length === 0) {
      this.info("No data to display");
      return;
    }

    // Simple table implementation
    const cols = columns || Object.keys(data[0]);
    const widths = cols.map((col) =>
      Math.max(
        col.length,
        ...data.map((row) => String(row[col] || "").length)
      )
    );

    // Header
    console.log(
      cols.map((col, i) => col.padEnd(widths[i])).join("  ")
    );
    console.log(widths.map((w) => "-".repeat(w)).join("  "));

    // Rows
    data.forEach((row) => {
      console.log(
        cols.map((col, i) => String(row[col] || "").padEnd(widths[i])).join("  ")
      );
    });
  }

  /**
   * Display list
   */
  protected list(items: string[], prefix: string = "•"): void {
    items.forEach((item) => {
      console.log(`${prefix} ${item}`);
    });
  }

  /**
   * Exit with code
   */
  protected exit(code: number = 0): never {
    process.exit(code);
  }

  /**
   * Get command name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get command description
   */
  getDescription(): string {
    return this.description;
  }
}
