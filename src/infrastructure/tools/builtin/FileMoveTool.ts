/**
 * File Move Tool
 *
 * Moves or renames files and directories on the filesystem.
 *
 * Features:
 * - Move files and directories
 * - Rename files and directories
 * - Cross-directory moves
 * - Overwrite protection
 * - Automatic directory creation
 * - Backup before overwrite
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
 * File Move Tool Configuration
 */
export interface FileMoveToolConfig extends BaseToolConfig {
  /** Base directory for relative paths */
  baseDirectory?: string;

  /** Whether to allow absolute paths */
  allowAbsolutePaths?: boolean;

  /** Whether to create destination directories automatically */
  createDirectories?: boolean;

  /** Whether to allow overwriting existing files */
  allowOverwrite?: boolean;

  /** Whether to create backups before overwriting */
  createBackups?: boolean;

  /** Backup file suffix */
  backupSuffix?: string;
}

/**
 * File Move Tool Arguments
 */
export interface FileMoveArgs {
  /** Source path */
  source: string;

  /** Destination path */
  destination: string;

  /** Whether to overwrite if destination exists */
  overwrite?: boolean;

  /** Whether to create destination directories if they don't exist */
  createDirs?: boolean;

  /** Whether to create a backup of existing destination file */
  backup?: boolean;
}

/**
 * File Move Tool Result
 */
export interface FileMoveResult {
  /** Source path */
  source: string;

  /** Destination path */
  destination: string;

  /** Type of item moved */
  type: "file" | "directory";

  /** Operation performed */
  operation: "move" | "rename";

  /** Whether an existing file was overwritten */
  overwritten: boolean;

  /** Path to backup file if created */
  backupPath?: string;
}

/**
 * File Move Tool
 */
export class FileMoveTool extends BaseTool {
  private readonly fileConfig: FileMoveToolConfig;

  constructor(config: Partial<FileMoveToolConfig> = {}) {
    super(
      "file_move",
      "Move or rename a file or directory on the filesystem",
      {
        version: "1.0.0",
        category: "filesystem",
        tags: ["file", "move", "rename", "io"],
        requiresConfirmation: true,
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
      createBackups: config.createBackups || false,
      backupSuffix: config.backupSuffix || ".backup",
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
              "Source path of the file or directory to move (relative or absolute)",
          },
          destination: {
            type: "string",
            description:
              "Destination path where the file or directory should be moved (relative or absolute)",
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
          backup: {
            type: "boolean",
            description:
              "Whether to create a backup of existing destination file before overwriting",
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
    const overwriteValidation = this.validateBoolean(args, "overwrite");
    if (overwriteValidation !== true) return overwriteValidation;

    const createDirsValidation = this.validateBoolean(args, "createDirs");
    if (createDirsValidation !== true) return createDirsValidation;

    const backupValidation = this.validateBoolean(args, "backup");
    if (backupValidation !== true) return backupValidation;

    return true;
  }

  /**
   * Execute the tool
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as unknown as FileMoveArgs;

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

      // Check if destination exists
      let destExists = false;
      try {
        await fs.stat(destPath);
        destExists = true;
      } catch {
        // Destination doesn't exist, which is fine
      }

      // Handle existing destination
      let backupPath: string | undefined;
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

        // Create backup if requested
        if (typedArgs.backup || this.fileConfig.createBackups) {
          backupPath = await this.createBackup(destPath);
        }

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

      // Perform the move
      await fs.rename(sourcePath, destPath);

      // Determine if it was a move or rename
      const sourceDir = dirname(sourcePath);
      const operation = sourceDir === destDir ? "rename" : "move";

      // Build result
      const result: FileMoveResult = {
        source: sourcePath,
        destination: destPath,
        type,
        operation,
        overwritten: destExists,
        backupPath,
      };

      return this.success(result, {
        operation,
        type,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.error(`Failed to move: ${message}`);
    }
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filePath: string): Promise<string> {
    const backupPath = `${filePath}${this.fileConfig.backupSuffix}`;

    try {
      // Check if it's a directory
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        await this.copyDirectory(filePath, backupPath);
      } else {
        await fs.copyFile(filePath, backupPath);
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
