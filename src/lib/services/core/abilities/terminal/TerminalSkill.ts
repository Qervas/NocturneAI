import { abilityManager } from "../../AbilityManager";

export interface TerminalSkillResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  command: string;
  executionTime?: number;
  agentId: string;
}

export interface TerminalSkillConfig {
  allowedCommands: string[];
  blockedCommands: string[];
  maxExecutionTime: number;
  workingDirectory: string;
  requireConfirmation: boolean;
  logAllCommands: boolean;
}

export const DEFAULT_TERMINAL_SKILL_CONFIG: TerminalSkillConfig = {
  allowedCommands: [
    // Basic commands
    "ls", "dir", "pwd", "cd", "cat", "type", "echo", "mkdir", "rmdir", "cp", "copy", "mv", "move", "rm", "del", "touch",
    
    // PowerShell specific
    "Get-ChildItem", "Get-Location", "Set-Location", "Get-Content", "Set-Content", "New-Item", "Remove-Item", "Copy-Item", "Move-Item",
    "Get-Process", "Get-Service", "Get-Command", "Get-Help", "Get-Member", "Select-Object", "Where-Object", "ForEach-Object",
    "Write-Host", "Write-Output", "Read-Host", "Get-Date", "Get-ComputerInfo", "Get-SystemInfo",
    
    // System commands
    "whoami", "hostname", "date", "time", "systeminfo", "ver", "winver",
    
    // Development tools
    "git", "npm", "node", "python", "python3", "pip", "pip3", "npx", "yarn", "dotnet", "cargo", "rustc",
    
    // Network commands
    "ping", "ipconfig", "netstat", "nslookup", "tracert", "route",
    
    // File operations
    "find", "grep", "head", "tail", "wc", "sort", "uniq", "diff", "chmod", "chown",
  ],
  blockedCommands: [
    "sudo", "su", "rm -rf", "format", "fdisk", "dd", "mkfs", "shutdown", "reboot", "halt", "poweroff", "init", "systemctl",
    "Remove-Item -Recurse -Force", "Format-Volume", "Restart-Computer", "Stop-Computer",
  ],
  maxExecutionTime: 30000, // 30 seconds
  workingDirectory: ".",
  requireConfirmation: false,
  logAllCommands: true,
};

export class TerminalSkill {
  id = "terminal_skill";
  name = "Terminal Command Skill";
  description = "Execute system commands through the integrated terminal";
  category = "system";
  config: TerminalSkillConfig;
  private commandHistory: Array<{agentId: string, command: string, timestamp: Date, result: TerminalSkillResult}> = [];

  constructor(config: Partial<TerminalSkillConfig> = {}) {
    this.config = { ...DEFAULT_TERMINAL_SKILL_CONFIG, ...config };
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

    // Check if command is allowed
    const baseCommand = command.split(" ")[0];
    return this.config.allowedCommands.includes(baseCommand);
  }

  async execute(agentId: string, params?: any): Promise<TerminalSkillResult> {
    const startTime = Date.now();

    try {
      const { command, workingDir } = params;

      if (!command) {
        return {
          success: false,
          error: "No command provided",
          command: "",
          agentId,
        };
      }

      const trimmedCommand = command.trim();
      if (!trimmedCommand) {
        return {
          success: false,
          error: "Empty command provided",
          command: "",
          agentId,
        };
      }

      // Security checks
      if (!this.isCommandAllowed(trimmedCommand)) {
        return {
          success: false,
          error: `Command '${trimmedCommand}' is not allowed or is blocked`,
          command: trimmedCommand,
          agentId,
        };
      }

      // Log command if enabled
      if (this.config.logAllCommands) {
        console.log(`🔍 Terminal Skill: Agent ${agentId} executing: ${trimmedCommand}`);
      }

      // Execute command using Tauri's command API
      const result = await this.executeCommand(trimmedCommand, workingDir);

      const executionTime = Date.now() - startTime;

      const skillResult: TerminalSkillResult = {
        success: result.success,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        command: trimmedCommand,
        executionTime,
        agentId,
      };

      // Add to history
      this.commandHistory.push({
        agentId,
        command: trimmedCommand,
        timestamp: new Date(),
        result: skillResult,
      });

      return skillResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        command: params?.command || "",
        executionTime,
        agentId,
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
      const isTauriApp = typeof window !== "undefined" && (window as any).__TAURI__;
      
      if (isTauriApp) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          
          const workingDirectory = workingDir || this.config.workingDirectory;
          
          const result = await invoke("execute_command", {
            command: command,
            working_dir: workingDirectory,
          }) as any;
          
          return {
            success: result.success,
            output: result.output,
            error: result.error,
            exitCode: result.exitCode,
          };
        } catch (tauriError) {
          console.error("❌ Terminal Skill: Tauri execution failed:", tauriError);
          return {
            success: false,
            error: `Tauri execution failed: ${tauriError}`,
            exitCode: -1
          };
        }
      }

      // Fallback for web environment
      return await this.simulateTerminalCommand(command, workingDir);
    } catch (error) {
      console.error("❌ Terminal Skill: Error executing command:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to execute command",
      };
    }
  }

  private async simulateTerminalCommand(
    command: string,
    workingDir?: string,
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
    exitCode?: number;
  }> {
    try {
      const workingDirectory = workingDir || this.config.workingDirectory;
      
      // Simulate common commands
      if (command.includes("echo")) {
        const echoContent = command.replace("echo", "").trim().replace(/"/g, "");
        return {
          success: true,
          output: echoContent,
          exitCode: 0
        };
      }
      
      if (command.includes("dir") || command.includes("ls")) {
        return {
          success: true,
          output: `Directory of ${workingDirectory}\n\nREADME.md\npackage.json\nsrc/\nsrc-tauri/\nnode_modules/\n.gitignore\npackage-lock.json\nvite.config.js\nsvelte.config.js\nstatic/\nworkspace/\nLICENSE`,
          exitCode: 0
        };
      }
      
      if (command.includes("pwd") || command.includes("Get-Location")) {
        return {
          success: true,
          output: workingDirectory,
          exitCode: 0
        };
      }
      
      if (command.includes("whoami")) {
        return {
          success: true,
          output: "user",
          exitCode: 0
        };
      }
      
      if (command.includes("Get-Date")) {
        return {
          success: true,
          output: new Date().toString(),
          exitCode: 0
        };
      }
      
      // Default response for unknown commands
      return {
        success: true,
        output: `[Simulated Terminal] Command executed: ${command}\nThis is a simulated terminal for web environment.\nFor real system commands, use the Tauri desktop app.`,
        exitCode: 0
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Simulated command failed: ${error}`,
        exitCode: 1
      };
    }
  }

  // Utility methods
  getCommandHistory(agentId?: string): Array<{agentId: string, command: string, timestamp: Date, result: TerminalSkillResult}> {
    if (agentId) {
      return this.commandHistory.filter(entry => entry.agentId === agentId);
    }
    return this.commandHistory;
  }

  clearCommandHistory(): void {
    this.commandHistory = [];
  }

  getLastCommand(agentId?: string): {agentId: string, command: string, timestamp: Date, result: TerminalSkillResult} | null {
    const history = this.getCommandHistory(agentId);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<TerminalSkillConfig>): void {
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

  isLoggingEnabled(): boolean {
    return this.config.logAllCommands;
  }

  setLoggingEnabled(enabled: boolean): void {
    this.config.logAllCommands = enabled;
  }

  isConfirmationRequired(): boolean {
    return this.config.requireConfirmation;
  }

  setConfirmationRequired(required: boolean): void {
    this.config.requireConfirmation = required;
  }
}

// Create the skill instance
const terminalSkill = new TerminalSkill();

export { terminalSkill }; 