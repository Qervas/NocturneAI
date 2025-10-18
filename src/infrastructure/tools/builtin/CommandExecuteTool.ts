/**
 * Command Execute Tool
 *
 * Execute shell commands with comprehensive safety features and output handling.
 *
 * Features:
 * - Execute commands with arguments
 * - Timeout support
 * - Working directory control
 * - Environment variable management
 * - Exit code handling
 * - Output capture (stdout/stderr)
 * - Command whitelisting/blacklisting
 * - Path restrictions
 * - Resource limits
 */

import { spawn, exec } from "child_process";
import { resolve, isAbsolute } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
} from "../../../core/interfaces/ITool.js";

/**
 * Command Execute Tool Configuration
 */
export interface CommandExecuteToolConfig extends BaseToolConfig {
  /** Base directory for command execution */
  baseDirectory?: string;

  /** Whether to allow absolute paths */
  allowAbsolutePaths?: boolean;

  /** Default timeout in milliseconds */
  defaultTimeout?: number;

  /** Maximum output size in bytes */
  maxOutputSize?: number;

  /** Allowed commands (whitelist) */
  allowedCommands?: string[];

  /** Blocked commands (blacklist) */
  blockedCommands?: string[];

  /** Blocked patterns in commands */
  blockedPatterns?: string[];

  /** Whether to allow shell execution */
  allowShell?: boolean;

  /** Maximum execution time in milliseconds */
  maxExecutionTime?: number;

  /** Environment variables to always include */
  defaultEnv?: Record<string, string>;
}

/**
 * Command Execute Tool Arguments
 */
export interface CommandExecuteArgs {
  /** Command to execute */
  command: string;

  /** Command arguments */
  args?: string[];

  /** Working directory */
  cwd?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Whether to use shell */
  shell?: boolean;

  /** Whether to capture stderr separately */
  captureStderr?: boolean;

  /** Input to pass to stdin */
  stdin?: string;
}

/**
 * Command Execute Tool Result
 */
export interface CommandExecuteResult {
  /** Exit code */
  exitCode: number;

  /** Standard output */
  stdout: string;

  /** Standard error (if captured separately) */
  stderr?: string;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Command that was executed */
  command: string;

  /** Working directory */
  cwd: string;

  /** Whether execution was killed due to timeout */
  timedOut: boolean;

  /** Signal that terminated the process (if any) */
  signal?: string;
}

/**
 * Command Execute Tool
 */
export class CommandExecuteTool extends BaseTool {
  private readonly cmdConfig: CommandExecuteToolConfig;

  constructor(config: Partial<CommandExecuteToolConfig> = {}) {
    super(
      "command_execute",
      "Execute a shell command with safety controls and output capture",
      {
        version: "1.0.0",
        category: "system",
        tags: ["command", "shell", "execute", "system"],
        requiresConfirmation: true,
        hasSideEffects: true,
      },
      config,
    );

    this.cmdConfig = {
      ...this.config,
      baseDirectory: config.baseDirectory,
      allowAbsolutePaths: config.allowAbsolutePaths !== false,
      defaultTimeout: config.defaultTimeout || 30000, // 30 seconds
      maxOutputSize: config.maxOutputSize || 10 * 1024 * 1024, // 10MB
      allowedCommands: config.allowedCommands,
      blockedCommands: config.blockedCommands || [
        "rm",
        "rmdir",
        "del",
        "format",
        "mkfs",
        "dd",
        "shutdown",
        "reboot",
        "halt",
        "poweroff",
        "init",
      ],
      blockedPatterns: config.blockedPatterns || [
        "rm -rf /",
        ":(){ :|:& };:",
        "mkfs",
        "> /dev/sda",
        "dd if=",
      ],
      allowShell: config.allowShell !== false,
      maxExecutionTime: config.maxExecutionTime || 60000, // 60 seconds
      defaultEnv: config.defaultEnv || {},
    };
  }

  /**
   * Get tool definition for LLM
   */
  getDefinition(): ToolDefinition {
    return {
      type: "function",
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Command to execute (e.g., 'ls', 'git', 'npm')",
          },
          args: {
            type: "array",
            description: "Array of command arguments",
            items: {
              type: "string",
            },
          },
          cwd: {
            type: "string",
            description: "Working directory for command execution",
          },
          env: {
            type: "object",
            description: "Environment variables to set for the command",
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 30000)",
          },
          shell: {
            type: "boolean",
            description: "Whether to execute command through shell",
          },
          captureStderr: {
            type: "boolean",
            description: "Whether to capture stderr separately from stdout",
          },
          stdin: {
            type: "string",
            description: "Input to pass to command's stdin",
          },
        },
        required: ["command"],
      },
    };
  }

  /**
   * Validate arguments
   */
  validate(args: Record<string, unknown>): boolean | string {
    // Validate command
    const commandValidation = this.validateString(args, "command", {
      required: true,
      minLength: 1,
    });
    if (commandValidation !== true) return commandValidation;

    // Validate command is not blocked
    const command = args.command as string;
    if (this.isCommandBlocked(command)) {
      return `Command is blocked for security reasons: ${command}`;
    }

    // Validate command is allowed (if whitelist exists)
    if (
      this.cmdConfig.allowedCommands &&
      this.cmdConfig.allowedCommands.length > 0
    ) {
      const commandName = command.split(/\s+/)[0];
      if (!this.cmdConfig.allowedCommands.includes(commandName)) {
        return `Command not in allowed list: ${commandName}`;
      }
    }

    // Validate args if provided
    if (args.args !== undefined) {
      const argsValidation = this.validateArray(args, "args");
      if (argsValidation !== true) return argsValidation;

      // Validate each arg is a string
      const argsArray = args.args as unknown[];
      for (let i = 0; i < argsArray.length; i++) {
        if (typeof argsArray[i] !== "string") {
          return `Argument at index ${i} must be a string`;
        }
      }
    }

    // Validate cwd if provided
    if (args.cwd !== undefined) {
      const cwdValidation = this.validateString(args, "cwd", {
        minLength: 1,
      });
      if (cwdValidation !== true) return cwdValidation;
    }

    // Validate env if provided
    if (args.env !== undefined) {
      if (typeof args.env !== "object" || Array.isArray(args.env)) {
        return "env must be an object";
      }
    }

    // Validate timeout if provided
    if (args.timeout !== undefined) {
      const timeoutValidation = this.validateNumber(args, "timeout", {
        min: 100,
        max: this.cmdConfig.maxExecutionTime,
        integer: true,
      });
      if (timeoutValidation !== true) return timeoutValidation;
    }

    // Validate boolean flags
    const shellValidation = this.validateBoolean(args, "shell");
    if (shellValidation !== true) return shellValidation;

    const stderrValidation = this.validateBoolean(args, "captureStderr");
    if (stderrValidation !== true) return stderrValidation;

    // Validate stdin if provided
    if (args.stdin !== undefined) {
      const stdinValidation = this.validateString(args, "stdin");
      if (stdinValidation !== true) return stdinValidation;
    }

    return true;
  }

  /**
   * Execute the tool
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as unknown as CommandExecuteArgs;

    try {
      // Resolve working directory
      const cwd = this.resolvePath(typedArgs.cwd || ".", context);

      // Check if path is allowed
      if (
        !this.cmdConfig.allowAbsolutePaths &&
        typedArgs.cwd &&
        isAbsolute(typedArgs.cwd)
      ) {
        return this.error("Absolute paths are not allowed");
      }

      // Check if shell execution is allowed
      if (typedArgs.shell && !this.cmdConfig.allowShell) {
        return this.error("Shell execution is not allowed by configuration");
      }

      // Prepare environment variables
      const env: Record<string, string> = {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            ([_, v]) => v !== undefined,
          ) as Array<[string, string]>,
        ),
        ...this.cmdConfig.defaultEnv,
        ...typedArgs.env,
      };

      // Get timeout
      const timeout = typedArgs.timeout || this.cmdConfig.defaultTimeout!;

      // Execute command
      const startTime = Date.now();
      let result: CommandExecuteResult;

      if (typedArgs.shell || !typedArgs.args) {
        // Execute with shell
        result = await this.executeWithShell(
          typedArgs.command,
          typedArgs.args,
          cwd,
          env,
          timeout,
          typedArgs.stdin,
        );
      } else {
        // Execute without shell (safer)
        result = await this.executeWithSpawn(
          typedArgs.command,
          typedArgs.args,
          cwd,
          env,
          timeout,
          typedArgs.captureStderr || false,
          typedArgs.stdin,
        );
      }

      const executionTime = Date.now() - startTime;
      result.executionTime = executionTime;

      // Check output size
      const totalOutput = result.stdout.length + (result.stderr?.length || 0);
      if (totalOutput > this.cmdConfig.maxOutputSize!) {
        return this.error(
          `Output size (${totalOutput} bytes) exceeds maximum allowed size (${this.cmdConfig.maxOutputSize} bytes)`,
        );
      }

      return this.success(result, {
        exitCode: result.exitCode,
        executionTime,
        timedOut: result.timedOut,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.error(`Command execution failed: ${message}`);
    }
  }

  /**
   * Execute command with shell
   */
  private async executeWithShell(
    command: string,
    args: string[] | undefined,
    cwd: string,
    env: Record<string, string>,
    timeout: number,
    stdin?: string,
  ): Promise<CommandExecuteResult> {
    const fullCommand = args ? `${command} ${args.join(" ")}` : command;

    return new Promise((resolve) => {
      let timedOut = false;
      let stdout = "";
      let stderr = "";

      const child = exec(
        fullCommand,
        {
          cwd,
          env,
          timeout,
          maxBuffer: this.cmdConfig.maxOutputSize,
        },
        (error, stdoutData, stderrData) => {
          stdout = stdoutData;
          stderr = stderrData;

          if (error) {
            if (error.killed) {
              timedOut = true;
            }

            // Don't reject on non-zero exit codes
            resolve({
              exitCode: error.code || 1,
              stdout,
              stderr,
              executionTime: 0,
              command: fullCommand,
              cwd,
              timedOut,
              signal: error.signal || undefined,
            });
          } else {
            resolve({
              exitCode: 0,
              stdout,
              stderr,
              executionTime: 0,
              command: fullCommand,
              cwd,
              timedOut: false,
            });
          }
        },
      );

      // Pass stdin if provided
      if (stdin && child.stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }
    });
  }

  /**
   * Execute command with spawn (no shell)
   */
  private async executeWithSpawn(
    command: string,
    args: string[],
    cwd: string,
    env: Record<string, string>,
    timeout: number,
    captureStderr: boolean,
    stdin?: string,
  ): Promise<CommandExecuteResult> {
    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let timeoutHandle: NodeJS.Timeout | undefined;

      const child = spawn(command, args, {
        cwd,
        env,
        stdio: ["pipe", "pipe", captureStderr ? "pipe" : "pipe"],
      });

      // Set timeout
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, 5000);
      }, timeout);

      // Capture stdout
      child.stdout?.on("data", (data) => {
        stdout += data.toString();
        if (stdout.length > this.cmdConfig.maxOutputSize!) {
          child.kill("SIGTERM");
        }
      });

      // Capture stderr
      if (captureStderr && child.stderr) {
        child.stderr.on("data", (data) => {
          stderr += data.toString();
          if (stderr.length > this.cmdConfig.maxOutputSize!) {
            child.kill("SIGTERM");
          }
        });
      }

      // Handle errors
      child.on("error", (error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        reject(error);
      });

      // Handle exit
      child.on("close", (code, signal) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);

        resolve({
          exitCode: code || 0,
          stdout,
          stderr: captureStderr ? stderr : undefined,
          executionTime: 0,
          command: `${command} ${args.join(" ")}`,
          cwd,
          timedOut,
          signal: signal || undefined,
        });
      });

      // Pass stdin if provided
      if (stdin && child.stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }
    });
  }

  /**
   * Check if command is blocked
   */
  private isCommandBlocked(command: string): boolean {
    // Check blocked commands
    const commandName = command.split(/\s+/)[0];
    if (this.cmdConfig.blockedCommands?.includes(commandName)) {
      return true;
    }

    // Check blocked patterns
    if (this.cmdConfig.blockedPatterns) {
      for (const pattern of this.cmdConfig.blockedPatterns) {
        if (command.includes(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Resolve path
   */
  private resolvePath(path: string, context?: ToolContext): string {
    // If absolute path, return as-is
    if (isAbsolute(path)) {
      return path;
    }

    // Use context cwd if available
    if (context?.cwd) {
      return resolve(context.cwd, path);
    }

    // Use configured base directory
    if (this.cmdConfig.baseDirectory) {
      return resolve(this.cmdConfig.baseDirectory, path);
    }

    // Use process cwd as fallback
    return resolve(process.cwd(), path);
  }
}
