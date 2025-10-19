/**
 * ChatLayout Component
 *
 * Pure chat-first interface with read-only status sidebar.
 * All interactions happen through unified chat - no separate views.
 * Sidebar displays glanceable metrics (model, agents, workflows, errors).
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { EventEmitter } from 'events';
import Sidebar from './Sidebar.js';
import ChatMessages from './ChatMessages.js';
import ChatInput from './ChatInput.js';
import { useUIState } from '../hooks/useUIState.js';
import { ChatMessage, ConfirmationStatus, DEFAULT_THEME } from '../types.js';
import type { ChatOrchestrator } from '../../application/services/ChatOrchestrator.js';
import type { ModelConfigService } from '../../application/services/ModelConfigService.js';

interface ChatLayoutProps {
  chatOrchestrator: ChatOrchestrator;
  modelService: ModelConfigService;
  eventBus: EventEmitter;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  chatOrchestrator,
  modelService,
  eventBus
}) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentModel, setCurrentModel] = useState<string>(
    modelService.getCurrentModel().id
  );
  const [currentMode, setCurrentMode] = useState<string>(
    chatOrchestrator.getCurrentMode()
  );

  // Initialize UI state for metrics calculation
  const { state: uiState } = useUIState({});

  // Chat input state (always visible at bottom)
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Subscribe to chat messages
  useEffect(() => {
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    const handleChatCleared = () => {
      setMessages([]);
    };

    const handleModelChanged = (model: any) => {
      setCurrentModel(model.id);
    };

    const handleModeChanged = (data: any) => {
      setCurrentMode(data.mode);
    };

    const handleExit = () => {
      exit();
    };

    eventBus.on('chat:message', handleMessage);
    eventBus.on('chat:cleared', handleChatCleared);
    eventBus.on('model:changed', handleModelChanged);
    eventBus.on('mode:changed', handleModeChanged);
    eventBus.on('app:exit', handleExit);

    return () => {
      eventBus.off('chat:message', handleMessage);
      eventBus.off('chat:cleared', handleChatCleared);
      eventBus.off('model:changed', handleModelChanged);
      eventBus.off('mode:changed', handleModeChanged);
      eventBus.off('app:exit', handleExit);
    };
  }, [eventBus, exit]);

  // Handle command submission
  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputValue('');

    // Add to history
    setCommandHistory(prev => [...prev, value]);
    setHistoryIndex(-1);

    try {
      await chatOrchestrator.processUserInput(value);
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [chatOrchestrator, isProcessing]);

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

  // Handle confirmation responses
  const handleConfirmation = useCallback((confirmationId: string, response: ConfirmationStatus) => {
    chatOrchestrator.handleConfirmation(confirmationId, response);
  }, [chatOrchestrator]);

  // Handle mode cycling (Shift+Enter)
  const handleCycleMode = useCallback(() => {
    chatOrchestrator.cycleMode();
  }, [chatOrchestrator]);

  // Calculate metrics for sidebar
  const agentCount = uiState.agents.length;
  const activeAgentCount = uiState.agents.filter(a => a.status === 'busy').length;
  const workflowCount = uiState.workflows.length;
  const activeWorkflowCount = uiState.workflows.filter(w => w.status === 'running').length;
  const errorCount = uiState.logs.filter(l => l.level === 'error').length;

  return (
    <Box flexDirection="row" flexGrow={1}>
      {/* Sidebar */}
      <Sidebar
        currentMode={currentMode}
        currentModel={currentModel}
        agentCount={agentCount}
        activeAgentCount={activeAgentCount}
        workflowCount={workflowCount}
        activeWorkflowCount={activeWorkflowCount}
        errorCount={errorCount}
        theme={DEFAULT_THEME}
      />

      {/* Main Content Area */}
      <Box flexDirection="column" flexGrow={1}>
        {/* Header */}
        <Box
          paddingX={1}
          borderStyle="single"
          borderColor={DEFAULT_THEME.colors.primary}
        >
          <Text bold color={DEFAULT_THEME.colors.primary}>
            💬 AI Assistant
          </Text>
          <Text color={DEFAULT_THEME.colors.muted}> • </Text>
          <Text color={DEFAULT_THEME.colors.info}>
            {currentModel}
          </Text>
          <Text color={DEFAULT_THEME.colors.muted}> • </Text>
          <Text color={DEFAULT_THEME.colors.muted} dimColor>
            Type /help for commands
          </Text>
        </Box>

        {/* Chat Messages - Takes remaining space */}
        <Box flexGrow={1} overflow="hidden">
          <ChatMessages
            messages={messages}
            onConfirm={handleConfirmation}
            theme={DEFAULT_THEME}
            showHeader={false}
            isProcessing={isProcessing}
          />
        </Box>

        {/* Chat Input - ALWAYS visible at bottom */}
        <Box paddingX={1} borderStyle="single" borderColor={DEFAULT_THEME.colors.muted}>
          <Text dimColor color={DEFAULT_THEME.colors.muted}>
            {showAutocomplete && (
              <Text>Tab: autocomplete • </Text>
            )}
            ↑↓: history • Enter: send • Shift+Tab: switch mode • /: commands • @: mentions
          </Text>
        </Box>

        <ChatInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onHistoryUp={handleHistoryUp}
          onHistoryDown={handleHistoryDown}
          onCycleMode={handleCycleMode}
          placeholder={
            isProcessing
              ? "Processing..."
              : "Type a command or question... (/ for commands, @ for mentions)"
          }
          showAutocomplete={showAutocomplete}
          disabled={isProcessing}
          theme={DEFAULT_THEME}
          commandEntries={chatOrchestrator.getCommandRegistry().getAllCommandEntries()}
        />
      </Box>
    </Box>
  );
};

export default ChatLayout;