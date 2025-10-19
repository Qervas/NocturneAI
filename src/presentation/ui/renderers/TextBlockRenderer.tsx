/**
 * TextBlockRenderer - Renders text content blocks
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { TextBlock } from '../content-model.js';
import type { UITheme } from '../types.js';

export interface TextBlockRendererProps {
  block: TextBlock;
  theme: UITheme;
}

export const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({ block, theme }) => {
  const getColor = () => {
    switch (block.style) {
      case 'error':
        return theme.colors.error;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'muted':
        return theme.colors.muted;
      case 'bold':
        return theme.colors.foreground;
      default:
        return theme.colors.foreground;
    }
  };

  const getWeight = () => {
    return block.style === 'bold';
  };

  const getItalic = () => {
    return block.style === 'italic';
  };

  const getDim = () => {
    return block.style === 'muted';
  };

  return (
    <Box>
      <Text
        color={getColor()}
        bold={getWeight()}
        italic={getItalic()}
        dimColor={getDim()}
      >
        {block.icon && `${block.icon} `}{block.content}
      </Text>
    </Box>
  );
};

export default TextBlockRenderer;
