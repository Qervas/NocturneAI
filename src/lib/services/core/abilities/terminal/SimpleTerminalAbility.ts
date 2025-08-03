import { abilityManager } from "../../AbilityManager";

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

// Default configuration - PowerShell focused
export const DEFAULT_TERMINAL_CONFIG: TerminalConfig = {
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
  environment: {
    NODE_ENV: "development",
    PYTHONPATH: ".",
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
      console.log("🔍 Terminal Skill: Executing command:", command);
      
      // Check if we're in a Tauri environment
      const isTauriApp = typeof window !== "undefined" && (window as any).__TAURI__;
      
      if (isTauriApp) {
        console.log("🔍 Terminal Skill: Tauri environment detected");
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          
          const workingDirectory = workingDir || ".";
          console.log("🔍 Terminal Skill: Working directory:", workingDirectory);
          
          const result = await invoke("execute_command", {
            command: command,
            working_dir: workingDirectory,
          }) as any;
          
          console.log("🔍 Terminal Skill: Result:", result);

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
      console.log("🔍 Terminal Skill: Using simulated terminal for web environment");
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
      console.log("🖥️ Simulating terminal command:", command);
      
      const workingDirectory = workingDir || ".";
      
      // Simulate common PowerShell commands
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
      
      if (command.includes("systeminfo")) {
        return {
          success: true,
          output: `Host Name:                 DESKTOP-XXXXX\nOS Name:                   Microsoft Windows 10 Pro\nOS Version:                10.0.19045 N/A Build 19045\nOS Manufacturer:           Microsoft Corporation\nOS Configuration:          Standalone Workstation\nOS Build Type:             Multiprocessor Free\nRegistered Owner:          user\nRegistered Organization:   \nProduct ID:                00330-00000-00000-AA000\nOriginal Install Date:     1/1/2023, 12:00:00 AM\nSystem Manufacturer:        Dell Inc.\nSystem Model:               XPS 13 9310\nSystem Type:                x64-based PC\nProcessor(s):              1 Processor(s) Installed.\n                           [01]: Intel64 Family 6 Model 142 Stepping 12 GenuineIntel ~1992 Mhz\nBIOS Version:              Dell Inc. 2.13.0, 1/1/2023\nWindows Directory:          C:\\Windows\nSystem Directory:           C:\\Windows\\system32\nBoot Device:                \\Device\\HarddiskVolume1\nSystem Locale:              en-us;English (United States)\nInput Locale:               en-us;English (United States)\nTime Zone:                  (UTC-05:00) Eastern Time (US & Canada)\nTotal Physical Memory:      16,384 MB\nAvailable Physical Memory: 8,192 MB\nVirtual Memory: Max Size:   18,944 MB\nVirtual Memory: Available: 9,472 MB\nVirtual Memory: In Use:     9,472 MB\nPage File Location(s):     C:\\pagefile.sys\nDomain:                     WORKGROUP\nLogon Server:               \\\\DESKTOP-XXXXX\nHotfix(s):                 10 Hotfix(s) Installed.\n                           [01]: KB5022282\n                           [02]: KB5022283\n                           [03]: KB5022284\n                           [04]: KB5022285\n                           [05]: KB5022286\n                           [06]: KB5022287\n                           [07]: KB5022288\n                           [08]: KB5022289\n                           [09]: KB5022290\n                           [10]: KB5022291\nNetwork Card(s):            1 NIC(s) Installed.\n                           [01]: Intel(R) Wi-Fi 6 AX201 160MHz\n                                 Connection Name: Wi-Fi\n                                 DHCP Enabled:    Yes\n                                 DHCP Server:      192.168.1.1\n                                 IP address(es)\n                                 [01]: 192.168.1.100\n                                 [02]: fe80::1234:5678:9abc:def0%2\n                                 [03]: 2001:db8::1234:5678:9abc:def0\n                                 [04]: 2001:db8::1234:5678:9abc:def0%2`,
          exitCode: 0
        };
      }
      
      if (command.includes("Get-Process")) {
        return {
          success: true,
          output: `Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName\n-------  ------    -----      -----     ------     --  -- -----------\n    123      45     1234      5678       0.12   1234   0 chrome\n    234      67     2345      6789       0.23   2345   0 code\n    345      89     3456      7890       0.34   3456   0 node\n    456     123     4567      8901       0.45   4567   0 npm\n    567     145     5678      9012       0.56   5678   0 powershell`,
          exitCode: 0
        };
      }
      
      if (command.includes("git")) {
        if (command.includes("status")) {
          return {
            success: true,
            output: `On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)\n        modified:   src/lib/abilities/terminal/SimpleTerminalAbility.ts\n        modified:   src/lib/components/panels/MultiTabTerminal.svelte\n\nno changes added to commit (use "git add" and/or "git commit -a")`,
            exitCode: 0
          };
        }
        return {
          success: true,
          output: `git version 2.39.0.windows.1`,
          exitCode: 0
        };
      }
      
      if (command.includes("npm")) {
        if (command.includes("list")) {
          return {
            success: true,
            output: `agents@0.1.0 C:\\Users\\djmax\\Desktop\\agents\n├── @tauri-apps/api@2.0.0-alpha.11\n├── @tauri-apps/cli@2.0.0-alpha.17\n├── @tauri-apps/plugin-opener@2.0.0-alpha.11\n├── @tauri-apps/vite@2.0.0-alpha.11\n├── @types/node@20.10.5\n├── svelte@4.2.8\n├── svelte-check@3.6.2\n├── tauri@2.0.0-alpha.17\n├── typescript@5.3.3\n├── vite@5.0.10\n└── vite-plugin-svelte@3.0.1`,
            exitCode: 0
          };
        }
        return {
          success: true,
          output: `9.8.1`,
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
