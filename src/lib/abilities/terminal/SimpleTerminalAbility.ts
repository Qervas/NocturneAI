import { abilityManager } from "../../services/core/AbilityManager";

export interface TerminalCommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  command: string;
  executionTime?: number;
}

export interface TerminalConfig {
  allowedCommands: string[];
  blockedCommands: string[];
  maxExecutionTime: number; // in milliseconds
  workingDirectory: string;
  environment: Record<string, string>;
}

// Default configuration - very restrictive for security
export const DEFAULT_TERMINAL_CONFIG: TerminalConfig = {
  allowedCommands: [
    "ls",
    "dir",
    "pwd",
    "cd",
    "cat",
    "type",
    "echo",
    "mkdir",
    "rmdir",
    "cp",
    "copy",
    "mv",
    "move",
    "rm",
    "del",
    "touch",
    "find",
    "grep",
    "head",
    "tail",
    "wc",
    "sort",
    "uniq",
    "diff",
    "git",
    "npm",
    "node",
    "python",
    "python3",
    "pip",
    "pip3",
    "npx",
    "yarn",
  ],
  blockedCommands: [
    "sudo",
    "su",
    "rm -rf",
    "format",
    "fdisk",
    "dd",
    "mkfs",
    "shutdown",
    "reboot",
    "halt",
    "poweroff",
    "init",
    "systemctl",
  ],
  maxExecutionTime: 30000, // 30 seconds
  workingDirectory: "./workspace",
  environment: {
    NODE_ENV: "development",
    PYTHONPATH: "./workspace",
  },
};

export class SimpleTerminalAbility {
  id = "terminal";
  name = "Simple Terminal";
  description = "Execute terminal commands in a controlled environment";
  category = "system";
  config: TerminalConfig;

  constructor(config: Partial<TerminalConfig> = {}) {
    this.config = { ...DEFAULT_TERMINAL_CONFIG, ...config };
  }

  canExecute(agentId: string, params?: any): boolean {
    if (!params?.command) {
      return false;
    }

    const command = params.command.trim();
    if (!command) {
      return false;
    }

    // Check if command is blocked
    for (const blocked of this.config.blockedCommands) {
      if (command.includes(blocked)) {
        return false;
      }
    }

    // Check if command is allowed (basic check)
    const baseCommand = command.split(" ")[0];
    return this.config.allowedCommands.includes(baseCommand);
  }

  async execute(agentId: string, params?: any): Promise<TerminalCommandResult> {
    const startTime = Date.now();

    try {
      const { command, workingDir } = params;

      if (!command) {
        return {
          success: false,
          error: "No command provided",
          command: "",
        };
      }

      const trimmedCommand = command.trim();
      if (!trimmedCommand) {
        return {
          success: false,
          error: "Empty command provided",
          command: "",
        };
      }

      // Security checks
      if (!this.isCommandAllowed(trimmedCommand)) {
        return {
          success: false,
          error: `Command '${trimmedCommand}' is not allowed or is blocked`,
          command: trimmedCommand,
        };
      }

      // Execute command using Tauri's command API
      const result = await this.executeCommand(trimmedCommand, workingDir);

      const executionTime = Date.now() - startTime;

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        command: trimmedCommand,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        command: params?.command || "",
        executionTime,
      };
    }
  }

  private isCommandAllowed(command: string): boolean {
    // Check blocked commands first
    for (const blocked of this.config.blockedCommands) {
      if (command.includes(blocked)) {
        return false;
      }
    }

    // Check allowed commands
    const baseCommand = command.split(" ")[0];
    return this.config.allowedCommands.includes(baseCommand);
  }

  private async executeCommand(
    command: string,
    workingDir?: string,
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
    exitCode?: number;
  }> {
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          // Use string-based dynamic import that Vite can't analyze
          const tauriModule = await import(
            /* @vite-ignore */ "@tauri-apps/api/core"
          );
          const { invoke } = tauriModule;

          const result = (await invoke("execute_command", {
            command,
            workingDir: workingDir || this.config.workingDirectory,
            environment: this.config.environment,
          })) as TerminalCommandResult;

          return {
            success: result.success,
            output: result.output,
            error: result.error,
            exitCode: result.exitCode,
          };
        } catch (tauriError) {
          console.warn(
            "Tauri API not available, falling back to simulation:",
            tauriError,
          );
          // Fall through to simulation
        }
      }

      // Fallback for web environment - simulate command execution
      console.log("🖥️ Terminal command simulated (web environment):", command);

      // Simulate common commands
      if (command.includes("ls") || command.includes("dir")) {
        return {
          success: true,
          output: "workspace/\n  test.txt\n  README.md\n  config.json",
          error: undefined,
          exitCode: 0,
        };
      } else if (command.includes("pwd")) {
        return {
          success: true,
          output: workingDir || this.config.workingDirectory,
          error: undefined,
          exitCode: 0,
        };
      } else if (command.includes("echo")) {
        const echoContent = command.replace("echo", "").trim();
        return {
          success: true,
          output: echoContent,
          error: undefined,
          exitCode: 0,
        };
      } else {
        return {
          success: false,
          output: undefined,
          error: "Command not available in web environment",
          exitCode: 1,
        };
      }
    } catch (error) {
      console.error("❌ Error executing terminal command:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to execute command",
      };
    }
  }

  // Configuration methods
  updateConfig(newConfig: Partial<TerminalConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getAllowedCommands(): string[] {
    return this.config.allowedCommands;
  }

  setAllowedCommands(commands: string[]): void {
    this.config.allowedCommands = commands;
  }

  getBlockedCommands(): string[] {
    return this.config.blockedCommands;
  }

  setBlockedCommands(commands: string[]): void {
    this.config.blockedCommands = commands;
  }

  getMaxExecutionTime(): number {
    return this.config.maxExecutionTime;
  }

  setMaxExecutionTime(time: number): void {
    this.config.maxExecutionTime = time;
  }

  getWorkingDirectory(): string {
    return this.config.workingDirectory;
  }

  setWorkingDirectory(dir: string): void {
    this.config.workingDirectory = dir;
  }

  getEnvironment(): Record<string, string> {
    return this.config.environment;
  }

  setEnvironment(env: Record<string, string>): void {
    this.config.environment = env;
  }
}

// Create the ability instance
const terminalAbility = new SimpleTerminalAbility();

export { terminalAbility as simpleTerminalAbility };
