/**
 * Tool Loader
 *
 * Dynamically loads tools from files and directories.
 *
 * Features:
 * - Load tools from JavaScript/TypeScript files
 * - Scan directories for tool files
 * - Hot reload support
 * - Error handling and validation
 * - Tool discovery patterns
 * - Cache management
 */

import { readdir } from "fs/promises";
import { join, extname, resolve } from "path";
import { pathToFileURL } from "url";
import type { ITool, IToolLoader } from "../../../core/interfaces/ITool.js";

/**
 * Tool loader configuration
 */
export interface ToolLoaderConfig {
  /** File patterns to include (e.g., ['*.tool.js', '*Tool.js']) */
  patterns?: string[];

  /** File patterns to exclude */
  excludePatterns?: string[];

  /** Whether to load recursively from subdirectories */
  recursive?: boolean;

  /** Maximum directory depth for recursive loading */
  maxDepth?: number;

  /** Whether to validate tools after loading */
  validateAfterLoad?: boolean;

  /** Custom tool validator function */
  validator?: (tool: ITool) => boolean | string;
}

/**
 * Tool load result
 */
export interface ToolLoadResult {
  /** Successfully loaded tools */
  tools: ITool[];

  /** Number of tools loaded */
  count: number;

  /** Errors encountered during loading */
  errors: Array<{
    file: string;
    error: string;
  }>;

  /** Files scanned */
  filesScanned: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ToolLoaderConfig> = {
  patterns: ["*.tool.js", "*Tool.js", "*.tool.ts", "*Tool.ts"],
  excludePatterns: ["*.test.js", "*.test.ts", "*.spec.js", "*.spec.ts"],
  recursive: true,
  maxDepth: 10,
  validateAfterLoad: true,
  validator: () => true,
};

/**
 * Tool Loader Implementation
 */
export class ToolLoader implements IToolLoader {
  public readonly config: Required<ToolLoaderConfig>;
  private loadedFiles: Map<string, ITool[]> = new Map();
  private watchedDirectories: Set<string> = new Set();

  constructor(config?: ToolLoaderConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load tools from directory
   *
   * @param directory - Directory path
   * @returns Promise resolving to array of loaded tools
   */
  async loadFromDirectory(directory: string): Promise<ITool[]> {
    const resolvedPath = resolve(directory);
    const result = await this.loadFromDirectoryInternal(resolvedPath, 0);

    if (result.errors.length > 0) {
      console.warn(
        `Encountered ${result.errors.length} error(s) while loading tools:`,
      );
      result.errors.forEach((err) => {
        console.warn(`  ${err.file}: ${err.error}`);
      });
    }

    console.log(
      `Loaded ${result.count} tool(s) from ${result.filesScanned} file(s) in ${directory}`,
    );

    return result.tools;
  }

  /**
   * Internal recursive directory loading
   */
  private async loadFromDirectoryInternal(
    directory: string,
    depth: number,
  ): Promise<ToolLoadResult> {
    const result: ToolLoadResult = {
      tools: [],
      count: 0,
      errors: [],
      filesScanned: 0,
    };

    // Check max depth
    if (depth > this.config.maxDepth) {
      return result;
    }

    try {
      const entries = await readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory()) {
          // Recurse into subdirectories if enabled
          if (this.config.recursive) {
            const subResult = await this.loadFromDirectoryInternal(
              fullPath,
              depth + 1,
            );
            result.tools.push(...subResult.tools);
            result.count += subResult.count;
            result.errors.push(...subResult.errors);
            result.filesScanned += subResult.filesScanned;
          }
        } else if (entry.isFile()) {
          // Check if file matches patterns
          if (this.shouldLoadFile(entry.name)) {
            result.filesScanned++;

            try {
              const tools = await this.loadToolsFromFile(fullPath);
              result.tools.push(...tools);
              result.count += tools.length;

              // Cache loaded tools by file
              this.loadedFiles.set(fullPath, tools);
            } catch (error) {
              result.errors.push({
                file: fullPath,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      }
    } catch (error) {
      result.errors.push({
        file: directory,
        error: `Failed to read directory: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    return result;
  }

  /**
   * Load a single tool from file
   *
   * @param filePath - File path
   * @returns Promise resolving to loaded tool
   */
  async loadFromFile(filePath: string): Promise<ITool> {
    const tools = await this.loadToolsFromFile(filePath);

    if (tools.length === 0) {
      throw new Error(`No tools found in ${filePath}`);
    }

    if (tools.length > 1) {
      console.warn(
        `Multiple tools found in ${filePath}, returning first tool. Use loadToolsFromFile() to get all.`,
      );
    }

    return tools[0];
  }

  /**
   * Load all tools from a single file
   *
   * @param filePath - File path
   * @returns Promise resolving to loaded tool(s)
   */
  async loadToolsFromFile(filePath: string): Promise<ITool[]> {
    const resolvedPath = resolve(filePath);
    const tools: ITool[] = [];

    try {
      // Convert file path to URL for ES module import
      const fileUrl = pathToFileURL(resolvedPath).href;

      // Dynamically import the module
      // Add timestamp to bust cache for hot reload
      const module = await import(`${fileUrl}?t=${Date.now()}`);

      // Extract tools from module
      const extractedTools = this.extractToolsFromModule(module, filePath);
      tools.push(...extractedTools);

      // Validate tools if enabled
      if (this.config.validateAfterLoad) {
        for (const tool of tools) {
          const validationResult = this.config.validator(tool);
          if (validationResult !== true) {
            throw new Error(`Tool validation failed: ${validationResult}`);
          }
        }
      }

      // Cache loaded tools
      this.loadedFiles.set(resolvedPath, tools);
    } catch (error) {
      throw new Error(
        `Failed to load tool from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return tools;
  }

  /**
   * Reload all tools
   *
   * @returns Promise resolving to array of reloaded tools
   */
  async reload(): Promise<ITool[]> {
    const allTools: ITool[] = [];
    const filesToReload = Array.from(this.loadedFiles.keys());
    const errors: Array<{ file: string; error: string }> = [];

    // Clear cache
    this.loadedFiles.clear();

    // Reload each file
    for (const filePath of filesToReload) {
      try {
        const tools = await this.loadToolsFromFile(filePath);
        allTools.push(...tools);
      } catch (error) {
        errors.push({
          file: filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Reload directories
    for (const directory of this.watchedDirectories) {
      try {
        const tools = await this.loadFromDirectory(directory);
        allTools.push(...tools);
      } catch (error) {
        errors.push({
          file: directory,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (errors.length > 0) {
      console.warn(`Encountered ${errors.length} error(s) during reload:`);
      errors.forEach((err) => {
        console.warn(`  ${err.file}: ${err.error}`);
      });
    }

    return allTools;
  }

  /**
   * Extract tools from an imported module
   */
  private extractToolsFromModule(module: any, filePath: string): ITool[] {
    const tools: ITool[] = [];

    // Check for default export
    if (module.default && this.isTool(module.default)) {
      tools.push(module.default);
    }

    // Check for named exports
    for (const key in module) {
      if (key === "default") continue;

      const exported = module[key];

      // Check if it's a tool instance
      if (this.isTool(exported)) {
        tools.push(exported);
      }
      // Check if it's a tool class (constructor)
      else if (this.isToolClass(exported)) {
        try {
          const instance = new exported();
          if (this.isTool(instance)) {
            tools.push(instance);
          }
        } catch (error) {
          console.warn(
            `Failed to instantiate tool class ${key} from ${filePath}:`,
            error,
          );
        }
      }
    }

    if (tools.length === 0) {
      throw new Error(
        `No valid tools found in ${filePath}. Make sure to export tool instances or classes.`,
      );
    }

    return tools;
  }

  /**
   * Check if object is a valid tool
   */
  private isTool(obj: any): obj is ITool {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj.name === "string" &&
      typeof obj.description === "string" &&
      typeof obj.execute === "function" &&
      typeof obj.getDefinition === "function" &&
      typeof obj.validate === "function" &&
      typeof obj.isEnabled === "function"
    );
  }

  /**
   * Check if value is a tool class constructor
   */
  private isToolClass(value: any): boolean {
    return (
      typeof value === "function" &&
      value.prototype &&
      (typeof value.prototype.execute === "function" ||
        value.toString().includes("extends BaseTool"))
    );
  }

  /**
   * Check if file should be loaded based on patterns
   */
  private shouldLoadFile(fileName: string): boolean {
    const ext = extname(fileName);

    // Must be .js or .ts file (compiled in production)
    if (![".js", ".ts", ".mjs"].includes(ext)) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of this.config.excludePatterns) {
      if (this.matchPattern(fileName, pattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of this.config.patterns) {
      if (this.matchPattern(fileName, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching (supports * wildcard)
   */
  private matchPattern(fileName: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    const regex = new RegExp(`^${regexPattern}$`, "i");
    return regex.test(fileName);
  }

  /**
   * Get loaded files
   *
   * @returns Map of file paths to loaded tools
   */
  getLoadedFiles(): Map<string, ITool[]> {
    return new Map(this.loadedFiles);
  }

  /**
   * Get loaded file paths
   *
   * @returns Array of loaded file paths
   */
  getLoadedFilePaths(): string[] {
    return Array.from(this.loadedFiles.keys());
  }

  /**
   * Check if file is loaded
   *
   * @param filePath - File path to check
   * @returns True if file is loaded
   */
  isFileLoaded(filePath: string): boolean {
    return this.loadedFiles.has(resolve(filePath));
  }

  /**
   * Clear loaded files cache
   */
  clearCache(): void {
    this.loadedFiles.clear();
  }

  /**
   * Watch a directory for tools (for future hot reload support)
   *
   * @param directory - Directory to watch
   */
  watchDirectory(directory: string): void {
    this.watchedDirectories.add(resolve(directory));
  }

  /**
   * Unwatch a directory
   *
   * @param directory - Directory to stop watching
   */
  unwatchDirectory(directory: string): void {
    this.watchedDirectories.delete(resolve(directory));
  }

  /**
   * Get watched directories
   *
   * @returns Array of watched directory paths
   */
  getWatchedDirectories(): string[] {
    return Array.from(this.watchedDirectories);
  }

  /**
   * Get loader statistics
   *
   * @returns Loader statistics
   */
  getStats(): {
    loadedFiles: number;
    totalTools: number;
    watchedDirectories: number;
  } {
    let totalTools = 0;
    for (const tools of this.loadedFiles.values()) {
      totalTools += tools.length;
    }

    return {
      loadedFiles: this.loadedFiles.size,
      totalTools,
      watchedDirectories: this.watchedDirectories.size,
    };
  }
}

/**
 * Create a tool loader
 *
 * @param config - Loader configuration
 * @returns New tool loader instance
 */
export function createToolLoader(config?: ToolLoaderConfig): ToolLoader {
  return new ToolLoader(config);
}
