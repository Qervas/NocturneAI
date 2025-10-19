/**
 * File Edit Tool
 *
 * Edits existing files using search-replace pattern.
 * Inspired by Claude Code's Edit tool.
 *
 * Features:
 * - Exact string matching and replacement
 * - Line number tracking for changes
 * - Replace all occurrences option
 * - Safety checks for ambiguous matches
 * - Preserves file encoding and permissions
 */

import { promises as fs } from "fs";
import { resolve, isAbsolute } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
} from "../../../core/interfaces/ITool.js";
import { DiffGenerator, type DiffResult } from "../utils/DiffGenerator.js";

/**
 * File Edit Tool Configuration
 */
export interface FileEditToolConfig extends BaseToolConfig {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;

  /** Default encoding */
  defaultEncoding?: BufferEncoding;

  /** Base directory for relative paths */
  baseDirectory?: string;

  /** Whether to allow absolute paths */
  allowAbsolutePaths?: boolean;

  /** Whether to create backups before editing */
  createBackups?: boolean;

  /** Backup file suffix */
  backupSuffix?: string;
}

/**
 * File Edit Tool Arguments
 */
export interface FileEditArgs {
  /** Path to the file */
  path: string;

  /** Old string to search for (exact match) */
  old_string: string;

  /** New string to replace with */
  new_string: string;

  /** Replace all occurrences (default: false) */
  replace_all?: boolean;

  /** Encoding (default: utf8) */
  encoding?: BufferEncoding;

  /** Whether to create a backup before editing */
  backup?: boolean;
}

/**
 * File Edit Tool Result
 */
export interface FileEditResult {
  /** Path to the edited file */
  path: string;

  /** Number of replacements made */
  replacements: number;

  /** Line numbers affected (1-based) */
  linesAffected: number[];

  /** Path to backup file if created */
  backupPath?: string;

  /** Preview of changes (legacy format) */
  preview: {
    before: string;
    after: string;
  };

  /** Unified diff result (new format with colors) */
  diff?: DiffResult;
}

/**
 * File Edit Tool
 */
export class FileEditTool extends BaseTool {
  private readonly fileConfig: FileEditToolConfig;

  constructor(config: Partial<FileEditToolConfig> = {}) {
    super(
      "file_edit",
      "Edit existing file with search-replace pattern",
      {
        version: "1.0.0",
        category: "filesystem",
        tags: ["file", "edit", "replace", "modify"],
        requiresConfirmation: true,
        hasSideEffects: true,
      },
      config,
    );

    this.fileConfig = {
      ...this.config,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      defaultEncoding: config.defaultEncoding || "utf8",
      baseDirectory: config.baseDirectory,
      allowAbsolutePaths: config.allowAbsolutePaths !== false,
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
            description: "Path to the file to edit (relative or absolute)",
          },
          old_string: {
            type: "string",
            description:
              "Exact string to search for in the file (must match exactly, including whitespace and indentation)",
          },
          new_string: {
            type: "string",
            description:
              "New string to replace the old string with (can be different length)",
          },
          replace_all: {
            type: "boolean",
            description:
              "Whether to replace all occurrences (default: false). If false and multiple matches found, will error.",
          },
          encoding: {
            type: "string",
            description: "File encoding (default: utf8)",
            enum: ["utf8", "ascii", "base64", "hex", "binary", "latin1"],
          },
          backup: {
            type: "boolean",
            description:
              "Whether to create a backup of the file before editing",
          },
        },
        required: ["path", "old_string", "new_string"],
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

    // Validate old_string
    const oldStringValidation = this.validateString(args, "old_string", {
      required: true,
      minLength: 1,
    });
    if (oldStringValidation !== true) return oldStringValidation;

    // Validate new_string (can be empty for deletion)
    const newStringValidation = this.validateString(args, "new_string", {
      required: true,
    });
    if (newStringValidation !== true) return newStringValidation;

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
    const replaceAllValidation = this.validateBoolean(args, "replace_all");
    if (replaceAllValidation !== true) return replaceAllValidation;

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
    const typedArgs = args as unknown as FileEditArgs;

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
      const originalContent = await fs.readFile(filePath, encoding);

      // Find all occurrences
      const { count, indices } = this.findOccurrences(
        originalContent,
        typedArgs.old_string,
      );

      // Check if old_string exists
      if (count === 0) {
        return this.error(
          `String not found in file. Searched for:\n${this.truncateString(typedArgs.old_string, 200)}`,
        );
      }

      // Check for ambiguous match (multiple occurrences without replace_all)
      if (count > 1 && !typedArgs.replace_all) {
        return this.error(
          `Found ${count} occurrences of the string, but replace_all is false. Either:\n` +
            `1. Set replace_all to true to replace all occurrences\n` +
            `2. Provide a more specific old_string that matches only once`,
        );
      }

      // Create backup if requested
      let backupPath: string | undefined;
      if (typedArgs.backup || this.fileConfig.createBackups) {
        backupPath = await this.createBackup(filePath);
      }

      // Perform replacement
      const newContent = typedArgs.replace_all
        ? originalContent.split(typedArgs.old_string).join(typedArgs.new_string)
        : originalContent.replace(typedArgs.old_string, typedArgs.new_string);

      // Write back to file
      await fs.writeFile(filePath, newContent, { encoding });

      // Calculate affected line numbers
      const linesAffected = this.getAffectedLines(
        originalContent,
        typedArgs.old_string,
        indices,
      );

      // Generate preview (legacy format)
      const preview = this.generatePreview(
        originalContent,
        newContent,
        indices[0],
        typedArgs.old_string.length,
      );

      // Generate unified diff (new format with color support)
      const diff = DiffGenerator.generateDiff(originalContent, newContent, 3);

      // Build result
      const result: FileEditResult = {
        path: filePath,
        replacements: count,
        linesAffected,
        backupPath,
        preview,
        diff,
      };

      return this.success(result, {
        operation: "edit",
        encoding,
        replacements: count,
        additions: diff.additions,
        deletions: diff.deletions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.error(`Failed to edit file: ${message}`);
    }
  }

  /**
   * Find all occurrences of search string
   */
  private findOccurrences(
    content: string,
    searchString: string,
  ): { count: number; indices: number[] } {
    const indices: number[] = [];
    let index = content.indexOf(searchString);

    while (index !== -1) {
      indices.push(index);
      index = content.indexOf(searchString, index + 1);
    }

    return {
      count: indices.length,
      indices,
    };
  }

  /**
   * Get affected line numbers (1-based)
   */
  private getAffectedLines(
    content: string,
    searchString: string,
    indices: number[],
  ): number[] {
    const lines: number[] = [];

    for (const index of indices) {
      // Count newlines before this index
      const beforeContent = content.substring(0, index);
      const lineNumber = beforeContent.split("\n").length;
      lines.push(lineNumber);
    }

    return lines;
  }

  /**
   * Generate preview of changes
   */
  private generatePreview(
    originalContent: string,
    newContent: string,
    firstMatchIndex: number,
    matchLength: number,
  ): { before: string; after: string } {
    const contextLines = 2;

    // Get line number of first match
    const beforeMatch = originalContent.substring(0, firstMatchIndex);
    const lineNumber = beforeMatch.split("\n").length - 1;

    // Split content into lines
    const originalLines = originalContent.split("\n");
    const newLines = newContent.split("\n");

    // Extract context around the change
    const startLine = Math.max(0, lineNumber - contextLines);
    const endLine = Math.min(originalLines.length, lineNumber + contextLines + 1);

    const beforePreview = originalLines
      .slice(startLine, endLine)
      .map((line, idx) => {
        const actualLineNum = startLine + idx + 1;
        const marker = actualLineNum === lineNumber + 1 ? "→" : " ";
        return `${actualLineNum.toString().padStart(4)} ${marker} ${line}`;
      })
      .join("\n");

    const afterPreview = newLines
      .slice(startLine, Math.min(newLines.length, endLine))
      .map((line, idx) => {
        const actualLineNum = startLine + idx + 1;
        const marker = actualLineNum === lineNumber + 1 ? "→" : " ";
        return `${actualLineNum.toString().padStart(4)} ${marker} ${line}`;
      })
      .join("\n");

    return {
      before: beforePreview,
      after: afterPreview,
    };
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${filePath}${this.fileConfig.backupSuffix}-${timestamp}`;

    try {
      await fs.copyFile(filePath, backupPath);
      return backupPath;
    } catch (error) {
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

  /**
   * Truncate string for display
   */
  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength) + "... (truncated)";
  }
}
