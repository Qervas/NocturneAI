/**
 * @fileoverview GitDiffTool - Show git changes and diffs
 * @module @qi/core/tools/builtin/GitDiffTool
 *
 * @description
 * Provides functionality to view git diffs including:
 * - Working tree changes (unstaged)
 * - Staged changes (index)
 * - Commit-to-commit diffs
 * - File-specific diffs
 * - Statistics information (insertions/deletions)
 * - Context line control
 * - Multiple output formats
 *
 * @example
 * ```typescript
 * const tool = new GitDiffTool();
 * const result = await tool.execute({
 *   repository: '/path/to/repo',
 *   staged: true,
 *   files: ['src/index.ts']
 * });
 * ```
 *
 * @author Nocturne Labs
 * @created 2024-01-15
 */

import { BaseTool } from "../BaseTool.js";
import type {
  ToolResult,
  ToolContext,
} from "../../../core/interfaces/ITool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import { promises as fs } from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Configuration options for GitDiffTool
 */
export interface GitDiffConfig {
  /** Maximum execution time in milliseconds (default: 30000ms) */
  timeout?: number;
  /** Default repository path if not specified in arguments */
  defaultRepository?: string;
  /** Maximum diff size in bytes (default: 10MB) */
  maxDiffSize?: number;
  /** Default number of context lines */
  defaultContextLines?: number;
  /** Enable color output */
  colorOutput?: boolean;
  /** Enable verbose output */
  verbose?: boolean;
}

/**
 * Arguments for the git_diff tool
 */
export interface GitDiffArgs {
  /** Path to git repository (default: current directory) */
  repository?: string;
  /** Show staged changes (default: false, shows unstaged) */
  staged?: boolean;
  /** Specific files to diff (empty = all files) */
  files?: string[];
  /** Reference to diff against (commit hash, branch, tag) */
  ref?: string;
  /** Second reference for commit-to-commit diff */
  refTo?: string;
  /** Number of context lines (default: 3) */
  contextLines?: number;
  /** Show only file names and status (--name-status) */
  nameOnly?: boolean;
  /** Show statistics (--stat) */
  showStats?: boolean;
  /** Ignore whitespace changes */
  ignoreWhitespace?: boolean;
  /** Maximum number of lines to return (0 = unlimited) */
  maxLines?: number;
}

/**
 * File change information
 */
export interface FileDiff {
  /** File path */
  path: string;
  /** Old path (for renames) */
  oldPath?: string;
  /** Change type (M=modified, A=added, D=deleted, R=renamed, C=copied) */
  status: string;
  /** Number of lines added */
  additions: number;
  /** Number of lines deleted */
  deletions: number;
  /** Diff content */
  diff?: string;
}

/**
 * Diff statistics
 */
export interface DiffStats {
  /** Number of files changed */
  filesChanged: number;
  /** Total insertions */
  insertions: number;
  /** Total deletions */
  deletions: number;
  /** Summary by file */
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
  }>;
}

/**
 * Git diff result
 */
export interface GitDiff {
  /** Type of diff performed */
  type: "unstaged" | "staged" | "commit" | "range";
  /** Reference(s) being compared */
  references?: {
    from: string;
    to?: string;
  };
  /** Individual file diffs */
  files: FileDiff[];
  /** Overall statistics */
  stats: DiffStats;
  /** Raw diff output (if verbose) */
  raw?: string;
  /** Whether diff was truncated */
  truncated: boolean;
}

/**
 * GitDiffTool - Show git changes and diffs
 *
 * This tool provides comprehensive git diff functionality including:
 * - View unstaged changes in working tree
 * - View staged changes ready for commit
 * - Compare specific commits or branches
 * - File-specific or repository-wide diffs
 * - Statistics and summaries
 *
 * @extends BaseTool
 */
export class GitDiffTool extends BaseTool {
  private gitConfig: GitDiffConfig;

  /**
   * Creates a new GitDiffTool instance
   *
   * @param config - Optional configuration
   */
  constructor(config?: GitDiffConfig) {
    super(
      "git_diff",
      "Show git changes and diffs",
      {
        category: "git",
        tags: ["git", "version-control", "diff", "changes", "vcs"],
        version: "1.0.0",
        author: "Nocturne Labs",
      },
      {
        timeout: config?.timeout || 30000,
      },
    );

    this.gitConfig = {
      ...this.config,
      timeout: config?.timeout || 30000,
      maxDiffSize: config?.maxDiffSize || 10 * 1024 * 1024, // 10MB
      defaultContextLines: config?.defaultContextLines || 3,
      colorOutput: config?.colorOutput ?? false,
      verbose: config?.verbose ?? false,
      defaultRepository: config?.defaultRepository,
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
          repository: {
            type: "string",
            description: "Path to git repository (default: current directory)",
          },
          staged: {
            type: "boolean",
            description: "Show staged changes (default: false, shows unstaged)",
          },
          files: {
            type: "array",
            items: { type: "string" },
            description: "Specific files to diff (empty = all files)",
          },
          ref: {
            type: "string",
            description: "Reference to diff against (commit hash, branch, tag)",
          },
          refTo: {
            type: "string",
            description: "Second reference for commit-to-commit diff",
          },
          contextLines: {
            type: "number",
            description: "Number of context lines (default: 3)",
            minimum: 0,
          },
          nameOnly: {
            type: "boolean",
            description: "Show only file names and status",
          },
          showStats: {
            type: "boolean",
            description: "Show statistics",
          },
          ignoreWhitespace: {
            type: "boolean",
            description: "Ignore whitespace changes",
          },
          maxLines: {
            type: "number",
            description: "Maximum number of lines to return (0 = unlimited)",
            minimum: 0,
          },
        },
        required: [],
      },
    };
  }

  /**
   * Validate arguments
   */
  validate(args: Record<string, unknown>): boolean | string {
    if (args.repository !== undefined) {
      const pathValidation = this.validateString(args, "repository", {
        required: false,
      });
      if (pathValidation !== true) return pathValidation;
    }

    if (args.contextLines !== undefined) {
      const contextValidation = this.validateNumber(args, "contextLines", {
        required: false,
        min: 0,
      });
      if (contextValidation !== true) return contextValidation;
    }

    if (args.maxLines !== undefined) {
      const maxValidation = this.validateNumber(args, "maxLines", {
        required: false,
        min: 0,
      });
      if (maxValidation !== true) return maxValidation;
    }

    return true;
  }

  /**
   * Executes the git diff command
   *
   * @param args - Tool arguments
   * @param context - Execution context
   * @returns Tool execution result with git diff
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as GitDiffArgs;
    const repoPath =
      typedArgs.repository || this.gitConfig.defaultRepository || process.cwd();
    const staged = typedArgs.staged ?? false;
    const contextLines =
      typedArgs.contextLines ?? this.gitConfig.defaultContextLines ?? 3;
    const files = typedArgs.files || [];

    try {
      await this.verifyGitRepository(repoPath);

      let diff: GitDiff;

      if (typedArgs.refTo) {
        diff = await this.getCommitRangeDiff(
          repoPath,
          typedArgs.ref || "HEAD",
          typedArgs.refTo,
          files,
          contextLines,
          typedArgs,
        );
      } else if (typedArgs.ref) {
        diff = await this.getCommitDiff(
          repoPath,
          typedArgs.ref,
          files,
          contextLines,
          typedArgs,
        );
      } else if (staged) {
        diff = await this.getStagedDiff(
          repoPath,
          files,
          contextLines,
          typedArgs,
        );
      } else {
        diff = await this.getUnstagedDiff(
          repoPath,
          files,
          contextLines,
          typedArgs,
        );
      }

      return {
        success: true,
        data: {
          diff,
          repository: repoPath,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get git diff",
      };
    }
  }

  private async verifyGitRepository(repoPath: string): Promise<void> {
    try {
      await fs.access(repoPath);
    } catch {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    try {
      const gitDir = path.join(repoPath, ".git");
      await fs.access(gitDir);
    } catch {
      try {
        await execAsync("git rev-parse --git-dir", {
          cwd: repoPath,
          timeout: this.gitConfig.timeout,
        });
      } catch {
        throw new Error(`Not a git repository: ${repoPath}`);
      }
    }
  }

  private async getUnstagedDiff(
    repoPath: string,
    files: string[],
    contextLines: number,
    args: GitDiffArgs,
  ): Promise<GitDiff> {
    const command = this.buildDiffCommand("", files, contextLines, args);
    const output = await this.executeDiffCommand(repoPath, command);
    return this.parseDiff(output, "unstaged", args);
  }

  private async getStagedDiff(
    repoPath: string,
    files: string[],
    contextLines: number,
    args: GitDiffArgs,
  ): Promise<GitDiff> {
    const command = this.buildDiffCommand(
      "--cached",
      files,
      contextLines,
      args,
    );
    const output = await this.executeDiffCommand(repoPath, command);
    return this.parseDiff(output, "staged", args);
  }

  private async getCommitDiff(
    repoPath: string,
    ref: string,
    files: string[],
    contextLines: number,
    args: GitDiffArgs,
  ): Promise<GitDiff> {
    const command = this.buildDiffCommand(ref, files, contextLines, args);
    const output = await this.executeDiffCommand(repoPath, command);
    const diff = this.parseDiff(output, "commit", args);
    diff.references = { from: ref };
    return diff;
  }

  private async getCommitRangeDiff(
    repoPath: string,
    refFrom: string,
    refTo: string,
    files: string[],
    contextLines: number,
    args: GitDiffArgs,
  ): Promise<GitDiff> {
    const command = this.buildDiffCommand(
      `${refFrom}..${refTo}`,
      files,
      contextLines,
      args,
    );
    const output = await this.executeDiffCommand(repoPath, command);
    const diff = this.parseDiff(output, "range", args);
    diff.references = { from: refFrom, to: refTo };
    return diff;
  }

  private buildDiffCommand(
    baseArg: string,
    files: string[],
    contextLines: number,
    args: GitDiffArgs,
  ): string {
    const parts = ["git diff"];

    if (baseArg) {
      parts.push(baseArg);
    }

    parts.push(`--unified=${contextLines}`);

    if (args.nameOnly) {
      parts.push("--name-status");
    }

    if (args.ignoreWhitespace) {
      parts.push("--ignore-all-space");
    }

    if (!this.gitConfig.colorOutput) {
      parts.push("--no-color");
    }

    if (files.length > 0) {
      parts.push("--");
      parts.push(...files.map((f) => `"${f}"`));
    }

    return parts.join(" ");
  }

  private async executeDiffCommand(
    repoPath: string,
    command: string,
  ): Promise<string> {
    try {
      const { stdout } = await execAsync(command, {
        cwd: repoPath,
        timeout: this.gitConfig.timeout,
        maxBuffer: this.gitConfig.maxDiffSize,
      });
      return stdout;
    } catch (error: any) {
      if (error.code === 1 && error.stdout) {
        return error.stdout;
      }
      throw error;
    }
  }

  private parseDiff(
    output: string,
    type: GitDiff["type"],
    args: GitDiffArgs,
  ): GitDiff {
    const lines = output.split("\n");
    const maxLines = args.maxLines || 0;
    let truncated = false;

    let processedOutput = output;
    if (maxLines > 0 && lines.length > maxLines) {
      processedOutput = lines.slice(0, maxLines).join("\n");
      truncated = true;
    }

    const files: FileDiff[] = [];
    const stats: DiffStats = {
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      files: [],
    };

    if (args.nameOnly) {
      this.parseNameStatus(processedOutput, files, stats);
    } else {
      this.parseFullDiff(processedOutput, files, stats);
    }

    const diff: GitDiff = {
      type,
      files,
      stats,
      truncated,
    };

    if (this.gitConfig.verbose) {
      diff.raw = processedOutput;
    }

    return diff;
  }

  private parseNameStatus(
    output: string,
    files: FileDiff[],
    stats: DiffStats,
  ): void {
    const lines = output.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      const match = line.match(/^([MADRC])\s+(.+?)(?:\s+(.+))?$/);
      if (!match) continue;

      const [, status, path, newPath] = match;

      const fileDiff: FileDiff = {
        path: newPath || path,
        status,
        additions: 0,
        deletions: 0,
      };

      if (status === "R" || status === "C") {
        fileDiff.oldPath = path;
      }

      files.push(fileDiff);
      stats.filesChanged++;
    }
  }

  private parseFullDiff(
    output: string,
    files: FileDiff[],
    stats: DiffStats,
  ): void {
    const lines = output.split("\n");
    let currentFile: FileDiff | null = null;
    let currentDiff: string[] = [];

    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        if (currentFile) {
          currentFile.diff = currentDiff.join("\n");
          files.push(currentFile);
        }

        const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
        if (match) {
          currentFile = {
            path: match[2],
            oldPath: match[1] !== match[2] ? match[1] : undefined,
            status: "M",
            additions: 0,
            deletions: 0,
          };
          currentDiff = [line];
        }
      } else if (line.startsWith("new file")) {
        if (currentFile) currentFile.status = "A";
        currentDiff.push(line);
      } else if (line.startsWith("deleted file")) {
        if (currentFile) currentFile.status = "D";
        currentDiff.push(line);
      } else if (line.startsWith("rename from")) {
        if (currentFile) currentFile.status = "R";
        currentDiff.push(line);
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        if (currentFile) {
          currentFile.additions++;
          stats.insertions++;
        }
        currentDiff.push(line);
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        if (currentFile) {
          currentFile.deletions++;
          stats.deletions++;
        }
        currentDiff.push(line);
      } else {
        currentDiff.push(line);
      }
    }

    if (currentFile) {
      currentFile.diff = currentDiff.join("\n");
      files.push(currentFile);
    }

    stats.filesChanged = files.length;
    stats.files = files.map((f) => ({
      path: f.path,
      additions: f.additions,
      deletions: f.deletions,
    }));
  }
}

export default GitDiffTool;
