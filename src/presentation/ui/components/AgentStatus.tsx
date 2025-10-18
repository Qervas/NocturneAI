/**
 * AgentStatus Component
 *
 * Displays the status of all agents in a list format.
 * Shows agent name, status, current task, progress, and metrics.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { AgentStatusProps } from '../types.js';

/**
 * Get status color based on agent status
 */
function getStatusColor(status: string, theme: AgentStatusProps['theme']): string {
  switch (status) {
    case 'idle':
      return theme.colors.muted;
    case 'busy':
      return theme.colors.warning;
    case 'error':
      return theme.colors.error;
    default:
      return theme.colors.foreground;
  }
}

/**
 * Get status symbol based on agent status
 */
function getStatusSymbol(status: string, theme: AgentStatusProps['theme']): string {
  switch (status) {
    case 'idle':
      return theme.symbols.pending;
    case 'busy':
      return theme.symbols.running;
    case 'error':
      return theme.symbols.failed;
    default:
      return theme.symbols.completed;
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * AgentStatus component
 *
 * Displays a list of agents with their current status and metrics.
 *
 * @param props - Component props
 * @returns Rendered agent status component
 */
export const AgentStatus: React.FC<AgentStatusProps> = ({
  agents,
  selectedAgentId,
  onSelect,
  theme
}) => {
  if (agents.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.colors.muted}>No agents available</Text>
        <Text color={theme.colors.muted} dimColor>
          Create an agent with: nocturne agent create
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          Agent Status ({agents.length})
        </Text>
      </Box>

      {agents.map((agent) => {
        const isSelected = agent.id === selectedAgentId;
        const statusColor = getStatusColor(agent.status, theme);
        const statusSymbol = getStatusSymbol(agent.status, theme);
        const uptime = agent.startTime
          ? Date.now() - agent.startTime.getTime()
          : 0;

        return (
          <Box
            key={agent.id}
            flexDirection="column"
            marginBottom={1}
            paddingX={1}
            borderStyle={isSelected ? 'round' : undefined}
            borderColor={isSelected ? theme.colors.primary : undefined}
          >
            {/* Agent Name and Status */}
            <Box>
              <Text color={statusColor}>{statusSymbol} </Text>
              <Text bold color={isSelected ? theme.colors.primary : theme.colors.foreground}>
                {agent.name}
              </Text>
              <Text color={theme.colors.muted}> ({agent.id.slice(0, 8)})</Text>
            </Box>

            {/* Status Details */}
            <Box marginLeft={2} marginTop={0}>
              <Text color={theme.colors.muted}>Status: </Text>
              <Text color={statusColor}>{agent.status.toUpperCase()}</Text>

              {agent.startTime && (
                <>
                  <Text color={theme.colors.muted}> • Uptime: </Text>
                  <Text>{formatDuration(uptime)}</Text>
                </>
              )}
            </Box>

            {/* Current Task */}
            {agent.currentTask && (
              <Box marginLeft={2}>
                <Text color={theme.colors.muted}>Task: </Text>
                <Text>{agent.currentTask}</Text>
              </Box>
            )}

            {/* Progress Bar */}
            {agent.progress !== undefined && agent.progress > 0 && (
              <Box marginLeft={2}>
                <Text color={theme.colors.muted}>Progress: </Text>
                <ProgressBar
                  progress={agent.progress}
                  width={30}
                  theme={theme}
                />
                <Text> {Math.round(agent.progress * 100)}%</Text>
              </Box>
            )}

            {/* Metrics */}
            {agent.metrics && (
              <Box marginLeft={2} marginTop={0}>
                <Text color={theme.colors.muted}>
                  Tasks: {agent.metrics.tasksCompleted} completed
                </Text>
                {agent.metrics.tasksInProgress > 0 && (
                  <Text color={theme.colors.warning}>
                    , {agent.metrics.tasksInProgress} in progress
                  </Text>
                )}
                {agent.metrics.tasksFailed > 0 && (
                  <Text color={theme.colors.error}>
                    , {agent.metrics.tasksFailed} failed
                  </Text>
                )}
                {agent.metrics.avgExecutionTime > 0 && (
                  <Text color={theme.colors.muted}>
                    {' '}• Avg: {formatDuration(agent.metrics.avgExecutionTime)}
                  </Text>
                )}
              </Box>
            )}
          </Box>
        );
      })}

    </Box>
  );
};

/**
 * ProgressBar sub-component
 */
interface ProgressBarProps {
  progress: number;
  width: number;
  theme: AgentStatusProps['theme'];
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, width, theme }) => {
  const filled = Math.round(progress * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color={theme.colors.success}>{'█'.repeat(filled)}</Text>
      <Text color={theme.colors.muted}>{'░'.repeat(empty)}</Text>
    </Text>
  );
};

export default AgentStatus;
