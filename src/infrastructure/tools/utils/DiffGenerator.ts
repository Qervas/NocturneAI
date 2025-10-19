/**
 * DiffGenerator
 *
 * Generates unified diffs for file changes, similar to git diff format.
 * Provides structured diff data with additions, deletions, and context lines.
 */

import * as Diff from 'diff';

/**
 * Diff Change Type
 */
export type DiffChangeType = 'add' | 'remove' | 'context';

/**
 * Single diff line
 */
export interface DiffLine {
  /** Line type: addition, removal, or context */
  type: DiffChangeType;

  /** Line content (without prefix) */
  content: string;

  /** Original line number (for context and removals) */
  oldLineNumber?: number;

  /** New line number (for context and additions) */
  newLineNumber?: number;

  /** Prefix character ('+', '-', ' ') */
  prefix: string;
}

/**
 * Diff Hunk
 *
 * Represents a section of changes in the file
 */
export interface DiffHunk {
  /** Hunk header (e.g., "@@ -42,3 +42,3 @@") */
  header: string;

  /** Start line in old file */
  oldStart: number;

  /** Number of lines in old file */
  oldLines: number;

  /** Start line in new file */
  newStart: number;

  /** Number of lines in new file */
  newLines: number;

  /** Lines in this hunk */
  lines: DiffLine[];
}

/**
 * Complete diff result
 */
export interface DiffResult {
  /** All hunks in the diff */
  hunks: DiffHunk[];

  /** Total additions */
  additions: number;

  /** Total deletions */
  deletions: number;

  /** Total unchanged lines */
  unchanged: number;

  /** Whether files are identical */
  identical: boolean;
}

/**
 * Diff Generator
 *
 * Generates structured unified diffs for file editing
 */
export class DiffGenerator {
  /**
   * Generate unified diff between two strings
   *
   * @param oldContent Original content
   * @param newContent New content
   * @param contextLines Number of context lines around changes (default: 3)
   * @returns Structured diff result
   */
  static generateDiff(
    oldContent: string,
    newContent: string,
    contextLines: number = 3,
  ): DiffResult {
    // Check if contents are identical
    if (oldContent === newContent) {
      return {
        hunks: [],
        additions: 0,
        deletions: 0,
        unchanged: oldContent.split('\n').length,
        identical: true,
      };
    }

    // Generate patch using diff library
    const patches = Diff.structuredPatch(
      '',
      '',
      oldContent,
      newContent,
      '',
      '',
      { context: contextLines },
    );

    // Convert patches to our hunk format
    const hunks: DiffHunk[] = patches.hunks.map((hunk) => {
      const lines: DiffLine[] = [];
      let oldLineNum = hunk.oldStart;
      let newLineNum = hunk.newStart;

      for (const line of hunk.lines) {
        const prefix = line.charAt(0);
        const content = line.substring(1); // Remove prefix

        let type: DiffChangeType;
        let diffLine: DiffLine;

        if (prefix === '+') {
          type = 'add';
          diffLine = {
            type,
            content,
            newLineNumber: newLineNum,
            prefix: '+',
          };
          newLineNum++;
        } else if (prefix === '-') {
          type = 'remove';
          diffLine = {
            type,
            content,
            oldLineNumber: oldLineNum,
            prefix: '-',
          };
          oldLineNum++;
        } else {
          // Context line (space prefix)
          type = 'context';
          diffLine = {
            type,
            content,
            oldLineNumber: oldLineNum,
            newLineNumber: newLineNum,
            prefix: ' ',
          };
          oldLineNum++;
          newLineNum++;
        }

        lines.push(diffLine);
      }

      return {
        header: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
        oldStart: hunk.oldStart,
        oldLines: hunk.oldLines,
        newStart: hunk.newStart,
        newLines: hunk.newLines,
        lines,
      };
    });

    // Calculate statistics
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') {
          additions++;
        } else if (line.type === 'remove') {
          deletions++;
        } else {
          unchanged++;
        }
      }
    }

    return {
      hunks,
      additions,
      deletions,
      unchanged,
      identical: false,
    };
  }

  /**
   * Format diff result as plain text (no colors)
   *
   * @param diff Diff result
   * @param options Formatting options
   * @returns Formatted diff string
   */
  static formatPlainDiff(
    diff: DiffResult,
    options: {
      showLineNumbers?: boolean;
      contextLines?: number;
    } = {},
  ): string {
    if (diff.identical) {
      return 'No changes';
    }

    const { showLineNumbers = true } = options;
    const lines: string[] = [];

    for (const hunk of diff.hunks) {
      // Add hunk header
      lines.push(hunk.header);

      // Add hunk lines
      for (const line of hunk.lines) {
        if (showLineNumbers) {
          const lineNum =
            line.type === 'remove'
              ? line.oldLineNumber?.toString().padStart(4) || '    '
              : line.newLineNumber?.toString().padStart(4) || '    ';
          lines.push(`${lineNum} ${line.prefix} ${line.content}`);
        } else {
          lines.push(`${line.prefix} ${line.content}`);
        }
      }

      lines.push(''); // Empty line between hunks
    }

    return lines.join('\n');
  }

  /**
   * Generate summary of changes
   *
   * @param diff Diff result
   * @returns Human-readable summary
   */
  static generateSummary(diff: DiffResult): string {
    if (diff.identical) {
      return 'No changes';
    }

    const parts: string[] = [];

    if (diff.additions > 0) {
      parts.push(`+${diff.additions}`);
    }

    if (diff.deletions > 0) {
      parts.push(`-${diff.deletions}`);
    }

    const totalChanged = diff.additions + diff.deletions;
    const totalLines = totalChanged + diff.unchanged;

    return `${parts.join(' ')} (~${totalLines} line${totalLines !== 1 ? 's' : ''} affected)`;
  }

  /**
   * Get affected line numbers from diff
   *
   * @param diff Diff result
   * @returns Array of line numbers that were modified (old file line numbers)
   */
  static getAffectedLineNumbers(diff: DiffResult): number[] {
    const lineNumbers = new Set<number>();

    for (const hunk of diff.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'remove' && line.oldLineNumber !== undefined) {
          lineNumbers.add(line.oldLineNumber);
        } else if (line.type === 'add' && line.newLineNumber !== undefined) {
          lineNumbers.add(line.newLineNumber);
        }
      }
    }

    return Array.from(lineNumbers).sort((a, b) => a - b);
  }

  /**
   * Generate compact preview for confirmation
   *
   * Shows only the changed lines with minimal context
   *
   * @param diff Diff result
   * @param maxLines Maximum number of lines to show
   * @returns Compact preview string
   */
  static generateCompactPreview(
    diff: DiffResult,
    maxLines: number = 10,
  ): string {
    if (diff.identical) {
      return 'No changes';
    }

    const lines: string[] = [];
    let lineCount = 0;

    for (const hunk of diff.hunks) {
      // Only show changed lines, skip context
      const changedLines = hunk.lines.filter(
        (l) => l.type === 'add' || l.type === 'remove',
      );

      for (const line of changedLines) {
        if (lineCount >= maxLines) {
          lines.push(`... (${diff.additions + diff.deletions - lineCount} more changes)`);
          return lines.join('\n');
        }

        const lineNum =
          line.type === 'remove'
            ? line.oldLineNumber?.toString().padStart(4) || '    '
            : line.newLineNumber?.toString().padStart(4) || '    ';

        lines.push(`${lineNum} ${line.prefix} ${line.content}`);
        lineCount++;
      }
    }

    return lines.join('\n');
  }
}
