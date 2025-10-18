/**
 * UnifiedChat Component
 *
 * Claude Code-style unified chat interface that serves as the primary
 * interaction method for NocturneAI. Supports natural language commands,
 * slash commands, file/folder mentions, and ReAct agent interactions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { ChatMessage, ChatInputProps, ConfirmationStatus } from '../types.js';
import ChatInput from './ChatInput.js';
import ChatMessageComponent from './ChatMessage.js';
import ConfirmationDialog from './ConfirmationDialog.js';
import type { Command } from '../../../application/services/CommandRegistry.js';

interface UnifiedChatProps {
  onCommand: (input: string) => Promise<void>;
  onConfirm: (confirmationId: string, response: ConfirmationStatus) => void;
  messages: ChatMessage[];
  theme: any;
  height?: number;
  showInput?: boolean;
  commandEntries?: Array<{ id: string; command: Command }>;  // Command entries from CommandRegistry
}

export const UnifiedChat: React.FC<UnifiedChatProps> = ({
  onCommand,
  onConfirm,
  messages,
  theme,
  height = 10,
  showInput = true,
  commandEntries = []
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [maxVisibleMessages, setMaxVisibleMessages] = useState(20);
  const messagesEndRef = useRef<any>();

  // Calculate how many messages we can show based on terminal height
  // We keep the most recent messages visible (virtual scrolling)
  useEffect(() => {
    // Reserve space for header (1) + status bar (1) + input (3) + padding = ~6 lines
    // Use terminal height if available, otherwise default to showing last 20 messages
    const terminalHeight = process.stdout.rows || 30;
    const availableLines = Math.max(10, terminalHeight - 10);
    setMaxVisibleMessages(availableLines);
  }, []);

  // Handle command submission
  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputValue('');

    // Add to history
    setCommandHistory(prev => [...prev, value]);
    setHistoryIndex(-1);

    try {
      await onCommand(value);
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onCommand, isProcessing]);

  // Handle input changes
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    // Reset history index when user types
    setHistoryIndex(-1);

    // Check for autocomplete triggers
    if (value.startsWith('/') || value.includes('@')) {
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  }, []);

  // Handle history navigation - UP arrow (go back in history)
  const handleHistoryUp = useCallback(() => {
    if (commandHistory.length === 0) return;

    const newIndex = historyIndex < commandHistory.length - 1
      ? historyIndex + 1
      : commandHistory.length - 1;
    setHistoryIndex(newIndex);
    setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
  }, [commandHistory, historyIndex]);

  // Handle history navigation - DOWN arrow (go forward in history)
  const handleHistoryDown = useCallback(() => {
    if (historyIndex <= 0) {
      setHistoryIndex(-1);
      setInputValue('');
      return;
    }

    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
  }, [commandHistory, historyIndex]);

  // Get the last confirmation message that's pending
  const pendingConfirmation = messages
    .filter(m => m.type === 'confirmation' && m.status === 'pending')
    .slice(-1)[0];

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Chat Header */}
      <Box paddingX={1} borderStyle="single" borderColor={theme.colors.muted}>
        <Text bold color={theme.colors.primary}>
          🤖 AI Assistant
        </Text>
        {isProcessing && (
          <Text color={theme.colors.warning}> (thinking...)</Text>
        )}
      </Box>

      {/* Messages Area - Takes up all remaining space with virtual scrolling */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1} overflow="hidden">
        {/* Show only the most recent messages that fit in the viewport */}
        {messages.length > maxVisibleMessages && (
          <Text dimColor color={theme.colors.muted}>
            ... {messages.length - maxVisibleMessages} older messages (scroll up to see history)
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
        {pendingConfirmation && (
          <ConfirmationDialog
            message={pendingConfirmation}
            onConfirm={(response) => onConfirm(pendingConfirmation.confirmationId!, response)}
            theme={theme}
          />
        )}

        <Box ref={messagesEndRef} />
      </Box>

      {/* Status Bar - Always visible above input */}
      <Box paddingX={1} borderStyle="single" borderColor={theme.colors.muted}>
        <Text dimColor color={theme.colors.muted}>
          {showAutocomplete && (
            <Text>Tab: autocomplete • </Text>
          )}
          ↑↓: history • Enter: send • /: commands • @: mentions
        </Text>
      </Box>

      {/* Input Area - Pinned to bottom */}
      {showInput && !pendingConfirmation && (
        <ChatInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onHistoryUp={handleHistoryUp}
          onHistoryDown={handleHistoryDown}
          placeholder={
            isProcessing
              ? "Processing..."
              : "Type a command or question... (/ for commands, @ for mentions)"
          }
          showAutocomplete={showAutocomplete}
          disabled={isProcessing}
          theme={theme}
          commandEntries={commandEntries}
        />
      )}
    </Box>
  );
};

export default UnifiedChat;