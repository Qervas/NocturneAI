/**
 * Project Repository
 *
 * Repository for managing project persistence with specialized query methods.
 *
 * Features:
 * - CRUD operations for projects
 * - Find by name/path
 * - Language/framework filtering
 * - Project statistics
 * - Metadata management
 */

import { BaseRepository } from "./BaseRepository.js";
import type { DatabaseWrapper } from "../Database.js";

/**
 * Project Entity
 */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  path: string;
  language: string | null;
  framework: string | null;
  created_at: number;
  updated_at: number;
  metadata: string | null; // JSON string
}

/**
 * Project Create Input
 */
export interface ProjectCreateInput {
  id: string;
  name: string;
  description?: string;
  path: string;
  language?: string;
  framework?: string;
  metadata?: Record<string, any>;
}

/**
 * Project Update Input
 */
export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  path?: string;
  language?: string;
  framework?: string;
  metadata?: Record<string, any>;
}

/**
 * Project Statistics
 */
export interface ProjectStats {
  total_agents: number;
  total_tasks: number;
  total_workflows: number;
  tasks_by_status: Record<string, number>;
  agents_by_state: Record<string, number>;
}

/**
 * Project Repository
 */
export class ProjectRepository extends BaseRepository<Project> {
  constructor(db: DatabaseWrapper) {
    super(db, {
      tableName: "projects",
      primaryKey: "id",
      softDelete: false,
    });
  }

  /**
   * Create a new project
   */
  createProject(input: ProjectCreateInput): Project {
    const data: Partial<Project> = {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      path: input.path,
      language: input.language ?? null,
      framework: input.framework ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    };

    return this.create(data);
  }

  /**
   * Update a project
   */
  updateProject(id: string, input: ProjectUpdateInput): Project | null {
    const updates: Partial<Project> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.path !== undefined) updates.path = input.path;
    if (input.language !== undefined) updates.language = input.language;
    if (input.framework !== undefined) updates.framework = input.framework;
    if (input.metadata !== undefined)
      updates.metadata = JSON.stringify(input.metadata);

    return this.update(id, updates);
  }

  /**
   * Find project by name
   */
  findByName(name: string): Project | null {
    return this.findOne({
      where: { name },
    });
  }

  /**
   * Find project by path
   */
  findByPath(path: string): Project | null {
    return this.findOne({
      where: { path },
    });
  }

  /**
   * Find projects by language
   */
  findByLanguage(
    language: string,
    options?: { limit?: number; offset?: number },
  ): Project[] {
    return this.findAll({
      where: { language },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "name",
      order: "ASC",
    });
  }

  /**
   * Find projects by framework
   */
  findByFramework(
    framework: string,
    options?: { limit?: number; offset?: number },
  ): Project[] {
    return this.findAll({
      where: { framework },
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "name",
      order: "ASC",
    });
  }

  /**
   * Search projects by name pattern
   */
  searchByName(
    pattern: string,
    options?: { limit?: number; offset?: number },
  ): Project[] {
    const sql = `
      SELECT * FROM ${this.config.tableName}
      WHERE name LIKE ?
      ORDER BY name ASC
      ${options?.limit ? `LIMIT ${options.limit}` : ""}
      ${options?.offset ? `OFFSET ${options.offset}` : ""}
    `;

    return this.db.query<Project>(sql, [`%${pattern}%`]);
  }

  /**
   * Get all unique languages
   */
  getLanguages(): string[] {
    const sql = `
      SELECT DISTINCT language
      FROM ${this.config.tableName}
      WHERE language IS NOT NULL
      ORDER BY language ASC
    `;

    const results = this.db.query<{ language: string }>(sql, []);
    return results.map((row) => row.language);
  }

  /**
   * Get all unique frameworks
   */
  getFrameworks(): string[] {
    const sql = `
      SELECT DISTINCT framework
      FROM ${this.config.tableName}
      WHERE framework IS NOT NULL
      ORDER BY framework ASC
    `;

    const results = this.db.query<{ framework: string }>(sql, []);
    return results.map((row) => row.framework);
  }

  /**
   * Get project statistics
   */
  getProjectStats(projectId: string): ProjectStats | null {
    const project = this.findById(projectId);
    if (!project) return null;

    // Count agents
    const agentCountSql = `
      SELECT COUNT(*) as count
      FROM agents
      WHERE project_id = ?
    `;
    const agentCountResult = this.db.queryOne<{ count: number }>(
      agentCountSql,
      [projectId],
    );
    const total_agents = agentCountResult?.count ?? 0;

    // Count tasks
    const taskCountSql = `
      SELECT COUNT(*) as count
      FROM tasks
      WHERE project_id = ?
    `;
    const taskCountResult = this.db.queryOne<{ count: number }>(taskCountSql, [
      projectId,
    ]);
    const total_tasks = taskCountResult?.count ?? 0;

    // Count workflows
    const workflowCountSql = `
      SELECT COUNT(*) as count
      FROM workflows
      WHERE project_id = ?
    `;
    const workflowCountResult = this.db.queryOne<{ count: number }>(
      workflowCountSql,
      [projectId],
    );
    const total_workflows = workflowCountResult?.count ?? 0;

    // Tasks by status
    const taskStatusSql = `
      SELECT status, COUNT(*) as count
      FROM tasks
      WHERE project_id = ?
      GROUP BY status
    `;
    const taskStatusResults = this.db.query<{ status: string; count: number }>(
      taskStatusSql,
      [projectId],
    );
    const tasks_by_status: Record<string, number> = {};
    for (const row of taskStatusResults) {
      tasks_by_status[row.status] = row.count;
    }

    // Agents by state
    const agentStateSql = `
      SELECT state, COUNT(*) as count
      FROM agents
      WHERE project_id = ?
      GROUP BY state
    `;
    const agentStateResults = this.db.query<{ state: string; count: number }>(
      agentStateSql,
      [projectId],
    );
    const agents_by_state: Record<string, number> = {};
    for (const row of agentStateResults) {
      agents_by_state[row.state] = row.count;
    }

    return {
      total_agents,
      total_tasks,
      total_workflows,
      tasks_by_status,
      agents_by_state,
    };
  }

  /**
   * Get project with parsed metadata
   */
  getProjectWithParsedMetadata(projectId: string):
    | (Project & {
        metadataParsed?: Record<string, any>;
      })
    | null {
    const project = this.findById(projectId);
    if (!project) return null;

    return {
      ...project,
      metadataParsed: project.metadata
        ? JSON.parse(project.metadata)
        : undefined,
    };
  }

  /**
   * Check if project path exists
   */
  pathExists(path: string): boolean {
    return this.findByPath(path) !== null;
  }

  /**
   * Check if project name exists
   */
  nameExists(name: string): boolean {
    return this.findByName(name) !== null;
  }

  /**
   * Get recently updated projects
   */
  getRecentlyUpdated(limit: number = 10): Project[] {
    return this.findAll({
      limit,
      orderBy: "updated_at",
      order: "DESC",
    });
  }

  /**
   * Get recently created projects
   */
  getRecentlyCreated(limit: number = 10): Project[] {
    return this.findAll({
      limit,
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Count projects by language
   */
  countByLanguage(): Record<string, number> {
    const sql = `
      SELECT language, COUNT(*) as count
      FROM ${this.config.tableName}
      WHERE language IS NOT NULL
      GROUP BY language
      ORDER BY count DESC
    `;

    const results = this.db.query<{ language: string; count: number }>(sql, []);
    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.language] = row.count;
    }
    return counts;
  }

  /**
   * Count projects by framework
   */
  countByFramework(): Record<string, number> {
    const sql = `
      SELECT framework, COUNT(*) as count
      FROM ${this.config.tableName}
      WHERE framework IS NOT NULL
      GROUP BY framework
      ORDER BY count DESC
    `;

    const results = this.db.query<{ framework: string; count: number }>(
      sql,
      [],
    );
    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.framework] = row.count;
    }
    return counts;
  }

  /**
   * Delete project and cascade related data
   */
  deleteProjectCascade(projectId: string): boolean {
    return this.db.transaction(() => {
      // Delete related agents
      this.db.execute("DELETE FROM agents WHERE project_id = ?", [projectId]);

      // Delete related tasks
      this.db.execute("DELETE FROM tasks WHERE project_id = ?", [projectId]);

      // Delete related workflows
      this.db.execute("DELETE FROM workflows WHERE project_id = ?", [
        projectId,
      ]);

      // Delete related sessions
      this.db.execute("DELETE FROM sessions WHERE project_id = ?", [projectId]);

      // Delete the project
      return this.delete(projectId);
    });
  }
}
