/**
 * Task Repository
 *
 * Repository for managing task persistence with specialized query methods.
 *
 * Features:
 * - CRUD operations for tasks
 * - Find by agent/project
 * - Find by status/priority
 * - Parent-child task relationships
 * - Task dependencies
 * - Task execution tracking
 */

import { BaseRepository } from "./BaseRepository.js";
import type { DatabaseWrapper } from "../Database.js";

/**
 * Task Entity
 */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: TaskStatus;
  priority: number;
  agent_id: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  dependencies: string | null; // JSON array of task IDs
  input: string | null; // JSON string
  output: string | null; // JSON string
  error: string | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
  metadata: string | null; // JSON string
}

/**
 * Task Status
 */
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "blocked";

/**
 * Task Type
 */
export type TaskType =
  | "code_generation"
  | "code_review"
  | "refactoring"
  | "bug_fix"
  | "testing"
  | "documentation"
  | "analysis"
  | "research"
  | "custom";

/**
 * Task Create Input
 */
export interface TaskCreateInput {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status?: TaskStatus;
  priority?: number;
  agent_id?: string | null;
  project_id?: string | null;
  parent_task_id?: string | null;
  dependencies?: string[];
  input?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Task Update Input
 */
export interface TaskUpdateInput {
  title?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: number;
  agent_id?: string | null;
  project_id?: string | null;
  parent_task_id?: string | null;
  dependencies?: string[];
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  started_at?: number;
  completed_at?: number;
  metadata?: Record<string, any>;
}

/**
 * Task Statistics
 */
export interface TaskStats {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_type: Record<string, number>;
  avg_completion_time: number | null;
  success_rate: number;
}

/**
 * Task Repository
 */
export class TaskRepository extends BaseRepository<Task> {
  constructor(db: DatabaseWrapper) {
    super(db, {
      tableName: "tasks",
      primaryKey: "id",
      softDelete: false,
    });
  }

  /**
   * Create a new task
   */
  createTask(input: TaskCreateInput): Task {
    const data: Partial<Task> = {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      status: input.status ?? "pending",
      priority: input.priority ?? 0,
      agent_id: input.agent_id ?? null,
      project_id: input.project_id ?? null,
      parent_task_id: input.parent_task_id ?? null,
      dependencies: input.dependencies
        ? JSON.stringify(input.dependencies)
        : null,
      input: input.input ? JSON.stringify(input.input) : null,
      output: null,
      error: null,
      started_at: null,
      completed_at: null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    };

    return this.create(data);
  }

  /**
   * Update a task
   */
  updateTask(id: string, input: TaskUpdateInput): Task | null {
    const updates: Partial<Task> = {};

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.type !== undefined) updates.type = input.type;
    if (input.status !== undefined) updates.status = input.status;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.agent_id !== undefined) updates.agent_id = input.agent_id;
    if (input.project_id !== undefined) updates.project_id = input.project_id;
    if (input.parent_task_id !== undefined)
      updates.parent_task_id = input.parent_task_id;
    if (input.dependencies !== undefined)
      updates.dependencies = JSON.stringify(input.dependencies);
    if (input.input !== undefined) updates.input = JSON.stringify(input.input);
    if (input.output !== undefined)
      updates.output = JSON.stringify(input.output);
    if (input.error !== undefined) updates.error = input.error;
    if (input.started_at !== undefined) updates.started_at = input.started_at;
    if (input.completed_at !== undefined)
      updates.completed_at = input.completed_at;
    if (input.metadata !== undefined)
      updates.metadata = JSON.stringify(input.metadata);

    return this.update(id, updates);
  }

  /**
   * Find tasks by agent ID
   */
  findByAgent(
    agentId: string,
    options?: { limit?: number; offset?: number },
  ): Task[] {
    return this.findAll({
      where: { agent_id: agentId },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find tasks by project ID
   */
  findByProject(
    projectId: string,
    options?: { limit?: number; offset?: number },
  ): Task[] {
    return this.findAll({
      where: { project_id: projectId },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "priority",
      order: "DESC",
    });
  }

  /**
   * Find tasks by status
   */
  findByStatus(
    status: TaskStatus,
    options?: { limit?: number; offset?: number },
  ): Task[] {
    return this.findAll({
      where: { status },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "priority",
      order: "DESC",
    });
  }

  /**
   * Find tasks by type
   */
  findByType(
    type: TaskType,
    options?: { limit?: number; offset?: number },
  ): Task[] {
    return this.findAll({
      where: { type },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find subtasks of a parent task
   */
  findSubtasks(parentTaskId: string): Task[] {
    return this.findAll({
      where: { parent_task_id: parentTaskId },
      orderBy: "priority",
      order: "DESC",
    });
  }

  /**
   * Find tasks by priority range
   */
  findByPriorityRange(
    minPriority: number,
    maxPriority: number,
    options?: { limit?: number; offset?: number },
  ): Task[] {
    const sql = `
      SELECT * FROM ${this.config.tableName}
      WHERE priority >= ? AND priority <= ?
      ORDER BY priority DESC, created_at DESC
      ${options?.limit ? `LIMIT ${options.limit}` : ""}
      ${options?.offset ? `OFFSET ${options.offset}` : ""}
    `;

    return this.db.query<Task>(sql, [minPriority, maxPriority]);
  }

  /**
   * Find pending tasks by priority
   */
  findPendingTasks(options?: {
    limit?: number;
    offset?: number;
    agentId?: string;
    projectId?: string;
  }): Task[] {
    const filters: Record<string, any> = { status: "pending" };

    if (options?.agentId) {
      filters.agent_id = options.agentId;
    }

    if (options?.projectId) {
      filters.project_id = options.projectId;
    }

    return this.findAll({
      where: filters,
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "priority",
      order: "DESC",
    });
  }

  /**
   * Find running tasks
   */
  findRunningTasks(options?: {
    limit?: number;
    offset?: number;
    agentId?: string;
  }): Task[] {
    const filters: Record<string, any> = { status: "running" };

    if (options?.agentId) {
      filters.agent_id = options.agentId;
    }

    return this.findAll({
      where: filters,
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "started_at",
      order: "ASC",
    });
  }

  /**
   * Find blocked tasks
   */
  findBlockedTasks(options?: { limit?: number; offset?: number }): Task[] {
    return this.findAll({
      where: { status: "blocked" },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "priority",
      order: "DESC",
    });
  }

  /**
   * Start a task
   */
  startTask(taskId: string): Task | null {
    return this.update(taskId, {
      status: "running",
      started_at: Date.now(),
    });
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, output?: Record<string, any>): Task | null {
    return this.update(taskId, {
      status: "completed",
      completed_at: Date.now(),
      output: output ? JSON.stringify(output) : null,
    });
  }

  /**
   * Fail a task
   */
  failTask(taskId: string, error: string): Task | null {
    return this.update(taskId, {
      status: "failed",
      completed_at: Date.now(),
      error,
    });
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): Task | null {
    return this.update(taskId, {
      status: "cancelled",
      completed_at: Date.now(),
    });
  }

  /**
   * Block a task
   */
  blockTask(taskId: string): Task | null {
    return this.update(taskId, {
      status: "blocked",
    });
  }

  /**
   * Unblock a task
   */
  unblockTask(taskId: string): Task | null {
    return this.update(taskId, {
      status: "pending",
    });
  }

  /**
   * Get task statistics
   */
  getStatistics(options?: { agentId?: string; projectId?: string }): TaskStats {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (options?.agentId) {
      whereClause += " AND agent_id = ?";
      params.push(options.agentId);
    }

    if (options?.projectId) {
      whereClause += " AND project_id = ?";
      params.push(options.projectId);
    }

    // Total count
    const totalSql = `SELECT COUNT(*) as count FROM ${this.config.tableName} ${whereClause}`;
    const totalResult = this.db.queryOne<{ count: number }>(totalSql, params);
    const total = totalResult?.count ?? 0;

    // Count by status
    const statusSql = `
      SELECT status, COUNT(*) as count
      FROM ${this.config.tableName}
      ${whereClause}
      GROUP BY status
    `;
    const statusResults = this.db.query<{ status: TaskStatus; count: number }>(
      statusSql,
      params,
    );

    const by_status: Record<TaskStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      blocked: 0,
    };

    for (const row of statusResults) {
      by_status[row.status] = row.count;
    }

    // Count by type
    const typeSql = `
      SELECT type, COUNT(*) as count
      FROM ${this.config.tableName}
      ${whereClause}
      GROUP BY type
    `;
    const typeResults = this.db.query<{ type: string; count: number }>(
      typeSql,
      params,
    );

    const by_type: Record<string, number> = {};
    for (const row of typeResults) {
      by_type[row.type] = row.count;
    }

    // Average completion time
    const avgTimeSql = `
      SELECT AVG(completed_at - started_at) as avg_time
      FROM ${this.config.tableName}
      ${whereClause}
      AND started_at IS NOT NULL
      AND completed_at IS NOT NULL
      AND status = 'completed'
    `;
    const avgTimeResult = this.db.queryOne<{ avg_time: number | null }>(
      avgTimeSql,
      params,
    );
    const avg_completion_time = avgTimeResult?.avg_time ?? null;

    // Success rate
    const completed = by_status.completed;
    const failed = by_status.failed;
    const success_rate =
      completed + failed > 0 ? completed / (completed + failed) : 0;

    return {
      total,
      by_status,
      by_type,
      avg_completion_time,
      success_rate,
    };
  }

  /**
   * Get task with parsed JSON fields
   */
  getTaskWithParsedFields(taskId: string):
    | (Task & {
        dependenciesParsed?: string[];
        inputParsed?: Record<string, any>;
        outputParsed?: Record<string, any>;
        metadataParsed?: Record<string, any>;
      })
    | null {
    const task = this.findById(taskId);
    if (!task) return null;

    return {
      ...task,
      dependenciesParsed: task.dependencies
        ? JSON.parse(task.dependencies)
        : undefined,
      inputParsed: task.input ? JSON.parse(task.input) : undefined,
      outputParsed: task.output ? JSON.parse(task.output) : undefined,
      metadataParsed: task.metadata ? JSON.parse(task.metadata) : undefined,
    };
  }

  /**
   * Check if task dependencies are met
   */
  areDependenciesMet(taskId: string): boolean {
    const task = this.findById(taskId);
    if (!task || !task.dependencies) return true;

    const dependencyIds: string[] = JSON.parse(task.dependencies);
    if (dependencyIds.length === 0) return true;

    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.config.tableName}
      WHERE id IN (${dependencyIds.map(() => "?").join(",")})
      AND status = 'completed'
    `;

    const result = this.db.queryOne<{ count: number }>(sql, dependencyIds);
    return result ? result.count === dependencyIds.length : false;
  }

  /**
   * Get task execution duration in milliseconds
   */
  getExecutionDuration(taskId: string): number | null {
    const task = this.findById(taskId);
    if (!task || !task.started_at) return null;

    const endTime = task.completed_at ?? Date.now();
    return endTime - task.started_at;
  }
}
