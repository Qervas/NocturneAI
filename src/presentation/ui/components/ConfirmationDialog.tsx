/**
 * ConfirmationDialog Component
 *
 * Interactive dialog for confirming proposed actions before execution.
 * Allows users to proceed, modify, or cancel operations.
 *
 * NOW USES: BlockRenderer for clean, unified content rendering!
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ChatMessage, ConfirmationStatus } from '../types.js';
import { BlockRenderer } from '../renderers/index.js';

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

      {/* Claude Code style: Show ONLY action summary, not full task progress */}
      {message.blocks ? (
        <Box marginBottom={1}>
          {/* Filter to show only action_list blocks, skip task progress */}
          {message.blocks
            .filter(block => block.type === 'action_list')
            .map((block, index) => (
              <Box key={index} flexDirection="column">
                {block.type === 'action_list' && block.actions.map((action, i) => (
                  <Box key={action.id}>
                    <Text color={theme.colors.info}>→</Text>
                    <Text color={theme.colors.foreground}> {action.description}</Text>
                    {action.command === 'command_execute' && action.parameters && (
                      <Text color={theme.colors.muted}>
                        {' '}({(action.parameters as any).command}{(action.parameters as any).args ? ' ' + (action.parameters as any).args.join(' ') : ''})
                      </Text>
                    )}
                  </Box>
                ))}
              </Box>
            ))}
        </Box>
      ) : (
        /* LEGACY: Fallback */
        <Box marginBottom={1}>
          {message.proposedActions && message.proposedActions.length > 0 && (
            message.proposedActions.map((action, index) => (
              <Box key={index}>
                <Text color={theme.colors.info}>→</Text>
                <Text color={theme.colors.foreground}> {action.description}</Text>
              </Box>
            ))
          )}
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