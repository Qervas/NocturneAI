/**
 * TodoListRenderer - Renders todo list blocks with status indicators
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { TodoListBlock } from '../content-model.js';
import type { UITheme } from '../types.js';

export interface TodoListRendererProps {
  block: TodoListBlock;
  theme: UITheme;
}

export const TodoListRenderer: React.FC<TodoListRendererProps> = ({ block, theme }) => {
  return (
    <Box flexDirection="column">
      {block.title && (
        <Box marginBottom={1}>
          <Text bold color={theme.colors.secondary}>
            {block.title}
          </Text>
        </Box>
      )}

      {block.todos.map((todo, index) => {
        const icon = todo.status === 'completed' ? '✓' :
                     todo.status === 'in_progress' ? '⟳' : '○';

        const color = todo.status === 'completed' ? theme.colors.success :
                      todo.status === 'in_progress' ? theme.colors.warning :
                      theme.colors.muted;

        const isCurrentStep = block.currentIndex !== undefined && index === block.currentIndex;

        return (
          <Box key={index}>
            <Text color={color} bold={isCurrentStep}>
              {icon} {index + 1}. {todo.description}
            </Text>
            {todo.result && (
              <Text color={theme.colors.muted}> ({todo.result})</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default TodoListRenderer;
