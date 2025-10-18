/**
 * ConfirmationDialog Component
 *
 * Interactive dialog for confirming proposed actions before execution.
 * Allows users to proceed, modify, or cancel operations.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ChatMessage, ConfirmationStatus } from '../types.js';

interface ConfirmationDialogProps {
  message: ChatMessage;
  onConfirm: (response: ConfirmationStatus) => void;
  theme: any;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  onConfirm,
  theme
}) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const options: Array<{ label: string; value: ConfirmationStatus; color: string }> = [
    { label: '✓ Proceed', value: 'approved', color: theme.colors.success },
    { label: '✏ Modify', value: 'modified', color: theme.colors.warning },
    { label: '✗ Cancel', value: 'cancelled', color: theme.colors.error }
  ];

  useInput((input, key) => {
    // Navigate options with arrow keys
    if (key.leftArrow) {
      setSelectedOption(prev => (prev - 1 + options.length) % options.length);
    }
    if (key.rightArrow) {
      setSelectedOption(prev => (prev + 1) % options.length);
    }

    // Confirm with Enter
    if (key.return) {
      onConfirm(options[selectedOption].value);
    }

    // Quick shortcuts
    if (input === 'y' || input === 'Y') {
      onConfirm('approved');
    }
    if (input === 'n' || input === 'N') {
      onConfirm('cancelled');
    }
    if (input === 'm' || input === 'M') {
      onConfirm('modified');
    }

    // Cancel with Escape
    if (key.escape) {
      onConfirm('cancelled');
    }
  }, { isActive: true });

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      paddingX={1}
      paddingY={1}
      borderStyle="round"
      borderColor={theme.colors.warning}
    >
      {/* Dialog Header */}
      <Box marginBottom={1}>
        <Text bold color={theme.colors.warning}>
          ⚠️ Confirmation Required
        </Text>
      </Box>

      {/* Message Content */}
      {message.content && (
        <Box marginBottom={1}>
          <Text>{message.content}</Text>
        </Box>
      )}

      {/* Proposed Actions */}
      {message.proposedActions && message.proposedActions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.secondary}>
            Actions to be executed:
          </Text>
          {message.proposedActions.map((action, index) => (
            <Box key={index} marginLeft={2}>
              <Text color={theme.colors.foreground}>
                {index + 1}. {action.description}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Reasoning */}
      {message.thought && (
        <Box marginBottom={1}>
          <Text color={theme.colors.info}>
            💭 {message.thought}
          </Text>
        </Box>
      )}

      {/* Options */}
      <Box marginTop={1}>
        {options.map((option, index) => (
          <Box key={option.value} marginRight={2}>
            <Text
              color={option.color}
              bold={index === selectedOption}
              inverse={index === selectedOption}
            >
              {index === selectedOption ? '[' : ' '}
              {option.label}
              {index === selectedOption ? ']' : ' '}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Instructions */}
      <Box marginTop={1}>
        <Text dimColor color={theme.colors.muted}>
          Use ← → to select, Enter to confirm, or press Y/N/M for quick response
        </Text>
      </Box>

      {/* Alternative Input Hint */}
      <Box marginTop={1}>
        <Text dimColor color={theme.colors.muted}>
          Or type: "no, do something else" to provide alternative instructions
        </Text>
      </Box>
    </Box>
  );
};

export default ConfirmationDialog;