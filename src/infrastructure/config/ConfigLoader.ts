/**
 * Configuration Loader
 *
 * Loads and manages application configuration from multiple sources.
 *
 * Features:
 * - Load from JSON/YAML files
 * - Environment variable overrides
 * - Configuration merging
 * - Schema validation
 * - Hot reloading support
 * - Default values
 * - Nested configuration access
 */

import { readFileSync, existsSync, watchFile, unwatchFile } from "fs";
import { resolve, extname } from "path";
import type { ConfigValidator } from "./ConfigValidator.js";

/**
 * Configuration Source
 */
export type ConfigSource = "file" | "env" | "default" | "override";

/**
 * Configuration Entry
 */
export interface ConfigEntry {
  key: string;
  value: any;
  source: ConfigSource;
  timestamp: number;
}

/**
 * Configuration Change Event
 */
export interface ConfigChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  source: ConfigSource;
}

/**
 * Configuration Loader Options
 */
export interface ConfigLoaderOptions {
  /** Base configuration directory */
  configDir?: string;

  /** Environment prefix for env vars (e.g., "NOCTURNE_") */
  envPrefix?: string;

  /** Enable hot reloading */
  enableHotReload?: boolean;

  /** Reload interval in milliseconds */
  reloadInterval?: number;

  /** Validator instance */
  validator?: ConfigValidator;

  /** Default configuration */
  defaults?: Record<string, any>;

  /** Allow environment overrides */
  allowEnvOverrides?: boolean;
}

/**
 * Configuration Loader
 */
export class ConfigLoader {
  private config: Map<string, ConfigEntry>;
  private watchers: Map<string, NodeJS.Timeout>;
  private changeListeners: Array<(event: ConfigChangeEvent) => void>;
  private options: Required<Omit<ConfigLoaderOptions, "validator">> & {
    validator?: ConfigValidator;
  };

  /**
   * Default options
   */
  private static readonly DEFAULT_OPTIONS = {
    configDir: "./config",
    envPrefix: "NOCTURNE_",
    enableHotReload: false,
    reloadInterval: 5000,
    defaults: {},
    allowEnvOverrides: true,
  };

  constructor(options?: ConfigLoaderOptions) {
    this.config = new Map();
    this.watchers = new Map();
    this.changeListeners = [];
    this.options = {
      ...ConfigLoader.DEFAULT_OPTIONS,
      ...options,
      validator: options?.validator,
    };

    // Load defaults
    this.loadDefaults();
  }

  /**
   * Load configuration from a file
   */
  load(filePath: string): void {
    const fullPath = this.resolvePath(filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`Configuration file not found: ${fullPath}`);
    }

    try {
      const content = readFileSync(fullPath, "utf-8");
      const ext = extname(fullPath).toLowerCase();
      let data: any;

      if (ext === ".json") {
        data = JSON.parse(content);
      } else if (ext === ".yaml" || ext === ".yml") {
        data = this.parseYaml(content);
      } else {
        throw new Error(`Unsupported configuration file format: ${ext}`);
      }

      // Validate if validator is provided
      if (this.options.validator) {
        const validation = this.options.validator.validate(data);
        if (!validation.valid) {
          throw new Error(
            `Configuration validation failed: ${validation.errors.join(", ")}`,
          );
        }
      }

      // Flatten and store configuration
      this.mergeConfig(data, "file");

      // Setup hot reloading
      if (this.options.enableHotReload) {
        this.setupHotReload(fullPath);
      }
    } catch (error) {
      throw new Error(
        `Failed to load configuration from ${fullPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Load configuration from multiple files
   */
  loadMultiple(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.load(filePath);
    }
  }

  /**
   * Load environment variables
   */
  loadEnvironment(): void {
    const prefix = this.options.envPrefix;

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key.substring(prefix.length).toLowerCase();
        const normalizedKey = configKey.replace(/_/g, ".");

        this.set(normalizedKey, this.parseEnvValue(value || ""), "env");
      }
    }
  }

  /**
   * Get configuration value
   */
  get<T = any>(key: string, defaultValue?: T): T {
    // Check for environment override
    if (this.options.allowEnvOverrides) {
      const envValue = this.getEnvOverride(key);
      if (envValue !== undefined) {
        return envValue as T;
      }
    }

    const entry = this.config.get(key);
    if (entry !== undefined) {
      return entry.value as T;
    }

    // Check nested keys
    const nestedValue = this.getNestedValue(key);
    if (nestedValue !== undefined) {
      return nestedValue as T;
    }

    return defaultValue as T;
  }

  /**
   * Get all configuration keys
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, entry] of this.config.entries()) {
      this.setNestedValue(result, key, entry.value);
    }

    return result;
  }

  /**
   * Set configuration value
   */
  set(key: string, value: any, source: ConfigSource = "override"): void {
    const oldEntry = this.config.get(key);
    const oldValue = oldEntry?.value;

    this.config.set(key, {
      key,
      value,
      source,
      timestamp: Date.now(),
    });

    // Notify listeners if value changed
    if (oldValue !== value) {
      this.notifyChange({
        key,
        oldValue,
        newValue: value,
        source,
      });
    }
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.config.has(key) || this.getNestedValue(key) !== undefined;
  }

  /**
   * Delete configuration value
   */
  delete(key: string): boolean {
    const deleted = this.config.delete(key);

    if (deleted) {
      this.notifyChange({
        key,
        oldValue: this.config.get(key)?.value,
        newValue: undefined,
        source: "override",
      });
    }

    return deleted;
  }

  /**
   * Clear all configuration
   */
  clear(): void {
    this.config.clear();
    this.loadDefaults();
  }

  /**
   * Get configuration by prefix
   */
  getByPrefix(prefix: string): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, entry] of this.config.entries()) {
      if (key.startsWith(prefix)) {
        const subKey = key.substring(prefix.length);
        result[subKey] = entry.value;
      }
    }

    return result;
  }

  /**
   * Merge configuration object
   */
  merge(config: Record<string, any>, source: ConfigSource = "override"): void {
    this.mergeConfig(config, source);
  }

  /**
   * Watch for configuration changes
   */
  onChange(listener: (event: ConfigChangeEvent) => void): () => void {
    this.changeListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Reload configuration from all sources
   */
  reload(): void {
    // Stop watching
    this.stopHotReload();

    // Clear current config (keep defaults)
    this.config.clear();
    this.loadDefaults();

    // Reload would need to track loaded files
    // For now, this is a placeholder
  }

  /**
   * Get configuration metadata
   */
  getMetadata(key: string): Omit<ConfigEntry, "value"> | undefined {
    const entry = this.config.get(key);
    if (!entry) return undefined;

    return {
      key: entry.key,
      source: entry.source,
      timestamp: entry.timestamp,
    };
  }

  /**
   * Export configuration to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Stop hot reloading and cleanup
   */
  dispose(): void {
    this.stopHotReload();
    this.changeListeners = [];
    this.config.clear();
  }

  /**
   * Load default configuration
   */
  private loadDefaults(): void {
    this.mergeConfig(this.options.defaults, "default");
  }

  /**
   * Merge configuration recursively
   */
  private mergeConfig(
    config: Record<string, any>,
    source: ConfigSource,
    prefix: string = "",
  ): void {
    for (const [key, value] of Object.entries(config)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (this.isPlainObject(value)) {
        this.mergeConfig(value, source, fullKey);
      } else {
        this.set(fullKey, value, source);
      }
    }
  }

  /**
   * Get nested value using dot notation
   */
  private getNestedValue(key: string): any {
    const parts = key.split(".");
    let current: any = this.getAll();

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Set nested value using dot notation
   */
  private setNestedValue(obj: any, key: string, value: any): void {
    const parts = key.split(".");
    const last = parts.pop()!;
    let current = obj;

    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[last] = value;
  }

  /**
   * Get environment override
   */
  private getEnvOverride(key: string): any {
    const envKey =
      this.options.envPrefix + key.toUpperCase().replace(/\./g, "_");
    const value = process.env[envKey];

    return value !== undefined ? this.parseEnvValue(value) : undefined;
  }

  /**
   * Parse environment variable value
   */
  private parseEnvValue(value: string): any {
    // Boolean
    if (value === "true") return true;
    if (value === "false") return false;

    // Number
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

    // JSON
    if (value.startsWith("{") || value.startsWith("[")) {
      try {
        return JSON.parse(value);
      } catch {
        // Return as string if not valid JSON
      }
    }

    // String
    return value;
  }

  /**
   * Parse YAML content (simplified)
   */
  private parseYaml(content: string): any {
    // This is a simplified YAML parser for basic use cases
    // For production, consider using a library like 'yaml'
    try {
      const lines = content.split("\n");
      const result: any = {};
      let currentObj = result;
      const stack: any[] = [result];
      let currentIndent = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith("#")) continue;

        const indent = line.search(/\S/);
        const colonIndex = trimmed.indexOf(":");

        if (colonIndex > 0) {
          const key = trimmed.substring(0, colonIndex).trim();
          const valueStr = trimmed.substring(colonIndex + 1).trim();

          // Handle indent changes
          if (indent < currentIndent) {
            const levels = (currentIndent - indent) / 2;
            for (let i = 0; i < levels; i++) {
              stack.pop();
            }
            currentObj = stack[stack.length - 1];
          }

          currentIndent = indent;

          if (valueStr) {
            // Has value on same line
            currentObj[key] = this.parseYamlValue(valueStr);
          } else {
            // Nested object
            currentObj[key] = {};
            currentObj = currentObj[key];
            stack.push(currentObj);
            currentIndent = indent + 2;
          }
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `YAML parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse YAML value
   */
  private parseYamlValue(value: string): any {
    // Boolean
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;

    // Number
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

    // String (remove quotes if present)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.substring(1, value.length - 1);
    }

    return value;
  }

  /**
   * Setup hot reloading for a file
   */
  private setupHotReload(filePath: string): void {
    if (this.watchers.has(filePath)) return;

    watchFile(filePath, { interval: this.options.reloadInterval }, () => {
      try {
        this.load(filePath);
      } catch (error) {
        console.error(
          `Failed to reload configuration from ${filePath}:`,
          error,
        );
      }
    });

    this.watchers.set(
      filePath,
      setTimeout(() => {}, 0),
    ); // Placeholder
  }

  /**
   * Stop hot reloading
   */
  private stopHotReload(): void {
    for (const [filePath] of this.watchers.entries()) {
      unwatchFile(filePath);
    }
    this.watchers.clear();
  }

  /**
   * Notify change listeners
   */
  private notifyChange(event: ConfigChangeEvent): void {
    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in config change listener:", error);
      }
    }
  }

  /**
   * Resolve configuration file path
   */
  private resolvePath(filePath: string): string {
    if (filePath.startsWith("/")) {
      return filePath;
    }

    return resolve(this.options.configDir, filePath);
  }

  /**
   * Check if value is a plain object
   */
  private isPlainObject(value: any): boolean {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  }
}
