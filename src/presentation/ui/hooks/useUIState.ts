/**
 * useUIState Hook
 *
 * Custom React hook for managing Terminal UI state using a reducer pattern.
 * Provides state management and dispatch functionality for UI components.
 */

import { useReducer, useCallback } from 'react';
import {
  UIState,
  UIAction,
  UIActionType,
  ViewType,
  AgentDisplay,
  WorkflowDisplay,
  LogEntry
} from '../types.js';
import { uiReducer, initialUIState } from '../reducer.js';

/**
 * Hook return type
 */
export interface UseUIStateReturn {
  state: UIState;
  dispatch: (action: UIAction) => void;
  actions: {
    setView: (view: ViewType) => void;
    updateAgent: (agent: AgentDisplay) => void;
    removeAgent: (agentId: string) => void;
    updateWorkflow: (workflow: WorkflowDisplay) => void;
    removeWorkflow: (workflowId: string) => void;
    addLog: (log: LogEntry) => void;
    clearLogs: () => void;
    selectAgent: (agentId?: string) => void;
    selectWorkflow: (workflowId?: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error?: string) => void;
    clearError: () => void;
  };
}

/**
 * Custom hook for managing UI state
 *
 * @param initialState - Optional initial state override
 * @returns UI state and action creators
 */
export function useUIState(initialState?: Partial<UIState>): UseUIStateReturn {
  const [state, dispatch] = useReducer(
    uiReducer,
    initialState
      ? { ...initialUIState, ...initialState }
      : initialUIState
  );

  // Action creators wrapped with useCallback for stable references
  const actions = {
    setView: useCallback((view: ViewType) => {
      dispatch({ type: UIActionType.SET_VIEW, payload: view });
    }, []),

    updateAgent: useCallback((agent: AgentDisplay) => {
      dispatch({ type: UIActionType.UPDATE_AGENT, payload: agent });
    }, []),

    removeAgent: useCallback((agentId: string) => {
      dispatch({ type: UIActionType.REMOVE_AGENT, payload: agentId });
    }, []),

    updateWorkflow: useCallback((workflow: WorkflowDisplay) => {
      dispatch({ type: UIActionType.UPDATE_WORKFLOW, payload: workflow });
    }, []),

    removeWorkflow: useCallback((workflowId: string) => {
      dispatch({ type: UIActionType.REMOVE_WORKFLOW, payload: workflowId });
    }, []),

    addLog: useCallback((log: LogEntry) => {
      dispatch({ type: UIActionType.ADD_LOG, payload: log });
    }, []),

    clearLogs: useCallback(() => {
      dispatch({ type: UIActionType.CLEAR_LOGS });
    }, []),

    selectAgent: useCallback((agentId?: string) => {
      dispatch({ type: UIActionType.SELECT_AGENT, payload: agentId });
    }, []),

    selectWorkflow: useCallback((workflowId?: string) => {
      dispatch({ type: UIActionType.SELECT_WORKFLOW, payload: workflowId });
    }, []),

    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: UIActionType.SET_LOADING, payload: loading });
    }, []),

    setError: useCallback((error?: string) => {
      dispatch({ type: UIActionType.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: UIActionType.CLEAR_ERROR });
    }, [])
  };

  return {
    state,
    dispatch,
    actions
  };
}
