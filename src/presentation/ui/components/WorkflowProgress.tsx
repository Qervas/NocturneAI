/**
 * WorkflowProgress Component
 *
 * Displays detailed workflow execution progress with step-by-step visualization.
 * Shows workflow status, current step, timeline, and step details.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { WorkflowProgressProps, WorkflowStepDisplay } from '../types.js';

/**
 * Get status color based on workflow status
 */
function getStatusColor(
  status: string,
  theme: WorkflowProgressProps['theme']
): string {
  switch (status) {
    case 'pending':
      return theme.colors.muted;
    case 'running':
      return theme.colors.warning;
    case 'completed':
      return theme.colors.success;
    case 'failed':
      return theme.colors.error;
    case 'cancelled':
      return theme.colors.muted;
    default:
      return theme.colors.foreground;
  }
}

/**
 * Get status symbol based on workflow status
 */
function getStatusSymbol(
  status: string,
  theme: WorkflowProgressProps['theme']
): string {
  switch (status) {
    case 'pending':
      return theme.symbols.pending;
    case 'running':
      return theme.symbols.running;
    case 'completed':
      return theme.symbols.completed;
    case 'failed':
      return theme.symbols.failed;
    case 'cancelled':
      return '○';
    case 'skipped':
      return '⊘';
    default:
      return theme.symbols.bullet;
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format timestamp
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * WorkflowProgress component
 *
 * Displays workflow execution progress with step visualization.
 *
 * @param props - Component props
 * @returns Rendered workflow progress component
 */
export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  workflow,
  theme,
  compact = false
}) => {
  const statusColor = getStatusColor(workflow.status, theme);
  const statusSymbol = getStatusSymbol(workflow.status, theme);

  // Calculate total duration
  const duration =
    workflow.startTime && workflow.endTime
      ? workflow.endTime.getTime() - workflow.startTime.getTime()
      : workflow.startTime
      ? Date.now() - workflow.startTime.getTime()
      : 0;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Workflow Header */}
      <Box marginBottom={1}>
        <Text color={statusColor}>{statusSymbol} </Text>
        <Text bold color={theme.colors.primary}>
          {workflow.name}
        </Text>
        <Text color={theme.colors.muted}> ({workflow.id.slice(0, 8)})</Text>
      </Box>

      {/* Status and Progress */}
      <Box marginLeft={2} marginBottom={1}>
        <Box flexDirection="column">
          <Box>
            <Text color={theme.colors.muted}>Status: </Text>
            <Text color={statusColor}>{workflow.status.toUpperCase()}</Text>
            <Text color={theme.colors.muted}>
              {' '}• Step {workflow.currentStep || 0}/{workflow.totalSteps}
            </Text>
            {duration > 0 && (
              <>
                <Text color={theme.colors.muted}> • Duration: </Text>
                <Text>{formatDuration(duration)}</Text>
              </>
            )}
          </Box>

          {/* Progress Bar */}
          <Box marginTop={1}>
            <Text color={theme.colors.muted}>Progress: </Text>
            <ProgressBar
              progress={workflow.progress}
              width={40}
              theme={theme}
            />
            <Text> {Math.round(workflow.progress * 100)}%</Text>
          </Box>
        </Box>
      </Box>

      {/* Steps Timeline */}
      {!compact && (
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text bold color={theme.colors.secondary}>
              Steps:
            </Text>
          </Box>

          {workflow.steps.map((step, index) => (
            <WorkflowStep
              key={step.id}
              step={step}
              index={index}
              isLast={index === workflow.steps.length - 1}
              theme={theme}
            />
          ))}
        </Box>
      )}

      {/* Compact Steps Summary */}
      {compact && (
        <Box marginTop={1} marginLeft={2}>
          <Text color={theme.colors.muted}>
            {workflow.steps.filter(s => s.status === 'completed').length} completed,{' '}
            {workflow.steps.filter(s => s.status === 'running').length} running,{' '}
            {workflow.steps.filter(s => s.status === 'failed').length} failed
          </Text>
        </Box>
      )}

      {/* Error Message */}
      {workflow.status === 'failed' && (
        <Box marginTop={1} marginLeft={2}>
          <Text color={theme.colors.error}>
            ✗ Failed:{' '}
            {workflow.steps.find(s => s.status === 'failed')?.error || 'Unknown error'}
          </Text>
        </Box>
      )}

      {/* Timestamps */}
      {!compact && (
        <Box marginTop={1} marginLeft={2}>
          {workflow.startTime && (
            <Text color={theme.colors.muted}>
              Started: {formatTime(workflow.startTime)}
            </Text>
          )}
          {workflow.endTime && (
            <Text color={theme.colors.muted}>
              {' '}• Ended: {formatTime(workflow.endTime)}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

/**
 * WorkflowStep sub-component
 */
interface WorkflowStepProps {
  step: WorkflowStepDisplay;
  index: number;
  isLast: boolean;
  theme: WorkflowProgressProps['theme'];
}

const WorkflowStep: React.FC<WorkflowStepProps> = ({
  step,
  index,
  isLast,
  theme
}) => {
  const statusColor = getStatusColor(step.status, theme);
  const statusSymbol = getStatusSymbol(step.status, theme);

  const duration = step.duration || 0;

  return (
    <Box flexDirection="column" marginLeft={2}>
      {/* Step Header */}
      <Box>
        {/* Connection Line */}
        {index > 0 && (
          <Text color={theme.colors.muted}>│ </Text>
        )}
        {index === 0 && <Text>  </Text>}

        {/* Status Symbol */}
        <Text color={statusColor}>{statusSymbol} </Text>

        {/* Step Name */}
        <Text
          bold={step.status === 'running'}
          color={step.status === 'running' ? theme.colors.warning : theme.colors.foreground}
        >
          {step.name}
        </Text>

        {/* Duration */}
        {duration > 0 && (
          <Text color={theme.colors.muted}> ({formatDuration(duration)})</Text>
        )}
      </Box>

      {/* Step Details */}
      {step.status === 'running' && (
        <Box marginLeft={4}>
          <Text color={theme.colors.warning}>⟳ In progress...</Text>
        </Box>
      )}

      {step.status === 'failed' && step.error && (
        <Box marginLeft={4}>
          <Text color={theme.colors.error}>✗ Error: {step.error}</Text>
        </Box>
      )}

      {step.status === 'skipped' && (
        <Box marginLeft={4}>
          <Text color={theme.colors.muted}>⊘ Skipped</Text>
        </Box>
      )}

      {/* Vertical Line to Next Step */}
      {!isLast && step.status !== 'pending' && (
        <Box>
          <Text color={theme.colors.muted}>│</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * ProgressBar sub-component
 */
interface ProgressBarProps {
  progress: number;
  width: number;
  theme: WorkflowProgressProps['theme'];
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

export default WorkflowProgress;
