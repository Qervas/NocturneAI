/**
 * Built-in Tools
 *
 * Collection of built-in tools for the NocturneAI system.
 *
 * File Operations:
 * - FileReadTool: Read file contents
 * - FileWriteTool: Write content to files
 * - FileListTool: List directory contents
 * - FileDeleteTool: Delete files and directories
 * - FileMoveTool: Move/rename files and directories
 * - FileCopyTool: Copy files and directories
 *
 * Command Operations:
 * - CommandExecuteTool: Execute shell commands
 *
 * Git Operations:
 * - GitStatusTool: Get git repository status
 * - GitDiffTool: Show git changes and diffs
 * - GitCommitTool: Commit changes to git repository
 * - GitLogTool: View git commit history
 *
 * Search Operations:
 * - CodeSearchTool: Search for patterns in code files
 * - FileSearchTool: Find files by name or pattern
 * - SymbolSearchTool: Find symbol definitions in code
 */

// File Tools
export { FileReadTool } from "./FileReadTool.js";
export { FileWriteTool } from "./FileWriteTool.js";
export { FileListTool } from "./FileListTool.js";
export { FileDeleteTool } from "./FileDeleteTool.js";
export { FileMoveTool } from "./FileMoveTool.js";
export { FileCopyTool } from "./FileCopyTool.js";

// Command Tools
export { CommandExecuteTool } from "./CommandExecuteTool.js";

// Git Tools
export { GitStatusTool } from "./GitStatusTool.js";
export { GitDiffTool } from "./GitDiffTool.js";
export { GitCommitTool } from "./GitCommitTool.js";
export { GitLogTool } from "./GitLogTool.js";

// Search Tools
export { CodeSearchTool } from "./CodeSearchTool.js";
export { FileSearchTool } from "./FileSearchTool.js";
export { SymbolSearchTool } from "./SymbolSearchTool.js";

// File Tool Types
export type {
  FileReadToolConfig,
  FileReadArgs,
  FileReadResult,
} from "./FileReadTool.js";
export type {
  FileWriteToolConfig,
  FileWriteArgs,
  FileWriteResult,
} from "./FileWriteTool.js";
export type {
  FileListToolConfig,
  FileListArgs,
  FileListResult,
  FileEntry,
  FileType,
  SortBy,
} from "./FileListTool.js";
export type {
  FileDeleteToolConfig,
  FileDeleteArgs,
  FileDeleteResult,
} from "./FileDeleteTool.js";
export type {
  FileMoveToolConfig,
  FileMoveArgs,
  FileMoveResult,
} from "./FileMoveTool.js";
export type {
  FileCopyToolConfig,
  FileCopyArgs,
  FileCopyResult,
} from "./FileCopyTool.js";

// Command Tool Types
export type {
  CommandExecuteToolConfig,
  CommandExecuteArgs,
  CommandExecuteResult,
} from "./CommandExecuteTool.js";

// Git Tool Types
export type {
  GitStatusConfig,
  GitStatusArgs,
  GitStatus,
  FileStatus,
  BranchInfo,
} from "./GitStatusTool.js";
export type {
  GitDiffConfig,
  GitDiffArgs,
  GitDiff,
  FileDiff,
  DiffStats,
} from "./GitDiffTool.js";
export type {
  GitCommitConfig,
  GitCommitArgs,
  CommitResult,
} from "./GitCommitTool.js";
export type {
  GitLogConfig,
  GitLogArgs,
  GitLog,
  CommitInfo,
} from "./GitLogTool.js";

// Search Tool Types
export type {
  CodeSearchToolConfig,
  CodeSearchArgs,
  CodeSearchResult,
  SearchMatch,
} from "./CodeSearchTool.js";
export type {
  FileSearchToolConfig,
  FileSearchArgs,
  FileSearchResult,
  FileSearchEntry,
} from "./FileSearchTool.js";
export type {
  SymbolSearchToolConfig,
  SymbolSearchArgs,
  SymbolSearchResult,
  SymbolDefinition,
  SymbolType,
} from "./SymbolSearchTool.js";
