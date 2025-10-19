/**
 * ActionListRenderer - Renders proposed actions with commands and parameters
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ActionListBlock } from '../content-model.js';
import type { UITheme } from '../types.js';

export interface ActionListRendererProps {
  block: ActionListBlock;
  theme: UITheme;
}

export const ActionListRenderer: React.FC<ActionListRendererProps> = ({ block, theme }) => {
  return (
    <Box flexDirection="column">
      {block.title && (
        <Box marginBottom={1}>
          <Text bold color={theme.colors.secondary}>
            {block.title}
          </Text>
        </Box>
      )}

      {block.actions.map((action, index) => (
        <Box key={action.id} flexDirection="column" marginLeft={2}>
          {/* Action description */}
          <Box>
            <Text color={theme.colors.foreground}>
              {index + 1}. {action.description}
            </Text>
          </Box>

          {/* Show command for command_execute */}
          {block.showCommands !== false && action.command === 'command_execute' && action.parameters && (
            <Box marginLeft={2}>
              <Text color={theme.colors.muted}>
                → Command: {action.parameters.command || ''}
                {action.parameters.args && Array.isArray(action.parameters.args) && action.parameters.args.length > 0 && (
                  <Text> {action.parameters.args.join(' ')}</Text>
                )}
              </Text>
            </Box>
          )}

          {/* Show file path for file_edit */}
          {block.showCommands !== false && action.command === 'file_edit' && action.parameters && (
            <Box marginLeft={2}>
              <Text color={theme.colors.muted}>
                → File: {action.parameters.path || ''}
              </Text>
            </Box>
          )}

          {/* Show parameters if requested */}
          {block.showParameters && action.parameters && (
            <Box marginLeft={2}>
              <Text color={theme.colors.muted} dimColor>
                → Parameters: {JSON.stringify(action.parameters)}
              </Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default ActionListRenderer;
