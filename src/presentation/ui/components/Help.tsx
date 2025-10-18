/**
 * Help Component
 *
 * Displays keyboard shortcuts, command descriptions, and usage information
 * for the Terminal UI. Provides quick reference for all available actions.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { HelpProps } from '../types.js';
import { getKeyBindingDescriptions } from '../hooks/useKeyBindings.js';

/**
 * Help component
 *
 * Shows comprehensive help information including keyboard shortcuts,
 * navigation tips, and available commands.
 *
 * @param props - Component props
 * @returns Rendered help component
 */
export const Help: React.FC<HelpProps> = ({ theme }) => {
  const keyBindings = getKeyBindingDescriptions();

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          Help & Keyboard Shortcuts
        </Text>
      </Box>

      {/* Description */}
      <Box marginBottom={2}>
        <Text color={theme.colors.muted}>
          NocturneAI Terminal UI provides an interactive interface for managing
          agents and workflows.
        </Text>
      </Box>

      {/* Navigation Section */}
      <Box flexDirection="column" marginBottom={2}>
        <Text bold color={theme.colors.secondary}>
          Navigation
        </Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          {keyBindings.slice(0, 6).map((binding, index) => (
            <Box key={index} marginBottom={0}>
              <Text color={theme.colors.primary} bold>
                {binding.key.padEnd(10)}
              </Text>
              <Text color={theme.colors.foreground}>{binding.description}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Actions Section */}
      <Box flexDirection="column" marginBottom={2}>
        <Text bold color={theme.colors.secondary}>
          Actions
        </Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          {keyBindings.slice(6, 9).map((binding, index) => (
            <Box key={index} marginBottom={0}>
              <Text color={theme.colors.primary} bold>
                {binding.key.padEnd(10)}
              </Text>
              <Text color={theme.colors.foreground}>{binding.description}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Controls Section */}
      <Box flexDirection="column" marginBottom={2}>
        <Text bold color={theme.colors.secondary}>
          Controls
        </Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          {keyBindings.slice(9).map((binding, index) => (
            <Box key={index} marginBottom={0}>
              <Text color={theme.colors.primary} bold>
                {binding.key.padEnd(10)}
              </Text>
              <Text color={theme.colors.foreground}>{binding.description}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Views Description */}
      <Box flexDirection="column" marginBottom={2}>
        <Text bold color={theme.colors.secondary}>
          Views
        </Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Box marginBottom={0}>
            <Text color={theme.colors.primary} bold>
              Dashboard
            </Text>
            <Text color={theme.colors.muted}>
              {' '}- Overview of active agents, workflows, and recent activity
            </Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.primary} bold>
              Agent Status
            </Text>
            <Text color={theme.colors.muted}>
              {' '}- Detailed view of all agents with metrics and current tasks
            </Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.primary} bold>
              Workflow Progress
            </Text>
            <Text color={theme.colors.muted}>
              {' '}- Step-by-step visualization of running workflows
            </Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.primary} bold>
              Logs
            </Text>
            <Text color={theme.colors.muted}>
              {' '}- Real-time log viewer with filtering by level
            </Text>
          </Box>
        </Box>
      </Box>

      {/* CLI Commands */}
      <Box flexDirection="column" marginBottom={2}>
        <Text bold color={theme.colors.secondary}>
          Common CLI Commands
        </Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Box marginBottom={0}>
            <Text color={theme.colors.success}>nocturne agent create</Text>
            <Text color={theme.colors.muted}> - Create a new agent</Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.success}>nocturne agent run</Text>
            <Text color={theme.colors.muted}> - Run an agent with a task</Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.success}>nocturne workflow run</Text>
            <Text color={theme.colors.muted}> - Execute a workflow</Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.success}>nocturne tool list</Text>
            <Text color={theme.colors.muted}> - List available tools</Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.success}>nocturne project init</Text>
            <Text color={theme.colors.muted}> - Initialize a new project</Text>
          </Box>
        </Box>
      </Box>

      {/* Status Indicators */}
      <Box flexDirection="column" marginBottom={2}>
        <Text bold color={theme.colors.secondary}>
          Status Indicators
        </Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Box marginBottom={0}>
            <Text color={theme.colors.muted}>
              {theme.symbols.pending} Pending
            </Text>
            <Text color={theme.colors.muted}> • </Text>
            <Text color={theme.colors.warning}>
              {theme.symbols.running} Running
            </Text>
            <Text color={theme.colors.muted}> • </Text>
            <Text color={theme.colors.success}>
              {theme.symbols.completed} Completed
            </Text>
            <Text color={theme.colors.muted}> • </Text>
            <Text color={theme.colors.error}>
              {theme.symbols.failed} Failed
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Tips */}
      <Box flexDirection="column">
        <Text bold color={theme.colors.secondary}>
          Tips
        </Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Box marginBottom={0}>
            <Text color={theme.colors.info}>{theme.symbols.bullet}</Text>
            <Text color={theme.colors.muted}>
              {' '}The UI refreshes automatically every 5 seconds
            </Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.info}>{theme.symbols.bullet}</Text>
            <Text color={theme.colors.muted}>
              {' '}Press 'r' to manually refresh the current view
            </Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.info}>{theme.symbols.bullet}</Text>
            <Text color={theme.colors.muted}>
              {' '}Use arrow keys to navigate lists and select items
            </Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.info}>{theme.symbols.bullet}</Text>
            <Text color={theme.colors.muted}>
              {' '}Logs are limited to the last 1000 entries to prevent memory issues
            </Text>
          </Box>
          <Box marginBottom={0}>
            <Text color={theme.colors.info}>{theme.symbols.bullet}</Text>
            <Text color={theme.colors.muted}>
              {' '}Press Ctrl+C or 'q' to exit at any time
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={2}>
        <Text color={theme.colors.muted} dimColor>
          For more information, visit: https://github.com/nocturneai/nocturne
        </Text>
      </Box>
    </Box>
  );
};

export default Help;
