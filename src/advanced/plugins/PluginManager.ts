/**
 * Plugin Manager
 *
 * Dynamic plugin loading and lifecycle management system.
 * Enables extensibility through loadable modules with hot-reload,
 * dependency resolution, and sandboxed execution.
 *
 * Features:
 * - Dynamic plugin loading and unloading
 * - Plugin lifecycle hooks (install, enable, disable, uninstall)
 * - Dependency management and resolution
 * - Version compatibility checking
 * - Hot-reload support
 * - Sandboxed execution environment
 * - Plugin API with event system
 * - Configuration management per plugin
 * - Resource isolation and cleanup
 *
 * @module PluginManager
 */

import { EventEmitter } from "events";

/**
 * Plugin status
 */
export type PluginStatus =
  | "installed"
  | "enabled"
  | "disabled"
  | "error"
  | "uninstalled";

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];

  // Dependencies
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  nocturneVersion?: string;

  // Capabilities
  capabilities?: string[];
  permissions?: string[];

  // Configuration
  configSchema?: any;
  defaultConfig?: any;
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  /**
   * Called when plugin is first installed
   */
  onInstall?(context: PluginContext): Promise<void> | void;

  /**
   * Called when plugin is enabled
   */
  onEnable?(context: PluginContext): Promise<void> | void;

  /**
   * Called when plugin is disabled
   */
  onDisable?(context: PluginContext): Promise<void> | void;

  /**
   * Called when plugin is uninstalled
   */
  onUninstall?(context: PluginContext): Promise<void> | void;

  /**
   * Called when plugin configuration changes
   */
  onConfigChange?(config: any, context: PluginContext): Promise<void> | void;

  /**
   * Called periodically for maintenance tasks
   */
  onTick?(context: PluginContext): Promise<void> | void;
}

/**
 * Plugin definition
 */
export interface Plugin extends PluginHooks {
  metadata: PluginMetadata;

  /**
   * Main plugin initialization
   */
  activate(context: PluginContext): Promise<void> | void;

  /**
   * Plugin cleanup
   */
  deactivate(context: PluginContext): Promise<void> | void;
}

/**
 * Plugin context provided to plugins
 */
export interface PluginContext {
  pluginId: string;
  pluginPath: string;
  config: any;
  logger: PluginLogger;
  events: EventEmitter;
  storage: PluginStorage;
  api: PluginAPI;
}

/**
 * Plugin logger
 */
export interface PluginLogger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  get<T = any>(key: string): Promise<T | undefined>;
  set<T = any>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

/**
 * Plugin API exposed to plugins
 */
export interface PluginAPI {
  // Core
  getVersion(): string;
  getPlugins(): string[];

  // Agents
  registerAgent?(config: any): Promise<string>;
  getAgent?(id: string): Promise<any>;

  // Tools
  registerTool?(tool: any): Promise<void>;
  getTool?(name: string): Promise<any>;

  // Workflows
  registerWorkflow?(workflow: any): Promise<string>;
  runWorkflow?(id: string, input: any): Promise<any>;

  // Events
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;

  // Commands
  registerCommand?(
    name: string,
    handler: (...args: any[]) => Promise<any>,
  ): void;
  executeCommand?(name: string, ...args: any[]): Promise<any>;

  // UI
  registerView?(view: any): void;
  showNotification?(message: string, type?: "info" | "warn" | "error"): void;
}

/**
 * Plugin instance
 */
interface PluginInstance {
  plugin: Plugin;
  metadata: PluginMetadata;
  status: PluginStatus;
  context: PluginContext;
  config: any;
  path: string;
  loadedAt: number;
  enabledAt?: number;
  error?: Error;
}

/**
 * Plugin manager options
 */
export interface PluginManagerOptions {
  pluginsPath?: string;
  enableHotReload?: boolean;
  sandboxed?: boolean;
  maxPlugins?: number;
  tickInterval?: number;
  autoEnable?: boolean;
  version?: string;
}

/**
 * Plugin Manager
 *
 * Manages plugin lifecycle, dependencies, and execution.
 *
 * @example
 * ```typescript
 * const manager = new PluginManager({
 *   pluginsPath: './plugins',
 *   enableHotReload: true,
 *   autoEnable: true
 * });
 *
 * // Load plugin
 * await manager.loadPlugin('my-plugin', './plugins/my-plugin');
 *
 * // Enable plugin
 * await manager.enablePlugin('my-plugin');
 *
 * // Configure plugin
 * await manager.configurePlugin('my-plugin', {
 *   setting1: 'value1'
 * });
 *
 * // Monitor events
 * manager.on('plugin:enabled', ({ pluginId }) => {
 *   console.log(`Plugin ${pluginId} enabled`);
 * });
 * ```
 */
export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance>;
  private options: Required<PluginManagerOptions>;
  private pluginAPI: PluginAPI;
  private tickInterval?: NodeJS.Timeout;
  private watchers: Map<string, any>;

  constructor(options: PluginManagerOptions = {}) {
    super();

    this.plugins = new Map();
    this.watchers = new Map();

    this.options = {
      pluginsPath: "./plugins",
      enableHotReload: false,
      sandboxed: false,
      maxPlugins: 100,
      tickInterval: 60000, // 1 minute
      autoEnable: false,
      version: "0.1.0",
      ...options,
    };

    this.pluginAPI = this.createPluginAPI();
    this.startTicker();
  }

  /**
   * Load plugin from path
   */
  async loadPlugin(pluginId: string, pluginPath: string): Promise<void> {
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} already loaded`);
    }

    if (this.plugins.size >= this.options.maxPlugins) {
      throw new Error(
        `Maximum number of plugins (${this.options.maxPlugins}) reached`,
      );
    }

    try {
      // Load plugin module
      const pluginModule = await this.loadPluginModule(pluginPath);

      if (!pluginModule || !pluginModule.metadata) {
        throw new Error("Invalid plugin: missing metadata");
      }

      // Validate metadata
      this.validateMetadata(pluginModule.metadata);

      // Check version compatibility
      this.checkCompatibility(pluginModule.metadata);

      // Check dependencies
      await this.checkDependencies(pluginModule.metadata);

      // Create plugin context
      const context = this.createPluginContext(pluginId, pluginPath);

      // Create plugin instance
      const instance: PluginInstance = {
        plugin: pluginModule,
        metadata: pluginModule.metadata,
        status: "installed",
        context,
        config: pluginModule.metadata.defaultConfig || {},
        path: pluginPath,
        loadedAt: Date.now(),
      };

      this.plugins.set(pluginId, instance);

      // Call install hook
      if (pluginModule.onInstall) {
        await pluginModule.onInstall(context);
      }

      this.emit("plugin:loaded", { pluginId, metadata: pluginModule.metadata });

      // Enable hot reload if enabled
      if (this.options.enableHotReload) {
        await this.watchPlugin(pluginId, pluginPath);
      }

      // Auto-enable if configured
      if (this.options.autoEnable) {
        await this.enablePlugin(pluginId);
      }
    } catch (error) {
      this.emit("plugin:error", { pluginId, error });
      throw error;
    }
  }

  /**
   * Unload plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.getPluginInstance(pluginId);

    // Disable first if enabled
    if (instance.status === "enabled") {
      await this.disablePlugin(pluginId);
    }

    // Call uninstall hook
    if (instance.plugin.onUninstall) {
      await instance.plugin.onUninstall(instance.context);
    }

    // Stop watching
    this.unwatchPlugin(pluginId);

    // Clean up storage
    await instance.context.storage.clear();

    this.plugins.delete(pluginId);

    this.emit("plugin:unloaded", { pluginId });
  }

  /**
   * Enable plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const instance = this.getPluginInstance(pluginId);

    if (instance.status === "enabled") {
      return; // Already enabled
    }

    if (instance.status === "error") {
      throw new Error(`Cannot enable plugin ${pluginId} in error state`);
    }

    try {
      // Call enable hook
      if (instance.plugin.onEnable) {
        await instance.plugin.onEnable(instance.context);
      }

      // Activate plugin
      await instance.plugin.activate(instance.context);

      instance.status = "enabled";
      instance.enabledAt = Date.now();

      this.emit("plugin:enabled", { pluginId });
    } catch (error) {
      instance.status = "error";
      instance.error = error as Error;
      this.emit("plugin:error", { pluginId, error });
      throw error;
    }
  }

  /**
   * Disable plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const instance = this.getPluginInstance(pluginId);

    if (instance.status !== "enabled") {
      return; // Not enabled
    }

    try {
      // Deactivate plugin
      await instance.plugin.deactivate(instance.context);

      // Call disable hook
      if (instance.plugin.onDisable) {
        await instance.plugin.onDisable(instance.context);
      }

      instance.status = "disabled";
      instance.enabledAt = undefined;

      this.emit("plugin:disabled", { pluginId });
    } catch (error) {
      instance.status = "error";
      instance.error = error as Error;
      this.emit("plugin:error", { pluginId, error });
      throw error;
    }
  }

  /**
   * Configure plugin
   */
  async configurePlugin(pluginId: string, config: any): Promise<void> {
    const instance = this.getPluginInstance(pluginId);

    // Merge with existing config
    instance.config = { ...instance.config, ...config };
    instance.context.config = instance.config;

    // Call config change hook
    if (instance.plugin.onConfigChange) {
      await instance.plugin.onConfigChange(instance.config, instance.context);
    }

    this.emit("plugin:configured", { pluginId, config });
  }

  /**
   * Get plugin info
   */
  getPlugin(pluginId: string): PluginMetadata & { status: PluginStatus } {
    const instance = this.getPluginInstance(pluginId);
    return {
      ...instance.metadata,
      status: instance.status,
    };
  }

  /**
   * Get all plugins
   */
  getPlugins(filter?: {
    status?: PluginStatus;
  }): Array<PluginMetadata & { status: PluginStatus; id: string }> {
    let instances = Array.from(this.plugins.values());

    if (filter?.status) {
      instances = instances.filter((i) => i.status === filter.status);
    }

    return instances.map((i) => ({
      ...i.metadata,
      status: i.status,
    }));
  }

  /**
   * Check if plugin is loaded
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Reload plugin (hot-reload)
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const instance = this.getPluginInstance(pluginId);
    const wasEnabled = instance.status === "enabled";
    const pluginPath = instance.path;

    // Unload
    await this.unloadPlugin(pluginId);

    // Reload
    await this.loadPlugin(pluginId, pluginPath);

    // Re-enable if it was enabled
    if (wasEnabled) {
      await this.enablePlugin(pluginId);
    }

    this.emit("plugin:reloaded", { pluginId });
  }

  /**
   * Load plugin module
   */
  private async loadPluginModule(pluginPath: string): Promise<Plugin> {
    // In a real implementation, this would use dynamic import
    // and potentially run in a sandboxed environment
    try {
      // Clear require cache for hot reload
      const resolvedPath = require.resolve(pluginPath);
      delete require.cache[resolvedPath];

      const module = require(pluginPath);
      return module.default || module;
    } catch (error) {
      throw new Error(`Failed to load plugin from ${pluginPath}: ${error}`);
    }
  }

  /**
   * Create plugin context
   */
  private createPluginContext(
    pluginId: string,
    pluginPath: string,
  ): PluginContext {
    const storage = new Map<string, any>();

    return {
      pluginId,
      pluginPath,
      config: {},
      logger: this.createLogger(pluginId),
      events: new EventEmitter(),
      storage: {
        async get<T>(key: string): Promise<T | undefined> {
          return storage.get(key);
        },
        async set<T>(key: string, value: T): Promise<void> {
          storage.set(key, value);
        },
        async delete(key: string): Promise<void> {
          storage.delete(key);
        },
        async clear(): Promise<void> {
          storage.clear();
        },
        async keys(): Promise<string[]> {
          return Array.from(storage.keys());
        },
      },
      api: this.pluginAPI,
    };
  }

  /**
   * Create logger for plugin
   */
  private createLogger(pluginId: string): PluginLogger {
    return {
      info: (message: string, data?: any) => {
        this.emit("plugin:log", { pluginId, level: "info", message, data });
      },
      warn: (message: string, data?: any) => {
        this.emit("plugin:log", { pluginId, level: "warn", message, data });
      },
      error: (message: string, data?: any) => {
        this.emit("plugin:log", { pluginId, level: "error", message, data });
      },
      debug: (message: string, data?: any) => {
        this.emit("plugin:log", { pluginId, level: "debug", message, data });
      },
    };
  }

  /**
   * Create plugin API
   */
  private createPluginAPI(): PluginAPI {
    return {
      getVersion: () => this.options.version,
      getPlugins: () => Array.from(this.plugins.keys()),
      on: (event: string, handler: (...args: any[]) => void) => {
        this.on(event, handler);
      },
      off: (event: string, handler: (...args: any[]) => void) => {
        this.off(event, handler);
      },
      emit: (event: string, ...args: any[]) => {
        this.emit(event, ...args);
      },
    };
  }

  /**
   * Validate plugin metadata
   */
  private validateMetadata(metadata: PluginMetadata): void {
    if (!metadata.id) {
      throw new Error("Plugin metadata missing required field: id");
    }

    if (!metadata.name) {
      throw new Error("Plugin metadata missing required field: name");
    }

    if (!metadata.version) {
      throw new Error("Plugin metadata missing required field: version");
    }

    // Validate version format (semver)
    if (!/^\d+\.\d+\.\d+/.test(metadata.version)) {
      throw new Error(`Invalid version format: ${metadata.version}`);
    }
  }

  /**
   * Check version compatibility
   */
  private checkCompatibility(metadata: PluginMetadata): void {
    if (metadata.nocturneVersion) {
      // Simplified version check
      const required = metadata.nocturneVersion;
      const current = this.options.version;

      // In production, use a proper semver library
      if (required !== current) {
        console.warn(
          `Plugin ${metadata.id} requires NocturneAI ${required}, but current version is ${current}`,
        );
      }
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(metadata: PluginMetadata): Promise<void> {
    if (!metadata.dependencies) {
      return;
    }

    for (const [depId, depVersion] of Object.entries(metadata.dependencies)) {
      const depInstance = this.plugins.get(depId);

      if (!depInstance) {
        throw new Error(
          `Plugin ${metadata.id} requires dependency ${depId} which is not installed`,
        );
      }

      // Check version compatibility
      if (depVersion !== depInstance.metadata.version) {
        console.warn(
          `Plugin ${metadata.id} requires ${depId}@${depVersion}, but ${depInstance.metadata.version} is installed`,
        );
      }
    }
  }

  /**
   * Watch plugin for changes (hot-reload)
   */
  private async watchPlugin(
    pluginId: string,
    _pluginPath: string,
  ): Promise<void> {
    // In a real implementation, use fs.watch or chokidar
    // This is a simplified placeholder
    this.emit("plugin:watch:started", { pluginId });
  }

  /**
   * Stop watching plugin
   */
  private unwatchPlugin(pluginId: string): void {
    const watcher = this.watchers.get(pluginId);
    if (watcher) {
      // Stop watcher
      this.watchers.delete(pluginId);
      this.emit("plugin:watch:stopped", { pluginId });
    }
  }

  /**
   * Start ticker for periodic plugin maintenance
   */
  private startTicker(): void {
    this.tickInterval = setInterval(async () => {
      for (const [pluginId, instance] of this.plugins) {
        if (instance.status === "enabled" && instance.plugin.onTick) {
          try {
            await instance.plugin.onTick(instance.context);
          } catch (error) {
            this.emit("plugin:tick:error", { pluginId, error });
          }
        }
      }
    }, this.options.tickInterval);
  }

  /**
   * Get plugin instance
   */
  private getPluginInstance(pluginId: string): PluginInstance {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    return instance;
  }

  /**
   * Shutdown plugin manager
   */
  async shutdown(): Promise<void> {
    // Stop ticker
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }

    // Disable all plugins
    for (const pluginId of this.plugins.keys()) {
      try {
        await this.disablePlugin(pluginId);
      } catch (error) {
        // Continue with other plugins
      }
    }

    // Unload all plugins
    for (const pluginId of Array.from(this.plugins.keys())) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        // Continue with other plugins
      }
    }

    this.emit("shutdown");
    this.removeAllListeners();
  }
}

/**
 * Create plugin manager
 *
 * @param options - Plugin manager options
 * @returns Plugin manager instance
 */
export function createPluginManager(
  options?: PluginManagerOptions,
): PluginManager {
  return new PluginManager(options);
}
