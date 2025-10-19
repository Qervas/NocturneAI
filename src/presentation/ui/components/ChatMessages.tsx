/**
 * ChatMessages Component
 *
 * Displays chat messages with virtual scrolling.
 * Extracted from UnifiedChat to allow reuse in different layouts.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { ChatMessage, ConfirmationStatus } from '../types.js';
import ChatMessageComponent from './ChatMessage.js';
import ConfirmationDialog from './ConfirmationDialog.js';

interface ChatMessagesProps {
  messages: ChatMessage[];
  onConfirm?: (confirmationId: string, response: ConfirmationStatus) => void;
  theme: any;
  showHeader?: boolean;
  isProcessing?: boolean;
  shouldAutoScroll?: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  onConfirm,
  theme,
  showHeader = true,
  isProcessing = false,
  shouldAutoScroll = true
}) => {
  const [maxVisibleMessages, setMaxVisibleMessages] = useState(20);
  const [scrollOffset, setScrollOffset] = useState(0);
  const messagesEndRef = useRef<any>();

  // Calculate how many messages we can show based on terminal height
  useEffect(() => {
    const terminalHeight = process.stdout.rows || 30;
    const availableLines = Math.max(10, terminalHeight - 10);
    setMaxVisibleMessages(availableLines);
  }, []);

  // Auto-scroll to bottom only when shouldAutoScroll is true
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      // Reset scroll offset to show latest messages
      setScrollOffset(0);
    }
  }, [shouldAutoScroll, messages.length]);

  // Get the last confirmation message that's pending
  const pendingConfirmation = messages
    .filter(m => m.type === 'confirmation' && m.status === 'pending')
    .slice(-1)[0];

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Chat Header */}
      {showHeader && (
        <Box paddingX={1} borderStyle="single" borderColor={theme.colors.muted}>
          <Text bold color={theme.colors.primary}>
            🤖 AI Assistant
          </Text>
          {isProcessing && (
            <Text color={theme.colors.warning}> (thinking...)</Text>
          )}
        </Box>
      )}

      {/* Messages Area - Takes up all remaining space with virtual scrolling */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1} overflow="hidden">
        {/* Show only the most recent messages that fit in the viewport */}
        {messages.length > maxVisibleMessages && (
          <Text dimColor color={theme.colors.muted}>
            ... {messages.length - maxVisibleMessages} older messages
          </Text>
        )}

        {messages.slice(-maxVisibleMessages).map((message) => (
          <ChatMessageComponent
            key={message.id}
            message={message}
            theme={theme}
          />
        ))}

        {/* Pending Confirmation Dialog */}
        {pendingConfirmation && onConfirm && (
          <ConfirmationDialog
            message={pendingConfirmation}
            onConfirm={(response) => onConfirm(pendingConfirmation.confirmationId!, response)}
            theme={theme}
          />
        )}

        <Box ref={messagesEndRef} />
      </Box>
    </Box>
  );
};

export default ChatMessages;
