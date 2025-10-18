/**
 * Command Index
 *
 * Barrel exports for all CLI commands.
 */

// Base Command
export { BaseCommand } from "./BaseCommand.js";
export type {
  CommandOptions,
  CommandResult,
  CommandContext,
} from "./BaseCommand.js";

// Agent Commands
export {
  AgentCreateCommand,
  AgentListCommand,
  AgentRunCommand,
  AgentDeleteCommand,
  AgentInspectCommand,
  registerAgentCommands,
} from "./AgentCommands.js";

// Workflow Commands
export {
  WorkflowRunCommand,
  WorkflowValidateCommand,
  WorkflowListCommand,
  WorkflowStatusCommand,
  WorkflowCancelCommand,
  registerWorkflowCommands,
} from "./WorkflowCommands.js";

// Tool Commands
export {
  ToolListCommand,
  ToolInspectCommand,
  ToolRegisterCommand,
  registerToolCommands,
} from "./ToolCommands.js";

// Project Commands
export {
  ProjectInitCommand,
  ProjectConfigCommand,
  registerProjectCommands,
} from "./ProjectCommands.js";

// UI Command
export { createUICommand } from "./ui.js";

// Chat Command
export { startChatUI, createChatCommand } from "./chat.js";

// Docs Commands
export { DocsCommands } from "./DocsCommands.js";
