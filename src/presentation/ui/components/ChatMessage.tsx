/**
 * ChatMessage Component
 *
 * Renders individual chat messages with appropriate styling based on type.
 * Supports user messages, assistant responses, confirmations, and execution results.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ChatMessage } from '../types.js';

interface ChatMessageProps {
  message: ChatMessage;
  theme: any;
}

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  theme
}) => {
  const getMessageColor = () => {
    switch (message.type) {
      case 'user':
        return theme.colors.foreground;
      case 'assistant':
        return theme.colors.info;
      case 'confirmation':
        return theme.colors.warning;
      case 'execution':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'agent_list':
      case 'workflow_list':
      case 'model_list':
        return theme.colors.info;
      case 'dashboard':
        return theme.colors.primary;
      case 'logs':
        return theme.colors.muted;
      default:
        return theme.colors.foreground;
    }
  };

  const getMessagePrefix = () => {
    switch (message.type) {
      case 'user':
        return '👤 You: ';
      case 'assistant':
        return '🤖 AI: ';
      case 'confirmation':
        return '⚠️ Confirm: ';
      case 'execution':
        return '✓ Executed: ';
      case 'error':
        return '✗ Error: ';
      case 'agent_list':
        return '🤖 Agents: ';
      case 'workflow_list':
        return '⚙️ Workflows: ';
      case 'model_list':
        return '🧠 Models: ';
      case 'dashboard':
        return '📊 Dashboard: ';
      case 'logs':
        return '📋 Logs: ';
      default:
        return '';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Render rich content for special message types
  const renderRichContent = () => {
    switch (message.type) {
      case 'agent_list':
      case 'workflow_list':
      case 'model_list':
      case 'dashboard':
      case 'logs':
        // For rich content, metadata should contain structured data
        if (message.metadata) {
          return (
            <Box flexDirection="column" marginLeft={2}>
              <Text color={getMessageColor()}>{message.content}</Text>
            </Box>
          );
        }
        return null;
      default:
        return null;
    }
  };

  const isRichMessage = ['agent_list', 'workflow_list', 'model_list', 'dashboard', 'logs'].includes(message.type);

  return (
    <Box flexDirection="column" marginBottom={1} paddingY={1}>
      {/* Message Header */}
      <Box marginBottom={1}>
        <Text color={getMessageColor()} bold>
          {getMessagePrefix()}
        </Text>
        <Text color={theme.colors.muted} dimColor>
          {' '}[{formatTimestamp(message.timestamp)}]
        </Text>
      </Box>

      {/* Message Content */}
      {isRichMessage ? (
        renderRichContent()
      ) : (
        <Box marginLeft={2}>
          <Text color={getMessageColor()}>{message.content}</Text>
        </Box>
      )}

      {/* Thought Process (for assistant messages) */}
      {message.thought && (
        <Box marginLeft={2} marginTop={1}>
          <Text color={theme.colors.muted} italic>
            💭 Reasoning: {message.thought}
          </Text>
        </Box>
      )}

      {/* Proposed Actions (for assistant messages) */}
      {message.proposedActions && message.proposedActions.length > 0 && (
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text bold color={theme.colors.secondary}>
            Proposed Actions:
          </Text>
          {message.proposedActions.map((action, index) => (
            <Box key={index} marginLeft={2}>
              <Text color={theme.colors.foreground}>
                {index + 1}. {action.description}
              </Text>
              {action.command && (
                <Text color={theme.colors.muted} dimColor>
                  {' → '}{action.command}
                </Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Execution Results */}
      {message.results && message.results.length > 0 && (
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          {message.results.map((result, index) => (
            <Box key={index}>
              <Text color={result.success ? theme.colors.success : theme.colors.error}>
                {result.success ? '✓' : '✗'} {result.message}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Confirmation Status */}
      {message.type === 'confirmation' && message.status && (
        <Box marginLeft={2} marginTop={1}>
          <Text
            color={
              message.status === 'approved'
                ? theme.colors.success
                : message.status === 'cancelled'
                ? theme.colors.error
                : theme.colors.warning
            }
          >
            Status: {message.status.toUpperCase()}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ChatMessageComponent;