/**
 * BlockRenderer - Main renderer that delegates to specific block renderers
 *
 * Renders an array of content blocks using the appropriate renderer for each type.
 * This is the unified entry point for rendering structured message content.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { MessageContentBlock } from '../content-model.js';
import type { UITheme } from '../types.js';
import { TextBlockRenderer } from './TextBlockRenderer.js';
import { TodoListRenderer } from './TodoListRenderer.js';
import { ActionListRenderer } from './ActionListRenderer.js';
import { ResultsRenderer } from './ResultsRenderer.js';

export interface BlockRendererProps {
  blocks: MessageContentBlock[];
  theme: UITheme;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ blocks, theme }) => {
  return (
    <Box flexDirection="column">
      {blocks.map((block, index) => (
        <Box key={index} marginBottom={index < blocks.length - 1 ? 1 : 0}>
          {renderBlock(block, theme)}
        </Box>
      ))}
    </Box>
  );
};

/**
 * Render a single block based on its type
 */
function renderBlock(block: MessageContentBlock, theme: UITheme): React.ReactNode {
  switch (block.type) {
    case 'text':
      return <TextBlockRenderer block={block} theme={theme} />;

    case 'todo_list':
      return <TodoListRenderer block={block} theme={theme} />;

    case 'action_list':
      return <ActionListRenderer block={block} theme={theme} />;

    case 'results':
      return <ResultsRenderer block={block} theme={theme} />;

    case 'diff':
      // TODO: Implement DiffPreviewRenderer
      return (
        <Box flexDirection="column">
          <Text color={theme.colors.info}>File: {block.file}</Text>
          {block.deletions.map((line, i) => (
            <Text key={`del-${i}`} color={theme.colors.error}>- {line}</Text>
          ))}
          {block.additions.map((line, i) => (
            <Text key={`add-${i}`} color={theme.colors.success}>+ {line}</Text>
          ))}
        </Box>
      );

    case 'code':
      // TODO: Implement CodeBlockRenderer with syntax highlighting
      return (
        <Box flexDirection="column">
          {block.filename && (
            <Text color={theme.colors.muted}>{block.filename}</Text>
          )}
          <Text color={theme.colors.foreground}>{block.code}</Text>
        </Box>
      );

    case 'divider':
      return (
        <Text color={theme.colors.muted} dimColor>
          {block.style === 'dots' ? '...' : '─'.repeat(40)}
        </Text>
      );

    case 'list':
      return (
        <Box flexDirection="column">
          {block.items.map((item, i) => (
            <Text key={i} color={theme.colors.foreground}>
              {block.ordered ? `${i + 1}.` : (block.icon || '•')} {item}
            </Text>
          ))}
        </Box>
      );

    case 'table':
      // Simple table rendering
      return (
        <Box flexDirection="column">
          <Box>
            {block.headers.map((header, i) => (
              <Text key={i} bold color={theme.colors.secondary}>
                {header}{i < block.headers.length - 1 ? ' | ' : ''}
              </Text>
            ))}
          </Box>
          {block.rows.map((row, rowIndex) => (
            <Box key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <Text key={cellIndex} color={theme.colors.foreground}>
                  {cell}{cellIndex < row.length - 1 ? ' | ' : ''}
                </Text>
              ))}
            </Box>
          ))}
        </Box>
      );

    default:
      // Unknown block type
      return (
        <Text color={theme.colors.error}>
          Unknown block type: {(block as any).type}
        </Text>
      );
  }
}

export default BlockRenderer;
