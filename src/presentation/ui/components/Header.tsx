/**
 * Header Component
 *
 * Displays the application header with title, version, and status information.
 * Shows active agents, running workflows, and current time.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { UITheme, AgentDisplay, WorkflowDisplay } from '../types.js';

/**
 * Header component props
 */
export interface HeaderProps {
  theme: UITheme;
  agents: AgentDisplay[];
  workflows: WorkflowDisplay[];
  showTime?: boolean;
}

/**
 * Header component
 *
 * Displays the main application header with branding and status.
 *
 * @param props - Component props
 * @returns Rendered header component
 */
export const Header: React.FC<HeaderProps> = ({
  theme,
  agents,
  workflows,
  showTime = true
}) => {
  // Calculate active counts
  const activeAgents = agents.filter(a => a.status === 'busy').length;
  const totalAgents = agents.length;
  const activeWorkflows = workflows.filter(w => w.status === 'running').length;
  const totalWorkflows = workflows.length;

  // Get current time
  const currentTime = showTime
    ? new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : '';

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Title Bar */}
      <Box justifyContent="space-between">
        <Box>
          <Text bold color={theme.colors.primary}>
            ⚡ NocturneAI
          </Text>
          <Text color={theme.colors.muted}> v1.0.0</Text>
        </Box>
        {showTime && (
          <Text color={theme.colors.muted}>{currentTime}</Text>
        )}
      </Box>

      {/* Status Bar */}
      <Box marginTop={1}>
        <Box marginRight={4}>
          <Text color={theme.colors.muted}>Agents: </Text>
          <Text color={activeAgents > 0 ? theme.colors.success : theme.colors.muted}>
            {activeAgents}
          </Text>
          <Text color={theme.colors.muted}>/</Text>
          <Text>{totalAgents}</Text>
        </Box>

        <Box marginRight={4}>
          <Text color={theme.colors.muted}>Workflows: </Text>
          <Text color={activeWorkflows > 0 ? theme.colors.warning : theme.colors.muted}>
            {activeWorkflows}
          </Text>
          <Text color={theme.colors.muted}>/</Text>
          <Text>{totalWorkflows}</Text>
        </Box>

        <Box>
          <Text color={theme.colors.muted}>Status: </Text>
          {activeAgents > 0 || activeWorkflows > 0 ? (
            <Text color={theme.colors.success}>● Active</Text>
          ) : (
            <Text color={theme.colors.muted}>○ Idle</Text>
          )}
        </Box>
      </Box>

      {/* Separator */}
      <Box marginTop={1}>
        <Text color={theme.colors.muted}>
          {'─'.repeat(80)}
        </Text>
      </Box>
    </Box>
  );
};

export default Header;
