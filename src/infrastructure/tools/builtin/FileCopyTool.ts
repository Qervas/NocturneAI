/**
 * File Copy Tool
 *
 * Copies files and directories on the filesystem.
 *
 * Features:
 * - Copy files and directories
 * - Recursive directory copying
 * - Overwrite protection
 * - Automatic directory creation
 * - Preserve file attributes option
 * - Pattern-based filtering
 */

import { promises as fs } from "fs";
import { resolve, isAbsolute, dirname, join } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
} from "../../../core/interfaces/ITool.js";

/**
 * File Copy Tool Configuration
 */
export interface FileCopyToolConfig extends BaseToolConfig {
  /** Base directory for relative paths */
  baseDirectory?: string;

  /** Whether to allow absolute paths */
  allowAbsolutePaths?: boolean;

  /** Whether to create destination directories automatically */
  createDirectories?: boolean;

  /** Whether to allow overwriting existing files */
  allowOverwrite?: boolean;

  /** Whether to preserve file attributes by default */
  preserveAttributes?: boolean;
}

/**
 * File Copy Tool Arguments
 */
export interface FileCopyArgs {
  /** Source path */
  source: string;

  /** Destination path */
  destination: string;

  /** Whether to copy directories recursively */
  recursive?: boolean;

  /** Whether to overwrite if destination exists */
  overwrite?: boolean;

  /** Whether to create destination directories if they don't exist */
  createDirs?: boolean;

  /** Whether to preserve file timestamps and permissions */
  preserveAttributes?: boolean;

  /** Pattern to filter files (for directory copies) */
  pattern?: string;

  /** Whether to include hidden files */
  includeHidden?: boolean;
}

/**
 * File Copy Tool Result
 */
export interface FileCopyResult {
  /** Source path */
  source: string;

  /** Destination path */
  destination: string;

  /** Type of item copied */
  type: "file" | "directory";

  /** Number of items copied */
  itemsCopied: number;

  /** Total bytes copied */
  bytesCopied: number;

  /** Whether any existing files were overwritten */
  overwritten: boolean;
}

/**
 * File Copy Tool
 */
export class FileCopyTool extends BaseTool {
  private readonly fileConfig: FileCopyToolConfig;

  constructor(config: Partial<FileCopyToolConfig> = {}) {
    super(
      "file_copy",
      "Copy a file or directory on the filesystem",
      {
        version: "1.0.0",
        category: "filesystem",
        tags: ["file", "copy", "duplicate", "io"],
        requiresConfirmation: false,
        hasSideEffects: true,
      },
      config,
    );

    this.fileConfig = {
      ...this.config,
      baseDirectory: config.baseDirectory,
      allowAbsolutePaths: config.allowAbsolutePaths !== false,
      createDirectories: config.createDirectories !== false,
      allowOverwrite: config.allowOverwrite || false,
      preserveAttributes: config.preserveAttributes !== false,
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
          source: {
            type: "string",
            description:
              "Source path of the file or directory to copy (relative or absolute)",
          },
          destination: {
            type: "string",
            description:
              "Destination path where the file or directory should be copied (relative or absolute)",
          },
          recursive: {
            type: "boolean",
            description:
              "Whether to copy directories recursively (required for directories)",
          },
          overwrite: {
            type: "boolean",
            description:
              "Whether to overwrite the destination if it already exists",
          },
          createDirs: {
            type: "boolean",
            description:
              "Whether to create destination directories if they don't exist",
          },
          preserveAttributes: {
            type: "boolean",
            description: "Whether to preserve file timestamps and permissions",
          },
          pattern: {
            type: "string",
            description:
              "Pattern to filter files during directory copy (supports * and ? wildcards)",
          },
          includeHidden: {
            type: "boolean",
            description:
              "Whether to include hidden files (starting with .) when copying directories",
          },
        },
        required: ["source", "destination"],
      },
    };
  }

  /**
   * Validate arguments
   */
  validate(args: Record<string, unknown>): boolean | string {
    // Validate source
    const sourceValidation = this.validateString(args, "source", {
      required: true,
      minLength: 1,
    });
    if (sourceValidation !== true) return sourceValidation;

    // Validate destination
    const destValidation = this.validateString(args, "destination", {
      required: true,
      minLength: 1,
    });
    if (destValidation !== true) return destValidation;

    // Check that source and destination are different
    if (args.source === args.destination) {
      return "Source and destination cannot be the same";
    }

    // Validate boolean flags
    const recursiveValidation = this.validateBoolean(args, "recursive");
    if (recursiveValidation !== true) return recursiveValidation;

    const overwriteValidation = this.validateBoolean(args, "overwrite");
    if (overwriteValidation !== true) return overwriteValidation;

    const createDirsValidation = this.validateBoolean(args, "createDirs");
    if (createDirsValidation !== true) return createDirsValidation;

    const preserveValidation = this.validateBoolean(args, "preserveAttributes");
    if (preserveValidation !== true) return preserveValidation;

    const hiddenValidation = this.validateBoolean(args, "includeHidden");
    if (hiddenValidation !== true) return hiddenValidation;

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
    const typedArgs = args as unknown as FileCopyArgs;

    try {
      // Resolve paths
      const sourcePath = this.resolvePath(typedArgs.source, context);
      const destPath = this.resolvePath(typedArgs.destination, context);

      // Check if paths are allowed
      if (!this.fileConfig.allowAbsolutePaths) {
        if (isAbsolute(typedArgs.source)) {
          return this.error("Absolute source paths are not allowed");
        }
        if (isAbsolute(typedArgs.destination)) {
          return this.error("Absolute destination paths are not allowed");
        }
      }

      // Check source exists
      let sourceStats;
      try {
        sourceStats = await fs.stat(sourcePath);
      } catch {
        return this.error(`Source not found: ${typedArgs.source}`);
      }

      const isDirectory = sourceStats.isDirectory();
      const type = isDirectory ? "directory" : "file";

      // Check if source and destination are the same (after resolution)
      if (sourcePath === destPath) {
        return this.error("Source and destination resolve to the same path");
      }

      // Check if destination is inside source (for directory copies)
      if (isDirectory && destPath.startsWith(sourcePath + "/")) {
        return this.error("Cannot copy directory into itself");
      }

      // Check if recursive is needed for directories
      if (isDirectory && !typedArgs.recursive) {
        return this.error("recursive: true is required to copy directories");
      }

      // Check if destination exists
      let destExists = false;
      try {
        await fs.stat(destPath);
        destExists = true;
      } catch {
        // Destination doesn't exist, which is fine
      }

      // Handle existing destination
      let overwritten = false;
      if (destExists) {
        // Check if overwrite is allowed
        const allowOverwrite =
          typedArgs.overwrite !== undefined
            ? typedArgs.overwrite
            : this.fileConfig.allowOverwrite;

        if (!allowOverwrite) {
          return this.error(
            `Destination already exists: ${typedArgs.destination}. Use overwrite: true to replace it`,
          );
        }

        overwritten = true;

        // Delete existing destination
        const destStats = await fs.stat(destPath);
        if (destStats.isDirectory()) {
          await fs.rm(destPath, { recursive: true, force: true });
        } else {
          await fs.unlink(destPath);
        }
      }

      // Ensure destination directory exists
      const destDir = dirname(destPath);
      const shouldCreateDirs =
        typedArgs.createDirs !== undefined
          ? typedArgs.createDirs
          : this.fileConfig.createDirectories;

      if (shouldCreateDirs) {
        await fs.mkdir(destDir, { recursive: true });
      } else {
        // Check if directory exists
        try {
          await fs.access(destDir);
        } catch {
          return this.error(`Destination directory does not exist: ${destDir}`);
        }
      }

      // Perform the copy
      const preserveAttributes =
        typedArgs.preserveAttributes !== undefined
          ? typedArgs.preserveAttributes
          : this.fileConfig.preserveAttributes;

      let itemsCopied = 0;
      let bytesCopied = 0;

      if (isDirectory) {
        const stats = await this.copyDirectory(
          sourcePath,
          destPath,
          preserveAttributes || false,
          typedArgs.pattern,
          typedArgs.includeHidden !== false,
        );
        itemsCopied = stats.itemsCopied;
        bytesCopied = stats.bytesCopied;
      } else {
        await this.copyFile(sourcePath, destPath, preserveAttributes || false);
        itemsCopied = 1;
        bytesCopied = sourceStats.size;
      }

      // Build result
      const result: FileCopyResult = {
        source: sourcePath,
        destination: destPath,
        type,
        itemsCopied,
        bytesCopied,
        overwritten,
      };

      return this.success(result, {
        operation: "copy",
        type,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.error(`Failed to copy: ${message}`);
    }
  }

  /**
   * Copy a single file
   */
  private async copyFile(
    src: string,
    dest: string,
    preserveAttributes: boolean,
  ): Promise<void> {
    // Copy file content
    await fs.copyFile(src, dest);

    // Preserve attributes if requested
    if (preserveAttributes) {
      try {
        const stats = await fs.stat(src);
        await fs.chmod(dest, stats.mode);
        await fs.utimes(dest, stats.atime, stats.mtime);
      } catch {
        // If preserving attributes fails, continue anyway
      }
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(
    src: string,
    dest: string,
    preserveAttributes: boolean,
    pattern?: string,
    includeHidden: boolean = true,
  ): Promise<{ itemsCopied: number; bytesCopied: number }> {
    let itemsCopied = 0;
    let bytesCopied = 0;

    // Create destination directory
    await fs.mkdir(dest, { recursive: true });
    itemsCopied++;

    // Preserve directory attributes if requested
    if (preserveAttributes) {
      try {
        const stats = await fs.stat(src);
        await fs.chmod(dest, stats.mode);
        await fs.utimes(dest, stats.atime, stats.mtime);
      } catch {
        // If preserving attributes fails, continue anyway
      }
    }

    // Read directory entries
    const entries = await fs.readdir(src, { withFileTypes: true });

    // Create pattern regex if provided
    const patternRegex = pattern ? this.globToRegex(pattern) : null;

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      // Skip hidden files if not included
      if (!includeHidden && entry.name.startsWith(".")) {
        continue;
      }

      // Skip files that don't match pattern
      if (
        patternRegex &&
        !entry.isDirectory() &&
        !patternRegex.test(entry.name)
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively copy subdirectory
        const subStats = await this.copyDirectory(
          srcPath,
          destPath,
          preserveAttributes,
          pattern,
          includeHidden,
        );
        itemsCopied += subStats.itemsCopied;
        bytesCopied += subStats.bytesCopied;
      } else {
        // Copy file
        await this.copyFile(srcPath, destPath, preserveAttributes);
        itemsCopied++;

        // Track bytes copied
        const stats = await fs.stat(srcPath);
        bytesCopied += stats.size;
      }
    }

    return { itemsCopied, bytesCopied };
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
   * Resolve file path
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
