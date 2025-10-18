/**
 * Agent Repository
 *
 * Repository for managing agent persistence with specialized query methods.
 *
 * Features:
 * - CRUD operations for agents
 * - Find by project
 * - Find by role/type
 * - State management
 * - Activity tracking
 */

import { BaseRepository } from "./BaseRepository.js";
import type { DatabaseWrapper } from "../Database.js";

/**
 * Agent Entity
 */
export interface Agent {
  id: string;
  name: string;
  role: string;
  type: string;
  project_id: string | null;
  state: AgentState;
  config: string | null; // JSON string
  capabilities: string | null; // JSON string
  created_at: number;
  updated_at: number;
  last_active_at: number | null;
  metadata: string | null; // JSON string
}

/**
 * Agent State
 */
export type AgentState = "idle" | "busy" | "paused" | "error" | "terminated";

/**
 * Agent Create Input
 */
export interface AgentCreateInput {
  id: string;
  name: string;
  role: string;
  type: string;
  project_id?: string | null;
  state?: AgentState;
  config?: Record<string, any>;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

/**
 * Agent Update Input
 */
export interface AgentUpdateInput {
  name?: string;
  role?: string;
  type?: string;
  project_id?: string | null;
  state?: AgentState;
  config?: Record<string, any>;
  capabilities?: string[];
  last_active_at?: number;
  metadata?: Record<string, any>;
}

/**
 * Agent Repository
 */
export class AgentRepository extends BaseRepository<Agent> {
  constructor(db: DatabaseWrapper) {
    super(db, {
      tableName: "agents",
      primaryKey: "id",
      softDelete: false,
    });
  }

  /**
   * Create a new agent
   */
  createAgent(input: AgentCreateInput): Agent {
    const data: Partial<Agent> = {
      id: input.id,
      name: input.name,
      role: input.role,
      type: input.type,
      project_id: input.project_id ?? null,
      state: input.state ?? "idle",
      config: input.config ? JSON.stringify(input.config) : null,
      capabilities: input.capabilities ? JSON.stringify(input.capabilities) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      last_active_at: null,
    };

    return this.create(data);
  }

  /**
   * Update an agent
   */
  updateAgent(id: string, input: AgentUpdateInput): Agent | null {
    const data: Partial<Agent> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.role !== undefined) data.role = input.role;
    if (input.type !== undefined) data.type = input.type;
    if (input.project_id !== undefined) data.project_id = input.project_id;
    if (input.state !== undefined) data.state = input.state;
    if (input.last_active_at !== undefined) data.last_active_at = input.last_active_at;

    if (input.config !== undefined) {
      data.config = JSON.stringify(input.config);
    }

    if (input.capabilities !== undefined) {
      data.capabilities = JSON.stringify(input.capabilities);
    }

    if (input.metadata !== undefined) {
      data.metadata = JSON.stringify(input.metadata);
    }

    return this.update(id, data);
  }

  /**
   * Find agents by project
   */
  findByProject(projectId: string): Agent[] {
    return this.findAll({
      where: { project_id: projectId },
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find agents by role
   */
  findByRole(role: string): Agent[] {
    return this.findAll({
      where: { role },
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find agents by type
   */
  findByType(type: string): Agent[] {
    return this.findAll({
      where: { type },
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find agents by state
   */
  findByState(state: AgentState): Agent[] {
    return this.findAll({
      where: { state },
      orderBy: "last_active_at",
      order: "DESC",
    });
  }

  /**
   * Find active agents (not terminated)
   */
  findActive(): Agent[] {
    const sql = `
      SELECT *
      FROM ${this.getTableName()}
      WHERE state != 'terminated'
      ORDER BY last_active_at DESC
    `;

    return this.getDatabase().query<Agent>(sql);
  }

  /**
   * Find idle agents
   */
  findIdle(): Agent[] {
    return this.findByState("idle");
  }

  /**
   * Find busy agents
   */
  findBusy(): Agent[] {
    return this.findByState("busy");
  }

  /**
   * Update agent state
   */
  updateState(id: string, state: AgentState): Agent | null {
    return this.updateAgent(id, {
      state,
      last_active_at: Date.now(),
    });
  }

  /**
   * Mark agent as active
   */
  markActive(id: string): Agent | null {
    return this.update(id, {
      last_active_at: Date.now(),
    });
  }

  /**
   * Get agents by last activity
   */
  findByLastActivity(sinceMs: number): Agent[] {
    const timestamp = Date.now() - sinceMs;

    const sql = `
      SELECT *
      FROM ${this.getTableName()}
      WHERE last_active_at >= ?
      ORDER BY last_active_at DESC
    `;

    return this.getDatabase().query<Agent>(sql, [timestamp]);
  }

  /**
   * Get agent statistics by project
   */
  getStatsByProject(projectId: string): {
    total: number;
    byState: Record<AgentState, number>;
    byRole: Record<string, number>;
  } {
    const agents = this.findByProject(projectId);

    const byState: Record<AgentState, number> = {
      idle: 0,
      busy: 0,
      paused: 0,
      error: 0,
      terminated: 0,
    };

    const byRole: Record<string, number> = {};

    agents.forEach((agent) => {
      byState[agent.state] = (byState[agent.state] || 0) + 1;
      byRole[agent.role] = (byRole[agent.role] || 0) + 1;
    });

    return {
      total: agents.length,
      byState,
      byRole,
    };
  }

  /**
   * Parse agent config
   */
  parseConfig(agent: Agent): Record<string, any> | null {
    if (!agent.config) return null;
    try {
      return JSON.parse(agent.config);
    } catch {
      return null;
    }
  }

  /**
   * Parse agent capabilities
   */
  parseCapabilities(agent: Agent): string[] | null {
    if (!agent.capabilities) return null;
    try {
      return JSON.parse(agent.capabilities);
    } catch {
      return null;
    }
  }

  /**
   * Parse agent metadata
   */
  parseMetadata(agent: Agent): Record<string, any> | null {
    if (!agent.metadata) return null;
    try {
      return JSON.parse(agent.metadata);
    } catch {
      return null;
    }
  }

  /**
   * Get agent with parsed fields
   */
  getAgentWithParsedFields(id: string): {
    agent: Agent;
    config: Record<string, any> | null;
    capabilities: string[] | null;
    metadata: Record<string, any> | null;
  } | null {
    const agent = this.findById(id);
    if (!agent) return null;

    return {
      agent,
      config: this.parseConfig(agent),
      capabilities: this.parseCapabilities(agent),
      metadata: this.parseMetadata(agent),
    };
  }

  /**
   * Delete agents by project
   */
  deleteByProject(projectId: string): number {
    return this.deleteMany({ project_id: projectId });
  }

  /**
   * Count agents by state
   */
  countByState(state: AgentState): number {
    return this.count({ where: { state } });
  }

  /**
   * Count agents by project
   */
  countByProject(projectId: string): number {
    return this.count({ where: { project_id: projectId } });
  }
}
