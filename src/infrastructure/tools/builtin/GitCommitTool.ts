/**
 * @fileoverview GitCommitTool - Commit changes to git repository
 * @module @qi/core/tools/builtin/GitCommitTool
 *
 * @description
 * Provides functionality to commit changes to a git repository including:
 * - Commit staged changes with custom messages
 * - Auto-stage modified files before committing
 * - Amend previous commits
 * - Sign commits
 * - Add co-authors
 * - Validate commit messages
 * - Safety checks (no empty commits, etc.)
 *
 * @example
 * ```typescript
 * const tool = new GitCommitTool();
 * const result = await tool.execute({
 *   repository: '/path/to/repo',
 *   message: 'feat: add new feature',
 *   files: ['src/index.ts'],
 *   autoStage: true
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
 * Configuration options for GitCommitTool
 */
export interface GitCommitConfig {
  /** Maximum execution time in milliseconds (default: 30000ms) */
  timeout?: number;
  /** Default repository path if not specified in arguments */
  defaultRepository?: string;
  /** Require commit message validation */
  validateMessage?: boolean;
  /** Minimum commit message length */
  minMessageLength?: number;
  /** Maximum commit message length */
  maxMessageLength?: number;
  /** Allow empty commits */
  allowEmpty?: boolean;
  /** Auto-sign commits by default */
  signByDefault?: boolean;
  /** Enforce conventional commit format */
  enforceConventionalCommits?: boolean;
  /** Enable verbose output */
  verbose?: boolean;
}

/**
 * Arguments for the git_commit tool
 */
export interface GitCommitArgs {
  /** Path to git repository (default: current directory) */
  repository?: string;
  /** Commit message (required) */
  message: string;
  /** Specific files to stage and commit (empty = commit all staged) */
  files?: string[];
  /** Auto-stage modified files before committing */
  autoStage?: boolean;
  /** Amend the previous commit */
  amend?: boolean;
  /** Allow empty commit (no changes) */
  allowEmpty?: boolean;
  /** Sign the commit */
  sign?: boolean;
  /** Co-authors to add to commit message */
  coAuthors?: string[];
  /** Additional commit message body */
  body?: string;
  /** Commit author (format: "Name <email>") */
  author?: string;
  /** Skip pre-commit hooks */
  noVerify?: boolean;
}

/**
 * Commit result information
 */
export interface CommitResult {
  /** Commit hash */
  hash: string;
  /** Short commit hash */
  shortHash: string;
  /** Commit message */
  message: string;
  /** Author name and email */
  author: string;
  /** Timestamp of commit */
  timestamp: string;
  /** Number of files changed */
  filesChanged: number;
  /** Number of insertions */
  insertions: number;
  /** Number of deletions */
  deletions: number;
  /** Files that were committed */
  files: string[];
  /** Whether this was an amended commit */
  amended: boolean;
}

/**
 * GitCommitTool - Commit changes to git repository
 *
 * This tool provides safe git commit functionality including:
 * - Create commits with validated messages
 * - Auto-stage files before committing
 * - Amend previous commits
 * - Sign commits for verification
 * - Multi-author commits
 * - Conventional commit format support
 *
 * @extends BaseTool
 */
export class GitCommitTool extends BaseTool {
  private gitConfig: GitCommitConfig;

  /**
   * Creates a new GitCommitTool instance
   *
   * @param config - Optional configuration
   */
  constructor(config?: GitCommitConfig) {
    super(
      "git_commit",
      "Commit changes to git repository",
      {
        category: "git",
        tags: ["git", "version-control", "commit", "vcs"],
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
      validateMessage: config?.validateMessage ?? true,
      minMessageLength: config?.minMessageLength || 10,
      maxMessageLength: config?.maxMessageLength || 500,
      allowEmpty: config?.allowEmpty ?? false,
      signByDefault: config?.signByDefault ?? false,
      enforceConventionalCommits: config?.enforceConventionalCommits ?? false,
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
          message: {
            type: "string",
            description: "Commit message (required)",
          },
          files: {
            type: "array",
            items: { type: "string" },
            description:
              "Specific files to stage and commit (empty = commit all staged)",
          },
          autoStage: {
            type: "boolean",
            description: "Auto-stage modified files before committing",
          },
          amend: {
            type: "boolean",
            description: "Amend the previous commit",
          },
          allowEmpty: {
            type: "boolean",
            description: "Allow empty commit (no changes)",
          },
          sign: {
            type: "boolean",
            description: "Sign the commit",
          },
          coAuthors: {
            type: "array",
            items: { type: "string" },
            description:
              'Co-authors to add to commit message (format: "Name <email>")',
          },
          body: {
            type: "string",
            description: "Additional commit message body",
          },
          author: {
            type: "string",
            description: 'Commit author (format: "Name <email>")',
          },
          noVerify: {
            type: "boolean",
            description: "Skip pre-commit hooks",
          },
        },
        required: ["message"],
      },
    };
  }

  /**
   * Validate arguments
   */
  validate(args: Record<string, unknown>): boolean | string {
    // Validate repository
    if (args.repository !== undefined) {
      const pathValidation = this.validateString(args, "repository", {
        required: false,
      });
      if (pathValidation !== true) return pathValidation;
    }

    // Validate message
    const messageValidation = this.validateString(args, "message", {
      required: true,
      minLength: 1,
    });
    if (messageValidation !== true) return messageValidation;

    const message = (args.message as string).trim();
    if (message.length === 0) {
      return "Commit message cannot be empty";
    }

    if (this.gitConfig.validateMessage) {
      if (
        this.gitConfig.minMessageLength &&
        message.length < this.gitConfig.minMessageLength
      ) {
        return `Commit message must be at least ${this.gitConfig.minMessageLength} characters`;
      }

      if (
        this.gitConfig.maxMessageLength &&
        message.length > this.gitConfig.maxMessageLength
      ) {
        return `Commit message must not exceed ${this.gitConfig.maxMessageLength} characters`;
      }

      // Validate conventional commit format if enforced
      if (this.gitConfig.enforceConventionalCommits) {
        const conventionalFormat =
          /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+/;
        if (!conventionalFormat.test(message)) {
          return "Commit message must follow conventional commit format: type(scope): message";
        }
      }
    }

    // Validate author format
    if (args.author) {
      const author = args.author as string;
      const authorFormat = /^.+ <.+@.+\..+>$/;
      if (!authorFormat.test(author)) {
        return 'Author must be in format: "Name <email@example.com>"';
      }
    }

    // Validate co-authors format
    if (args.coAuthors) {
      if (!Array.isArray(args.coAuthors)) {
        return "coAuthors must be an array";
      }

      const coAuthorFormat = /^.+ <.+@.+\..+>$/;
      for (const coAuthor of args.coAuthors) {
        if (typeof coAuthor !== "string" || !coAuthorFormat.test(coAuthor)) {
          return `Co-author must be in format: "Name <email@example.com>": ${coAuthor}`;
        }
      }
    }

    return true;
  }

  /**
   * Executes the git commit command
   *
   * @param args - Tool arguments
   * @param context - Execution context
   * @returns Tool execution result with commit information
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as unknown as GitCommitArgs;
    const repoPath =
      typedArgs.repository || this.gitConfig.defaultRepository || process.cwd();
    const files = typedArgs.files || [];
    const autoStage = typedArgs.autoStage ?? false;

    try {
      // Verify repository exists and is a git repository
      await this.verifyGitRepository(repoPath);

      // Check if there are changes to commit (unless amending or allowing empty)
      if (
        !typedArgs.amend &&
        !typedArgs.allowEmpty &&
        !this.gitConfig.allowEmpty
      ) {
        const hasChanges = await this.hasChangesToCommit(
          repoPath,
          autoStage,
          files,
        );
        if (!hasChanges) {
          return {
            success: false,
            error: "No changes to commit",
          };
        }
      }

      // Stage files if requested
      if (autoStage || files.length > 0) {
        await this.stageFiles(repoPath, files.length > 0 ? files : ["."]);
      }

      // Build commit message with body and co-authors
      const fullMessage = this.buildCommitMessage(typedArgs);

      // Execute commit
      const result = await this.executeCommit(repoPath, fullMessage, typedArgs);

      return {
        success: true,
        data: {
          commit: result,
          repository: repoPath,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to commit changes",
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
   * Checks if there are changes to commit
   */
  private async hasChangesToCommit(
    repoPath: string,
    autoStage: boolean,
    files: string[],
  ): Promise<boolean> {
    try {
      // Check staged changes
      const { stdout: staged } = await execAsync(
        "git diff --cached --name-only",
        {
          cwd: repoPath,
          timeout: this.gitConfig.timeout,
        },
      );

      if (staged.trim()) {
        return true;
      }

      // If auto-staging or specific files, check unstaged changes
      if (autoStage || files.length > 0) {
        const fileArgs = files.length > 0 ? `-- ${files.join(" ")}` : "";
        const { stdout: unstaged } = await execAsync(
          `git diff --name-only ${fileArgs}`,
          {
            cwd: repoPath,
            timeout: this.gitConfig.timeout,
          },
        );

        if (unstaged.trim()) {
          return true;
        }

        // Check untracked files if specific files mentioned
        if (files.length > 0) {
          const { stdout: untracked } = await execAsync(
            "git ls-files --others --exclude-standard",
            {
              cwd: repoPath,
              timeout: this.gitConfig.timeout,
            },
          );

          const untrackedFiles = untracked.trim().split("\n");
          return files.some((f) => untrackedFiles.includes(f));
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Stages files for commit
   */
  private async stageFiles(repoPath: string, files: string[]): Promise<void> {
    const fileArgs = files.map((f) => `"${f}"`).join(" ");
    await execAsync(`git add ${fileArgs}`, {
      cwd: repoPath,
      timeout: this.gitConfig.timeout,
    });
  }

  /**
   * Builds full commit message with body and co-authors
   */
  private buildCommitMessage(args: GitCommitArgs): string {
    const parts: string[] = [args.message.trim()];

    // Add body if provided
    if (args.body && args.body.trim()) {
      parts.push("");
      parts.push(args.body.trim());
    }

    // Add co-authors if provided
    if (args.coAuthors && args.coAuthors.length > 0) {
      parts.push("");
      for (const coAuthor of args.coAuthors) {
        parts.push(`Co-authored-by: ${coAuthor}`);
      }
    }

    return parts.join("\n");
  }

  /**
   * Executes the git commit command
   */
  private async executeCommit(
    repoPath: string,
    message: string,
    args: GitCommitArgs,
  ): Promise<CommitResult> {
    const commitArgs: string[] = ["git commit"];

    // Escape message for shell
    const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    commitArgs.push(`-m "${escapedMessage}"`);

    // Add flags
    if (args.amend) commitArgs.push("--amend");
    if (args.allowEmpty || this.gitConfig.allowEmpty)
      commitArgs.push("--allow-empty");
    if (args.sign || this.gitConfig.signByDefault)
      commitArgs.push("--gpg-sign");
    if (args.noVerify) commitArgs.push("--no-verify");
    if (args.author) commitArgs.push(`--author="${args.author}"`);

    // Execute commit
    await execAsync(commitArgs.join(" "), {
      cwd: repoPath,
      timeout: this.gitConfig.timeout,
    });

    // Get commit information
    return await this.getCommitInfo(repoPath, args.amend ?? false);
  }

  /**
   * Gets information about the most recent commit
   */
  private async getCommitInfo(
    repoPath: string,
    amended: boolean,
  ): Promise<CommitResult> {
    // Get commit hash and message
    const { stdout: hashInfo } = await execAsync(
      'git log -1 --format="%H%n%h%n%s%n%an <%ae>%n%ai"',
      {
        cwd: repoPath,
        timeout: this.gitConfig.timeout,
      },
    );

    const [hash, shortHash, message, author, timestamp] = hashInfo
      .trim()
      .split("\n");

    // Get commit stats
    const { stdout: stats } = await execAsync(
      'git show --stat --format="" HEAD',
      {
        cwd: repoPath,
        timeout: this.gitConfig.timeout,
      },
    );

    const { filesChanged, insertions, deletions } =
      this.parseCommitStats(stats);

    // Get list of files
    const { stdout: filesOutput } = await execAsync(
      'git show --name-only --format="" HEAD',
      {
        cwd: repoPath,
        timeout: this.gitConfig.timeout,
      },
    );

    const files = filesOutput
      .trim()
      .split("\n")
      .filter((f) => f.trim());

    return {
      hash,
      shortHash,
      message,
      author,
      timestamp,
      filesChanged,
      insertions,
      deletions,
      files,
      amended,
    };
  }

  /**
   * Parses commit statistics
   */
  private parseCommitStats(stats: string): {
    filesChanged: number;
    insertions: number;
    deletions: number;
  } {
    const summaryMatch = stats.match(
      /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/,
    );

    return {
      filesChanged: summaryMatch ? parseInt(summaryMatch[1], 10) : 0,
      insertions:
        summaryMatch && summaryMatch[2] ? parseInt(summaryMatch[2], 10) : 0,
      deletions:
        summaryMatch && summaryMatch[3] ? parseInt(summaryMatch[3], 10) : 0,
    };
  }
}

export default GitCommitTool;
