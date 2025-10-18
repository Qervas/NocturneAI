/**
 * File Search Tool
 *
 * Finds files by name or pattern in the filesystem.
 *
 * Features:
 * - Find files by exact name or glob pattern
 * - Recursive directory search
 * - Case-sensitive and case-insensitive search
 * - File type filtering
 * - Size filtering
 * - Date filtering (modified time)
 * - Exclude patterns
 * - Depth limiting
 * - Symbolic link handling
 */

import { promises as fs } from "fs";
import { resolve, relative, join, basename, extname } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
  ToolStats,
} from "../../../core/interfaces/ITool.js";

/**
 * File Search Tool Configuration
 */
export interface FileSearchToolConfig extends BaseToolConfig {
  /** Maximum number of results to return */
  maxResults?: number;

  /** Maximum search depth */
  maxDepth?: number;

  /** Base directory for searches */
  baseDirectory?: string;

  /** Default exclude patterns */
  defaultExcludes?: string[];

  /** Whether to follow symbolic links */
  followSymlinks?: boolean;
}

/**
 * File Search Tool Arguments
 */
export interface FileSearchArgs {
  /** Search pattern (glob or exact name) */
  pattern: string;

  /** Directory to search in */
  directory?: string;

  /** Whether search is case-sensitive */
  caseSensitive?: boolean;

  /** File type filter (file, directory, symlink, all) */
  fileType?: "file" | "directory" | "symlink" | "all";

  /** Patterns to exclude (e.g., "node_modules", "*.test.ts") */
  exclude?: string[];

  /** Maximum search depth (0 = current directory only) */
  maxDepth?: number;

  /** Maximum number of results to return */
  maxResults?: number;

  /** Minimum file size in bytes */
  minSize?: number;

  /** Maximum file size in bytes */
  maxSize?: number;

  /** Modified after date (ISO 8601 string) */
  modifiedAfter?: string;

  /** Modified before date (ISO 8601 string) */
  modifiedBefore?: string;

  /** File extensions to filter (e.g., ["ts", "js"]) */
  extensions?: string[];

  /** Whether to include hidden files */
  includeHidden?: boolean;

  /** Whether to return full paths */
  fullPaths?: boolean;
}

/**
 * File Search Entry
 */
export interface FileSearchEntry {
  /** File path (relative or absolute based on fullPaths option) */
  path: string;

  /** File name */
  name: string;

  /** File type */
  type: "file" | "directory" | "symlink";

  /** File size in bytes */
  size: number;

  /** Last modified date */
  modified: Date;

  /** File extension (without dot) */
  extension?: string;

  /** Search depth level */
  depth: number;
}

/**
 * File Search Result
 */
export interface FileSearchResult {
  /** Search pattern used */
  pattern: string;

  /** Total matches found */
  totalMatches: number;

  /** Found files/directories */
  entries: FileSearchEntry[];

  /** Whether results were truncated */
  truncated: boolean;

  /** Search statistics */
  statistics: {
    searchTimeMs: number;
    directoriesSearched: number;
    filesScanned: number;
    matchesByType: Record<string, number>;
  };
}

/**
 * File Search Tool
 */
export class FileSearchTool extends BaseTool {
  private readonly searchConfig: FileSearchToolConfig;

  constructor(config: Partial<FileSearchToolConfig> = {}) {
    super(
      "file_search",
      "Find files by name or pattern in the filesystem",
      {
        version: "1.0.0",
        category: "search",
        tags: ["search", "file", "find", "filesystem"],
        requiresConfirmation: false,
        hasSideEffects: false,
      },
      config,
    );

    this.searchConfig = {
      enabled: true,
      maxResults: 100,
      maxDepth: 10,
      baseDirectory: process.cwd(),
      followSymlinks: false,
      defaultExcludes: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/coverage/**",
      ],
      ...config,
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
          pattern: {
            type: "string",
            description:
              "Search pattern (glob or exact name, e.g., '*.ts', 'package.json')",
          },
          directory: {
            type: "string",
            description: "Directory to search in (default: current directory)",
          },
          caseSensitive: {
            type: "boolean",
            description: "Whether search is case-sensitive (default: false)",
          },
          fileType: {
            type: "string",
            enum: ["file", "directory", "symlink", "all"],
            description: "Type of entries to find (default: all)",
          },
          exclude: {
            type: "array",
            items: { type: "string" },
            description:
              "Patterns to exclude (e.g., ['node_modules', '*.test.ts'])",
          },
          maxDepth: {
            type: "number",
            description:
              "Maximum search depth (0 = current directory only, default: 10)",
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return (default: 100)",
          },
          minSize: {
            type: "number",
            description: "Minimum file size in bytes",
          },
          maxSize: {
            type: "number",
            description: "Maximum file size in bytes",
          },
          modifiedAfter: {
            type: "string",
            description: "Modified after date (ISO 8601 format)",
          },
          modifiedBefore: {
            type: "string",
            description: "Modified before date (ISO 8601 format)",
          },
          extensions: {
            type: "array",
            items: { type: "string" },
            description: "File extensions to filter (e.g., ['ts', 'js'])",
          },
          includeHidden: {
            type: "boolean",
            description: "Whether to include hidden files (default: false)",
          },
          fullPaths: {
            type: "boolean",
            description:
              "Whether to return full absolute paths (default: false)",
          },
        },
        required: ["pattern"],
      },
    };
  }

  /**
   * Validate arguments
   */
  validate(args: Record<string, unknown>): true | string {
    const typedArgs = args as Partial<FileSearchArgs>;

    if (!typedArgs.pattern) {
      return "pattern is required";
    }

    if (typeof typedArgs.pattern !== "string") {
      return "pattern must be a string";
    }

    if (typedArgs.pattern.trim() === "") {
      return "pattern cannot be empty";
    }

    if (
      typedArgs.directory !== undefined &&
      typeof typedArgs.directory !== "string"
    ) {
      return "directory must be a string";
    }

    if (
      typedArgs.fileType !== undefined &&
      !["file", "directory", "symlink", "all"].includes(typedArgs.fileType)
    ) {
      return "fileType must be one of: file, directory, symlink, all";
    }

    if (
      typedArgs.maxDepth !== undefined &&
      (typeof typedArgs.maxDepth !== "number" || typedArgs.maxDepth < 0)
    ) {
      return "maxDepth must be a non-negative number";
    }

    if (
      typedArgs.maxResults !== undefined &&
      (typeof typedArgs.maxResults !== "number" || typedArgs.maxResults < 1)
    ) {
      return "maxResults must be a positive number";
    }

    if (
      typedArgs.minSize !== undefined &&
      (typeof typedArgs.minSize !== "number" || typedArgs.minSize < 0)
    ) {
      return "minSize must be a non-negative number";
    }

    if (
      typedArgs.maxSize !== undefined &&
      (typeof typedArgs.maxSize !== "number" || typedArgs.maxSize < 0)
    ) {
      return "maxSize must be a non-negative number";
    }

    if (
      typedArgs.minSize !== undefined &&
      typedArgs.maxSize !== undefined &&
      typedArgs.minSize > typedArgs.maxSize
    ) {
      return "minSize cannot be greater than maxSize";
    }

    // Validate dates if provided
    if (typedArgs.modifiedAfter !== undefined) {
      const date = new Date(typedArgs.modifiedAfter);
      if (isNaN(date.getTime())) {
        return "modifiedAfter must be a valid ISO 8601 date string";
      }
    }

    if (typedArgs.modifiedBefore !== undefined) {
      const date = new Date(typedArgs.modifiedBefore);
      if (isNaN(date.getTime())) {
        return "modifiedBefore must be a valid ISO 8601 date string";
      }
    }

    return true;
  }

  /**
   * Execute the tool
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    _context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as Partial<FileSearchArgs>;
    const startTime = Date.now();

    try {
      // Validate pattern
      if (!typedArgs.pattern) {
        return {
          success: false,
          error: "pattern is required",
        };
      }

      // Resolve directory
      const searchDir = typedArgs.directory
        ? resolve(this.searchConfig.baseDirectory!, typedArgs.directory)
        : this.searchConfig.baseDirectory!;

      // Check directory exists
      try {
        const stats = await fs.stat(searchDir);
        if (!stats.isDirectory()) {
          return {
            success: false,
            error: `Path is not a directory: ${searchDir}`,
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Directory not found: ${searchDir}`,
        };
      }

      // Search configuration
      const maxResults = typedArgs.maxResults ?? this.searchConfig.maxResults!;
      const maxDepth = typedArgs.maxDepth ?? this.searchConfig.maxDepth!;
      const fileType = typedArgs.fileType ?? "all";
      const caseSensitive = typedArgs.caseSensitive === true;
      const includeHidden = typedArgs.includeHidden === true;
      const fullPaths = typedArgs.fullPaths === true;

      // Exclude patterns
      const excludePatterns = [
        ...(this.searchConfig.defaultExcludes ?? []),
        ...(typedArgs.exclude ?? []),
      ];

      // Date filters
      const modifiedAfter = typedArgs.modifiedAfter
        ? new Date(typedArgs.modifiedAfter)
        : undefined;
      const modifiedBefore = typedArgs.modifiedBefore
        ? new Date(typedArgs.modifiedBefore)
        : undefined;

      // Search for files
      const entries: FileSearchEntry[] = [];
      let directoriesSearched = 0;
      let filesScanned = 0;
      let truncated = false;
      const matchesByType: Record<string, number> = {
        file: 0,
        directory: 0,
        symlink: 0,
      };

      await this.searchDirectory(
        searchDir,
        searchDir,
        typedArgs.pattern,
        caseSensitive,
        fileType,
        excludePatterns,
        includeHidden,
        fullPaths,
        0,
        maxDepth,
        maxResults,
        typedArgs.minSize,
        typedArgs.maxSize,
        modifiedAfter,
        modifiedBefore,
        typedArgs.extensions,
        entries,
        (type) => {
          if (type === "directory") directoriesSearched++;
          else filesScanned++;
        },
        () => {
          truncated = true;
        },
        matchesByType,
      );

      const searchTimeMs = Date.now() - startTime;

      const result: FileSearchResult = {
        pattern: typedArgs.pattern!,
        totalMatches: entries.length,
        entries,
        truncated,
        statistics: {
          searchTimeMs,
          directoriesSearched,
          filesScanned,
          matchesByType,
        },
      };

      return {
        success: true,
        data: result,
        metadata: {
          toolName: this.name,
          toolVersion: this.metadata.version,
          matchesFound: entries.length,
          searchTimeMs,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `File search failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          toolName: this.name,
          toolVersion: this.metadata.version,
        },
      };
    }
  }

  /**
   * Search directory recursively
   */
  private async searchDirectory(
    directory: string,
    baseDir: string,
    pattern: string,
    caseSensitive: boolean,
    fileType: string,
    excludePatterns: string[],
    includeHidden: boolean,
    fullPaths: boolean,
    currentDepth: number,
    maxDepth: number,
    maxResults: number,
    minSize: number | undefined,
    maxSize: number | undefined,
    modifiedAfter: Date | undefined,
    modifiedBefore: Date | undefined,
    extensions: string[] | undefined,
    results: FileSearchEntry[],
    onScan: (type: "file" | "directory") => void,
    onTruncate: () => void,
    matchesByType: Record<string, number>,
  ): Promise<void> {
    // Check if we've reached max results
    if (results.length >= maxResults) {
      onTruncate();
      return;
    }

    // Check depth limit
    if (currentDepth > maxDepth) {
      return;
    }

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      onScan("directory");

      for (const entry of entries) {
        // Check if we've reached max results
        if (results.length >= maxResults) {
          onTruncate();
          return;
        }

        const fullPath = join(directory, entry.name);
        const relativePath = relative(baseDir, fullPath);

        // Skip hidden files if not included
        if (!includeHidden && entry.name.startsWith(".")) {
          continue;
        }

        // Check exclude patterns
        if (this.matchesPattern(relativePath, excludePatterns)) {
          continue;
        }

        // Get entry type
        let entryType: "file" | "directory" | "symlink";
        if (entry.isSymbolicLink()) {
          if (!this.searchConfig.followSymlinks) {
            continue;
          }
          entryType = "symlink";
        } else if (entry.isDirectory()) {
          entryType = "directory";
        } else {
          entryType = "file";
          onScan("file");
        }

        // Check file type filter
        if (fileType !== "all" && entryType !== fileType) {
          if (entry.isDirectory()) {
            // Still recurse into directories
            await this.searchDirectory(
              fullPath,
              baseDir,
              pattern,
              caseSensitive,
              fileType,
              excludePatterns,
              includeHidden,
              fullPaths,
              currentDepth + 1,
              maxDepth,
              maxResults,
              minSize,
              maxSize,
              modifiedAfter,
              modifiedBefore,
              extensions,
              results,
              onScan,
              onTruncate,
              matchesByType,
            );
          }
          continue;
        }

        // Check if name matches pattern
        if (!this.matchesSearchPattern(entry.name, pattern, caseSensitive)) {
          // Still recurse into directories
          if (entry.isDirectory()) {
            await this.searchDirectory(
              fullPath,
              baseDir,
              pattern,
              caseSensitive,
              fileType,
              excludePatterns,
              includeHidden,
              fullPaths,
              currentDepth + 1,
              maxDepth,
              maxResults,
              minSize,
              maxSize,
              modifiedAfter,
              modifiedBefore,
              extensions,
              results,
              onScan,
              onTruncate,
              matchesByType,
            );
          }
          continue;
        }

        // Get file stats
        let stats;
        try {
          stats = await fs.stat(fullPath);
        } catch {
          continue; // Skip files we can't stat
        }

        // Apply filters for files
        if (entryType === "file") {
          // Size filter
          if (minSize !== undefined && stats.size < minSize) {
            continue;
          }
          if (maxSize !== undefined && stats.size > maxSize) {
            continue;
          }

          // Modified date filter
          if (modifiedAfter && stats.mtime < modifiedAfter) {
            continue;
          }
          if (modifiedBefore && stats.mtime > modifiedBefore) {
            continue;
          }

          // Extension filter
          if (extensions && extensions.length > 0) {
            const ext = extname(entry.name).slice(1).toLowerCase();
            if (!extensions.includes(ext)) {
              continue;
            }
          }
        }

        // Add to results
        const extension =
          entryType === "file" ? extname(entry.name).slice(1) : undefined;
        results.push({
          path: fullPaths ? fullPath : relativePath,
          name: entry.name,
          type: entryType,
          size: stats.size,
          modified: stats.mtime,
          extension,
          depth: currentDepth,
        });
        matchesByType[entryType]++;

        // Recurse into directories
        if (entry.isDirectory()) {
          await this.searchDirectory(
            fullPath,
            baseDir,
            pattern,
            caseSensitive,
            fileType,
            excludePatterns,
            includeHidden,
            fullPaths,
            currentDepth + 1,
            maxDepth,
            maxResults,
            minSize,
            maxSize,
            modifiedAfter,
            modifiedBefore,
            extensions,
            results,
            onScan,
            onTruncate,
            matchesByType,
          );
        }
      }
    } catch (error) {
      // Skip directories we can't read
      return;
    }
  }

  /**
   * Check if name matches search pattern
   */
  private matchesSearchPattern(
    name: string,
    pattern: string,
    caseSensitive: boolean,
  ): boolean {
    const normalizedName = caseSensitive ? name : name.toLowerCase();
    const normalizedPattern = caseSensitive ? pattern : pattern.toLowerCase();

    // Convert glob pattern to regex
    const regexPattern = normalizedPattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    return new RegExp(`^${regexPattern}$`).test(normalizedName);
  }

  /**
   * Check if path matches any pattern
   */
  private matchesPattern(path: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
      return false;
    }

    const normalizedPath = path.replace(/\\/g, "/");

    return patterns.some((pattern) => {
      const normalizedPattern = pattern.replace(/\\/g, "/");
      const regexPattern = normalizedPattern
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, "<<<DOUBLESTAR>>>")
        .replace(/\*/g, "[^/]*")
        .replace(/<<<DOUBLESTAR>>>/g, ".*")
        .replace(/\?/g, ".");

      return new RegExp(`^${regexPattern}$`).test(normalizedPath);
    });
  }

  /**
   * Get tool statistics
   */
  getStats(): ToolStats & {
    searchConfig: FileSearchToolConfig;
  } {
    return {
      ...this.stats,
      searchConfig: this.searchConfig,
    };
  }
}
