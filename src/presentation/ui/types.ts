/**
 * Terminal UI Types and Interfaces
 *
 * Defines the types and interfaces used throughout the Terminal UI components
 * for displaying agent status, workflow progress, and interactive elements.
 */

import { EventEmitter } from "events";

/**
 * Agent status for UI display
 */
export type AgentStatusType = "idle" | "busy" | "paused" | "error" | "stopped";

/**
 * View types supported by the Terminal UI
 */
export enum ViewType {
  DASHBOARD = "dashboard",
  AGENT_STATUS = "agent_status",
  WORKFLOW_PROGRESS = "workflow_progress",
  TASK_INPUT = "task_input",
  LOGS = "logs",
  HELP = "help",
  CHAT = "chat",
}

/**
 * Log level for display filtering
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  SUCCESS = "success",
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent display information
 */
export interface AgentDisplay {
  id: string;
  name: string;
  status: AgentStatusType;
  currentTask?: string;
  progress?: number;
  startTime?: Date;
  metrics?: {
    tasksCompleted: number;
    tasksInProgress: number;
    tasksFailed: number;
    avgExecutionTime: number;
  };
}

/**
 * Workflow step display information
 */
export interface WorkflowStepDisplay {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  output?: unknown;
}

/**
 * Workflow display information
 */
export interface WorkflowDisplay {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  currentStep?: number;
  totalSteps: number;
  steps: WorkflowStepDisplay[];
  startTime?: Date;
  endTime?: Date;
  progress: number;
}

/**
 * Task input form data
 */
export interface TaskInputData {
  description: string;
  priority?: "low" | "medium" | "high" | "critical";
  agentId?: string;
  parameters?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/**
 * UI state for the Terminal application
 */
export interface UIState {
  currentView: ViewType;
  agents: AgentDisplay[];
  workflows: WorkflowDisplay[];
  logs: LogEntry[];
  selectedAgentId?: string;
  selectedWorkflowId?: string;
  isLoading: boolean;
  error?: string;
}

/**
 * UI action types
 */
export enum UIActionType {
  SET_VIEW = "SET_VIEW",
  UPDATE_AGENT = "UPDATE_AGENT",
  REMOVE_AGENT = "REMOVE_AGENT",
  UPDATE_WORKFLOW = "UPDATE_WORKFLOW",
  REMOVE_WORKFLOW = "REMOVE_WORKFLOW",
  ADD_LOG = "ADD_LOG",
  CLEAR_LOGS = "CLEAR_LOGS",
  SELECT_AGENT = "SELECT_AGENT",
  SELECT_WORKFLOW = "SELECT_WORKFLOW",
  SET_LOADING = "SET_LOADING",
  SET_ERROR = "SET_ERROR",
  CLEAR_ERROR = "CLEAR_ERROR",
}

/**
 * UI action structure
 */
export type UIAction =
  | { type: UIActionType.SET_VIEW; payload: ViewType }
  | { type: UIActionType.UPDATE_AGENT; payload: AgentDisplay }
  | { type: UIActionType.REMOVE_AGENT; payload: string }
  | { type: UIActionType.UPDATE_WORKFLOW; payload: WorkflowDisplay }
  | { type: UIActionType.REMOVE_WORKFLOW; payload: string }
  | { type: UIActionType.ADD_LOG; payload: LogEntry }
  | { type: UIActionType.CLEAR_LOGS }
  | { type: UIActionType.SELECT_AGENT; payload: string | undefined }
  | { type: UIActionType.SELECT_WORKFLOW; payload: string | undefined }
  | { type: UIActionType.SET_LOADING; payload: boolean }
  | { type: UIActionType.SET_ERROR; payload: string | undefined }
  | { type: UIActionType.CLEAR_ERROR };

/**
 * Key bindings for Terminal UI
 */
export interface KeyBinding {
  key: string;
  description: string;
  action: () => void;
}

/**
 * Theme configuration for Terminal UI
 */
export interface UITheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    muted: string;
    background: string;
    foreground: string;
  };
  symbols: {
    pending: string;
    running: string;
    completed: string;
    failed: string;
    arrow: string;
    bullet: string;
    checkbox: string;
    checkboxChecked: string;
  };
}

/**
 * Component props for Dashboard
 */
export interface DashboardProps {
  state: UIState;
  dispatch: (action: UIAction) => void;
  eventBus: EventEmitter;
  theme: UITheme;
}

/**
 * Component props for Agent Status
 */
export interface AgentStatusProps {
  agents: AgentDisplay[];
  selectedAgentId?: string;
  onSelect: (agentId: string) => void;
  theme: UITheme;
}

/**
 * Component props for Workflow Progress
 */
export interface WorkflowProgressProps {
  workflow: WorkflowDisplay;
  theme: UITheme;
  compact?: boolean;
}

/**
 * Component props for Task Input
 */
export interface TaskInputProps {
  onSubmit: (task: TaskInputData) => void;
  onCancel: () => void;
  agents: AgentDisplay[];
  theme: UITheme;
}

/**
 * Component props for Log Viewer
 */
export interface LogViewerProps {
  logs: LogEntry[];
  maxLogs?: number;
  filter?: LogLevel[];
  theme: UITheme;
}

/**
 * Component props for Help
 */
export interface HelpProps {
  keyBindings: KeyBinding[];
  theme: UITheme;
}

/**
 * Default theme
 */
export const DEFAULT_THEME: UITheme = {
  colors: {
    primary: "#00D9FF",
    secondary: "#A78BFA",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
    muted: "#6B7280",
    background: "#1F2937",
    foreground: "#F9FAFB",
  },
  symbols: {
    pending: "○",
    running: "◐",
    completed: "●",
    failed: "✗",
    arrow: "→",
    bullet: "•",
    checkbox: "☐",
    checkboxChecked: "☑",
  },
};

/**
 * UI event types
 */
export enum UIEventType {
  AGENT_CREATED = "agent:created",
  AGENT_UPDATED = "agent:updated",
  AGENT_DELETED = "agent:deleted",
  WORKFLOW_STARTED = "workflow:started",
  WORKFLOW_UPDATED = "workflow:updated",
  WORKFLOW_COMPLETED = "workflow:completed",
  WORKFLOW_FAILED = "workflow:failed",
  TASK_SUBMITTED = "task:submitted",
  LOG_ENTRY = "log:entry",
  ERROR = "error",
  CHAT_MESSAGE = "chat:message",
  CHAT_COMMAND = "chat:command",
  CHAT_CONFIRMATION = "chat:confirmation",
}

/**
 * UI event payload types
 */
export interface UIEventPayloads {
  [UIEventType.AGENT_CREATED]: AgentDisplay;
  [UIEventType.AGENT_UPDATED]: AgentDisplay;
  [UIEventType.AGENT_DELETED]: string;
  [UIEventType.WORKFLOW_STARTED]: WorkflowDisplay;
  [UIEventType.WORKFLOW_UPDATED]: WorkflowDisplay;
  [UIEventType.WORKFLOW_COMPLETED]: WorkflowDisplay;
  [UIEventType.WORKFLOW_FAILED]: { workflowId: string; error: string };
  [UIEventType.TASK_SUBMITTED]: TaskInputData;
  [UIEventType.LOG_ENTRY]: LogEntry;
  [UIEventType.ERROR]: string;
  [UIEventType.CHAT_MESSAGE]: ChatMessage;
  [UIEventType.CHAT_COMMAND]: ChatCommand;
  [UIEventType.CHAT_CONFIRMATION]: ChatConfirmation;
}

/**
 * Chat message types
 */
export type ChatMessageType =
  | 'user'
  | 'assistant'
  | 'confirmation'
  | 'execution'
  | 'error'
  | 'agent_list'
  | 'workflow_list'
  | 'model_list'
  | 'dashboard'
  | 'logs';

/**
 * Confirmation status
 */
export type ConfirmationStatus = 'pending' | 'approved' | 'modified' | 'cancelled';

/**
 * Action to be executed
 */
export interface ProposedAction {
  id: string;
  description: string;
  command?: string;
  category: 'agent' | 'workflow' | 'navigation' | 'system';
  parameters?: Record<string, unknown>;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  actionId: string;
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  content: string;
  timestamp: Date;

  // For assistant messages
  thought?: string;
  proposedActions?: ProposedAction[];

  // For confirmation messages
  confirmationId?: string;
  status?: ConfirmationStatus;

  // For execution messages
  results?: ExecutionResult[];

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Chat command structure
 */
export interface ChatCommand {
  input: string;
  isSlashCommand: boolean;
  command?: string;
  args?: string[];
  mentions?: Array<{
    type: 'file' | 'folder' | 'agent' | 'workflow';
    path: string;
  }>;
}

/**
 * Chat confirmation structure
 */
export interface ChatConfirmation {
  confirmationId: string;
  response: ConfirmationStatus;
  modifiedInput?: string;
}

/**
 * Chat input props
 */
export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  showAutocomplete?: boolean;
  disabled?: boolean;
  theme: UITheme;
}
