/**
 * Storage Layer
 *
 * Exports all storage-related components including database wrapper,
 * repositories, and migrations.
 */

// Database
export { DatabaseWrapper, createDatabase } from "./Database.js";
export type {
  DatabaseConfig,
  Migration,
  QueryResult,
  TransactionOptions,
} from "./Database.js";

// Repositories - Base
export { BaseRepository } from "./repositories/BaseRepository.js";
export type { RepositoryConfig } from "./repositories/BaseRepository.js";

// Repositories - Agent
export { AgentRepository } from "./repositories/AgentRepository.js";
export type {
  Agent,
  AgentState,
  AgentCreateInput,
  AgentUpdateInput,
} from "./repositories/AgentRepository.js";

// Repositories - Task
export { TaskRepository } from "./repositories/TaskRepository.js";
export type {
  Task,
  TaskStatus,
  TaskType,
  TaskCreateInput,
  TaskUpdateInput,
  TaskStats,
} from "./repositories/TaskRepository.js";

// Repositories - Project
export { ProjectRepository } from "./repositories/ProjectRepository.js";
export type {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectStats,
} from "./repositories/ProjectRepository.js";

// Repositories - Action
export { ActionRepository } from "./repositories/ActionRepository.js";
export type {
  Action,
  ActionType,
  ActionCreateInput,
  ActionUpdateInput,
  ActionStats,
} from "./repositories/ActionRepository.js";

// Repositories - Workflow
export { WorkflowRepository } from "./repositories/WorkflowRepository.js";
export type {
  Workflow,
  WorkflowStatus,
  WorkflowExecution,
  ExecutionStatus,
  WorkflowCreateInput,
  WorkflowUpdateInput,
  WorkflowExecutionCreateInput,
  WorkflowExecutionUpdateInput,
  WorkflowStats,
} from "./repositories/WorkflowRepository.js";

// Migrations
export {
  migrations,
  getMigration,
  getMigrationsUpTo,
  getLatestVersion,
  validateMigrations,
  initialMigration,
} from "./migrations/index.js";
