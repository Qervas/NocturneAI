/**
 * Code Search Tool
 *
 * Searches for patterns in code files using regex/grep-like functionality.
 *
 * Features:
 * - Regex pattern matching in file contents
 * - Context lines (before/after matches)
 * - Case-sensitive and case-insensitive search
 * - File type filtering
 * - Recursive directory search
 * - Line number reporting
 * - Match count limiting
 * - Exclude patterns (e.g., node_modules)
 */

import { promises as fs } from "fs";
import { resolve, relative, join } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
  ToolStats,
} from "../../../core/interfaces/ITool.js";

/**
 * Code Search Tool Configuration
 */
export interface CodeSearchToolConfig extends BaseToolConfig {
  /** Maximum number of matches to return */
  maxMatches?: number;

  /** Maximum file size to search (bytes) */
  maxFileSize?: number;

  /** Base directory for searches */
  baseDirectory?: string;

  /** Default exclude patterns */
  defaultExcludes?: string[];

  /** Maximum context lines */
  maxContextLines?: number;
}

/**
 * Code Search Tool Arguments
 */
export interface CodeSearchArgs {
  /** Search pattern (regex) */
  pattern: string;

  /** Directory to search in */
  directory?: string;

  /** File patterns to include (e.g., "*.ts", "*.js") */
  include?: string[];

  /** Patterns to exclude (e.g., "node_modules", "*.test.ts") */
  exclude?: string[];

  /** Whether search is case-sensitive */
  caseSensitive?: boolean;

  /** Number of lines before match to include */
  contextBefore?: number;

  /** Number of lines after match to include */
  contextAfter?: number;

  /** Maximum number of matches to return */
  maxMatches?: number;

  /** Whether to search recursively */
  recursive?: boolean;

  /** File extensions to search (e.g., ["ts", "js"]) */
  fileExtensions?: string[];

  /** Whether to return whole file content for matches */
  wholeFiles?: boolean;
}

/**
 * Search Match
 */
export interface SearchMatch {
  /** File path */
  file: string;

  /** Line number (1-based) */
  line: number;

  /** Column number (1-based) */
  column: number;

  /** Matched text */
  match: string;

  /** Full line content */
  lineContent: string;

  /** Context lines before */
  contextBefore?: string[];

  /** Context lines after */
  contextAfter?: string[];
}

/**
 * Code Search Result
 */
export interface CodeSearchResult {
  /** Search pattern used */
  pattern: string;

  /** Total matches found */
  totalMatches: number;

  /** Number of files searched */
  filesSearched: number;

  /** Number of files with matches */
  filesWithMatches: number;

  /** Search matches */
  matches: SearchMatch[];

  /** Whether results were truncated */
  truncated: boolean;

  /** Search statistics */
  statistics: {
    searchTimeMs: number;
    matchesPerFile: Record<string, number>;
  };
}

/**
 * Code Search Tool
 */
export class CodeSearchTool extends BaseTool {
  private readonly searchConfig: CodeSearchToolConfig;

  constructor(config: Partial<CodeSearchToolConfig> = {}) {
    super(
      "code_search",
      "Search for patterns in code files using regex",
      {
        version: "1.0.0",
        category: "search",
        tags: ["search", "grep", "regex", "code"],
        requiresConfirmation: false,
        hasSideEffects: false,
      },
      config,
    );

    this.searchConfig = {
      enabled: true,
      maxMatches: 100,
      maxFileSize: 1024 * 1024, // 1MB
      maxContextLines: 5,
      baseDirectory: process.cwd(),
      defaultExcludes: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/coverage/**",
        "**/*.min.js",
        "**/*.map",
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
            description: "Regex pattern to search for in file contents",
          },
          directory: {
            type: "string",
            description: "Directory to search in (default: current directory)",
          },
          include: {
            type: "array",
            items: { type: "string" },
            description: "File patterns to include (e.g., ['*.ts', '*.js'])",
          },
          exclude: {
            type: "array",
            items: { type: "string" },
            description:
              "Patterns to exclude (e.g., ['node_modules', '*.test.ts'])",
          },
          caseSensitive: {
            type: "boolean",
            description: "Whether search is case-sensitive (default: false)",
          },
          contextBefore: {
            type: "number",
            description: "Number of lines before match to include (default: 2)",
          },
          contextAfter: {
            type: "number",
            description: "Number of lines after match to include (default: 2)",
          },
          maxMatches: {
            type: "number",
            description: "Maximum number of matches to return (default: 100)",
          },
          recursive: {
            type: "boolean",
            description: "Whether to search recursively (default: true)",
          },
          fileExtensions: {
            type: "array",
            items: { type: "string" },
            description: "File extensions to search (e.g., ['ts', 'js'])",
          },
          wholeFiles: {
            type: "boolean",
            description:
              "Whether to return whole file content for matches (default: false)",
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
    const typedArgs = args as Partial<CodeSearchArgs>;

    if (!typedArgs.pattern) {
      return "pattern is required";
    }

    if (typeof typedArgs.pattern !== "string") {
      return "pattern must be a string";
    }

    if (typedArgs.pattern.trim() === "") {
      return "pattern cannot be empty";
    }

    // Validate regex pattern
    try {
      new RegExp(typedArgs.pattern);
    } catch (error) {
      return `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`;
    }

    if (
      typedArgs.directory !== undefined &&
      typeof typedArgs.directory !== "string"
    ) {
      return "directory must be a string";
    }

    if (
      typedArgs.maxMatches !== undefined &&
      (typeof typedArgs.maxMatches !== "number" || typedArgs.maxMatches < 1)
    ) {
      return "maxMatches must be a positive number";
    }

    if (
      typedArgs.contextBefore !== undefined &&
      (typeof typedArgs.contextBefore !== "number" ||
        typedArgs.contextBefore < 0)
    ) {
      return "contextBefore must be a non-negative number";
    }

    if (
      typedArgs.contextAfter !== undefined &&
      (typeof typedArgs.contextAfter !== "number" || typedArgs.contextAfter < 0)
    ) {
      return "contextAfter must be a non-negative number";
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
    const typedArgs = args as Partial<CodeSearchArgs>;
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

      // Build regex
      const flags = typedArgs.caseSensitive === true ? "g" : "gi";
      const regex = new RegExp(typedArgs.pattern, flags);

      // Search configuration
      const maxMatches = typedArgs.maxMatches ?? this.searchConfig.maxMatches!;
      const contextBefore = Math.min(
        typedArgs.contextBefore ?? 2,
        this.searchConfig.maxContextLines!,
      );
      const contextAfter = Math.min(
        typedArgs.contextAfter ?? 2,
        this.searchConfig.maxContextLines!,
      );
      const recursive = typedArgs.recursive !== false;

      // Exclude patterns
      const excludePatterns = [
        ...(this.searchConfig.defaultExcludes ?? []),
        ...(typedArgs.exclude ?? []),
      ];

      // Collect files to search
      const filesToSearch = await this.collectFiles(
        searchDir,
        recursive,
        typedArgs.include,
        excludePatterns,
        typedArgs.fileExtensions,
      );

      // Search files
      const matches: SearchMatch[] = [];
      const matchesPerFile: Record<string, number> = {};
      let filesWithMatches = 0;
      let truncated = false;

      for (const file of filesToSearch) {
        if (matches.length >= maxMatches) {
          truncated = true;
          break;
        }

        const fileMatches = await this.searchFile(
          file,
          regex,
          contextBefore,
          contextAfter,
          maxMatches - matches.length,
          searchDir,
        );

        if (fileMatches.length > 0) {
          matches.push(...fileMatches);
          matchesPerFile[relative(searchDir, file)] = fileMatches.length;
          filesWithMatches++;
        }
      }

      const searchTimeMs = Date.now() - startTime;

      const result: CodeSearchResult = {
        pattern: typedArgs.pattern!,
        totalMatches: matches.length,
        filesSearched: filesToSearch.length,
        filesWithMatches,
        matches,
        truncated,
        statistics: {
          searchTimeMs,
          matchesPerFile,
        },
      };

      return {
        success: true,
        data: result,
        metadata: {
          toolName: this.name,
          toolVersion: this.metadata.version,
          filesSearched: filesToSearch.length,
          matchesFound: matches.length,
          searchTimeMs,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Code search failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          toolName: this.name,
          toolVersion: this.metadata.version,
        },
      };
    }
  }

  /**
   * Collect files to search
   */
  private async collectFiles(
    directory: string,
    recursive: boolean,
    includePatterns?: string[],
    excludePatterns?: string[],
    fileExtensions?: string[],
  ): Promise<string[]> {
    const files: string[] = [];

    const walkDir = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = relative(directory, fullPath);

        // Check exclude patterns
        if (this.matchesPattern(relativePath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          if (recursive) {
            await walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          // Check file extension
          if (fileExtensions && fileExtensions.length > 0) {
            const ext = entry.name.split(".").pop()?.toLowerCase();
            if (!ext || !fileExtensions.includes(ext)) {
              continue;
            }
          }

          // Check include patterns
          if (
            !includePatterns ||
            includePatterns.length === 0 ||
            this.matchesPattern(relativePath, includePatterns)
          ) {
            // Check file size
            try {
              const stats = await fs.stat(fullPath);
              if (stats.size <= this.searchConfig.maxFileSize!) {
                files.push(fullPath);
              }
            } catch {
              // Skip files we can't stat
            }
          }
        }
      }
    };

    await walkDir(directory);
    return files;
  }

  /**
   * Check if path matches any pattern
   */
  private matchesPattern(path: string, patterns?: string[]): boolean {
    if (!patterns || patterns.length === 0) {
      return false;
    }

    const normalizedPath = path.replace(/\\/g, "/");

    return patterns.some((pattern) => {
      const normalizedPattern = pattern.replace(/\\/g, "/");
      const regexPattern = normalizedPattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".");

      return new RegExp(`^${regexPattern}$`).test(normalizedPath);
    });
  }

  /**
   * Search a single file
   */
  private async searchFile(
    filePath: string,
    regex: RegExp,
    contextBefore: number,
    contextAfter: number,
    maxMatches: number,
    baseDir: string,
  ): Promise<SearchMatch[]> {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const lines = content.split("\n");
      const matches: SearchMatch[] = [];
      const relativePath = relative(baseDir, filePath);

      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= maxMatches) {
          break;
        }

        const line = lines[i];
        const lineMatches = Array.from(line.matchAll(regex));

        for (const match of lineMatches) {
          if (matches.length >= maxMatches) {
            break;
          }

          const column = (match.index ?? 0) + 1;
          const contextBeforeLines =
            contextBefore > 0
              ? lines.slice(Math.max(0, i - contextBefore), i)
              : undefined;
          const contextAfterLines =
            contextAfter > 0
              ? lines.slice(i + 1, i + 1 + contextAfter)
              : undefined;

          matches.push({
            file: relativePath,
            line: i + 1,
            column,
            match: match[0],
            lineContent: line,
            contextBefore: contextBeforeLines,
            contextAfter: contextAfterLines,
          });
        }
      }

      return matches;
    } catch (error) {
      // Skip files we can't read (binary, permissions, etc.)
      return [];
    }
  }

  /**
   * Get tool statistics
   */
  getStats(): ToolStats & {
    searchConfig: CodeSearchToolConfig;
  } {
    return {
      ...this.stats,
      searchConfig: this.searchConfig,
    };
  }
}
