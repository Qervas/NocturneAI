/**
 * Action Repository
 *
 * Repository for managing action persistence with execution tracking.
 *
 * Features:
 * - CRUD operations for actions
 * - Find by task/agent
 * - Execution history tracking
 * - Success/failure statistics
 * - Action type filtering
 */

import { BaseRepository } from "./BaseRepository.js";
import type { DatabaseWrapper } from "../Database.js";

/**
 * Action Entity
 */
export interface Action {
  id: string;
  task_id: string;
  agent_id: string;
  type: string;
  name: string;
  input: string | null; // JSON string
  output: string | null; // JSON string
  success: number; // 0 or 1 (boolean)
  error: string | null;
  duration_ms: number | null;
  created_at: number;
  metadata: string | null; // JSON string
}

/**
 * Action Type
 */
export type ActionType =
  | "file_read"
  | "file_write"
  | "file_delete"
  | "command_execute"
  | "git_commit"
  | "git_push"
  | "code_search"
  | "file_search"
  | "symbol_search"
  | "llm_request"
  | "tool_call"
  | "custom";

/**
 * Action Create Input
 */
export interface ActionCreateInput {
  id: string;
  task_id: string;
  agent_id: string;
  type: ActionType;
  name: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  success?: boolean;
  error?: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
}

/**
 * Action Update Input
 */
export interface ActionUpdateInput {
  output?: Record<string, any>;
  success?: boolean;
  error?: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
}

/**
 * Action Statistics
 */
export interface ActionStats {
  total: number;
  successful: number;
  failed: number;
  success_rate: number;
  by_type: Record<string, number>;
  avg_duration_ms: number | null;
  total_duration_ms: number;
}

/**
 * Action Repository
 */
export class ActionRepository extends BaseRepository<Action> {
  constructor(db: DatabaseWrapper) {
    super(db, {
      tableName: "actions",
      primaryKey: "id",
      softDelete: false,
    });
  }

  /**
   * Create a new action
   */
  createAction(input: ActionCreateInput): Action {
    const data: Partial<Action> = {
      id: input.id,
      task_id: input.task_id,
      agent_id: input.agent_id,
      type: input.type,
      name: input.name,
      input: input.input ? JSON.stringify(input.input) : null,
      output: input.output ? JSON.stringify(input.output) : null,
      success: input.success ? 1 : 0,
      error: input.error ?? null,
      duration_ms: input.duration_ms ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    };

    return this.create(data);
  }

  /**
   * Update an action
   */
  updateAction(id: string, input: ActionUpdateInput): Action | null {
    const updates: Partial<Action> = {};

    if (input.output !== undefined)
      updates.output = JSON.stringify(input.output);
    if (input.success !== undefined) updates.success = input.success ? 1 : 0;
    if (input.error !== undefined) updates.error = input.error;
    if (input.duration_ms !== undefined)
      updates.duration_ms = input.duration_ms;
    if (input.metadata !== undefined)
      updates.metadata = JSON.stringify(input.metadata);

    return this.update(id, updates);
  }

  /**
   * Find actions by task ID
   */
  findByTask(
    taskId: string,
    options?: { limit?: number; offset?: number },
  ): Action[] {
    return this.findAll({
      where: { task_id: taskId },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at",
      order: "ASC",
    });
  }

  /**
   * Find actions by agent ID
   */
  findByAgent(
    agentId: string,
    options?: { limit?: number; offset?: number },
  ): Action[] {
    return this.findAll({
      where: { agent_id: agentId },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find actions by type
   */
  findByType(
    type: ActionType,
    options?: { limit?: number; offset?: number },
  ): Action[] {
    return this.findAll({
      where: { type },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find successful actions
   */
  findSuccessful(options?: {
    limit?: number;
    offset?: number;
    agentId?: string;
    taskId?: string;
  }): Action[] {
    const filters: Record<string, any> = { success: 1 };

    if (options?.agentId) {
      filters.agent_id = options.agentId;
    }

    if (options?.taskId) {
      filters.task_id = options.taskId;
    }

    return this.findAll({
      where: filters,
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find failed actions
   */
  findFailed(options?: {
    limit?: number;
    offset?: number;
    agentId?: string;
    taskId?: string;
  }): Action[] {
    const filters: Record<string, any> = { success: 0 };

    if (options?.agentId) {
      filters.agent_id = options.agentId;
    }

    if (options?.taskId) {
      filters.task_id = options.taskId;
    }

    return this.findAll({
      where: filters,
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find actions by name pattern
   */
  findByName(
    pattern: string,
    options?: { limit?: number; offset?: number },
  ): Action[] {
    const sql = `
      SELECT * FROM ${this.config.tableName}
      WHERE name LIKE ?
      ORDER BY created_at DESC
      ${options?.limit ? `LIMIT ${options.limit}` : ""}
      ${options?.offset ? `OFFSET ${options.offset}` : ""}
    `;

    return this.db.query<Action>(sql, [`%${pattern}%`]);
  }

  /**
   * Find recent actions
   */
  findRecent(limit: number = 50): Action[] {
    return this.findAll({
      limit,
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find slow actions (above threshold)
   */
  findSlowActions(
    thresholdMs: number,
    options?: { limit?: number; offset?: number },
  ): Action[] {
    const sql = `
      SELECT * FROM ${this.config.tableName}
      WHERE duration_ms >= ?
      ORDER BY duration_ms DESC
      ${options?.limit ? `LIMIT ${options.limit}` : ""}
      ${options?.offset ? `OFFSET ${options.offset}` : ""}
    `;

    return this.db.query<Action>(sql, [thresholdMs]);
  }

  /**
   * Get action statistics
   */
  getStatistics(options?: {
    agentId?: string;
    taskId?: string;
    type?: ActionType;
  }): ActionStats {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (options?.agentId) {
      whereClause += " AND agent_id = ?";
      params.push(options.agentId);
    }

    if (options?.taskId) {
      whereClause += " AND task_id = ?";
      params.push(options.taskId);
    }

    if (options?.type) {
      whereClause += " AND type = ?";
      params.push(options.type);
    }

    // Total count
    const totalSql = `SELECT COUNT(*) as count FROM ${this.config.tableName} ${whereClause}`;
    const totalResult = this.db.queryOne<{ count: number }>(totalSql, params);
    const total = totalResult?.count ?? 0;

    // Successful count
    const successSql = `
      SELECT COUNT(*) as count
      FROM ${this.config.tableName}
      ${whereClause} AND success = 1
    `;
    const successResult = this.db.queryOne<{ count: number }>(
      successSql,
      params,
    );
    const successful = successResult?.count ?? 0;

    // Failed count
    const failed = total - successful;

    // Success rate
    const success_rate = total > 0 ? successful / total : 0;

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

    // Average duration
    const avgDurationSql = `
      SELECT AVG(duration_ms) as avg_duration
      FROM ${this.config.tableName}
      ${whereClause}
      AND duration_ms IS NOT NULL
    `;
    const avgDurationResult = this.db.queryOne<{ avg_duration: number | null }>(
      avgDurationSql,
      params,
    );
    const avg_duration_ms = avgDurationResult?.avg_duration ?? null;

    // Total duration
    const totalDurationSql = `
      SELECT SUM(duration_ms) as total_duration
      FROM ${this.config.tableName}
      ${whereClause}
      AND duration_ms IS NOT NULL
    `;
    const totalDurationResult = this.db.queryOne<{
      total_duration: number | null;
    }>(totalDurationSql, params);
    const total_duration_ms = totalDurationResult?.total_duration ?? 0;

    return {
      total,
      successful,
      failed,
      success_rate,
      by_type,
      avg_duration_ms,
      total_duration_ms,
    };
  }

  /**
   * Get action with parsed JSON fields
   */
  getActionWithParsedFields(actionId: string):
    | (Action & {
        inputParsed?: Record<string, any>;
        outputParsed?: Record<string, any>;
        metadataParsed?: Record<string, any>;
        successBoolean: boolean;
      })
    | null {
    const action = this.findById(actionId);
    if (!action) return null;

    return {
      ...action,
      inputParsed: action.input ? JSON.parse(action.input) : undefined,
      outputParsed: action.output ? JSON.parse(action.output) : undefined,
      metadataParsed: action.metadata ? JSON.parse(action.metadata) : undefined,
      successBoolean: action.success === 1,
    };
  }

  /**
   * Get action execution timeline for a task
   */
  getTaskTimeline(taskId: string): Action[] {
    return this.findAll({
      where: { task_id: taskId },
      orderBy: "created_at",
      order: "ASC",
    });
  }

  /**
   * Get action execution timeline for an agent
   */
  getAgentTimeline(
    agentId: string,
    options?: { limit?: number; offset?: number },
  ): Action[] {
    return this.findAll({
      where: { agent_id: agentId },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at",
      order: "ASC",
    });
  }

  /**
   * Get most common action types
   */
  getMostCommonTypes(
    limit: number = 10,
  ): Array<{ type: string; count: number }> {
    const sql = `
      SELECT type, COUNT(*) as count
      FROM ${this.config.tableName}
      GROUP BY type
      ORDER BY count DESC
      LIMIT ?
    `;

    return this.db.query<{ type: string; count: number }>(sql, [limit]);
  }

  /**
   * Get error frequency by type
   */
  getErrorFrequency(): Array<{ type: string; error_rate: number }> {
    const sql = `
      SELECT
        type,
        CAST(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as error_rate
      FROM ${this.config.tableName}
      GROUP BY type
      HAVING COUNT(*) >= 5
      ORDER BY error_rate DESC
    `;

    return this.db.query<{ type: string; error_rate: number }>(sql, []);
  }

  /**
   * Get actions with errors containing a pattern
   */
  findByErrorPattern(
    pattern: string,
    options?: { limit?: number; offset?: number },
  ): Action[] {
    const sql = `
      SELECT * FROM ${this.config.tableName}
      WHERE success = 0 AND error LIKE ?
      ORDER BY created_at DESC
      ${options?.limit ? `LIMIT ${options.limit}` : ""}
      ${options?.offset ? `OFFSET ${options.offset}` : ""}
    `;

    return this.db.query<Action>(sql, [`%${pattern}%`]);
  }

  /**
   * Delete actions older than timestamp
   */
  deleteOlderThan(timestamp: number): number {
    const sql = `DELETE FROM ${this.config.tableName} WHERE created_at < ?`;
    this.db.execute(sql, [timestamp]);

    const countSql = `SELECT changes() as count`;
    const result = this.db.queryOne<{ count: number }>(countSql, []);
    return result?.count ?? 0;
  }

  /**
   * Get total execution time for agent
   */
  getTotalExecutionTime(agentId: string): number {
    const sql = `
      SELECT SUM(duration_ms) as total
      FROM ${this.config.tableName}
      WHERE agent_id = ? AND duration_ms IS NOT NULL
    `;

    const result = this.db.queryOne<{ total: number | null }>(sql, [agentId]);
    return result?.total ?? 0;
  }

  /**
   * Get total execution time for task
   */
  getTaskExecutionTime(taskId: string): number {
    const sql = `
      SELECT SUM(duration_ms) as total
      FROM ${this.config.tableName}
      WHERE task_id = ? AND duration_ms IS NOT NULL
    `;

    const result = this.db.queryOne<{ total: number | null }>(sql, [taskId]);
    return result?.total ?? 0;
  }
}
