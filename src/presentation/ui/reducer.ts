/**
 * Terminal UI State Reducer
 *
 * Manages the state of the Terminal UI using a reducer pattern.
 * Handles all state updates for agents, workflows, logs, and UI interactions.
 */

import {
  UIState,
  UIAction,
  UIActionType,
  ViewType,
  LogEntry,
  AgentDisplay,
  WorkflowDisplay
} from './types.js';

/**
 * Initial UI state
 */
export const initialUIState: UIState = {
  currentView: ViewType.DASHBOARD,
  agents: [],
  workflows: [],
  logs: [],
  selectedAgentId: undefined,
  selectedWorkflowId: undefined,
  isLoading: false,
  error: undefined
};

/**
 * UI state reducer
 *
 * Processes actions and returns new state immutably.
 *
 * @param state - Current UI state
 * @param action - Action to process
 * @returns New UI state
 */
export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case UIActionType.SET_VIEW:
      return {
        ...state,
        currentView: action.payload,
        error: undefined
      };

    case UIActionType.UPDATE_AGENT: {
      const existingIndex = state.agents.findIndex(
        a => a.id === action.payload.id
      );

      const agents =
        existingIndex >= 0
          ? state.agents.map((a, i) =>
              i === existingIndex ? action.payload : a
            )
          : [...state.agents, action.payload];

      return {
        ...state,
        agents: agents.sort((a, b) => a.name.localeCompare(b.name))
      };
    }

    case UIActionType.REMOVE_AGENT:
      return {
        ...state,
        agents: state.agents.filter(a => a.id !== action.payload),
        selectedAgentId:
          state.selectedAgentId === action.payload
            ? undefined
            : state.selectedAgentId
      };

    case UIActionType.UPDATE_WORKFLOW: {
      const existingIndex = state.workflows.findIndex(
        w => w.id === action.payload.id
      );

      const workflows =
        existingIndex >= 0
          ? state.workflows.map((w, i) =>
              i === existingIndex ? action.payload : w
            )
          : [...state.workflows, action.payload];

      return {
        ...state,
        workflows: workflows.sort((a, b) =>
          (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0)
        )
      };
    }

    case UIActionType.REMOVE_WORKFLOW:
      return {
        ...state,
        workflows: state.workflows.filter(w => w.id !== action.payload),
        selectedWorkflowId:
          state.selectedWorkflowId === action.payload
            ? undefined
            : state.selectedWorkflowId
      };

    case UIActionType.ADD_LOG: {
      const logs = [...state.logs, action.payload];

      // Keep only the last 1000 logs to prevent memory issues
      const trimmedLogs = logs.length > 1000 ? logs.slice(-1000) : logs;

      return {
        ...state,
        logs: trimmedLogs
      };
    }

    case UIActionType.CLEAR_LOGS:
      return {
        ...state,
        logs: []
      };

    case UIActionType.SELECT_AGENT:
      return {
        ...state,
        selectedAgentId: action.payload
      };

    case UIActionType.SELECT_WORKFLOW:
      return {
        ...state,
        selectedWorkflowId: action.payload
      };

    case UIActionType.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case UIActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case UIActionType.CLEAR_ERROR:
      return {
        ...state,
        error: undefined
      };

    default:
      return state;
  }
}

/**
 * Selector functions for accessing state
 */
export const selectors = {
  /**
   * Get the current view
   */
  getCurrentView: (state: UIState): ViewType => state.currentView,

  /**
   * Get all agents
   */
  getAgents: (state: UIState): AgentDisplay[] => state.agents,

  /**
   * Get active agents (idle or busy)
   */
  getActiveAgents: (state: UIState): AgentDisplay[] =>
    state.agents.filter(
      a => a.status === 'idle' || a.status === 'busy'
    ),

  /**
   * Get selected agent
   */
  getSelectedAgent: (state: UIState): AgentDisplay | undefined =>
    state.agents.find(a => a.id === state.selectedAgentId),

  /**
   * Get all workflows
   */
  getWorkflows: (state: UIState): WorkflowDisplay[] => state.workflows,

  /**
   * Get active workflows (running)
   */
  getActiveWorkflows: (state: UIState): WorkflowDisplay[] =>
    state.workflows.filter(w => w.status === 'running'),

  /**
   * Get selected workflow
   */
  getSelectedWorkflow: (state: UIState): WorkflowDisplay | undefined =>
    state.workflows.find(w => w.id === state.selectedWorkflowId),

  /**
   * Get recent logs
   */
  getRecentLogs: (state: UIState, count: number = 100): LogEntry[] =>
    state.logs.slice(-count),

  /**
   * Get logs by level
   */
  getLogsByLevel: (state: UIState, levels: string[]): LogEntry[] =>
    state.logs.filter(log => levels.includes(log.level)),

  /**
   * Get loading state
   */
  isLoading: (state: UIState): boolean => state.isLoading,

  /**
   * Get error state
   */
  getError: (state: UIState): string | undefined => state.error,

  /**
   * Check if there are active operations
   */
  hasActiveOperations: (state: UIState): boolean =>
    state.agents.some(a => a.status === 'busy') ||
    state.workflows.some(w => w.status === 'running')
};
