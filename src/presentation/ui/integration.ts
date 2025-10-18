/**
 * UI Integration Utilities
 *
 * Provides integration helpers for connecting the Terminal UI
 * to application services (agents, workflows, logging).
 */

import { EventEmitter } from "events";
import {
  UIEventType,
  AgentDisplay,
  WorkflowDisplay,
  WorkflowStepDisplay,
  LogEntry,
  LogLevel,
  AgentStatusType,
} from "./types.js";

/**
 * Agent service interface (minimal for integration)
 */
export interface IAgent {
  id: string;
  name: string;
  status: string;
  metadata?: Record<string, any>;
}

/**
 * Workflow service interface (minimal for integration)
 */
export interface IWorkflow {
  id: string;
  name: string;
  status: string;
  steps: any[];
  context?: Record<string, any>;
}

/**
 * Logger interface (minimal for integration)
 */
export interface ILogger {
  on(event: string, handler: (entry: any) => void): void;
  off(event: string, handler: (entry: any) => void): void;
}

/**
 * Map agent service status to UI status
 */
export function mapAgentStatus(agentStatus: string): AgentStatusType {
  const statusMap: Record<string, AgentStatusType> = {
    idle: "idle",
    thinking: "busy",
    acting: "busy",
    observing: "busy",
    paused: "paused",
    stopped: "stopped",
    error: "error",
  };

  return statusMap[agentStatus] || "idle";
}

/**
 * Convert agent service to UI display format
 */
export function agentToDisplay(agent: IAgent): AgentDisplay {
  const status = mapAgentStatus(agent.status);
  const metadata = agent.metadata || {};

  return {
    id: agent.id,
    name: agent.name,
    status,
    currentTask: metadata.currentTask as string | undefined,
    progress: metadata.progress as number | undefined,
    startTime: metadata.startTime
      ? new Date(metadata.startTime as string)
      : undefined,
    metrics: metadata.metrics
      ? {
          tasksCompleted: metadata.metrics.tasksCompleted || 0,
          tasksInProgress: metadata.metrics.tasksInProgress || 0,
          tasksFailed: metadata.metrics.tasksFailed || 0,
          avgExecutionTime: metadata.metrics.avgExecutionTime || 0,
        }
      : undefined,
  };
}

/**
 * Map workflow status
 */
export function mapWorkflowStatus(
  workflowStatus: string
): WorkflowDisplay["status"] {
  const statusMap: Record<string, WorkflowDisplay["status"]> = {
    pending: "pending",
    running: "running",
    completed: "completed",
    failed: "failed",
    cancelled: "cancelled",
  };

  return statusMap[workflowStatus] || "pending";
}

/**
 * Map workflow step status
 */
export function mapStepStatus(stepStatus: string): WorkflowStepDisplay["status"] {
  const statusMap: Record<string, WorkflowStepDisplay["status"]> = {
    pending: "pending",
    running: "running",
    completed: "completed",
    failed: "failed",
    skipped: "skipped",
  };

  return statusMap[stepStatus] || "pending";
}

/**
 * Convert workflow service to UI display format
 */
export function workflowToDisplay(workflow: IWorkflow): WorkflowDisplay {
  const status = mapWorkflowStatus(workflow.status);
  const context = workflow.context || {};

  const steps: WorkflowStepDisplay[] = workflow.steps.map((step, index) => ({
    id: step.id || `step-${index}`,
    name: step.name || `Step ${index + 1}`,
    status: mapStepStatus(step.status || "pending"),
    startTime: step.startTime ? new Date(step.startTime) : undefined,
    endTime: step.endTime ? new Date(step.endTime) : undefined,
    duration: step.duration,
    error: step.error,
    output: step.output,
  }));

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progress = steps.length > 0 ? completedSteps / steps.length : 0;

  return {
    id: workflow.id,
    name: workflow.name,
    status,
    currentStep: context.currentStep as number | undefined,
    totalSteps: steps.length,
    steps,
    startTime: context.startTime
      ? new Date(context.startTime as string)
      : undefined,
    endTime: context.endTime ? new Date(context.endTime as string) : undefined,
    progress,
  };
}

/**
 * Map log level from winston/other loggers to UI format
 */
export function mapLogLevel(level: string): LogLevel {
  const levelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    warning: LogLevel.WARN,
    error: LogLevel.ERROR,
    success: LogLevel.SUCCESS,
  };

  return levelMap[level.toLowerCase()] || LogLevel.INFO;
}

/**
 * Convert logger entry to UI format
 */
export function logToEntry(logEntry: any): LogEntry {
  return {
    timestamp: logEntry.timestamp
      ? new Date(logEntry.timestamp)
      : new Date(),
    level: mapLogLevel(logEntry.level || "info"),
    source: logEntry.source || logEntry.context || "system",
    message: logEntry.message || String(logEntry),
    metadata: logEntry.metadata,
  };
}

/**
 * Integration manager for connecting services to UI
 */
export class UIIntegration {
  private eventBus: EventEmitter;
  private agentListeners: Map<string, () => void> = new Map();
  private workflowListeners: Map<string, () => void> = new Map();
  private logListener?: (entry: any) => void;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
  }

  /**
   * Connect an agent to the UI
   */
  connectAgent(agent: IAgent, onChange?: () => void): void {
    // Initial display
    const display = agentToDisplay(agent);
    this.eventBus.emit(UIEventType.AGENT_CREATED, display);

    // Set up update listener if provided
    if (onChange) {
      const updateHandler = () => {
        const updated = agentToDisplay(agent);
        this.eventBus.emit(UIEventType.AGENT_UPDATED, updated);
      };

      this.agentListeners.set(agent.id, updateHandler);
      onChange();
    }
  }

  /**
   * Disconnect an agent from the UI
   */
  disconnectAgent(agentId: string): void {
    this.eventBus.emit(UIEventType.AGENT_DELETED, agentId);
    this.agentListeners.delete(agentId);
  }

  /**
   * Update agent in UI
   */
  updateAgent(agent: IAgent): void {
    const display = agentToDisplay(agent);
    this.eventBus.emit(UIEventType.AGENT_UPDATED, display);
  }

  /**
   * Connect a workflow to the UI
   */
  connectWorkflow(workflow: IWorkflow, onChange?: () => void): void {
    // Initial display
    const display = workflowToDisplay(workflow);
    this.eventBus.emit(UIEventType.WORKFLOW_STARTED, display);

    // Set up update listener if provided
    if (onChange) {
      const updateHandler = () => {
        const updated = workflowToDisplay(workflow);
        const wasCompleted = workflow.status === "completed";
        const wasFailed = workflow.status === "failed";

        if (wasCompleted) {
          this.eventBus.emit(UIEventType.WORKFLOW_COMPLETED, updated);
        } else if (wasFailed) {
          this.eventBus.emit(UIEventType.WORKFLOW_FAILED, {
            workflowId: workflow.id,
            error:
              workflow.steps.find((s) => s.error)?.error || "Unknown error",
          });
        } else {
          this.eventBus.emit(UIEventType.WORKFLOW_UPDATED, updated);
        }
      };

      this.workflowListeners.set(workflow.id, updateHandler);
      onChange();
    }
  }

  /**
   * Disconnect a workflow from the UI
   */
  disconnectWorkflow(workflowId: string): void {
    this.eventBus.emit(UIEventType.WORKFLOW_UPDATED, {
      id: workflowId,
      status: "cancelled",
    } as any);
    this.workflowListeners.delete(workflowId);
  }

  /**
   * Update workflow in UI
   */
  updateWorkflow(workflow: IWorkflow): void {
    const display = workflowToDisplay(workflow);
    this.eventBus.emit(UIEventType.WORKFLOW_UPDATED, display);
  }

  /**
   * Connect logger to UI
   */
  connectLogger(logger: ILogger): void {
    this.logListener = (entry: any) => {
      const logEntry = logToEntry(entry);
      this.eventBus.emit(UIEventType.LOG_ENTRY, logEntry);
    };

    logger.on("log", this.logListener);
  }

  /**
   * Disconnect logger from UI
   */
  disconnectLogger(logger: ILogger): void {
    if (this.logListener) {
      logger.off("log", this.logListener);
      this.logListener = undefined;
    }
  }

  /**
   * Emit a log entry directly to UI
   */
  log(level: string, source: string, message: string, metadata?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: mapLogLevel(level),
      source,
      message,
      metadata,
    };

    this.eventBus.emit(UIEventType.LOG_ENTRY, entry);
  }

  /**
   * Emit an error to UI
   */
  error(error: string | Error): void {
    const message = error instanceof Error ? error.message : error;
    this.eventBus.emit(UIEventType.ERROR, message);

    // Also log it
    this.log("error", "system", message);
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.agentListeners.clear();
    this.workflowListeners.clear();
    this.logListener = undefined;
  }
}

/**
 * Create a sample agent for testing
 */
export function createSampleAgent(
  id: string = "sample-agent",
  name: string = "Sample Agent"
): AgentDisplay {
  return {
    id,
    name,
    status: "idle",
    startTime: new Date(),
    metrics: {
      tasksCompleted: 0,
      tasksInProgress: 0,
      tasksFailed: 0,
      avgExecutionTime: 0,
    },
  };
}

/**
 * Create a sample workflow for testing
 */
export function createSampleWorkflow(
  id: string = "sample-workflow",
  name: string = "Sample Workflow"
): WorkflowDisplay {
  return {
    id,
    name,
    status: "pending",
    currentStep: 0,
    totalSteps: 3,
    steps: [
      {
        id: "step-1",
        name: "Initialize",
        status: "pending",
      },
      {
        id: "step-2",
        name: "Process",
        status: "pending",
      },
      {
        id: "step-3",
        name: "Complete",
        status: "pending",
      },
    ],
    startTime: new Date(),
    progress: 0,
  };
}

/**
 * Create sample logs for testing
 */
export function createSampleLogs(): LogEntry[] {
  return [
    {
      timestamp: new Date(),
      level: LogLevel.INFO,
      source: "system",
      message: "NocturneAI initialized",
    },
    {
      timestamp: new Date(),
      level: LogLevel.SUCCESS,
      source: "agent",
      message: "Agent created successfully",
    },
    {
      timestamp: new Date(),
      level: LogLevel.WARN,
      source: "workflow",
      message: "Workflow execution taking longer than expected",
    },
  ];
}
