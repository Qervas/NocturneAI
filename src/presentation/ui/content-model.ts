/**
 * Content Model - Structured Message Content Blocks
 *
 * Unified content representation that separates data from presentation.
 * Inspired by Claude Code's approach to clean, structured UI.
 *
 * Each block type represents a semantic unit of content that can be:
 * - Rendered as formatted text (for logs, CLI output)
 * - Rendered as interactive UI components (for rich terminal UI)
 *
 * Benefits:
 * - Single source of truth for content
 * - No duplication between text and structured data
 * - Easy to extend with new block types
 * - Clear separation of concerns
 */

import type { ProposedAction, ExecutionResult } from './types.js';

/**
 * Text block - Simple text content with optional styling
 */
export interface TextBlock {
  type: 'text';
  content: string;
  style?: 'normal' | 'italic' | 'bold' | 'muted' | 'error' | 'success' | 'warning';
  icon?: string;
}

/**
 * Todo list block - Task progress with status indicators
 */
export interface TodoListBlock {
  type: 'todo_list';
  todos: Array<{
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    result?: string;
  }>;
  currentIndex?: number;
  title?: string;
}

/**
 * Action list block - Proposed actions with commands and parameters
 */
export interface ActionListBlock {
  type: 'action_list';
  actions: ProposedAction[];
  title?: string;
  showCommands?: boolean;
  showParameters?: boolean;
}

/**
 * Diff preview block - File changes with additions and deletions
 */
export interface DiffPreviewBlock {
  type: 'diff';
  file: string;
  additions: string[];
  deletions: string[];
  lineStart?: number;
  maxLines?: number;
}

/**
 * Execution results block - Tool execution outcomes
 */
export interface ExecutionResultBlock {
  type: 'results';
  results: ExecutionResult[];
  summary?: string;
  showDetails?: boolean;
}

/**
 * Code block - Syntax-highlighted code snippet
 */
export interface CodeBlock {
  type: 'code';
  language?: string;
  code: string;
  filename?: string;
  lineNumbers?: boolean;
}

/**
 * Divider block - Visual separator
 */
export interface DividerBlock {
  type: 'divider';
  style?: 'line' | 'space' | 'dots';
}

/**
 * List block - Bulleted or numbered list
 */
export interface ListBlock {
  type: 'list';
  items: string[];
  ordered?: boolean;
  icon?: string;
}

/**
 * Table block - Tabular data
 */
export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
  align?: Array<'left' | 'center' | 'right'>;
}

/**
 * Union type of all content blocks
 */
export type MessageContentBlock =
  | TextBlock
  | TodoListBlock
  | ActionListBlock
  | DiffPreviewBlock
  | ExecutionResultBlock
  | CodeBlock
  | DividerBlock
  | ListBlock
  | TableBlock;

/**
 * Block utilities
 */
export class BlockUtils {
  /**
   * Convert blocks to plain text (for backward compatibility and logs)
   */
  static blocksToText(blocks: MessageContentBlock[]): string {
    return blocks.map(block => this.blockToText(block)).join('\n');
  }

  /**
   * Convert a single block to text
   */
  static blockToText(block: MessageContentBlock): string {
    switch (block.type) {
      case 'text':
        return (block.icon ? `${block.icon} ` : '') + block.content;

      case 'todo_list': {
        let output = '';
        if (block.title) {
          output += `${block.title}\n\n`;
        }
        block.todos.forEach((todo, i) => {
          const icon = todo.status === 'completed' ? '✓' :
                       todo.status === 'in_progress' ? '⟳' : '○';
          output += `${icon} ${i + 1}. ${todo.description}`;
          if (todo.result) {
            output += ` (${todo.result})`;
          }
          output += '\n';
        });
        return output;
      }

      case 'action_list': {
        let output = '';
        if (block.title) {
          output += `${block.title}\n\n`;
        }
        block.actions.forEach((action, i) => {
          output += `${i + 1}. ${action.description}\n`;

          if (block.showCommands && action.command === 'command_execute' && action.parameters) {
            const params = action.parameters as any;
            const cmd = params.command || '';
            const args = params.args || [];
            if (cmd) {
              output += `   → Command: ${cmd}${args.length > 0 ? ' ' + (Array.isArray(args) ? args.join(' ') : args) : ''}\n`;
            }
          }

          if (block.showCommands && action.command === 'file_edit' && action.parameters) {
            const params = action.parameters as any;
            const path = params.path || '';
            if (path) {
              output += `   → File: ${path}\n`;
            }
          }
        });
        return output;
      }

      case 'diff': {
        let output = `File: ${block.file}\n`;
        if (block.deletions.length > 0) {
          block.deletions.forEach(line => {
            output += `- ${line}\n`;
          });
        }
        if (block.additions.length > 0) {
          block.additions.forEach(line => {
            output += `+ ${line}\n`;
          });
        }
        return output;
      }

      case 'results': {
        let output = '';
        if (block.summary) {
          output += `${block.summary}\n\n`;
        }
        block.results.forEach(result => {
          const icon = result.success ? '✓' : '✗';
          output += `${icon} ${result.message}\n`;
          if (block.showDetails && result.output) {
            output += `  ${result.output}\n`;
          }
        });
        return output;
      }

      case 'code':
        return `\`\`\`${block.language || ''}\n${block.code}\n\`\`\``;

      case 'divider':
        return block.style === 'dots' ? '...' : '---';

      case 'list': {
        let output = '';
        block.items.forEach((item, i) => {
          const prefix = block.ordered ? `${i + 1}.` : (block.icon || '•');
          output += `${prefix} ${item}\n`;
        });
        return output;
      }

      case 'table': {
        // Simple text table representation
        let output = block.headers.join(' | ') + '\n';
        output += block.headers.map(() => '---').join(' | ') + '\n';
        block.rows.forEach(row => {
          output += row.join(' | ') + '\n';
        });
        return output;
      }

      default:
        return '';
    }
  }

  /**
   * Extract all proposed actions from blocks
   */
  static extractActions(blocks: MessageContentBlock[]): ProposedAction[] {
    return blocks
      .filter((b): b is ActionListBlock => b.type === 'action_list')
      .flatMap(b => b.actions);
  }

  /**
   * Extract all execution results from blocks
   */
  static extractResults(blocks: MessageContentBlock[]): ExecutionResult[] {
    return blocks
      .filter((b): b is ExecutionResultBlock => b.type === 'results')
      .flatMap(b => b.results);
  }

  /**
   * Find first block of given type
   */
  static findBlock<T extends MessageContentBlock>(
    blocks: MessageContentBlock[],
    type: T['type']
  ): T | undefined {
    return blocks.find(b => b.type === type) as T | undefined;
  }

  /**
   * Filter blocks by type
   */
  static filterBlocks<T extends MessageContentBlock>(
    blocks: MessageContentBlock[],
    type: T['type']
  ): T[] {
    return blocks.filter(b => b.type === type) as T[];
  }
}
