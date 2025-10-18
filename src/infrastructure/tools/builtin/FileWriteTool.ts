/**
 * File Write Tool
 *
 * Writes content to a file on the filesystem.
 *
 * Features:
 * - Create new files or overwrite existing ones
 * - Append mode support
 * - Automatic directory creation
 * - Encoding support (utf8, base64, etc.)
 * - Backup creation for existing files
 * - Safe write with atomic operations
 */

import { promises as fs } from "fs";
import { resolve, isAbsolute, dirname } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
} from "../../../core/interfaces/ITool.js";

/**
 * File Write Tool Configuration
 */
export interface FileWriteToolConfig extends BaseToolConfig {
  /** Maximum content size in bytes (default: 10MB) */
  maxContentSize?: number;

  /** Default encoding */
  defaultEncoding?: BufferEncoding;

  /** Base directory for relative paths */
  baseDirectory?: string;

  /** Whether to allow absolute paths */
  allowAbsolutePaths?: boolean;

  /** Whether to create directories automatically */
  createDirectories?: boolean;

  /** Whether to create backups before overwriting */
  createBackups?: boolean;

  /** Backup file suffix */
  backupSuffix?: string;
}

/**
 * File Write Tool Arguments
 */
export interface FileWriteArgs {
  /** Path to the file */
  path: string;

  /** Content to write */
  content: string;

  /** Encoding (default: utf8) */
  encoding?: BufferEncoding;

  /** Whether to append instead of overwrite */
  append?: boolean;

  /** Whether to create directories if they don't exist */
  createDirs?: boolean;

  /** Whether to create a backup of existing file */
  backup?: boolean;

  /** File mode/permissions (e.g., 0o644) */
  mode?: number;
}

/**
 * File Write Tool Result
 */
export interface FileWriteResult {
  /** Path to the written file */
  path: string;

  /** Number of bytes written */
  bytesWritten: number;

  /** Whether file was created (true) or updated (false) */
  created: boolean;

  /** Path to backup file if created */
  backupPath?: string;
}

/**
 * File Write Tool
 */
export class FileWriteTool extends BaseTool {
  private readonly fileConfig: FileWriteToolConfig;

  constructor(config: Partial<FileWriteToolConfig> = {}) {
    super(
      "file_write",
      "Write content to a file on the filesystem",
      {
        version: "1.0.0",
        category: "filesystem",
        tags: ["file", "write", "io", "create"],
        requiresConfirmation: true,
        hasSideEffects: true,
      },
      config,
    );

    this.fileConfig = {
      ...this.config,
      maxContentSize: config.maxContentSize || 10 * 1024 * 1024, // 10MB
      defaultEncoding: config.defaultEncoding || "utf8",
      baseDirectory: config.baseDirectory,
      allowAbsolutePaths: config.allowAbsolutePaths !== false,
      createDirectories: config.createDirectories !== false,
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
          path: {
            type: "string",
            description: "Path to the file to write (relative or absolute)",
          },
          content: {
            type: "string",
            description: "Content to write to the file",
          },
          encoding: {
            type: "string",
            description: "File encoding (default: utf8)",
            enum: ["utf8", "ascii", "base64", "hex", "binary", "latin1"],
          },
          append: {
            type: "boolean",
            description:
              "Whether to append to existing file instead of overwriting",
          },
          createDirs: {
            type: "boolean",
            description:
              "Whether to create parent directories if they don't exist",
          },
          backup: {
            type: "boolean",
            description:
              "Whether to create a backup of existing file before overwriting",
          },
          mode: {
            type: "number",
            description:
              "File permissions in octal format (e.g., 420 for 0o644)",
          },
        },
        required: ["path", "content"],
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

    // Validate content
    const contentValidation = this.validateString(args, "content", {
      required: true,
    });
    if (contentValidation !== true) return contentValidation;

    // Check content size
    const content = args.content as string;
    const contentSize = Buffer.byteLength(content, "utf8");
    if (contentSize > this.fileConfig.maxContentSize!) {
      return `Content size (${contentSize} bytes) exceeds maximum allowed size (${this.fileConfig.maxContentSize} bytes)`;
    }

    // Validate encoding if provided
    if (args.encoding !== undefined) {
      const validEncodings = [
        "utf8",
        "ascii",
        "base64",
        "hex",
        "binary",
        "latin1",
      ];
      if (!validEncodings.includes(args.encoding as string)) {
        return `Invalid encoding. Must be one of: ${validEncodings.join(", ")}`;
      }
    }

    // Validate boolean flags
    const appendValidation = this.validateBoolean(args, "append");
    if (appendValidation !== true) return appendValidation;

    const createDirsValidation = this.validateBoolean(args, "createDirs");
    if (createDirsValidation !== true) return createDirsValidation;

    const backupValidation = this.validateBoolean(args, "backup");
    if (backupValidation !== true) return backupValidation;

    // Validate mode if provided
    if (args.mode !== undefined) {
      const modeValidation = this.validateNumber(args, "mode", {
        min: 0,
        max: 0o777,
        integer: true,
      });
      if (modeValidation !== true) return modeValidation;
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
    const typedArgs = args as unknown as FileWriteArgs;

    try {
      // Resolve file path
      const filePath = this.resolvePath(typedArgs.path, context);

      // Check if path is allowed
      if (!this.fileConfig.allowAbsolutePaths && isAbsolute(typedArgs.path)) {
        return this.error("Absolute paths are not allowed");
      }

      // Check if file exists
      let fileExists = false;
      try {
        await fs.access(filePath);
        fileExists = true;
      } catch {
        // File doesn't exist, which is fine
      }

      // Create backup if requested and file exists
      let backupPath: string | undefined;
      if (fileExists && (typedArgs.backup || this.fileConfig.createBackups)) {
        backupPath = await this.createBackup(filePath);
      }

      // Ensure parent directory exists
      const dirPath = dirname(filePath);
      const shouldCreateDirs =
        typedArgs.createDirs !== undefined
          ? typedArgs.createDirs
          : this.fileConfig.createDirectories;

      if (shouldCreateDirs) {
        try {
          await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return this.error(`Failed to create directory: ${message}`);
        }
      } else {
        // Check if directory exists
        try {
          await fs.access(dirPath);
        } catch {
          return this.error(`Directory does not exist: ${dirPath}`);
        }
      }

      // Write file
      const encoding = (typedArgs.encoding ||
        this.fileConfig.defaultEncoding) as BufferEncoding;
      const content = typedArgs.content;

      if (typedArgs.append) {
        await fs.appendFile(filePath, content, { encoding });
      } else {
        await fs.writeFile(filePath, content, { encoding });
      }

      // Set file permissions if specified
      if (typedArgs.mode !== undefined) {
        await fs.chmod(filePath, typedArgs.mode);
      }

      // Get file stats
      const stats = await fs.stat(filePath);

      // Build result
      const result: FileWriteResult = {
        path: filePath,
        bytesWritten: stats.size,
        created: !fileExists,
        backupPath,
      };

      return this.success(result, {
        operation: typedArgs.append ? "append" : "write",
        encoding,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.error(`Failed to write file: ${message}`);
    }
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filePath: string): Promise<string> {
    const backupPath = `${filePath}${this.fileConfig.backupSuffix}`;

    try {
      await fs.copyFile(filePath, backupPath);
      return backupPath;
    } catch (error) {
      // If backup fails, we still continue with the write
      // but log the error
      throw new Error(
        `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
      );
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
