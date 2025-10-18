/**
 * Dashboard Component
 *
 * Main Terminal UI dashboard that orchestrates all views and components.
 * Provides navigation, state management, and real-time updates for the entire UI.
 */

import React, { useEffect, useCallback } from "react";
import { Box, Text } from "ink";
import {
  DashboardProps,
  ViewType,
  UIEventType,
  AgentDisplay,
  WorkflowDisplay,
  LogEntry,
} from "../types.js";
import { useEventSubscriptions } from "../hooks/useEventSubscription.js";
import Header from "./Header.js";
import AgentStatus from "./AgentStatus.js";
import WorkflowProgress from "./WorkflowProgress.js";
import LogViewer from "./LogViewer.js";
import { Help } from "./Help.js";
import TaskInput from "./TaskInput.js";

/**
 * Dashboard component
 *
 * Main container for the Terminal UI that manages views and coordinates updates.
 *
 * @param props - Component props
 * @returns Rendered dashboard component
 */
export const Dashboard: React.FC<DashboardProps> = ({
  state,
  dispatch,
  eventBus,
  theme,
}) => {
  // Note: View navigation and keyboard shortcuts removed
  // All navigation now happens through chat commands

  // Subscribe to UI events
  useEventSubscriptions(eventBus, {
    [UIEventType.AGENT_CREATED]: useCallback(
      (agent: AgentDisplay) => {
        dispatch({
          type: "UPDATE_AGENT" as any,
          payload: agent,
        });
        dispatch({
          type: "ADD_LOG" as any,
          payload: {
            timestamp: new Date(),
            level: "info" as any,
            source: "agent",
            message: `Agent created: ${agent.name}`,
          },
        });
      },
      [dispatch],
    ),

    [UIEventType.AGENT_UPDATED]: useCallback(
      (agent: AgentDisplay) => {
        dispatch({
          type: "UPDATE_AGENT" as any,
          payload: agent,
        });
      },
      [dispatch],
    ),

    [UIEventType.AGENT_DELETED]: useCallback(
      (agentId: string) => {
        dispatch({
          type: "REMOVE_AGENT" as any,
          payload: agentId,
        });
        dispatch({
          type: "ADD_LOG" as any,
          payload: {
            timestamp: new Date(),
            level: "info" as any,
            source: "agent",
            message: `Agent deleted: ${agentId}`,
          },
        });
      },
      [dispatch],
    ),

    [UIEventType.WORKFLOW_STARTED]: useCallback(
      (workflow: WorkflowDisplay) => {
        dispatch({
          type: "UPDATE_WORKFLOW" as any,
          payload: workflow,
        });
        dispatch({
          type: "ADD_LOG" as any,
          payload: {
            timestamp: new Date(),
            level: "info" as any,
            source: "workflow",
            message: `Workflow started: ${workflow.name}`,
          },
        });
      },
      [dispatch],
    ),

    [UIEventType.WORKFLOW_UPDATED]: useCallback(
      (workflow: WorkflowDisplay) => {
        dispatch({
          type: "UPDATE_WORKFLOW" as any,
          payload: workflow,
        });
      },
      [dispatch],
    ),

    [UIEventType.WORKFLOW_COMPLETED]: useCallback(
      (workflow: WorkflowDisplay) => {
        dispatch({
          type: "UPDATE_WORKFLOW" as any,
          payload: workflow,
        });
        dispatch({
          type: "ADD_LOG" as any,
          payload: {
            timestamp: new Date(),
            level: "success" as any,
            source: "workflow",
            message: `Workflow completed: ${workflow.name}`,
          },
        });
      },
      [dispatch],
    ),

    [UIEventType.WORKFLOW_FAILED]: useCallback(
      ({ workflowId, error }: { workflowId: string; error: string }) => {
        dispatch({
          type: "ADD_LOG" as any,
          payload: {
            timestamp: new Date(),
            level: "error" as any,
            source: "workflow",
            message: `Workflow ${workflowId} failed: ${error}`,
          },
        });
      },
      [dispatch],
    ),

    [UIEventType.LOG_ENTRY]: useCallback(
      (log: LogEntry) => {
        dispatch({
          type: "ADD_LOG" as any,
          payload: log,
        });
      },
      [dispatch],
    ),

    [UIEventType.ERROR]: useCallback(
      (error: string) => {
        dispatch({
          type: "SET_ERROR" as any,
          payload: error,
        });
        dispatch({
          type: "ADD_LOG" as any,
          payload: {
            timestamp: new Date(),
            level: "error" as any,
            source: "system",
            message: error,
          },
        });
      },
      [dispatch],
    ),
  });

  // Auto-refresh timer
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger refresh by emitting an event
      eventBus.emit("refresh");
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [eventBus]);

  // Render current view
  const renderView = () => {
    switch (state.currentView) {
      case ViewType.DASHBOARD:
        return <DashboardView state={state} theme={theme} />;

      case ViewType.AGENT_STATUS:
        return (
          <AgentStatus
            agents={state.agents}
            selectedAgentId={state.selectedAgentId}
            onSelect={(agentId) => {
              dispatch({
                type: "SELECT_AGENT" as any,
                payload: agentId,
              });
            }}
            theme={theme}
          />
        );

      case ViewType.WORKFLOW_PROGRESS:
        return (
          <Box flexDirection="column">
            {state.workflows.length === 0 ? (
              <Box padding={1}>
                <Text color={theme.colors.muted}>No workflows running</Text>
              </Box>
            ) : (
              state.workflows.map((workflow) => (
                <WorkflowProgress
                  key={workflow.id}
                  workflow={workflow}
                  theme={theme}
                  compact={state.workflows.length > 1}
                />
              ))
            )}
          </Box>
        );

      case ViewType.LOGS:
        return <LogViewer logs={state.logs} maxLogs={100} theme={theme} />;

      case ViewType.TASK_INPUT:
        return (
          <TaskInput
            agents={state.agents}
            onSubmit={(task) => {
              // Emit task submission event
              eventBus.emit(UIEventType.TASK_SUBMITTED, task);
              // Switch back to dashboard
              dispatch({
                type: "SET_VIEW" as any,
                payload: ViewType.DASHBOARD,
              });
              // Add log entry
              dispatch({
                type: "ADD_LOG" as any,
                payload: {
                  timestamp: new Date(),
                  level: "info" as any,
                  source: "task",
                  message: `Task submitted: ${task.description}`,
                },
              });
            }}
            onCancel={() => {
              dispatch({
                type: "SET_VIEW" as any,
                payload: ViewType.DASHBOARD,
              });
            }}
            theme={theme}
          />
        );

      case ViewType.HELP:
        return <Help keyBindings={[]} theme={theme} />;

      default:
        return (
          <Box padding={1}>
            <Text color={theme.colors.error}>
              Unknown view: {state.currentView}
            </Text>
          </Box>
        );
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Header
        theme={theme}
        agents={state.agents}
        workflows={state.workflows}
        showTime={true}
      />

      {/* Error Banner */}
      {state.error && (
        <Box
          marginBottom={1}
          paddingX={1}
          borderStyle="round"
          borderColor={theme.colors.error}
        >
          <Text color={theme.colors.error}>✗ Error: {state.error}</Text>
        </Box>
      )}

      {/* Loading Indicator */}
      {state.isLoading && (
        <Box marginBottom={1}>
          <Text color={theme.colors.warning}>⟳ Loading...</Text>
        </Box>
      )}

      {/* Current View */}
      <Box flexDirection="column">{renderView()}</Box>
    </Box>
  );
};

/**
 * DashboardView sub-component
 *
 * Shows overview of all agents and workflows on the main dashboard.
 */
interface DashboardViewProps {
  state: DashboardProps["state"];
  theme: DashboardProps["theme"];
}

const DashboardView: React.FC<DashboardViewProps> = ({ state, theme }) => {
  const activeAgents = state.agents.filter((a) => a.status === "busy");
  const activeWorkflows = state.workflows.filter((w) => w.status === "running");
  const recentLogs = state.logs.slice(-10);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Welcome Message */}
      <Box marginBottom={2}>
        <Text bold color={theme.colors.primary}>
          Welcome to NocturneAI Terminal UI
        </Text>
      </Box>

      {/* Active Agents Summary */}
      <Box flexDirection="column" marginBottom={2}>
        <Text bold color={theme.colors.secondary}>
          Active Agents ({activeAgents.length})
        </Text>
        {activeAgents.length === 0 ? (
          <Box marginLeft={2} marginTop={1}>
            <Text color={theme.colors.muted}>No agents currently active</Text>
          </Box>
        ) : (
          activeAgents.slice(0, 5).map((agent) => (
            <Box key={agent.id} marginLeft={2} marginTop={1}>
              <Text color={theme.colors.warning}>{theme.symbols.running} </Text>
              <Text>{agent.name}</Text>
              {agent.currentTask && (
                <Text color={theme.colors.muted}> - {agent.currentTask}</Text>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* Active Workflows Summary */}
      <Box flexDirection="column" marginBottom={2}>
        <Text bold color={theme.colors.secondary}>
          Active Workflows ({activeWorkflows.length})
        </Text>
        {activeWorkflows.length === 0 ? (
          <Box marginLeft={2} marginTop={1}>
            <Text color={theme.colors.muted}>
              No workflows currently running
            </Text>
          </Box>
        ) : (
          activeWorkflows.slice(0, 5).map((workflow) => (
            <Box key={workflow.id} marginLeft={2} marginTop={1}>
              <Text color={theme.colors.warning}>{theme.symbols.running} </Text>
              <Text>{workflow.name}</Text>
              <Text color={theme.colors.muted}>
                {" "}
                ({Math.round(workflow.progress * 100)}% complete)
              </Text>
            </Box>
          ))
        )}
      </Box>

      {/* Recent Activity */}
      <Box flexDirection="column">
        <Text bold color={theme.colors.secondary}>
          Recent Activity
        </Text>
        {recentLogs.length === 0 ? (
          <Box marginLeft={2} marginTop={1}>
            <Text color={theme.colors.muted}>No recent activity</Text>
          </Box>
        ) : (
          recentLogs
            .reverse()
            .slice(0, 5)
            .map((log, index) => (
              <Box key={index} marginLeft={2} marginTop={1}>
                <Text color={theme.colors.muted}>
                  [{log.timestamp.toLocaleTimeString()}]
                </Text>
                <Text> {log.message}</Text>
              </Box>
            ))
        )}
      </Box>

      {/* Quick Actions */}
      <Box marginTop={2}>
        <Text color={theme.colors.muted} dimColor>
          Press 'a' to view agents, 'w' for workflows, 'l' for logs, or 'h' for
          help
        </Text>
      </Box>
    </Box>
  );
};

export default Dashboard;
