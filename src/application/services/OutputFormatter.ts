/**
 * OutputFormatter
 *
 * Formats tool execution output to be beautiful and user-friendly,
 * inspired by Claude Code's clean, readable output style.
 */

import type { ExecutionResult } from '../../presentation/ui/types.js';
import type { DiffResult } from '../../infrastructure/tools/utils/DiffGenerator.js';

/**
 * Output Formatter
 *
 * Takes raw tool output and formats it beautifully for display
 */
export class OutputFormatter {
  /**
   * Format execution results for display
   *
   * @param results Execution results from tools
   * @returns Beautifully formatted message
   */
  static formatResults(results: ExecutionResult[]): string {
    if (results.length === 0) {
      return 'No results';
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    let output = '';

    // Compact summary (no icons - ResultsRenderer adds them)
    if (failureCount === 0) {
      output += `Executed ${results.length} action(s) successfully\n\n`;
    } else {
      output += `Executed ${results.length} action(s): ${successCount} succeeded, ${failureCount} failed\n\n`;
    }

    // Format each result
    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      output += this.formatSingleResult(result, i + 1);

      if (i < results.length - 1) {
        output += '\n';
      }
    }

    return output;
  }

  /**
   * Format a single execution result
   *
   * @param result Single result
   * @param _index Result index (for numbering)
   * @returns Formatted string
   */
  private static formatSingleResult(result: ExecutionResult, _index: number): string {
    // Note: Don't add ✓/✗ icons here - ResultsRenderer adds them
    // This avoids duplicate icons (✓ ✓)
    let output = `${result.action?.description || result.message}\n`;

    if (result.output) {
      // Try to parse as JSON and format beautifully
      try {
        const data = JSON.parse(result.output);
        output += this.formatToolOutput(data, result.action?.command);
      } catch {
        // Not JSON, show as-is but with nice formatting
        output += this.formatPlainOutput(result.output);
      }
    }

    if (result.error) {
      output += `\n  Error: ${result.error}`;
    }

    return output;
  }

  /**
   * Format tool output based on tool type
   *
   * @param data Parsed JSON data
   * @param toolName Tool that produced this output
   * @returns Formatted string
   */
  private static formatToolOutput(data: any, toolName?: string): string {
    switch (toolName) {
      // File operations
      case 'file_list':
        return this.formatFileList(data);

      case 'file_read':
        return this.formatFileRead(data);

      case 'file_write':
        return this.formatFileWrite(data);

      case 'file_edit':
        return this.formatFileEdit(data);

      case 'file_delete':
        return this.formatFileDelete(data);

      case 'file_copy':
        return this.formatFileCopy(data);

      case 'file_move':
        return this.formatFileMove(data);

      // Command execution
      case 'command_execute':
        return this.formatCommandExecute(data);

      // Git operations
      case 'git_status':
        return this.formatGitStatus(data);

      case 'git_log':
        return this.formatGitLog(data);

      case 'git_diff':
        return this.formatGitDiff(data);

      case 'git_commit':
        return this.formatGitCommit(data);

      // Search operations
      case 'code_search':
        return this.formatSearchResults(data);

      case 'file_search':
        return this.formatFileSearch(data);

      case 'symbol_search':
        return this.formatSymbolSearch(data);

      default:
        // Generic formatting
        return this.formatGeneric(data);
    }
  }

  /**
   * Format file list output (like ls)
   */
  private static formatFileList(data: any): string {
    if (!data.entries || !Array.isArray(data.entries)) {
      return '\n  No files found';
    }

    const entries = data.entries;
    let output = `\n  Found ${entries.length} item(s) in ${data.path || 'directory'}\n\n`;

    // Group by type
    const dirs = entries.filter((e: any) => e.type === 'directory');
    const files = entries.filter((e: any) => e.type === 'file');

    // Show directories first
    if (dirs.length > 0) {
      output += '  📁 Directories:\n';
      dirs.slice(0, 20).forEach((dir: any) => {
        output += `     ${dir.name}/\n`;
      });
      if (dirs.length > 20) {
        output += `     ... and ${dirs.length - 20} more\n`;
      }
      output += '\n';
    }

    // Show files
    if (files.length > 0) {
      output += '  📄 Files:\n';
      files.slice(0, 30).forEach((file: any) => {
        const size = file.metadata?.size ? this.formatSize(file.metadata.size) : '';
        output += `     ${file.name}${size ? ` (${size})` : ''}\n`;
      });
      if (files.length > 30) {
        output += `     ... and ${files.length - 30} more\n`;
      }
    }

    return output;
  }

  /**
   * Format file read output
   */
  private static formatFileRead(data: any): string {
    if (!data.content) {
      return '\n  (empty file)';
    }

    const content = data.content;
    const lines = content.split('\n');

    let output = `\n  File: ${data.path || 'unknown'}\n`;
    output += `  Size: ${this.formatSize(content.length)}\n`;
    output += `  Lines: ${lines.length}\n\n`;

    // Show preview (first 20 lines)
    const preview = lines.slice(0, 20).join('\n');
    output += '  ```\n';
    output += preview.split('\n').map((line: string) => `  ${line}`).join('\n');
    output += '\n  ```';

    if (lines.length > 20) {
      output += `\n\n  ... and ${lines.length - 20} more lines`;
    }

    return output;
  }

  /**
   * Format git status output
   */
  private static formatGitStatus(data: any): string {
    let output = '\n  Git Status:\n\n';

    if (data.branch) {
      output += `  Branch: ${data.branch}\n`;
    }

    if (data.modified && data.modified.length > 0) {
      output += '\n  Modified:\n';
      data.modified.forEach((file: string) => {
        output += `    M ${file}\n`;
      });
    }

    if (data.staged && data.staged.length > 0) {
      output += '\n  Staged:\n';
      data.staged.forEach((file: string) => {
        output += `    A ${file}\n`;
      });
    }

    if (data.deleted && data.deleted.length > 0) {
      output += '\n  Deleted:\n';
      data.deleted.forEach((file: string) => {
        output += `    D ${file}\n`;
      });
    }

    if (data.untracked && data.untracked.length > 0) {
      output += '\n  Untracked:\n';
      data.untracked.forEach((file: string) => {
        output += `    ? ${file}\n`;
      });
    }

    return output;
  }

  /**
   * Format git log output
   */
  private static formatGitLog(data: any): string {
    if (!data.commits || !Array.isArray(data.commits)) {
      return '\n  No commits found';
    }

    let output = '\n  Recent Commits:\n\n';

    data.commits.forEach((commit: any) => {
      output += `  ${commit.hash?.substring(0, 7) || '???????'} ${commit.message}\n`;
      if (commit.author) {
        output += `  Author: ${commit.author}\n`;
      }
      if (commit.date) {
        output += `  Date: ${commit.date}\n`;
      }
      output += '\n';
    });

    return output;
  }

  /**
   * Format search results
   */
  private static formatSearchResults(data: any): string {
    if (!data.matches || !Array.isArray(data.matches)) {
      return '\n  No results found';
    }

    const matches = data.matches;
    let output = `\n  Found ${matches.length} match(es)\n\n`;

    matches.slice(0, 10).forEach((match: any) => {
      output += `  ${match.file}:${match.line || '?'}\n`;
      if (match.content) {
        output += `    ${match.content.trim()}\n`;
      }
      output += '\n';
    });

    if (matches.length > 10) {
      output += `  ... and ${matches.length - 10} more matches\n`;
    }

    return output;
  }

  /**
   * Format file write output
   */
  private static formatFileWrite(data: any): string {
    let output = '\n  File Write:\n\n';

    if (data.path) {
      output += `  Path: ${data.path}\n`;
    }

    if (data.bytesWritten !== undefined) {
      output += `  Size: ${this.formatSize(data.bytesWritten)}\n`;
    }

    if (data.created) {
      output += `  Status: Created new file\n`;
    } else {
      output += `  Status: Updated existing file\n`;
    }

    return output;
  }

  /**
   * Format file edit output with unified diff
   */
  private static formatFileEdit(data: any): string {
    let output = '\n  File Edit:\n\n';

    if (data.path) {
      output += `  File: ${data.path}\n`;
    }

    if (data.replacements !== undefined) {
      output += `  Replacements: ${data.replacements}\n`;
    }

    // Show unified diff if available
    if (data.diff) {
      const diff = data.diff as DiffResult;

      if (diff.identical) {
        output += '\n  No changes (identical content)\n';
      } else {
        output += '\n';

        // Show each hunk
        for (const hunk of diff.hunks) {
          // Hunk header (in blue/info color when rendered)
          output += `  ${hunk.header}\n`;

          // Show lines with color markers
          for (const line of hunk.lines) {
            const lineNum = (line.oldLineNumber || line.newLineNumber || 0)
              .toString()
              .padStart(4);

            if (line.type === 'add') {
              // Addition (will be green when rendered)
              output += `  ${lineNum} + ${line.content}\n`;
            } else if (line.type === 'remove') {
              // Removal (will be red when rendered)
              output += `  ${lineNum} - ${line.content}\n`;
            } else {
              // Context line (normal color)
              output += `  ${lineNum}   ${line.content}\n`;
            }
          }

          output += '\n';
        }

        // Summary
        const parts: string[] = [];
        if (diff.additions > 0) {
          parts.push(`+${diff.additions}`);
        }
        if (diff.deletions > 0) {
          parts.push(`-${diff.deletions}`);
        }

        const totalLines = diff.additions + diff.deletions + diff.unchanged;
        output += `  Changes: ${parts.join(' ')} (~${totalLines} line${totalLines !== 1 ? 's' : ''} affected)\n`;
      }
    }

    return output;
  }

  /**
   * Format file delete output
   */
  private static formatFileDelete(data: any): string {
    let output = '\n  File Delete:\n\n';

    if (data.path) {
      output += `  Deleted: ${data.path}\n`;
    }

    if (data.size !== undefined) {
      output += `  Size: ${this.formatSize(data.size)}\n`;
    }

    return output;
  }

  /**
   * Format file copy output
   */
  private static formatFileCopy(data: any): string {
    let output = '\n  File Copy:\n\n';

    if (data.source) {
      output += `  From: ${data.source}\n`;
    }

    if (data.destination) {
      output += `  To: ${data.destination}\n`;
    }

    if (data.size !== undefined) {
      output += `  Size: ${this.formatSize(data.size)}\n`;
    }

    return output;
  }

  /**
   * Format file move output
   */
  private static formatFileMove(data: any): string {
    let output = '\n  File Move:\n\n';

    if (data.source) {
      output += `  From: ${data.source}\n`;
    }

    if (data.destination) {
      output += `  To: ${data.destination}\n`;
    }

    if (data.size !== undefined) {
      output += `  Size: ${this.formatSize(data.size)}\n`;
    }

    return output;
  }

  /**
   * Format command execution output (simplified for Claude Code style)
   */
  private static formatCommandExecute(data: any): string {
    let output = '';

    // Compact format: just show the command and output, no verbose details
    if (data.command) {
      output += `\n  → ${data.command}\n`;
    }

    if (data.stdout) {
      const lines = data.stdout.split('\n').filter((l: string) => l.trim());

      // Show only first 3 lines by default (collapsed output)
      const previewLines = lines.slice(0, 3);
      previewLines.forEach((line: string) => {
        output += `    ${line}\n`;
      });

      if (lines.length > 3) {
        output += `    ... and ${lines.length - 3} more lines → View in logs\n`;
      }
    }

    if (data.stderr) {
      output += '\n  Errors:\n';
      const lines = data.stderr.split('\n');
      lines.slice(0, 20).forEach((line: string) => {
        output += `    ${line}\n`;
      });
      if (lines.length > 20) {
        output += `    ... and ${lines.length - 20} more lines\n`;
      }
    }

    return output;
  }

  /**
   * Format git diff output
   */
  private static formatGitDiff(data: any): string {
    let output = '\n  Git Diff:\n\n';

    if (data.file) {
      output += `  File: ${data.file}\n\n`;
    }

    if (data.diff) {
      const lines = data.diff.split('\n');
      if (lines.length <= 50) {
        lines.forEach((line: string) => {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            output += `  + ${line.substring(1)}\n`;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            output += `  - ${line.substring(1)}\n`;
          } else {
            output += `    ${line}\n`;
          }
        });
      } else {
        lines.slice(0, 50).forEach((line: string) => {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            output += `  + ${line.substring(1)}\n`;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            output += `  - ${line.substring(1)}\n`;
          } else {
            output += `    ${line}\n`;
          }
        });
        output += `\n  ... and ${lines.length - 50} more lines\n`;
      }
    }

    return output;
  }

  /**
   * Format git commit output
   */
  private static formatGitCommit(data: any): string {
    let output = '\n  Git Commit:\n\n';

    if (data.hash) {
      output += `  Commit: ${data.hash.substring(0, 7)}\n`;
    }

    if (data.message) {
      output += `  Message: ${data.message}\n`;
    }

    if (data.author) {
      output += `  Author: ${data.author}\n`;
    }

    if (data.filesChanged !== undefined) {
      output += `  Files Changed: ${data.filesChanged}\n`;
    }

    if (data.insertions !== undefined) {
      output += `  Insertions: +${data.insertions}\n`;
    }

    if (data.deletions !== undefined) {
      output += `  Deletions: -${data.deletions}\n`;
    }

    return output;
  }

  /**
   * Format file search output
   */
  private static formatFileSearch(data: any): string {
    if (!data.files || !Array.isArray(data.files)) {
      return '\n  No files found';
    }

    const files = data.files;
    let output = `\n  Found ${files.length} file(s)\n\n`;

    files.slice(0, 20).forEach((file: any) => {
      const path = typeof file === 'string' ? file : file.path;
      const size = file.size ? ` (${this.formatSize(file.size)})` : '';
      output += `  ${path}${size}\n`;
    });

    if (files.length > 20) {
      output += `  ... and ${files.length - 20} more files\n`;
    }

    return output;
  }

  /**
   * Format symbol search output
   */
  private static formatSymbolSearch(data: any): string {
    if (!data.symbols || !Array.isArray(data.symbols)) {
      return '\n  No symbols found';
    }

    const symbols = data.symbols;
    let output = `\n  Found ${symbols.length} symbol(s)\n\n`;

    symbols.slice(0, 15).forEach((symbol: any) => {
      output += `  ${symbol.name} (${symbol.type || 'unknown'})\n`;
      if (symbol.file) {
        output += `    File: ${symbol.file}`;
        if (symbol.line) {
          output += `:${symbol.line}`;
        }
        output += '\n';
      }
      if (symbol.signature) {
        output += `    ${symbol.signature}\n`;
      }
      output += '\n';
    });

    if (symbols.length > 15) {
      output += `  ... and ${symbols.length - 15} more symbols\n`;
    }

    return output;
  }

  /**
   * Format plain text output
   */
  private static formatPlainOutput(output: string): string {
    const lines = output.split('\n');

    // If it's short, show as-is
    if (lines.length <= 30) {
      return '\n' + lines.map(line => `  ${line}`).join('\n');
    }

    // Show preview
    const preview = lines.slice(0, 30).join('\n');
    return '\n' + preview.split('\n').map(line => `  ${line}`).join('\n') +
           `\n\n  ... and ${lines.length - 30} more lines`;
  }

  /**
   * Format generic JSON data
   */
  private static formatGeneric(data: any): string {
    // Pretty print JSON with indentation
    const json = JSON.stringify(data, null, 2);
    const lines = json.split('\n');

    if (lines.length <= 20) {
      return '\n' + lines.map(line => `  ${line}`).join('\n');
    }

    const preview = lines.slice(0, 20).join('\n');
    return '\n' + preview.split('\n').map(line => `  ${line}`).join('\n') +
           `\n  ... (truncated)`;
  }

  /**
   * Format file size in human-readable format
   */
  private static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
