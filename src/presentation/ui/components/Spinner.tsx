/**
 * Spinner Component
 *
 * Loading spinner component for displaying async operations and loading states.
 * Uses ink-spinner for animated spinner with customizable colors and messages.
 */

import React from "react";
import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";
import { UITheme } from "../types.js";

/**
 * Spinner type
 */
export type SpinnerType = "dots" | "line" | "arc" | "arrow" | "bounce";

/**
 * Component props
 */
export interface SpinnerProps {
  /**
   * Loading message to display
   */
  message?: string;

  /**
   * Spinner type/style
   */
  type?: SpinnerType;

  /**
   * Theme for colors
   */
  theme: UITheme;

  /**
   * Color for the spinner (overrides theme)
   */
  color?: string;
}

/**
 * Spinner component
 *
 * Displays an animated loading spinner with optional message.
 *
 * @param props - Component props
 * @returns Rendered spinner component
 */
export const Spinner: React.FC<SpinnerProps> = ({
  message = "Loading...",
  type = "dots",
  theme,
  color,
}) => {
  const spinnerColor = color || theme.colors.primary;

  return (
    <Box>
      <Text color={spinnerColor}>
        <InkSpinner type={type} />
      </Text>
      {message && (
        <Text color={theme.colors.muted}> {message}</Text>
      )}
    </Box>
  );
};

/**
 * FullScreenSpinner component
 *
 * Centered spinner that takes up the full terminal screen.
 */
export interface FullScreenSpinnerProps extends SpinnerProps {
  /**
   * Title to display above spinner
   */
  title?: string;
}

export const FullScreenSpinner: React.FC<FullScreenSpinnerProps> = ({
  title,
  message,
  type = "dots",
  theme,
  color,
}) => {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight={20}
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            {title}
          </Text>
        </Box>
      )}
      <Spinner message={message} type={type} theme={theme} color={color} />
    </Box>
  );
};

/**
 * InlineSpinner component
 *
 * Compact spinner for inline use in lists or small spaces.
 */
export interface InlineSpinnerProps {
  /**
   * Theme for colors
   */
  theme: UITheme;

  /**
   * Color override
   */
  color?: string;
}

export const InlineSpinner: React.FC<InlineSpinnerProps> = ({ theme, color }) => {
  const spinnerColor = color || theme.colors.warning;

  return (
    <Text color={spinnerColor}>
      <InkSpinner type="dots" />
    </Text>
  );
};

/**
 * LoadingBox component
 *
 * Box with spinner and customizable content for loading states.
 */
export interface LoadingBoxProps {
  /**
   * Loading message
   */
  message: string;

  /**
   * Optional details or subtext
   */
  details?: string;

  /**
   * Theme for colors
   */
  theme: UITheme;

  /**
   * Show border
   */
  bordered?: boolean;

  /**
   * Progress percentage (0-100)
   */
  progress?: number;
}

export const LoadingBox: React.FC<LoadingBoxProps> = ({
  message,
  details,
  theme,
  bordered = true,
  progress,
}) => {
  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle={bordered ? "round" : undefined}
      borderColor={bordered ? theme.colors.primary : undefined}
    >
      <Box marginBottom={details || progress !== undefined ? 1 : 0}>
        <Text color={theme.colors.primary}>
          <InkSpinner type="dots" />
        </Text>
        <Text color={theme.colors.foreground}> {message}</Text>
      </Box>

      {details && (
        <Box marginLeft={2}>
          <Text color={theme.colors.muted} dimColor>
            {details}
          </Text>
        </Box>
      )}

      {progress !== undefined && (
        <Box marginLeft={2} marginTop={details ? 1 : 0}>
          <Text color={theme.colors.muted}>Progress: </Text>
          <Box width={30}>
            <Text color={theme.colors.success}>
              {"█".repeat(Math.round((progress / 100) * 30))}
            </Text>
            <Text color={theme.colors.muted}>
              {"░".repeat(30 - Math.round((progress / 100) * 30))}
            </Text>
          </Box>
          <Text color={theme.colors.muted}> {Math.round(progress)}%</Text>
        </Box>
      )}
    </Box>
  );
};

export default Spinner;
