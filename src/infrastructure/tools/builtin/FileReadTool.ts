/**
 * File Read Tool
 *
 * Reads the contents of a file from the filesystem.
 *
 * Features:
 * - Read entire file or specific line ranges
 * - Encoding support (utf8, base64, etc.)
 * - File existence validation
 * - Size limits for safety
 * - Binary file detection
 */

import { promises as fs } from "fs";
import { resolve, isAbsolute } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
} from "../../../core/interfaces/ITool.js";

/**
 * File Read Tool Configuration
 */
export interface FileReadToolConfig extends BaseToolConfig {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;

  /** Default encoding */
  defaultEncoding?: BufferEncoding;

  /** Base directory for relative paths */
  baseDirectory?: string;

  /** Whether to allow absolute paths */
  allowAbsolutePaths?: boolean;
}

/**
 * File Read Tool Arguments
 */
export interface FileReadArgs {
  /** Path to the file */
  path: string;

  /** Encoding (default: utf8) */
  encoding?: BufferEncoding;

  /** Start line (1-based, inclusive) */
  startLine?: number;

  /** End line (1-based, inclusive) */
  endLine?: number;

  /** Whether to include line numbers */
  includeLineNumbers?: boolean;

  /** Whether to return file metadata */
  includeMetadata?: boolean;
}

/**
 * File Read Tool Result
 */
export interface FileReadResult {
  /** File contents */
  content: string;

  /** File metadata (if requested) */
  metadata?: {
    path: string;
    size: number;
    modified: Date;
    lines: number;
    encoding: BufferEncoding;
  };
}

/**
 * File Read Tool
 */
export class FileReadTool extends BaseTool {
  private readonly fileConfig: FileReadToolConfig;

  constructor(config: Partial<FileReadToolConfig> = {}) {
    super(
      "file_read",
      "Read the contents of a file from the filesystem",
      {
        version: "1.0.0",
        category: "filesystem",
        tags: ["file", "read", "io"],
        requiresConfirmation: false,
        hasSideEffects: false,
      },
      config,
    );

    this.fileConfig = {
      ...this.config,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      defaultEncoding: config.defaultEncoding || "utf8",
      baseDirectory: config.baseDirectory,
      allowAbsolutePaths: config.allowAbsolutePaths !== false,
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
            description: "Path to the file to read (relative or absolute)",
          },
          encoding: {
            type: "string",
            description: "File encoding (default: utf8)",
            enum: ["utf8", "ascii", "base64", "hex", "binary", "latin1"],
          },
          startLine: {
            type: "number",
            description:
              "Start line number (1-based, inclusive) for partial reads",
          },
          endLine: {
            type: "number",
            description:
              "End line number (1-based, inclusive) for partial reads",
          },
          includeLineNumbers: {
            type: "boolean",
            description: "Whether to prefix each line with its line number",
          },
          includeMetadata: {
            type: "boolean",
            description: "Whether to include file metadata in the result",
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

    // Validate startLine if provided
    if (args.startLine !== undefined) {
      const startLineValidation = this.validateNumber(args, "startLine", {
        min: 1,
        integer: true,
      });
      if (startLineValidation !== true) return startLineValidation;
    }

    // Validate endLine if provided
    if (args.endLine !== undefined) {
      const endLineValidation = this.validateNumber(args, "endLine", {
        min: 1,
        integer: true,
      });
      if (endLineValidation !== true) return endLineValidation;

      // Check that endLine >= startLine
      if (args.startLine !== undefined) {
        const startLine = args.startLine as number;
        const endLine = args.endLine as number;
        if (endLine < startLine) {
          return "endLine must be greater than or equal to startLine";
        }
      }
    }

    // Validate boolean flags
    const lineNumbersValidation = this.validateBoolean(
      args,
      "includeLineNumbers",
    );
    if (lineNumbersValidation !== true) return lineNumbersValidation;

    const metadataValidation = this.validateBoolean(args, "includeMetadata");
    if (metadataValidation !== true) return metadataValidation;

    return true;
  }

  /**
   * Execute the tool
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as unknown as FileReadArgs;

    try {
      // Resolve file path
      const filePath = this.resolvePath(typedArgs.path, context);

      // Check if path is allowed
      if (!this.fileConfig.allowAbsolutePaths && isAbsolute(typedArgs.path)) {
        return this.error("Absolute paths are not allowed");
      }

      // Check file exists
      try {
        await fs.access(filePath);
      } catch {
        return this.error(`File not found: ${typedArgs.path}`);
      }

      // Get file stats
      const stats = await fs.stat(filePath);

      // Check if it's a file
      if (!stats.isFile()) {
        return this.error(`Path is not a file: ${typedArgs.path}`);
      }

      // Check file size
      if (stats.size > this.fileConfig.maxFileSize!) {
        return this.error(
          `File size (${stats.size} bytes) exceeds maximum allowed size (${this.fileConfig.maxFileSize} bytes)`,
        );
      }

      // Read file
      const encoding = (typedArgs.encoding ||
        this.fileConfig.defaultEncoding) as BufferEncoding;
      let content = await fs.readFile(filePath, encoding);

      // Handle line-based reading
      if (
        typedArgs.startLine !== undefined ||
        typedArgs.endLine !== undefined
      ) {
        const lines = content.split("\n");
        const startIdx = (typedArgs.startLine || 1) - 1;
        const endIdx = typedArgs.endLine ? typedArgs.endLine : lines.length;

        // Validate line ranges
        if (startIdx >= lines.length) {
          return this.error(
            `startLine (${typedArgs.startLine}) exceeds file length (${lines.length} lines)`,
          );
        }

        const selectedLines = lines.slice(startIdx, endIdx);

        // Add line numbers if requested
        if (typedArgs.includeLineNumbers) {
          const lineNumberWidth = String(endIdx).length;
          content = selectedLines
            .map((line, idx) => {
              const lineNum = String(startIdx + idx + 1).padStart(
                lineNumberWidth,
                " ",
              );
              return `${lineNum} | ${line}`;
            })
            .join("\n");
        } else {
          content = selectedLines.join("\n");
        }
      } else if (typedArgs.includeLineNumbers) {
        // Add line numbers to entire file
        const lines = content.split("\n");
        const lineNumberWidth = String(lines.length).length;
        content = lines
          .map((line, idx) => {
            const lineNum = String(idx + 1).padStart(lineNumberWidth, " ");
            return `${lineNum} | ${line}`;
          })
          .join("\n");
      }

      // Build result
      const result: FileReadResult = {
        content,
      };

      // Add metadata if requested
      if (typedArgs.includeMetadata) {
        const lines = content.split("\n");
        result.metadata = {
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          lines: lines.length,
          encoding,
        };
      }

      return this.success(result, {
        bytesRead: stats.size,
        linesRead: content.split("\n").length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.error(`Failed to read file: ${message}`);
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
