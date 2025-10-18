/**
 * @fileoverview GitLogTool - View git commit history
 * @module @qi/core/tools/builtin/GitLogTool
 *
 * @description
 * Provides functionality to view git commit history including:
 * - List commits with filtering options
 * - Search by author, message, date range
 * - Format output (oneline, short, full, custom)
 * - Limit number of commits
 * - Follow specific files or paths
 * - Branch-specific history
 * - Graph visualization option
 *
 * @example
 * ```typescript
 * const tool = new GitLogTool();
 * const result = await tool.execute({
 *   repository: '/path/to/repo',
 *   maxCount: 10,
 *   author: 'john@example.com'
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
 * Configuration options for GitLogTool
 */
export interface GitLogConfig {
  /** Maximum execution time in milliseconds (default: 30000ms) */
  timeout?: number;
  /** Default repository path if not specified in arguments */
  defaultRepository?: string;
  /** Default maximum number of commits to return */
  defaultMaxCount?: number;
  /** Maximum allowed commits to prevent memory issues */
  maxAllowedCount?: number;
  /** Enable verbose output */
  verbose?: boolean;
}

/**
 * Arguments for the git_log tool
 */
export interface GitLogArgs {
  /** Path to git repository (default: current directory) */
  repository?: string;
  /** Maximum number of commits to return (default: 10) */
  maxCount?: number;
  /** Skip the first N commits */
  skip?: number;
  /** Filter by author (name or email) */
  author?: string;
  /** Filter by committer (name or email) */
  committer?: string;
  /** Search in commit messages */
  grep?: string;
  /** Filter commits after date (ISO format or relative like '2 weeks ago') */
  since?: string;
  /** Filter commits before date (ISO format or relative) */
  until?: string;
  /** Specific branch to show history for */
  branch?: string;
  /** Specific file or path to follow */
  path?: string;
  /** Show merge commits only */
  merges?: boolean;
  /** Hide merge commits */
  noMerges?: boolean;
  /** Show first parent only (useful for merge commits) */
  firstParent?: boolean;
  /** Include commit statistics (files changed, insertions, deletions) */
  includeStats?: boolean;
}

/**
 * Commit information
 */
export interface CommitInfo {
  /** Full commit hash */
  hash: string;
  /** Short commit hash */
  shortHash: string;
  /** Commit message (subject line) */
  subject: string;
  /** Full commit message */
  body?: string;
  /** Author name */
  authorName: string;
  /** Author email */
  authorEmail: string;
  /** Author date */
  authorDate: string;
  /** Committer name */
  committerName: string;
  /** Committer email */
  committerEmail: string;
  /** Committer date */
  committerDate: string;
  /** Parent commit hashes */
  parents: string[];
  /** Ref names (branches, tags) */
  refs?: string;
  /** Commit statistics */
  stats?: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

/**
 * Git log result
 */
export interface GitLog {
  /** List of commits */
  commits: CommitInfo[];
  /** Total number of commits returned */
  count: number;
  /** Whether more commits are available */
  hasMore: boolean;
  /** Branch or ref that was queried */
  ref?: string;
  /** Raw git log output (if verbose) */
  raw?: string;
}

/**
 * GitLogTool - View git commit history
 *
 * This tool provides comprehensive git log functionality including:
 * - View commit history with various filters
 * - Search by author, message, date range
 * - Format output for different use cases
 * - Follow specific files or paths
 * - Branch-specific history
 *
 * @extends BaseTool
 */
export class GitLogTool extends BaseTool {
  private gitConfig: GitLogConfig;

  /**
   * Creates a new GitLogTool instance
   *
   * @param config - Optional configuration
   */
  constructor(config?: GitLogConfig) {
    super(
      "git_log",
      "View git commit history",
      {
        category: "git",
        tags: ["git", "version-control", "log", "history", "vcs"],
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
      defaultRepository: config?.defaultRepository,
      defaultMaxCount: config?.defaultMaxCount || 10,
      maxAllowedCount: config?.maxAllowedCount || 1000,
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
          maxCount: {
            type: "number",
            description: "Maximum number of commits to return (default: 10)",
            minimum: 1,
          },
          skip: {
            type: "number",
            description: "Skip the first N commits",
            minimum: 0,
          },
          author: {
            type: "string",
            description: "Filter by author (name or email)",
          },
          committer: {
            type: "string",
            description: "Filter by committer (name or email)",
          },
          grep: {
            type: "string",
            description: "Search in commit messages",
          },
          since: {
            type: "string",
            description:
              'Filter commits after date (ISO format or relative like "2 weeks ago")',
          },
          until: {
            type: "string",
            description: "Filter commits before date (ISO format or relative)",
          },
          branch: {
            type: "string",
            description: "Specific branch to show history for",
          },
          path: {
            type: "string",
            description: "Specific file or path to follow",
          },
          merges: {
            type: "boolean",
            description: "Show merge commits only",
          },
          noMerges: {
            type: "boolean",
            description: "Hide merge commits",
          },
          firstParent: {
            type: "boolean",
            description: "Show first parent only (useful for merge commits)",
          },
          includeStats: {
            type: "boolean",
            description: "Include commit statistics",
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

    if (args.maxCount !== undefined) {
      const maxValidation = this.validateNumber(args, "maxCount", {
        required: false,
        min: 1,
        max: this.gitConfig.maxAllowedCount,
      });
      if (maxValidation !== true) return maxValidation;
    }

    if (args.skip !== undefined) {
      const skipValidation = this.validateNumber(args, "skip", {
        required: false,
        min: 0,
      });
      if (skipValidation !== true) return skipValidation;
    }

    if (args.merges && args.noMerges) {
      return "Cannot specify both merges and noMerges";
    }

    return true;
  }

  /**
   * Executes the git log command
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as GitLogArgs;
    const repoPath =
      typedArgs.repository || this.gitConfig.defaultRepository || process.cwd();
    const maxCount = typedArgs.maxCount || this.gitConfig.defaultMaxCount || 10;

    try {
      // Verify repository exists and is a git repository
      await this.verifyGitRepository(repoPath);

      // Build and execute git log command
      const command = this.buildLogCommand(typedArgs, maxCount);
      const output = await this.executeLogCommand(repoPath, command);

      // Parse output
      const log = this.parseLog(output, maxCount, typedArgs);

      return {
        success: true,
        data: {
          log,
          repository: repoPath,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get git log",
      };
    }
  }

  /**
   * Verifies that the path is a git repository
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
   * Builds git log command with options
   */
  private buildLogCommand(args: GitLogArgs, maxCount: number): string {
    const parts = ["git log"];

    // Add count limit (add 1 to detect if there are more)
    parts.push(`-n ${maxCount + 1}`);

    // Add skip
    if (args.skip) {
      parts.push(`--skip=${args.skip}`);
    }

    // Add filters
    if (args.author) {
      parts.push(`--author="${args.author}"`);
    }

    if (args.committer) {
      parts.push(`--committer="${args.committer}"`);
    }

    if (args.grep) {
      parts.push(`--grep="${args.grep}"`);
    }

    if (args.since) {
      parts.push(`--since="${args.since}"`);
    }

    if (args.until) {
      parts.push(`--until="${args.until}"`);
    }

    // Merge options
    if (args.merges) {
      parts.push("--merges");
    } else if (args.noMerges) {
      parts.push("--no-merges");
    }

    if (args.firstParent) {
      parts.push("--first-parent");
    }

    // Format: use custom format for parsing
    const format = [
      "%H", // commit hash
      "%h", // short hash
      "%P", // parent hashes
      "%an", // author name
      "%ae", // author email
      "%ai", // author date (ISO)
      "%cn", // committer name
      "%ce", // committer email
      "%ci", // committer date (ISO)
      "%d", // ref names
      "%s", // subject
      "%b", // body
    ].join("%n");

    parts.push(`--format="${format}%n---COMMIT-END---"`);

    // Stats option
    if (args.includeStats) {
      parts.push("--stat");
    }

    // Branch
    if (args.branch) {
      parts.push(args.branch);
    }

    // Path filter (must come last after --)
    if (args.path) {
      parts.push("--");
      parts.push(`"${args.path}"`);
    }

    return parts.join(" ");
  }

  /**
   * Executes git log command
   */
  private async executeLogCommand(
    repoPath: string,
    command: string,
  ): Promise<string> {
    try {
      const { stdout } = await execAsync(command, {
        cwd: repoPath,
        timeout: this.gitConfig.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });
      return stdout;
    } catch (error: any) {
      // Handle empty repository
      if (error.message?.includes("does not have any commits")) {
        return "";
      }
      throw error;
    }
  }

  /**
   * Parses git log output
   */
  private parseLog(output: string, maxCount: number, args: GitLogArgs): GitLog {
    if (!output.trim()) {
      return {
        commits: [],
        count: 0,
        hasMore: false,
        ref: args.branch,
      };
    }

    const commitBlocks = output
      .split("---COMMIT-END---\n")
      .filter((block) => block.trim());
    const hasMore = commitBlocks.length > maxCount;
    const commits: CommitInfo[] = [];

    // Process up to maxCount commits
    for (let i = 0; i < Math.min(commitBlocks.length, maxCount); i++) {
      const commit = this.parseCommit(commitBlocks[i], args);
      if (commit) {
        commits.push(commit);
      }
    }

    const log: GitLog = {
      commits,
      count: commits.length,
      hasMore,
      ref: args.branch,
    };

    if (this.gitConfig.verbose) {
      log.raw = output;
    }

    return log;
  }

  /**
   * Parses a single commit block
   */
  private parseCommit(block: string, args: GitLogArgs): CommitInfo | null {
    const lines = block.split("\n");
    if (lines.length < 12) return null;

    const commit: CommitInfo = {
      hash: lines[0].trim(),
      shortHash: lines[1].trim(),
      parents: lines[2].trim() ? lines[2].trim().split(" ") : [],
      authorName: lines[3].trim(),
      authorEmail: lines[4].trim(),
      authorDate: lines[5].trim(),
      committerName: lines[6].trim(),
      committerEmail: lines[7].trim(),
      committerDate: lines[8].trim(),
      refs: lines[9].trim(),
      subject: lines[10].trim(),
      body: lines.slice(11).join("\n").trim(),
    };

    // Parse stats if included
    if (args.includeStats) {
      commit.stats = this.parseStats(block);
    }

    return commit;
  }

  /**
   * Parses commit statistics
   */
  private parseStats(block: string):
    | {
        filesChanged: number;
        insertions: number;
        deletions: number;
      }
    | undefined {
    const summaryMatch = block.match(
      /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/,
    );

    if (!summaryMatch) return undefined;

    return {
      filesChanged: parseInt(summaryMatch[1], 10),
      insertions: summaryMatch[2] ? parseInt(summaryMatch[2], 10) : 0,
      deletions: summaryMatch[3] ? parseInt(summaryMatch[3], 10) : 0,
    };
  }
}

export default GitLogTool;
