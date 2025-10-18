/**
 * Terminal UI Entry Point
 *
 * Main entry point for the NocturneAI Terminal UI application.
 * Initializes the React Ink app, sets up state management, event bus,
 * and renders the Dashboard component.
 */

import React from "react";
import { render } from "ink";
import { EventEmitter } from "events";
import { Dashboard } from "./components/Dashboard.js";
import { useUIState } from "./hooks/useUIState.js";
import { DEFAULT_THEME, ViewType } from "./types.js";

/**
 * App component props
 */
export interface AppProps {
  /**
   * Initial view to display
   */
  initialView?: ViewType;

  /**
   * Event bus for UI events
   */
  eventBus?: EventEmitter;

  /**
   * Exit callback
   */
  onExit?: () => void;
}

/**
 * Main App component
 *
 * Root component that sets up state and renders the dashboard.
 */
export const App: React.FC<AppProps> = ({
  initialView = ViewType.DASHBOARD,
  eventBus: externalEventBus,
  onExit,
}) => {
  // Initialize UI state
  const { state, dispatch } = useUIState({
    currentView: initialView,
  });

  // Create or use provided event bus
  const eventBus = React.useMemo(
    () => externalEventBus || new EventEmitter(),
    [externalEventBus],
  );

  // Handle exit
  React.useEffect(() => {
    const handleExit = () => {
      if (onExit) {
        onExit();
      } else {
        process.exit(0);
      }
    };

    // Listen for exit events
    eventBus.on("exit", handleExit);

    return () => {
      eventBus.off("exit", handleExit);
    };
  }, [eventBus, onExit]);

  return (
    <Dashboard
      state={state}
      dispatch={dispatch}
      eventBus={eventBus}
      theme={DEFAULT_THEME}
    />
  );
};

/**
 * Start the Terminal UI application
 *
 * @param options - Application options
 * @returns Ink instance with waitUntilExit method
 */
export function startUI(options: AppProps = {}) {
  const { waitUntilExit } = render(<App {...options} />);
  return { waitUntilExit };
}

/**
 * Export all UI components and types
 */
export * from "./components/index.js";
export * from "./hooks/index.js";
export * from "./types.js";
export { uiReducer, initialUIState, selectors } from "./reducer.js";

/**
 * Export integration utilities
 */
export {
  UIIntegration,
  mapAgentStatus,
  mapWorkflowStatus,
  mapStepStatus,
  mapLogLevel,
  agentToDisplay,
  workflowToDisplay,
  logToEntry,
  createSampleAgent,
  createSampleWorkflow,
  createSampleLogs,
} from "./integration.js";
export type { IAgent, IWorkflow, ILogger } from "./integration.js";
