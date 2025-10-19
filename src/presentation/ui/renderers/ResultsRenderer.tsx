/**
 * ResultsRenderer - Renders execution results with success/failure indicators
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ExecutionResultBlock } from '../content-model.js';
import type { UITheme } from '../types.js';

export interface ResultsRendererProps {
  block: ExecutionResultBlock;
  theme: UITheme;
}

export const ResultsRenderer: React.FC<ResultsRendererProps> = ({ block, theme }) => {
  return (
    <Box flexDirection="column">
      {block.summary && (
        <Box marginBottom={1}>
          <Text bold color={theme.colors.info}>
            {block.summary}
          </Text>
        </Box>
      )}

      {block.results.map((result, index) => {
        const maxPreviewLines = 3;
        const outputLines = result.output ? result.output.split('\n') : [];
        const hasMoreLines = outputLines.length > maxPreviewLines;
        const previewLines = outputLines.slice(0, maxPreviewLines);

        return (
          <Box key={index} flexDirection="column" marginBottom={0}>
            {/* Show result with icon and output inline (Claude Code style) */}
            <Box flexDirection="column">
              {/* Show icon + message ONLY if there's no output AND no error */}
              {!result.output && !result.error && (
                <Box>
                  <Text color={result.success ? theme.colors.success : theme.colors.error}>
                    {result.success ? '✓' : '✗'} {result.message}
                  </Text>
                </Box>
              )}

              {/* Show collapsed output with icon on first line */}
              {result.output && (
                <Box flexDirection="column">
                  {previewLines.map((line, i) => (
                    <Box key={i}>
                      {i === 0 && (
                        <Text color={result.success ? theme.colors.success : theme.colors.error}>
                          {result.success ? '✓' : '✗'}{' '}
                        </Text>
                      )}
                      <Text color={theme.colors.muted} dimColor>
                        {i === 0 ? line : `  ${line}`}
                      </Text>
                    </Box>
                  ))}
                  {hasMoreLines && (
                    <Text color={theme.colors.info} marginLeft={2}>
                      ... and {outputLines.length - maxPreviewLines} more lines → View in logs
                    </Text>
                  )}
                </Box>
              )}

              {/* Show error if present */}
              {result.error && (
                <Box marginLeft={2} marginTop={0}>
                  <Text color={theme.colors.error}>
                    Error: {result.error}
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ResultsRenderer;
