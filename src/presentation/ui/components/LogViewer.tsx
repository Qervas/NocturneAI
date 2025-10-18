/**
 * LogViewer Component
 *
 * Displays real-time logs with filtering, color coding, and auto-scrolling.
 * Shows log level, timestamp, source, and message with metadata support.
 */

import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { LogViewerProps, LogLevel, LogEntry } from '../types.js';

/**
 * Get log level color
 */
function getLogLevelColor(level: LogLevel, theme: LogViewerProps['theme']): string {
  switch (level) {
    case LogLevel.DEBUG:
      return theme.colors.muted;
    case LogLevel.INFO:
      return theme.colors.info;
    case LogLevel.WARN:
      return theme.colors.warning;
    case LogLevel.ERROR:
      return theme.colors.error;
    case LogLevel.SUCCESS:
      return theme.colors.success;
    default:
      return theme.colors.foreground;
  }
}

/**
 * Get log level symbol
 */
function getLogLevelSymbol(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return '◇';
    case LogLevel.INFO:
      return 'ℹ';
    case LogLevel.WARN:
      return '⚠';
    case LogLevel.ERROR:
      return '✗';
    case LogLevel.SUCCESS:
      return '✓';
    default:
      return '•';
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Truncate text to specified length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * LogViewer component
 *
 * Displays a scrollable list of log entries with filtering and formatting.
 *
 * @param props - Component props
 * @returns Rendered log viewer component
 */
export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  maxLogs = 100,
  filter,
  theme
}) => {
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | undefined>(undefined);

  // Filter logs based on level filter
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Apply custom filter if provided
    if (filter && filter.length > 0) {
      result = result.filter(log => filter.includes(log.level));
    }

    // Apply selected level filter
    if (selectedLevel) {
      result = result.filter(log => log.level === selectedLevel);
    }

    // Limit to maxLogs (most recent)
    return result.slice(-maxLogs);
  }, [logs, filter, selectedLevel, maxLogs]);

  // Calculate log level counts
  const levelCounts = useMemo(() => {
    const counts: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.SUCCESS]: 0
    };

    logs.forEach(log => {
      counts[log.level]++;
    });

    return counts;
  }, [logs]);

  if (logs.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.colors.muted}>No logs available</Text>
        <Text color={theme.colors.muted} dimColor>
          Logs will appear here as events occur
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          Logs ({filteredLogs.length}/{logs.length})
        </Text>
      </Box>

      {/* Level Filter Summary */}
      <Box marginBottom={1} marginLeft={2}>
        <Text color={theme.colors.muted}>Levels: </Text>

        <Text color={getLogLevelColor(LogLevel.ERROR, theme)}>
          {levelCounts[LogLevel.ERROR]} errors
        </Text>
        <Text color={theme.colors.muted}> • </Text>

        <Text color={getLogLevelColor(LogLevel.WARN, theme)}>
          {levelCounts[LogLevel.WARN]} warnings
        </Text>
        <Text color={theme.colors.muted}> • </Text>

        <Text color={getLogLevelColor(LogLevel.INFO, theme)}>
          {levelCounts[LogLevel.INFO]} info
        </Text>
        <Text color={theme.colors.muted}> • </Text>

        <Text color={getLogLevelColor(LogLevel.SUCCESS, theme)}>
          {levelCounts[LogLevel.SUCCESS]} success
        </Text>
        <Text color={theme.colors.muted}> • </Text>

        <Text color={getLogLevelColor(LogLevel.DEBUG, theme)}>
          {levelCounts[LogLevel.DEBUG]} debug
        </Text>
      </Box>

      {/* Separator */}
      <Box marginBottom={1}>
        <Text color={theme.colors.muted}>
          {'─'.repeat(80)}
        </Text>
      </Box>

      {/* Log Entries */}
      <Box flexDirection="column">
        {filteredLogs.map((log, index) => (
          <LogEntryRow
            key={`${log.timestamp.getTime()}-${index}`}
            log={log}
            theme={theme}
          />
        ))}
      </Box>

      {/* Footer */}
      {filteredLogs.length < logs.length && (
        <Box marginTop={1}>
          <Text color={theme.colors.muted} dimColor>
            Showing last {maxLogs} logs. {logs.length - filteredLogs.length} older logs hidden.
          </Text>
        </Box>
      )}

      {/* Help Text */}
      <Box marginTop={1}>
        <Text color={theme.colors.muted} dimColor>
          Use /logs clear to clear logs
        </Text>
      </Box>
    </Box>
  );
};

/**
 * LogEntryRow sub-component
 */
interface LogEntryRowProps {
  log: LogEntry;
  theme: LogViewerProps['theme'];
}

const LogEntryRow: React.FC<LogEntryRowProps> = ({ log, theme }) => {
  const levelColor = getLogLevelColor(log.level, theme);
  const levelSymbol = getLogLevelSymbol(log.level);
  const timestamp = formatTimestamp(log.timestamp);

  return (
    <Box flexDirection="column" marginBottom={0}>
      {/* Main Log Line */}
      <Box>
        {/* Timestamp */}
        <Text color={theme.colors.muted}>
          [{timestamp}]
        </Text>

        {/* Level Symbol */}
        <Text color={levelColor}> {levelSymbol} </Text>

        {/* Level Name */}
        <Text color={levelColor} bold>
          {log.level.toUpperCase().padEnd(7)}
        </Text>

        {/* Source */}
        <Text color={theme.colors.secondary}>
          {truncate(log.source, 15).padEnd(15)}
        </Text>

        {/* Message */}
        <Text color={theme.colors.foreground}>
          {' '}{log.message}
        </Text>
      </Box>

      {/* Metadata (if present) */}
      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <Box marginLeft={4}>
          <Text color={theme.colors.muted} dimColor>
            {JSON.stringify(log.metadata, null, 0)}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default LogViewer;
