/**
 * useKeyBindings Hook
 *
 * Custom React hook for managing keyboard shortcuts in the Terminal UI.
 * Handles key event registration, cleanup, and provides a consistent
 * interface for keyboard interaction across components.
 */

import { useEffect, useCallback } from 'react';
import { useInput } from 'ink';
import { ViewType } from '../types.js';

/**
 * Key action handler type
 */
export type KeyActionHandler = () => void;

/**
 * Key bindings configuration
 */
export interface KeyBindingsConfig {
  // Navigation
  onDashboard?: KeyActionHandler;
  onAgentStatus?: KeyActionHandler;
  onWorkflowProgress?: KeyActionHandler;
  onTaskInput?: KeyActionHandler;
  onLogs?: KeyActionHandler;
  onHelp?: KeyActionHandler;

  // Actions
  onRefresh?: KeyActionHandler;
  onQuit?: KeyActionHandler;
  onClear?: KeyActionHandler;
  onBack?: KeyActionHandler;

  // Selection
  onSelectNext?: KeyActionHandler;
  onSelectPrevious?: KeyActionHandler;
  onConfirm?: KeyActionHandler;
  onCancel?: KeyActionHandler;

  // Custom
  onCustom?: Record<string, KeyActionHandler>;
}

/**
 * Default key bindings
 */
export const DEFAULT_KEY_BINDINGS = {
  dashboard: 'd',
  agentStatus: 'a',
  workflowProgress: 'w',
  taskInput: 't',
  logs: 'l',
  help: 'h',
  refresh: 'r',
  quit: 'q',
  clear: 'c',
  back: 'escape',
  selectNext: 'down',
  selectPrevious: 'up',
  confirm: 'return',
  cancel: 'escape'
};

/**
 * Hook for managing keyboard shortcuts
 *
 * @param config - Key bindings configuration
 * @param enabled - Whether key bindings are enabled (default: true)
 */
export function useKeyBindings(
  config: KeyBindingsConfig,
  enabled: boolean = true
): void {
  useInput(
    (input, key) => {
      if (!enabled) {
        return;
      }

      // Handle special keys
      if (key.escape && config.onBack) {
        config.onBack();
        return;
      }

      if (key.return && config.onConfirm) {
        config.onConfirm();
        return;
      }

      if (key.upArrow && config.onSelectPrevious) {
        config.onSelectPrevious();
        return;
      }

      if (key.downArrow && config.onSelectNext) {
        config.onSelectNext();
        return;
      }

      // Handle control+c for quit
      if (key.ctrl && input === 'c' && config.onQuit) {
        config.onQuit();
        return;
      }

      // Handle letter keys
      switch (input.toLowerCase()) {
        case DEFAULT_KEY_BINDINGS.dashboard:
          config.onDashboard?.();
          break;

        case DEFAULT_KEY_BINDINGS.agentStatus:
          config.onAgentStatus?.();
          break;

        case DEFAULT_KEY_BINDINGS.workflowProgress:
          config.onWorkflowProgress?.();
          break;

        case DEFAULT_KEY_BINDINGS.taskInput:
          config.onTaskInput?.();
          break;

        case DEFAULT_KEY_BINDINGS.logs:
          config.onLogs?.();
          break;

        case DEFAULT_KEY_BINDINGS.help:
          config.onHelp?.();
          break;

        case DEFAULT_KEY_BINDINGS.refresh:
          config.onRefresh?.();
          break;

        case DEFAULT_KEY_BINDINGS.quit:
          config.onQuit?.();
          break;

        case DEFAULT_KEY_BINDINGS.clear:
          config.onClear?.();
          break;

        default:
          // Check custom bindings
          if (config.onCustom && config.onCustom[input]) {
            config.onCustom[input]();
          }
          break;
      }
    },
    { isActive: enabled }
  );
}

/**
 * Hook for simple view navigation
 *
 * @param onViewChange - Callback when view should change
 * @param onQuit - Callback when quit is requested
 */
export function useViewNavigation(
  onViewChange: (view: ViewType) => void,
  onQuit: () => void
): void {
  useKeyBindings({
    onDashboard: useCallback(() => {
      onViewChange(ViewType.DASHBOARD);
    }, [onViewChange]),

    onAgentStatus: useCallback(() => {
      onViewChange(ViewType.AGENT_STATUS);
    }, [onViewChange]),

    onWorkflowProgress: useCallback(() => {
      onViewChange(ViewType.WORKFLOW_PROGRESS);
    }, [onViewChange]),

    onTaskInput: useCallback(() => {
      onViewChange(ViewType.TASK_INPUT);
    }, [onViewChange]),

    onLogs: useCallback(() => {
      onViewChange(ViewType.LOGS);
    }, [onViewChange]),

    onHelp: useCallback(() => {
      onViewChange(ViewType.HELP);
    }, [onViewChange]),

    onQuit: useCallback(() => {
      onQuit();
    }, [onQuit])
  });
}

/**
 * Hook for list navigation with selection
 *
 * @param itemCount - Total number of items in list
 * @param onSelectionChange - Callback when selection changes
 * @param onConfirm - Callback when selection is confirmed
 * @param initialIndex - Initial selected index (default: 0)
 */
export function useListNavigation(
  itemCount: number,
  onSelectionChange: (index: number) => void,
  onConfirm?: (index: number) => void,
  initialIndex: number = 0
): void {
  let currentIndex = initialIndex;

  useKeyBindings({
    onSelectNext: useCallback(() => {
      if (itemCount === 0) return;
      currentIndex = (currentIndex + 1) % itemCount;
      onSelectionChange(currentIndex);
    }, [itemCount, onSelectionChange]),

    onSelectPrevious: useCallback(() => {
      if (itemCount === 0) return;
      currentIndex = (currentIndex - 1 + itemCount) % itemCount;
      onSelectionChange(currentIndex);
    }, [itemCount, onSelectionChange]),

    onConfirm: onConfirm
      ? useCallback(() => {
          onConfirm(currentIndex);
        }, [onConfirm])
      : undefined
  });
}

/**
 * Get key binding descriptions for help display
 *
 * @returns Array of key binding descriptions
 */
export function getKeyBindingDescriptions(): Array<{
  key: string;
  description: string;
}> {
  return [
    { key: 'd', description: 'Dashboard' },
    { key: 'a', description: 'Agent Status' },
    { key: 'w', description: 'Workflow Progress' },
    { key: 't', description: 'Task Input' },
    { key: 'l', description: 'Logs' },
    { key: 'h', description: 'Help' },
    { key: 'r', description: 'Refresh' },
    { key: 'c', description: 'Clear' },
    { key: 'q', description: 'Quit' },
    { key: '↑/↓', description: 'Navigate' },
    { key: 'Enter', description: 'Confirm' },
    { key: 'Esc', description: 'Back/Cancel' }
  ];
}
