/**
 * @fileoverview GitStatusTool - Get git repository status
 * @module @qi/core/tools/builtin/GitStatusTool
 *
 * @description
 * Provides functionality to check git repository status including:
 * - Working tree status (modified, added, deleted files)
 * - Staging area status
 * - Untracked files
 * - Branch information
 * - Ahead/behind remote tracking
 * - Stash information
 * - Conflict detection
 *
 * @example
 * ```typescript
 * const tool = new GitStatusTool();
 * const result = await tool.execute({
 *   repository: '/path/to/repo',
 *   includeUntracked: true,
 *   includeIgnored: false
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
 * Configuration options for GitStatusTool
 */
export interface GitStatusConfig {
  /** Maximum execution time in milliseconds (default: 10000ms) */
  timeout?: number;
  /** Default repository path if not specified in arguments */
  defaultRepository?: string;
  /** Include untracked files by default */
  includeUntrackedByDefault?: boolean;
  /** Include ignored files by default */
  includeIgnoredByDefault?: boolean;
  /** Enable verbose output */
  verbose?: boolean;
}

/**
 * Arguments for the git_status tool
 */
export interface GitStatusArgs {
  /** Path to git repository (default: current directory) */
  repository?: string;
  /** Include untracked files */
  includeUntracked?: boolean;
  /** Include ignored files */
  includeIgnored?: boolean;
  /** Show short format output */
  short?: boolean;
  /** Show branch information */
  showBranch?: boolean;
  /** Show ahead/behind information */
  showAheadBehind?: boolean;
}

/**
 * File status information
 */
export interface FileStatus {
  /** File path relative to repository root */
  path: string;
  /** Status in working tree (M=modified, D=deleted, A=added, etc.) */
  workingTreeStatus: string;
  /** Status in staging area */
  indexStatus: string;
  /** Human-readable status description */
  description: string;
}

/**
 * Branch tracking information
 */
export interface BranchInfo {
  /** Current branch name */
  name: string;
  /** Remote tracking branch */
  upstream?: string;
  /** Commits ahead of remote */
  ahead?: number;
  /** Commits behind remote */
  behind?: number;
}

/**
 * Git repository status
 */
export interface GitStatus {
  /** Current branch information */
  branch: BranchInfo;
  /** Files in staging area (to be committed) */
  staged: FileStatus[];
  /** Modified files not staged */
  modified: FileStatus[];
  /** Untracked files */
  untracked: FileStatus[];
  /** Deleted files */
  deleted: FileStatus[];
  /** Files with conflicts */
  conflicts: FileStatus[];
  /** Ignored files (if requested) */
  ignored: FileStatus[];
  /** Whether working tree is clean */
  isClean: boolean;
  /** Number of stash entries */
  stashCount: number;
  /** Raw git status output */
  raw?: string;
}

/**
 * GitStatusTool - Get git repository status
 *
 * This tool provides comprehensive git status information including:
 * - Working tree changes
 * - Staging area contents
 * - Branch tracking information
 * - Conflict detection
 * - Stash information
 *
 * @extends BaseTool
 */
export class GitStatusTool extends BaseTool {
  private gitConfig: GitStatusConfig;

  /**
   * Creates a new GitStatusTool instance
   *
   * @param config - Optional configuration
   */
  constructor(config?: GitStatusConfig) {
    super(
      "git_status",
      "Get git repository status",
      {
        category: "git",
        tags: ["git", "version-control", "status", "vcs"],
        version: "1.0.0",
        author: "Nocturne Labs",
      },
      {
        timeout: config?.timeout || 10000,
      },
    );

    this.gitConfig = {
      ...this.config,
      timeout: config?.timeout || 10000,
      defaultRepository: config?.defaultRepository,
      includeUntrackedByDefault: config?.includeUntrackedByDefault ?? true,
      includeIgnoredByDefault: config?.includeIgnoredByDefault ?? false,
      verbose: config?.verbose ?? false,
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
          includeUntracked: {
            type: "boolean",
            description: "Include untracked files (default: true)",
            default: true,
          },
          includeIgnored: {
            type: "boolean",
            description: "Include ignored files (default: false)",
            default: false,
          },
          short: {
            type: "boolean",
            description: "Show short format output (default: false)",
            default: false,
          },
          showBranch: {
            type: "boolean",
            description: "Show branch information (default: true)",
            default: true,
          },
          showAheadBehind: {
            type: "boolean",
            description: "Show ahead/behind information (default: true)",
            default: true,
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

    return true;
  }

  /**
   * Executes the git status command
   *
   * @param args - Tool arguments
   * @param context - Execution context
   * @returns Tool execution result with git status
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as GitStatusArgs;
    const repoPath =
      typedArgs.repository || this.gitConfig.defaultRepository || process.cwd();
    const includeUntracked =
      typedArgs.includeUntracked ??
      this.gitConfig.includeUntrackedByDefault ??
      true;
    const includeIgnored =
      typedArgs.includeIgnored ??
      this.gitConfig.includeIgnoredByDefault ??
      false;
    const showBranch = typedArgs.showBranch ?? true;
    const showAheadBehind = typedArgs.showAheadBehind ?? true;

    try {
      // Verify repository exists and is a git repository
      await this.verifyGitRepository(repoPath);

      // Get status
      const status = await this.getGitStatus(
        repoPath,
        includeUntracked,
        includeIgnored,
        showBranch,
        showAheadBehind,
      );

      return {
        success: true,
        data: {
          status,
          repository: repoPath,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get git status",
      };
    }
  }

  /**
   * Verifies that the path is a git repository
   *
   * @param repoPath - Path to verify
   * @throws Error if not a valid git repository
   */
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
      // Try git rev-parse to check if it's a git repository
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

  /**
   * Gets comprehensive git status
   *
   * @param repoPath - Repository path
   * @param includeUntracked - Include untracked files
   * @param includeIgnored - Include ignored files
   * @param showBranch - Show branch information
   * @param showAheadBehind - Show ahead/behind information
   * @returns Git status information
   */
  private async getGitStatus(
    repoPath: string,
    includeUntracked: boolean,
    includeIgnored: boolean,
    showBranch: boolean,
    showAheadBehind: boolean,
  ): Promise<GitStatus> {
    // Build git status command
    const flags: string[] = ["--porcelain=v1"];
    if (showBranch) flags.push("--branch");
    if (includeUntracked) flags.push("--untracked-files=all");
    else flags.push("--untracked-files=no");
    if (includeIgnored) flags.push("--ignored");

    const { stdout } = await execAsync(`git status ${flags.join(" ")}`, {
      cwd: repoPath,
      timeout: this.gitConfig.timeout,
    });

    // Parse status output
    const status = this.parseGitStatus(stdout, showBranch, showAheadBehind);

    // Get stash count
    status.stashCount = await this.getStashCount(repoPath);

    // Store raw output if verbose
    if (this.gitConfig.verbose) {
      status.raw = stdout;
    }

    return status;
  }

  /**
   * Parses git status porcelain output
   *
   * @param output - Git status output
   * @param showBranch - Whether branch info was requested
   * @param showAheadBehind - Whether ahead/behind info was requested
   * @returns Parsed git status
   */
  private parseGitStatus(
    output: string,
    showBranch: boolean,
    showAheadBehind: boolean,
  ): GitStatus {
    const lines = output.split("\n").filter((line) => line.trim());

    const status: GitStatus = {
      branch: { name: "HEAD" },
      staged: [],
      modified: [],
      untracked: [],
      deleted: [],
      conflicts: [],
      ignored: [],
      isClean: true,
      stashCount: 0,
    };

    for (const line of lines) {
      // Parse branch information
      if (line.startsWith("##")) {
        if (showBranch) {
          status.branch = this.parseBranchInfo(line, showAheadBehind);
        }
        continue;
      }

      // Parse file status
      const fileStatus = this.parseFileStatus(line);
      if (!fileStatus) continue;

      status.isClean = false;

      // Categorize by status
      if (
        fileStatus.workingTreeStatus === "?" &&
        fileStatus.indexStatus === "?"
      ) {
        status.untracked.push(fileStatus);
      } else if (
        fileStatus.workingTreeStatus === "!" &&
        fileStatus.indexStatus === "!"
      ) {
        status.ignored.push(fileStatus);
      } else if (
        fileStatus.workingTreeStatus === "U" ||
        fileStatus.indexStatus === "U" ||
        (fileStatus.workingTreeStatus === "D" &&
          fileStatus.indexStatus === "D") ||
        (fileStatus.workingTreeStatus === "A" && fileStatus.indexStatus === "A")
      ) {
        status.conflicts.push(fileStatus);
      } else if (
        fileStatus.workingTreeStatus === "D" ||
        fileStatus.indexStatus === "D"
      ) {
        status.deleted.push(fileStatus);
      } else if (
        fileStatus.indexStatus !== " " &&
        fileStatus.indexStatus !== "?"
      ) {
        status.staged.push(fileStatus);
      } else if (
        fileStatus.workingTreeStatus !== " " &&
        fileStatus.workingTreeStatus !== "?"
      ) {
        status.modified.push(fileStatus);
      }
    }

    return status;
  }

  /**
   * Parses branch information from status line
   *
   * @param line - Branch status line (starts with ##)
   * @param showAheadBehind - Whether to parse ahead/behind
   * @returns Branch information
   */
  private parseBranchInfo(line: string, showAheadBehind: boolean): BranchInfo {
    // Format: ## branch...upstream [ahead N, behind M]
    const branchLine = line.substring(3); // Remove '## '

    const info: BranchInfo = { name: "HEAD" };

    // Check for detached HEAD
    if (
      branchLine.includes("HEAD (no branch)") ||
      branchLine.includes("No commits yet")
    ) {
      info.name = "HEAD (detached)";
      return info;
    }

    // Parse branch and upstream
    const parts = branchLine.split("...");
    info.name = parts[0].trim();

    if (parts.length > 1 && showAheadBehind) {
      const upstreamPart = parts[1];
      const match = upstreamPart.match(/^(\S+)(?:\s+\[(.+?)\])?/);

      if (match) {
        info.upstream = match[1];

        // Parse ahead/behind
        if (match[2]) {
          const aheadMatch = match[2].match(/ahead (\d+)/);
          const behindMatch = match[2].match(/behind (\d+)/);

          if (aheadMatch) info.ahead = parseInt(aheadMatch[1], 10);
          if (behindMatch) info.behind = parseInt(behindMatch[1], 10);
        }
      }
    }

    return info;
  }

  /**
   * Parses file status line
   *
   * @param line - Status line
   * @returns File status or null if invalid
   */
  private parseFileStatus(line: string): FileStatus | null {
    if (line.length < 4) return null;

    const indexStatus = line[0];
    const workingTreeStatus = line[1];
    const filePath = line.substring(3);

    return {
      path: filePath,
      indexStatus,
      workingTreeStatus,
      description: this.getStatusDescription(indexStatus, workingTreeStatus),
    };
  }

  /**
   * Gets human-readable status description
   *
   * @param indexStatus - Status in index
   * @param workingTreeStatus - Status in working tree
   * @returns Status description
   */
  private getStatusDescription(
    indexStatus: string,
    workingTreeStatus: string,
  ): string {
    const descriptions: Record<string, string> = {
      M: "modified",
      A: "added",
      D: "deleted",
      R: "renamed",
      C: "copied",
      U: "unmerged",
      "?": "untracked",
      "!": "ignored",
    };

    const parts: string[] = [];

    if (indexStatus !== " " && indexStatus !== "?") {
      parts.push(`staged (${descriptions[indexStatus] || indexStatus})`);
    }

    if (workingTreeStatus !== " " && workingTreeStatus !== "?") {
      parts.push(descriptions[workingTreeStatus] || workingTreeStatus);
    }

    return parts.join(", ") || "unchanged";
  }

  /**
   * Gets the number of stash entries
   *
   * @param repoPath - Repository path
   * @returns Number of stash entries
   */
  private async getStashCount(repoPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync("git stash list", {
        cwd: repoPath,
        timeout: this.gitConfig.timeout,
      });
      return stdout.trim() ? stdout.trim().split("\n").length : 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Default export
 */
export default GitStatusTool;
