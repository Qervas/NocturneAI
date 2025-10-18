/**
 * Tool Factory
 *
 * Factory for creating and configuring tool instances.
 *
 * Features:
 * - Create tool instances from configurations
 * - Load tools from registry
 * - Validate tool configurations
 * - Configure tool settings (timeout, retry, etc.)
 * - Support for custom tools
 * - Tool dependency resolution
 * - Batch tool creation
 */

import type { ITool, ToolConfig } from "../../core/interfaces/ITool.js";
import type { IToolRegistry } from "../../core/interfaces/ITool.js";
import { ToolRegistry } from "../../infrastructure/tools/registry/ToolRegistry.js";
import { ToolValidator } from "../../infrastructure/tools/registry/ToolValidator.js";
import { ToolLoader } from "../../infrastructure/tools/registry/ToolLoader.js";

// Built-in tools
import { FileReadTool } from "../../infrastructure/tools/builtin/FileReadTool.js";
import { FileWriteTool } from "../../infrastructure/tools/builtin/FileWriteTool.js";
import { FileDeleteTool } from "../../infrastructure/tools/builtin/FileDeleteTool.js";
import { FileListTool } from "../../infrastructure/tools/builtin/FileListTool.js";
import { CommandExecuteTool } from "../../infrastructure/tools/builtin/CommandExecuteTool.js";
import { GitStatusTool } from "../../infrastructure/tools/builtin/GitStatusTool.js";
import { GitCommitTool } from "../../infrastructure/tools/builtin/GitCommitTool.js";
import { GitDiffTool } from "../../infrastructure/tools/builtin/GitDiffTool.js";
import { GitLogTool } from "../../infrastructure/tools/builtin/GitLogTool.js";
import { CodeSearchTool } from "../../infrastructure/tools/builtin/CodeSearchTool.js";
import { FileSearchTool } from "../../infrastructure/tools/builtin/FileSearchTool.js";
import { SymbolSearchTool } from "../../infrastructure/tools/builtin/SymbolSearchTool.js";

/**
 * Tool Factory Configuration
 */
export interface ToolFactoryConfig {
  /** Working directory for tool execution */
  cwd?: string;

  /** Default timeout for tool execution (ms) */
  defaultTimeout?: number;

  /** Default retry configuration */
  defaultRetry?: {
    maxAttempts: number;
    delayMs: number;
    backoff?: "linear" | "exponential";
  };

  /** Custom tool directories to load from */
  customToolDirs?: string[];

  /** Whether to auto-register built-in tools */
  autoRegisterBuiltins?: boolean;

  /** Tool-specific configurations */
  toolConfigs?: Record<string, Partial<ToolConfig>>;
}

/**
 * Tool Creation Options
 */
export interface ToolCreationOptions {
  /** Tool configuration overrides */
  config?: Partial<ToolConfig>;

  /** Whether to validate after creation */
  validate?: boolean;

  /** Whether to enable the tool immediately */
  enabled?: boolean;
}

/**
 * Tool Factory
 */
export class ToolFactory {
  private registry: IToolRegistry;
  private validator: ToolValidator;
  private loader: ToolLoader;
  private config: ToolFactoryConfig;
  private initialized: boolean = false;

  constructor(config: ToolFactoryConfig = {}) {
    this.config = {
      cwd: config.cwd || process.cwd(),
      defaultTimeout: config.defaultTimeout || 30000,
      defaultRetry: config.defaultRetry || {
        maxAttempts: 3,
        delayMs: 1000,
        backoff: "exponential",
      },
      customToolDirs: config.customToolDirs || [],
      autoRegisterBuiltins: config.autoRegisterBuiltins !== false,
      toolConfigs: config.toolConfigs || {},
    };

    this.registry = new ToolRegistry();
    this.validator = new ToolValidator();
    this.loader = new ToolLoader({
      validateAfterLoad: true,
      recursive: true,
    });
  }

  /**
   * Initialize the factory and load tools
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Register built-in tools
    if (this.config.autoRegisterBuiltins) {
      await this.registerBuiltinTools();
    }

    // Load custom tools from directories
    if (this.config.customToolDirs && this.config.customToolDirs.length > 0) {
      await this.loadCustomTools();
    }

    this.initialized = true;
  }

  /**
   * Register all built-in tools
   */
  private async registerBuiltinTools(): Promise<void> {
    const builtinTools: ITool[] = [
      // File tools
      new FileReadTool(),
      new FileWriteTool(),
      new FileDeleteTool(),
      new FileListTool(),

      // Command tools
      new CommandExecuteTool(),

      // Git tools
      new GitStatusTool(),
      new GitCommitTool(),
      new GitDiffTool(),
      new GitLogTool(),

      // Search tools
      new CodeSearchTool(),
      new FileSearchTool(),
      new SymbolSearchTool(),
    ];

    for (const tool of builtinTools) {
      try {
        // Apply tool-specific configuration if available
        if (this.config.toolConfigs?.[tool.name]) {
          this.applyToolConfig(tool, this.config.toolConfigs[tool.name]);
        }

        this.registry.register(tool);
      } catch (error) {
        console.warn(`Failed to register built-in tool ${tool.name}:`, error);
      }
    }
  }

  /**
   * Load custom tools from directories
   */
  private async loadCustomTools(): Promise<void> {
    for (const dir of this.config.customToolDirs || []) {
      try {
        const tools = await this.loader.loadFromDirectory(dir);
        for (const tool of tools) {
          // Apply tool-specific configuration if available
          if (this.config.toolConfigs?.[tool.name]) {
            this.applyToolConfig(tool, this.config.toolConfigs[tool.name]);
          }
        }
      } catch (error) {
        console.warn(`Failed to load tools from directory ${dir}:`, error);
      }
    }
  }

  /**
   * Create a tool by name
   */
  async createTool(
    name: string,
    options: ToolCreationOptions = {},
  ): Promise<ITool> {
    if (!this.initialized) {
      await this.initialize();
    }

    const tool = this.registry.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found in registry`);
    }

    // Apply configuration overrides
    if (options.config) {
      this.applyToolConfig(tool, options.config);
    }

    // Validate if requested
    if (options.validate !== false) {
      const validation = this.validator.validateTool(tool);
      if (validation !== true) {
        throw new Error(`Tool validation failed: ${validation}`);
      }
    }

    // Set enabled status
    if (options.enabled !== undefined) {
      if (options.enabled) {
        tool.enable();
      } else {
        tool.disable();
      }
    }

    return tool;
  }

  /**
   * Create multiple tools by names
   */
  async createTools(
    names: string[],
    options: ToolCreationOptions = {},
  ): Promise<ITool[]> {
    const tools: ITool[] = [];

    for (const name of names) {
      try {
        const tool = await this.createTool(name, options);
        tools.push(tool);
      } catch (error) {
        console.warn(`Failed to create tool ${name}:`, error);
      }
    }

    return tools;
  }

  /**
   * Create tools from configuration
   */
  async createToolsFromConfig(config: {
    enabled?: string[];
    disabled?: string[];
    allowAll?: boolean;
    config?: Record<string, Partial<ToolConfig>>;
  }): Promise<ITool[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const tools: ITool[] = [];

    // If allowAll is true, get all tools
    if (config.allowAll) {
      const allTools = this.registry.getAll();
      for (const tool of allTools) {
        // Apply tool-specific config if available
        if (config.config?.[tool.name]) {
          this.applyToolConfig(tool, config.config[tool.name]);
        }

        // Check if explicitly disabled
        if (config.disabled && config.disabled.includes(tool.name)) {
          tool.disable();
        }

        tools.push(tool);
      }
    } else if (config.enabled && config.enabled.length > 0) {
      // Only create explicitly enabled tools
      for (const name of config.enabled) {
        try {
          const tool = this.registry.get(name);
          if (!tool) {
            console.warn(`Tool "${name}" not found in registry`);
            continue;
          }

          // Apply tool-specific config if available
          if (config.config?.[name]) {
            this.applyToolConfig(tool, config.config[name]);
          }

          // Check if explicitly disabled
          if (config.disabled && config.disabled.includes(name)) {
            tool.disable();
          }

          tools.push(tool);
        } catch (error) {
          console.warn(`Failed to create tool ${name}:`, error);
        }
      }
    }

    return tools;
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: ITool): void {
    // Validate the tool
    const validation = this.validator.validateTool(tool);
    if (validation !== true) {
      throw new Error(`Tool validation failed: ${validation}`);
    }

    // Apply default configuration
    this.applyToolConfig(tool, {
      enabled: true,
      timeout: this.config.defaultTimeout,
      retry: this.config.defaultRetry,
    });

    // Register in the registry
    this.registry.register(tool);
  }

  /**
   * Apply configuration to a tool
   */
  private applyToolConfig(tool: ITool, config: Partial<ToolConfig>): void {
    // Merge with existing config
    const currentConfig = tool.config;
    tool.config = {
      ...currentConfig,
      ...config,
      // If retry is provided, merge it with existing retry config
      ...(config.retry && {
        retry: {
          ...(currentConfig.retry || {}),
          ...config.retry,
        },
      }),
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
   * Get the tool registry
   */
  getRegistry(): IToolRegistry {
    return this.registry;
  }

  /**
   * Get all available tool names
   */
  getAvailableTools(): string[] {
    if (!this.initialized) {
      throw new Error("Factory not initialized. Call initialize() first.");
    }
    return this.registry.getNames();
  }

  /**
   * Check if a tool is available
   */
  hasToolAvailable(name: string): boolean {
    if (!this.initialized) {
      return false;
    }
    return this.registry.has(name);
  }

  /**
   * Get tool by name from registry
   */
  getTool(name: string): ITool | undefined {
    if (!this.initialized) {
      return undefined;
    }
    return this.registry.get(name);
  }

  /**
   * Reload tools from custom directories
   */
  async reloadCustomTools(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
      return;
    }

    await this.loadCustomTools();
  }

  /**
   * Clear all tools from registry
   */
  clear(): void {
    this.registry.clear();
    this.initialized = false;
  }

  /**
   * Get factory configuration
   */
  getConfig(): Readonly<ToolFactoryConfig> {
    return { ...this.config };
  }

  /**
   * Get tool statistics
   */
  getStats(): {
    totalTools: number;
    enabledTools: number;
    disabledTools: number;
    toolsByCategory: Record<string, number>;
  } {
    if (!this.initialized) {
      return {
        totalTools: 0,
        enabledTools: 0,
        disabledTools: 0,
        toolsByCategory: {},
      };
    }

    return this.registry.getStats();
  }
}
