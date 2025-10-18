/**
 * File List Tool
 *
 * Lists files and directories in a specified path.
 *
 * Features:
 * - List files and directories
 * - Recursive listing support
 * - Pattern matching (glob support)
 * - File type filtering
 * - Detailed metadata options
 * - Sort by various criteria
 */

import { promises as fs } from "fs";
import { resolve, isAbsolute, join, relative } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
} from "../../../core/interfaces/ITool.js";

/**
 * File List Tool Configuration
 */
export interface FileListToolConfig extends BaseToolConfig {
  /** Base directory for relative paths */
  baseDirectory?: string;

  /** Whether to allow absolute paths */
  allowAbsolutePaths?: boolean;

  /** Maximum depth for recursive listings */
  maxDepth?: number;

  /** Maximum number of items to return */
  maxItems?: number;
}

/**
 * File Type
 */
export type FileType = "file" | "directory" | "symlink" | "all";

/**
 * Sort Criteria
 */
export type SortBy = "name" | "size" | "modified" | "created" | "type";

/**
 * File List Tool Arguments
 */
export interface FileListArgs {
  /** Path to the directory */
  path: string;

  /** Whether to list recursively */
  recursive?: boolean;

  /** Maximum recursion depth (requires recursive: true) */
  maxDepth?: number;

  /** File type filter */
  fileType?: FileType;

  /** Pattern to match (supports * and ? wildcards) */
  pattern?: string;

  /** Whether to include hidden files (starting with .) */
  includeHidden?: boolean;

  /** Whether to include detailed metadata */
  includeMetadata?: boolean;

  /** Sort by criteria */
  sortBy?: SortBy;

  /** Sort order */
  sortOrder?: "asc" | "desc";

  /** Maximum number of items to return */
  limit?: number;
}

/**
 * File Entry
 */
export interface FileEntry {
  /** File/directory name */
  name: string;

  /** Relative path from listing root */
  path: string;

  /** File type */
  type: "file" | "directory" | "symlink";

  /** File metadata (if requested) */
  metadata?: {
    size: number;
    modified: Date;
    created: Date;
    permissions: string;
    isReadable: boolean;
    isWritable: boolean;
  };
}

/**
 * File List Tool Result
 */
export interface FileListResult {
  /** Path that was listed */
  path: string;

  /** Array of file entries */
  entries: FileEntry[];

  /** Total number of entries (before limit) */
  total: number;

  /** Whether results were truncated */
  truncated: boolean;
}

/**
 * File List Tool
 */
export class FileListTool extends BaseTool {
  private readonly fileConfig: FileListToolConfig;

  constructor(config: Partial<FileListToolConfig> = {}) {
    super(
      "file_list",
      "List files and directories in a specified path",
      {
        version: "1.0.0",
        category: "filesystem",
        tags: ["file", "directory", "list", "ls", "io"],
        requiresConfirmation: false,
        hasSideEffects: false,
      },
      config,
    );

    this.fileConfig = {
      ...this.config,
      baseDirectory: config.baseDirectory,
      allowAbsolutePaths: config.allowAbsolutePaths !== false,
      maxDepth: config.maxDepth || 10,
      maxItems: config.maxItems || 1000,
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
          path: {
            type: "string",
            description: "Path to the directory to list (relative or absolute)",
          },
          recursive: {
            type: "boolean",
            description: "Whether to list directories recursively",
          },
          maxDepth: {
            type: "number",
            description: "Maximum recursion depth (requires recursive: true)",
          },
          fileType: {
            type: "string",
            description: "Filter by file type",
            enum: ["file", "directory", "symlink", "all"],
          },
          pattern: {
            type: "string",
            description:
              "Pattern to match file names (supports * and ? wildcards)",
          },
          includeHidden: {
            type: "boolean",
            description: "Whether to include hidden files (starting with .)",
          },
          includeMetadata: {
            type: "boolean",
            description: "Whether to include detailed file metadata",
          },
          sortBy: {
            type: "string",
            description: "Sort entries by criteria",
            enum: ["name", "size", "modified", "created", "type"],
          },
          sortOrder: {
            type: "string",
            description: "Sort order",
            enum: ["asc", "desc"],
          },
          limit: {
            type: "number",
            description: "Maximum number of items to return",
          },
        },
        required: ["path"],
      },
    };
  }

  /**
   * Validate arguments
   */
  validate(args: Record<string, unknown>): boolean | string {
    // Validate path
    const pathValidation = this.validateString(args, "path", {
      required: true,
      minLength: 1,
    });
    if (pathValidation !== true) return pathValidation;

    // Validate boolean flags
    const recursiveValidation = this.validateBoolean(args, "recursive");
    if (recursiveValidation !== true) return recursiveValidation;

    const hiddenValidation = this.validateBoolean(args, "includeHidden");
    if (hiddenValidation !== true) return hiddenValidation;

    const metadataValidation = this.validateBoolean(args, "includeMetadata");
    if (metadataValidation !== true) return metadataValidation;

    // Validate maxDepth if provided
    if (args.maxDepth !== undefined) {
      const maxDepthValidation = this.validateNumber(args, "maxDepth", {
        min: 1,
        max: this.fileConfig.maxDepth,
        integer: true,
      });
      if (maxDepthValidation !== true) return maxDepthValidation;
    }

    // Validate limit if provided
    if (args.limit !== undefined) {
      const limitValidation = this.validateNumber(args, "limit", {
        min: 1,
        max: this.fileConfig.maxItems,
        integer: true,
      });
      if (limitValidation !== true) return limitValidation;
    }

    // Validate fileType if provided
    if (args.fileType !== undefined) {
      const validTypes = ["file", "directory", "symlink", "all"];
      if (!validTypes.includes(args.fileType as string)) {
        return `Invalid fileType. Must be one of: ${validTypes.join(", ")}`;
      }
    }

    // Validate sortBy if provided
    if (args.sortBy !== undefined) {
      const validSortBy = ["name", "size", "modified", "created", "type"];
      if (!validSortBy.includes(args.sortBy as string)) {
        return `Invalid sortBy. Must be one of: ${validSortBy.join(", ")}`;
      }
    }

    // Validate sortOrder if provided
    if (args.sortOrder !== undefined) {
      const validSortOrder = ["asc", "desc"];
      if (!validSortOrder.includes(args.sortOrder as string)) {
        return `Invalid sortOrder. Must be one of: ${validSortOrder.join(", ")}`;
      }
    }

    // Validate pattern if provided
    if (args.pattern !== undefined) {
      const patternValidation = this.validateString(args, "pattern", {
        minLength: 1,
      });
      if (patternValidation !== true) return patternValidation;
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
    const typedArgs = args as unknown as FileListArgs;

    try {
      // Resolve directory path
      const dirPath = this.resolvePath(typedArgs.path, context);

      // Check if path is allowed
      if (!this.fileConfig.allowAbsolutePaths && isAbsolute(typedArgs.path)) {
        return this.error("Absolute paths are not allowed");
      }

      // Check directory exists
      try {
        await fs.access(dirPath);
      } catch {
        return this.error(`Directory not found: ${typedArgs.path}`);
      }

      // Check if it's a directory
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        return this.error(`Path is not a directory: ${typedArgs.path}`);
      }

      // List files
      const maxDepth = typedArgs.maxDepth || this.fileConfig.maxDepth!;
      const entries = typedArgs.recursive
        ? await this.listRecursive(dirPath, dirPath, 0, maxDepth, typedArgs)
        : await this.listDirectory(dirPath, dirPath, typedArgs);

      // Filter by file type
      let filteredEntries = entries;
      if (typedArgs.fileType && typedArgs.fileType !== "all") {
        filteredEntries = entries.filter(
          (entry) => entry.type === typedArgs.fileType,
        );
      }

      // Filter by pattern
      if (typedArgs.pattern) {
        const regex = this.globToRegex(typedArgs.pattern);
        filteredEntries = filteredEntries.filter((entry) =>
          regex.test(entry.name),
        );
      }

      // Filter hidden files
      if (!typedArgs.includeHidden) {
        filteredEntries = filteredEntries.filter(
          (entry) => !entry.name.startsWith("."),
        );
      }

      // Sort entries
      if (typedArgs.sortBy) {
        filteredEntries = this.sortEntries(
          filteredEntries,
          typedArgs.sortBy,
          typedArgs.sortOrder || "asc",
        );
      }

      // Apply limit
      const limit = typedArgs.limit || this.fileConfig.maxItems!;
      const total = filteredEntries.length;
      const truncated = total > limit;
      const limitedEntries = filteredEntries.slice(0, limit);

      // Build result
      const result: FileListResult = {
        path: dirPath,
        entries: limitedEntries,
        total,
        truncated,
      };

      return this.success(result, {
        entriesReturned: limitedEntries.length,
        totalEntries: total,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.error(`Failed to list directory: ${message}`);
    }
  }

  /**
   * List directory (non-recursive)
   */
  private async listDirectory(
    dirPath: string,
    rootPath: string,
    args: FileListArgs,
  ): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const items = await fs.readdir(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const entry = await this.createFileEntry(itemPath, rootPath, args);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * List directory recursively
   */
  private async listRecursive(
    dirPath: string,
    rootPath: string,
    currentDepth: number,
    maxDepth: number,
    args: FileListArgs,
  ): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];

    if (currentDepth >= maxDepth) {
      return entries;
    }

    const items = await fs.readdir(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const entry = await this.createFileEntry(itemPath, rootPath, args);

      if (entry) {
        entries.push(entry);

        // Recurse into directories
        if (entry.type === "directory") {
          const subEntries = await this.listRecursive(
            itemPath,
            rootPath,
            currentDepth + 1,
            maxDepth,
            args,
          );
          entries.push(...subEntries);
        }
      }
    }

    return entries;
  }

  /**
   * Create file entry
   */
  private async createFileEntry(
    itemPath: string,
    rootPath: string,
    args: FileListArgs,
  ): Promise<FileEntry | null> {
    try {
      const stats = await fs.stat(itemPath);
      const name = itemPath.split("/").pop() || itemPath;
      const relativePath = relative(rootPath, itemPath);

      const entry: FileEntry = {
        name,
        path: relativePath || name,
        type: stats.isDirectory()
          ? "directory"
          : stats.isSymbolicLink()
            ? "symlink"
            : "file",
      };

      // Add metadata if requested
      if (args.includeMetadata) {
        entry.metadata = {
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
          permissions: stats.mode.toString(8).slice(-3),
          isReadable: await this.checkReadable(itemPath),
          isWritable: await this.checkWritable(itemPath),
        };
      }

      return entry;
    } catch {
      // Skip items that can't be accessed
      return null;
    }
  }

  /**
   * Check if file is readable
   */
  private async checkReadable(path: string): Promise<boolean> {
    try {
      await fs.access(path, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file is writable
   */
  private async checkWritable(path: string): Promise<boolean> {
    try {
      await fs.access(path, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert glob pattern to regex
   */
  private globToRegex(pattern: string): RegExp {
    let regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${regexPattern}$`, "i");
  }

  /**
   * Sort entries
   */
  private sortEntries(
    entries: FileEntry[],
    sortBy: SortBy,
    sortOrder: "asc" | "desc",
  ): FileEntry[] {
    const sorted = [...entries].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "size":
          comparison = (a.metadata?.size || 0) - (b.metadata?.size || 0);
          break;
        case "modified":
          comparison =
            (a.metadata?.modified.getTime() || 0) -
            (b.metadata?.modified.getTime() || 0);
          break;
        case "created":
          comparison =
            (a.metadata?.created.getTime() || 0) -
            (b.metadata?.created.getTime() || 0);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Resolve directory path
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
    if (this.fileConfig.baseDirectory) {
      return resolve(this.fileConfig.baseDirectory, path);
    }

    // Use process cwd as fallback
    return resolve(process.cwd(), path);
  }
}
