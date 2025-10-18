/**
 * Workflow Repository
 *
 * Repository for managing workflow and workflow execution persistence.
 *
 * Features:
 * - CRUD operations for workflows and executions
 * - Find by project/status
 * - Version management
 * - Execution tracking
 * - Workflow statistics
 */

import { BaseRepository } from "./BaseRepository.js";
import type { DatabaseWrapper } from "../Database.js";

/**
 * Workflow Entity
 */
export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
  definition: string; // JSON string
  status: WorkflowStatus;
  version: number;
  created_at: number;
  updated_at: number;
  metadata: string | null; // JSON string
}

/**
 * Workflow Status
 */
export type WorkflowStatus = "active" | "inactive" | "draft" | "archived";

/**
 * Workflow Execution Entity
 */
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  input: string | null; // JSON string
  output: string | null; // JSON string
  error: string | null;
  started_at: number;
  completed_at: number | null;
  metadata: string | null; // JSON string
}

/**
 * Execution Status
 */
export type ExecutionStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

/**
 * Workflow Create Input
 */
export interface WorkflowCreateInput {
  id: string;
  name: string;
  description?: string;
  project_id?: string | null;
  definition: Record<string, any>;
  status?: WorkflowStatus;
  version?: number;
  metadata?: Record<string, any>;
}

/**
 * Workflow Update Input
 */
export interface WorkflowUpdateInput {
  name?: string;
  description?: string;
  project_id?: string | null;
  definition?: Record<string, any>;
  status?: WorkflowStatus;
  version?: number;
  metadata?: Record<string, any>;
}

/**
 * Workflow Execution Create Input
 */
export interface WorkflowExecutionCreateInput {
  id: string;
  workflow_id: string;
  status?: ExecutionStatus;
  input?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Workflow Execution Update Input
 */
export interface WorkflowExecutionUpdateInput {
  status?: ExecutionStatus;
  output?: Record<string, any>;
  error?: string;
  completed_at?: number;
  metadata?: Record<string, any>;
}

/**
 * Workflow Statistics
 */
export interface WorkflowStats {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  running_executions: number;
  success_rate: number;
  avg_execution_time: number | null;
  total_execution_time: number;
}

/**
 * Workflow Repository
 */
export class WorkflowRepository extends BaseRepository<Workflow> {
  constructor(db: DatabaseWrapper) {
    super(db, {
      tableName: "workflows",
      primaryKey: "id",
      softDelete: false,
    });
  }

  /**
   * Create a new workflow
   */
  createWorkflow(input: WorkflowCreateInput): Workflow {
    const data: Partial<Workflow> = {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      project_id: input.project_id ?? null,
      definition: JSON.stringify(input.definition),
      status: input.status ?? "draft",
      version: input.version ?? 1,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    };

    return this.create(data);
  }

  /**
   * Update a workflow
   */
  updateWorkflow(id: string, input: WorkflowUpdateInput): Workflow | null {
    const updates: Partial<Workflow> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.project_id !== undefined) updates.project_id = input.project_id;
    if (input.definition !== undefined)
      updates.definition = JSON.stringify(input.definition);
    if (input.status !== undefined) updates.status = input.status;
    if (input.version !== undefined) updates.version = input.version;
    if (input.metadata !== undefined)
      updates.metadata = JSON.stringify(input.metadata);

    return this.update(id, updates);
  }

  /**
   * Find workflows by project ID
   */
  findByProject(
    projectId: string,
    options?: { limit?: number; offset?: number },
  ): Workflow[] {
    return this.findAll({
      where: { project_id: projectId },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "name",
      order: "ASC",
    });
  }

  /**
   * Find workflows by status
   */
  findByStatus(
    status: WorkflowStatus,
    options?: { limit?: number; offset?: number },
  ): Workflow[] {
    return this.findAll({
      where: { status },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "updated_at",
      order: "DESC",
    });
  }

  /**
   * Find workflow by name
   */
  findByName(name: string): Workflow | null {
    return this.findOne({
      where: { name },
    });
  }

  /**
   * Search workflows by name pattern
   */
  searchByName(
    pattern: string,
    options?: { limit?: number; offset?: number },
  ): Workflow[] {
    const sql = `
      SELECT * FROM ${this.config.tableName}
      WHERE name LIKE ?
      ORDER BY name ASC
      ${options?.limit ? `LIMIT ${options.limit}` : ""}
      ${options?.offset ? `OFFSET ${options.offset}` : ""}
    `;

    return this.db.query<Workflow>(sql, [`%${pattern}%`]);
  }

  /**
   * Get active workflows
   */
  getActiveWorkflows(options?: {
    limit?: number;
    offset?: number;
    projectId?: string;
  }): Workflow[] {
    const where: Record<string, any> = { status: "active" };

    if (options?.projectId) {
      where.project_id = options.projectId;
    }

    return this.findAll({
      where,
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "name",
      order: "ASC",
    });
  }

  /**
   * Archive a workflow
   */
  archiveWorkflow(workflowId: string): Workflow | null {
    return this.update(workflowId, { status: "archived" });
  }

  /**
   * Activate a workflow
   */
  activateWorkflow(workflowId: string): Workflow | null {
    return this.update(workflowId, { status: "active" });
  }

  /**
   * Deactivate a workflow
   */
  deactivateWorkflow(workflowId: string): Workflow | null {
    return this.update(workflowId, { status: "inactive" });
  }

  /**
   * Increment workflow version
   */
  incrementVersion(workflowId: string): Workflow | null {
    const workflow = this.findById(workflowId);
    if (!workflow) return null;

    return this.update(workflowId, { version: workflow.version + 1 });
  }

  /**
   * Get workflow with parsed definition
   */
  getWorkflowWithParsedFields(workflowId: string):
    | (Workflow & {
        definitionParsed?: Record<string, any>;
        metadataParsed?: Record<string, any>;
      })
    | null {
    const workflow = this.findById(workflowId);
    if (!workflow) return null;

    return {
      ...workflow,
      definitionParsed: JSON.parse(workflow.definition),
      metadataParsed: workflow.metadata
        ? JSON.parse(workflow.metadata)
        : undefined,
    };
  }

  /**
   * Create workflow execution
   */
  createExecution(input: WorkflowExecutionCreateInput): WorkflowExecution {
    const data = {
      id: input.id,
      workflow_id: input.workflow_id,
      status: input.status ?? "running",
      input: input.input ? JSON.stringify(input.input) : null,
      output: null,
      error: null,
      started_at: Date.now(),
      completed_at: null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    };

    const sql = `
      INSERT INTO workflow_executions (
        id, workflow_id, status, input, output, error,
        started_at, completed_at, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      data.id,
      data.workflow_id,
      data.status,
      data.input,
      data.output,
      data.error,
      data.started_at,
      data.completed_at,
      data.metadata,
    ]);

    return data as WorkflowExecution;
  }

  /**
   * Update workflow execution
   */
  updateExecution(
    executionId: string,
    input: WorkflowExecutionUpdateInput,
  ): WorkflowExecution | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.status !== undefined) {
      updates.push("status = ?");
      values.push(input.status);
    }

    if (input.output !== undefined) {
      updates.push("output = ?");
      values.push(JSON.stringify(input.output));
    }

    if (input.error !== undefined) {
      updates.push("error = ?");
      values.push(input.error);
    }

    if (input.completed_at !== undefined) {
      updates.push("completed_at = ?");
      values.push(input.completed_at);
    }

    if (input.metadata !== undefined) {
      updates.push("metadata = ?");
      values.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) {
      return this.findExecutionById(executionId);
    }

    const sql = `
      UPDATE workflow_executions
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    values.push(executionId);
    this.db.execute(sql, values);

    return this.findExecutionById(executionId);
  }

  /**
   * Find execution by ID
   */
  findExecutionById(executionId: string): WorkflowExecution | null {
    const sql = "SELECT * FROM workflow_executions WHERE id = ?";
    return this.db.queryOne<WorkflowExecution>(sql, [executionId]);
  }

  /**
   * Find executions by workflow ID
   */
  findExecutionsByWorkflow(
    workflowId: string,
    options?: { limit?: number; offset?: number },
  ): WorkflowExecution[] {
    const sql = `
      SELECT * FROM workflow_executions
      WHERE workflow_id = ?
      ORDER BY started_at DESC
      ${options?.limit ? `LIMIT ${options.limit}` : ""}
      ${options?.offset ? `OFFSET ${options.offset}` : ""}
    `;

    return this.db.query<WorkflowExecution>(sql, [workflowId]);
  }

  /**
   * Find executions by status
   */
  findExecutionsByStatus(
    status: ExecutionStatus,
    options?: { limit?: number; offset?: number },
  ): WorkflowExecution[] {
    const sql = `
      SELECT * FROM workflow_executions
      WHERE status = ?
      ORDER BY started_at DESC
      ${options?.limit ? `LIMIT ${options.limit}` : ""}
      ${options?.offset ? `OFFSET ${options.offset}` : ""}
    `;

    return this.db.query<WorkflowExecution>(sql, [status]);
  }

  /**
   * Find running executions
   */
  findRunningExecutions(options?: {
    limit?: number;
    offset?: number;
  }): WorkflowExecution[] {
    return this.findExecutionsByStatus("running", options);
  }

  /**
   * Complete execution
   */
  completeExecution(
    executionId: string,
    output?: Record<string, any>,
  ): WorkflowExecution | null {
    return this.updateExecution(executionId, {
      status: "completed",
      output,
      completed_at: Date.now(),
    });
  }

  /**
   * Fail execution
   */
  failExecution(executionId: string, error: string): WorkflowExecution | null {
    return this.updateExecution(executionId, {
      status: "failed",
      error,
      completed_at: Date.now(),
    });
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId: string): WorkflowExecution | null {
    return this.updateExecution(executionId, {
      status: "cancelled",
      completed_at: Date.now(),
    });
  }

  /**
   * Pause execution
   */
  pauseExecution(executionId: string): WorkflowExecution | null {
    return this.updateExecution(executionId, {
      status: "paused",
    });
  }

  /**
   * Resume execution
   */
  resumeExecution(executionId: string): WorkflowExecution | null {
    return this.updateExecution(executionId, {
      status: "running",
    });
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats(workflowId: string): WorkflowStats {
    // Total executions
    const totalSql = `
      SELECT COUNT(*) as count
      FROM workflow_executions
      WHERE workflow_id = ?
    `;
    const totalResult = this.db.queryOne<{ count: number }>(totalSql, [
      workflowId,
    ]);
    const total_executions = totalResult?.count ?? 0;

    // Successful executions
    const successSql = `
      SELECT COUNT(*) as count
      FROM workflow_executions
      WHERE workflow_id = ? AND status = 'completed'
    `;
    const successResult = this.db.queryOne<{ count: number }>(successSql, [
      workflowId,
    ]);
    const successful_executions = successResult?.count ?? 0;

    // Failed executions
    const failedSql = `
      SELECT COUNT(*) as count
      FROM workflow_executions
      WHERE workflow_id = ? AND status = 'failed'
    `;
    const failedResult = this.db.queryOne<{ count: number }>(failedSql, [
      workflowId,
    ]);
    const failed_executions = failedResult?.count ?? 0;

    // Running executions
    const runningSql = `
      SELECT COUNT(*) as count
      FROM workflow_executions
      WHERE workflow_id = ? AND status = 'running'
    `;
    const runningResult = this.db.queryOne<{ count: number }>(runningSql, [
      workflowId,
    ]);
    const running_executions = runningResult?.count ?? 0;

    // Success rate
    const success_rate =
      successful_executions + failed_executions > 0
        ? successful_executions / (successful_executions + failed_executions)
        : 0;

    // Average execution time
    const avgTimeSql = `
      SELECT AVG(completed_at - started_at) as avg_time
      FROM workflow_executions
      WHERE workflow_id = ?
      AND completed_at IS NOT NULL
      AND status = 'completed'
    `;
    const avgTimeResult = this.db.queryOne<{ avg_time: number | null }>(
      avgTimeSql,
      [workflowId],
    );
    const avg_execution_time = avgTimeResult?.avg_time ?? null;

    // Total execution time
    const totalTimeSql = `
      SELECT SUM(completed_at - started_at) as total_time
      FROM workflow_executions
      WHERE workflow_id = ?
      AND completed_at IS NOT NULL
    `;
    const totalTimeResult = this.db.queryOne<{ total_time: number | null }>(
      totalTimeSql,
      [workflowId],
    );
    const total_execution_time = totalTimeResult?.total_time ?? 0;

    return {
      total_executions,
      successful_executions,
      failed_executions,
      running_executions,
      success_rate,
      avg_execution_time,
      total_execution_time,
    };
  }

  /**
   * Get execution with parsed fields
   */
  getExecutionWithParsedFields(executionId: string):
    | (WorkflowExecution & {
        inputParsed?: Record<string, any>;
        outputParsed?: Record<string, any>;
        metadataParsed?: Record<string, any>;
      })
    | null {
    const execution = this.findExecutionById(executionId);
    if (!execution) return null;

    return {
      ...execution,
      inputParsed: execution.input ? JSON.parse(execution.input) : undefined,
      outputParsed: execution.output ? JSON.parse(execution.output) : undefined,
      metadataParsed: execution.metadata
        ? JSON.parse(execution.metadata)
        : undefined,
    };
  }

  /**
   * Get recent executions
   */
  getRecentExecutions(
    limit: number = 50,
    options?: { workflowId?: string },
  ): WorkflowExecution[] {
    let sql = `
      SELECT * FROM workflow_executions
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.workflowId) {
      sql += " AND workflow_id = ?";
      params.push(options.workflowId);
    }

    sql += " ORDER BY started_at DESC LIMIT ?";
    params.push(limit);

    return this.db.query<WorkflowExecution>(sql, params);
  }

  /**
   * Delete old executions
   */
  deleteOldExecutions(olderThanTimestamp: number): number {
    const sql = `
      DELETE FROM workflow_executions
      WHERE completed_at < ?
      AND status IN ('completed', 'failed', 'cancelled')
    `;

    this.db.execute(sql, [olderThanTimestamp]);

    const countSql = "SELECT changes() as count";
    const result = this.db.queryOne<{ count: number }>(countSql, []);
    return result?.count ?? 0;
  }

  /**
   * Get execution duration
   */
  getExecutionDuration(executionId: string): number | null {
    const execution = this.findExecutionById(executionId);
    if (!execution || !execution.completed_at) return null;

    return execution.completed_at - execution.started_at;
  }

  /**
   * Count workflows by status
   */
  countByStatus(): Record<WorkflowStatus, number> {
    const sql = `
      SELECT status, COUNT(*) as count
      FROM ${this.config.tableName}
      GROUP BY status
    `;

    const results = this.db.query<{ status: WorkflowStatus; count: number }>(
      sql,
      [],
    );

    const counts: Record<WorkflowStatus, number> = {
      active: 0,
      inactive: 0,
      draft: 0,
      archived: 0,
    };

    for (const row of results) {
      counts[row.status] = row.count;
    }

    return counts;
  }
}
