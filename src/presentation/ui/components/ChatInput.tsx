/**
 * ChatInput Component
 *
 * Smart input field with slash command detection, @ mention support,
 * and autocomplete functionality.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Command } from '../../../application/services/CommandRegistry.js';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  showAutocomplete?: boolean;
  disabled?: boolean;
  theme: any;
  onHistoryUp?: () => void;
  onHistoryDown?: () => void;
  onCycleMode?: () => void;  // Shift+Enter to cycle modes
  commandEntries?: Array<{ id: string; command: Command }>;  // Command entries from CommandRegistry (includes aliases)
}

interface AutocompleteItem {
  label: string;
  value: string;
  description?: string;
  type: 'command' | 'mention' | 'suggestion';
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Type a command or question...",
  showAutocomplete = false,
  disabled = false,
  theme,
  onHistoryUp,
  onHistoryDown,
  onCycleMode,
  commandEntries = []
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
  const [shouldBlockSubmit, setShouldBlockSubmit] = useState(false);

  // Get autocomplete suggestions based on input
  const getAutocompleteSuggestions = useCallback((input: string): AutocompleteItem[] => {
    const suggestions: AutocompleteItem[] = [];

    // Slash commands - dynamically generated from CommandRegistry
    if (input.startsWith('/')) {
      const query = input.slice(1).toLowerCase();

      // Build autocomplete items from registered command entries (includes aliases)
      const commandItems: AutocompleteItem[] = [];

      // Process each command entry from CommandRegistry
      commandEntries.forEach(({ id, command }) => {
        // Convert command id to slash format
        // Handle both aliases (e.g., "agents") and full commands (e.g., "agent.list")
        const parts = id.split('.');
        let slashCommand = '';

        if (parts.length === 1) {
          // Single part - could be alias or system command (e.g., "help", "agents")
          slashCommand = `/${parts[0]}`;
        } else if (parts.length === 2) {
          // Two part command (e.g., "agent.list" -> "/agent list")
          slashCommand = `/${parts[0]} ${parts[1]}`;
        } else if (parts.length === 3) {
          // Three part command (e.g., "model.router.set" -> "/model router set")
          slashCommand = `/${parts[0]} ${parts[1]} ${parts[2]}`;
        }

        // Add space at end if command has required parameters
        const hasParams = command.parameters && command.parameters.some(p => p.required);
        const commandValue = slashCommand + (hasParams ? ' ' : '');

        commandItems.push({
          label: slashCommand,
          value: commandValue,
          description: command.description,
          type: 'command' as const
        });
      });

      // Filter by query and return
      return commandItems
        .filter(cmd => cmd.label.toLowerCase().includes(query) || cmd.description.toLowerCase().includes(query))
        .sort((a, b) => {
          // Sort by relevance: exact matches first, then starts with, then contains
          const aLabel = a.label.toLowerCase();
          const bLabel = b.label.toLowerCase();
          if (aLabel === `/${query}`) return -1;
          if (bLabel === `/${query}`) return 1;
          if (aLabel.startsWith(`/${query}`)) return -1;
          if (bLabel.startsWith(`/${query}`)) return 1;
          return aLabel.localeCompare(bLabel);
        });
    }

    // @ mentions
    if (input.includes('@')) {
      const lastAtIndex = input.lastIndexOf('@');
      const query = input.slice(lastAtIndex + 1).toLowerCase();

      const mentions = [
        { label: '@file:', value: '@file:', description: 'Reference a file' },
        { label: '@folder:', value: '@folder:', description: 'Reference a folder' },
        { label: '@agent:', value: '@agent:', description: 'Reference an agent' },
        { label: '@workflow:', value: '@workflow:', description: 'Reference a workflow' },
        { label: '@task:', value: '@task:', description: 'Reference a task' }
      ];

      return mentions
        .filter(m => m.label.includes(query))
        .map(m => ({ ...m, type: 'mention' as const }));
    }

    return suggestions;
  }, [commandEntries]);

  // Update autocomplete when value changes
  React.useEffect(() => {
    if (showAutocomplete) {
      const suggestions = getAutocompleteSuggestions(value);
      setAutocompleteItems(suggestions);
      setSelectedIndex(0);
    }
  }, [value, showAutocomplete, getAutocompleteSuggestions]);

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback((item: AutocompleteItem) => {
    if (item.type === 'command') {
      onChange(item.value);
      // Close autocomplete after selection so next Enter will submit
      setAutocompleteItems([]);
    } else if (item.type === 'mention') {
      const lastAtIndex = value.lastIndexOf('@');
      const newValue = value.slice(0, lastAtIndex) + item.value;
      onChange(newValue);
      // Close autocomplete after selection
      setAutocompleteItems([]);
    }
  }, [value, onChange]);

  // Handle submission - block if autocomplete is active
  const handleSubmitInternal = useCallback((val: string) => {
    // If autocomplete is showing and we have items, don't submit - select instead
    if (showAutocomplete && autocompleteItems.length > 0 && !shouldBlockSubmit) {
      handleAutocompleteSelect(autocompleteItems[selectedIndex]);
      setShouldBlockSubmit(false);
      return;
    }

    // Normal submission
    onSubmit(val);
    setShouldBlockSubmit(false);
  }, [showAutocomplete, autocompleteItems, selectedIndex, handleAutocompleteSelect, onSubmit, shouldBlockSubmit]);

  // Handle keyboard navigation for autocomplete and history
  useInput((input, key) => {
    if (disabled) return;

    // Shift+Tab: Cycle modes (check FIRST before autocomplete)
    if (key.tab && key.shift && onCycleMode) {
      onCycleMode();
      return;
    }

    // If autocomplete is showing, arrow keys navigate suggestions
    if (showAutocomplete && autocompleteItems.length > 0) {
      if (key.upArrow) {
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : autocompleteItems.length - 1
        );
        return;
      }
      if (key.downArrow) {
        setSelectedIndex(prev =>
          prev < autocompleteItems.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (key.tab) {
        if (autocompleteItems[selectedIndex]) {
          handleAutocompleteSelect(autocompleteItems[selectedIndex]);
        }
        return;
      }
      // Note: Enter/Return is handled by handleSubmitInternal
    }

    // If autocomplete is not showing, arrow keys navigate history
    if (!showAutocomplete || autocompleteItems.length === 0) {
      if (key.upArrow && onHistoryUp) {
        onHistoryUp();
        return;
      }
      if (key.downArrow && onHistoryDown) {
        onHistoryDown();
        return;
      }
    }
  }, { isActive: !disabled });

  return (
    <Box flexDirection="column">
      {/* Autocomplete Dropdown - ABOVE input */}
      {showAutocomplete && autocompleteItems.length > 0 && (
        <Box
          flexDirection="column"
          paddingX={1}
          marginBottom={1}
          borderStyle="single"
          borderColor={theme.colors.primary}
        >
          {autocompleteItems.map((item, index) => (
            <Box key={item.label}>
              <Text
                color={
                  index === selectedIndex
                    ? theme.colors.primary
                    : theme.colors.foreground
                }
                bold={index === selectedIndex}
              >
                {index === selectedIndex ? '▶ ' : '  '}
                {item.label}
              </Text>
              {item.description && (
                <Text color={theme.colors.muted} dimColor>
                  {' - ' + item.description}
                </Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Input Field - Full width box */}
      <Box paddingX={1} borderStyle="single" borderColor={theme.colors.primary}>
        <Text color={theme.colors.primary}>{'> '}</Text>
        <Box flexGrow={1}>
          <TextInput
            value={value}
            onChange={onChange}
            onSubmit={handleSubmitInternal}
            placeholder={disabled ? '' : placeholder}
            focus={!disabled}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ChatInput;