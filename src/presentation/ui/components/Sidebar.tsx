/**
 * Sidebar Component
 *
 * Read-only status display showing system metrics at a glance.
 * Shows current model, agent counts, workflow counts, error counts, and help hint.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { UITheme } from '../types.js';

interface SidebarProps {
  currentMode: string;
  currentModel: string;
  agentCount: number;
  activeAgentCount: number;
  workflowCount: number;
  activeWorkflowCount: number;
  errorCount: number;
  theme: UITheme;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  currentModel,
  agentCount,
  activeAgentCount,
  workflowCount,
  activeWorkflowCount,
  errorCount,
  theme
}) => {
  return (
    <Box
      flexDirection="column"
      width={12}
      borderStyle="single"
      borderColor={theme.colors.muted}
      paddingX={1}
      paddingY={1}
      height="100%"
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          Nocturne
        </Text>
      </Box>

      {/* Spacer - pushes metrics to bottom */}
      <Box flexGrow={1} />

      {/* Current Mode */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.secondary} dimColor>
          Mode
        </Text>
        <Text color={theme.colors.primary}>
          {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
        </Text>
      </Box>

      {/* Current Model */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.secondary} dimColor>
          Model
        </Text>
        <Text color={theme.colors.info}>
          {currentModel}
        </Text>
      </Box>

      {/* Agent Count */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.secondary} dimColor>
          Agents
        </Text>
        <Text color={theme.colors.success}>
          {activeAgentCount}/{agentCount}
        </Text>
      </Box>

      {/* Workflow Count */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.secondary} dimColor>
          Flows
        </Text>
        <Text color={theme.colors.info}>
          {activeWorkflowCount}/{workflowCount}
        </Text>
      </Box>

      {/* Error Count */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.secondary} dimColor>
          Errors
        </Text>
        <Text color={errorCount > 0 ? theme.colors.error : theme.colors.success}>
          {errorCount}
        </Text>
      </Box>
    </Box>
  );
};

export default Sidebar;