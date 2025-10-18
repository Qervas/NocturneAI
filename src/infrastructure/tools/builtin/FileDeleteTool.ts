/**
 * File Delete Tool
 *
 * Deletes files and directories from the filesystem.
 *
 * Features:
 * - Delete files and directories
 * - Recursive directory deletion
 * - Safety checks and confirmations
 * - Backup before delete option
 * - Pattern-based deletion
 */

import { promises as fs } from "fs";
import { resolve, isAbsolute, join } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
} from "../../../core/interfaces/ITool.js";

/**
 * File Delete Tool Configuration
 */
export interface FileDeleteToolConfig extends BaseToolConfig {
  /** Base directory for relative paths */
  baseDirectory?: string;

  /** Whether to allow absolute paths */
  allowAbsolutePaths?: boolean;

  /** Whether to allow recursive directory deletion */
  allowRecursive?: boolean;

  /** Whether to create backups before deletion */
  createBackups?: boolean;

  /** Backup directory */
  backupDirectory?: string;

  /** Patterns to prevent deletion (e.g., system files) */
  protectedPatterns?: string[];
}

/**
 * File Delete Tool Arguments
 */
export interface FileDeleteArgs {
  /** Path to the file or directory */
  path: string;

  /** Whether to delete directories recursively */
  recursive?: boolean;

  /** Whether to create a backup before deletion */
  backup?: boolean;

  /** Whether to force deletion (skip confirmations) */
  force?: boolean;
}

/**
 * File Delete Tool Result
 */
export interface FileDeleteResult {
  /** Path that was deleted */
  path: string;

  /** Type of item deleted */
  type: "file" | "directory";

  /** Number of items deleted (for directories) */
  itemsDeleted: number;

  /** Path to backup if created */
  backupPath?: string;
}

/**
 * File Delete Tool
 */
export class FileDeleteTool extends BaseTool {
  private readonly fileConfig: FileDeleteToolConfig;

  constructor(config: Partial<FileDeleteToolConfig> = {}) {
    super(
      "file_delete",
      "Delete a file or directory from the filesystem",
      {
        version: "1.0.0",
        category: "filesystem",
        tags: ["file", "delete", "remove", "io"],
        requiresConfirmation: true,
        hasSideEffects: true,
      },
      config,
    );

    this.fileConfig = {
      ...this.config,
      baseDirectory: config.baseDirectory,
      allowAbsolutePaths: config.allowAbsolutePaths !== false,
      allowRecursive: config.allowRecursive !== false,
      createBackups: config.createBackups || false,
      backupDirectory: config.backupDirectory,
      protectedPatterns: config.protectedPatterns || [
        "/etc/*",
        "/bin/*",
        "/sbin/*",
        "/usr/*",
        "/System/*",
        "*.exe",
        "*.dll",
        "*.sys",
      ],
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
            description:
              "Path to the file or directory to delete (relative or absolute)",
          },
          recursive: {
            type: "boolean",
            description:
              "Whether to delete directories recursively (required for non-empty directories)",
          },
          backup: {
            type: "boolean",
            description: "Whether to create a backup before deletion",
          },
          force: {
            type: "boolean",
            description:
              "Whether to force deletion without additional confirmations",
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

    const backupValidation = this.validateBoolean(args, "backup");
    if (backupValidation !== true) return backupValidation;

    const forceValidation = this.validateBoolean(args, "force");
    if (forceValidation !== true) return forceValidation;

    return true;
  }

  /**
   * Execute the tool
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as unknown as FileDeleteArgs;

    try {
      // Resolve file path
      const filePath = this.resolvePath(typedArgs.path, context);

      // Check if path is allowed
      if (!this.fileConfig.allowAbsolutePaths && isAbsolute(typedArgs.path)) {
        return this.error("Absolute paths are not allowed");
      }

      // Check for protected patterns
      if (this.isProtected(filePath)) {
        return this.error(
          `Path is protected and cannot be deleted: ${typedArgs.path}`,
        );
      }

      // Check file/directory exists
      let stats;
      try {
        stats = await fs.stat(filePath);
      } catch {
        return this.error(`Path not found: ${typedArgs.path}`);
      }

      const isDirectory = stats.isDirectory();
      const type = isDirectory ? "directory" : "file";

      // Check if recursive is needed for directories
      if (isDirectory && !typedArgs.recursive) {
        // Check if directory is empty
        const contents = await fs.readdir(filePath);
        if (contents.length > 0) {
          return this.error(
            "Directory is not empty. Use recursive: true to delete non-empty directories",
          );
        }
      }

      // Check if recursive is allowed
      if (
        isDirectory &&
        typedArgs.recursive &&
        !this.fileConfig.allowRecursive
      ) {
        return this.error("Recursive deletion is not allowed by configuration");
      }

      // Create backup if requested
      let backupPath: string | undefined;
      if (typedArgs.backup || this.fileConfig.createBackups) {
        backupPath = await this.createBackup(filePath, isDirectory);
      }

      // Count items (for directories)
      let itemsDeleted = 1;
      if (isDirectory && typedArgs.recursive) {
        itemsDeleted = await this.countItems(filePath);
      }

      // Delete the file or directory
      if (isDirectory) {
        await fs.rm(filePath, {
          recursive: typedArgs.recursive || false,
          force: true,
        });
      } else {
        await fs.unlink(filePath);
      }

      // Build result
      const result: FileDeleteResult = {
        path: filePath,
        type,
        itemsDeleted,
        backupPath,
      };

      return this.success(result, {
        operation: "delete",
        recursive: typedArgs.recursive || false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.error(`Failed to delete: ${message}`);
    }
  }

  /**
   * Check if path is protected
   */
  private isProtected(path: string): boolean {
    const patterns = this.fileConfig.protectedPatterns || [];

    for (const pattern of patterns) {
      const regex = this.globToRegex(pattern);
      if (regex.test(path)) {
        return true;
      }
    }

    return false;
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
   * Create backup of file or directory
   */
  private async createBackup(
    path: string,
    isDirectory: boolean,
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `${path.split("/").pop()}-backup-${timestamp}`;

    let backupPath: string;
    if (this.fileConfig.backupDirectory) {
      // Ensure backup directory exists
      await fs.mkdir(this.fileConfig.backupDirectory, { recursive: true });
      backupPath = join(this.fileConfig.backupDirectory, backupName);
    } else {
      backupPath = `${path}.backup-${timestamp}`;
    }

    try {
      if (isDirectory) {
        await this.copyDirectory(path, backupPath);
      } else {
        await fs.copyFile(path, backupPath);
      }
      return backupPath;
    } catch (error) {
      throw new Error(
        `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Count items in directory recursively
   */
  private async countItems(dirPath: string): Promise<number> {
    let count = 1; // Count the directory itself
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        count += await this.countItems(entryPath);
      } else {
        count++;
      }
    }

    return count;
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
