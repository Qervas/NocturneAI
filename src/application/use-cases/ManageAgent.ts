/**
 * Manage Agent Use Case
 *
 * High-level use case for agent CRUD operations and management.
 *
 * Features:
 * - Create agents with validation
 * - Update agent configuration
 * - Delete/stop agents
 * - List and filter agents
 * - Agent state management
 */

import type { AgentService } from "../services/AgentService.js";
import type { Agent, AgentState, AgentStats } from "../services/Agent.js";
import type { AgentFactory } from "../factories/AgentFactory.js";
import type { AgentConfig } from "../../infrastructure/config/AgentConfigParser.js";

/**
 * Create Agent Input
 */
export interface CreateAgentInput {
  /** Agent configuration */
  config?: AgentConfig;

  /** Agent role (shortcut for creating by role) */
  role?: "coder" | "reviewer" | "tester" | "architect" | "researcher" | "planner";

  /** Agent name */
  name?: string;

  /** Agent type */
  type?: "autonomous" | "interactive" | "reactive" | "proactive" | "collaborative";

  /** Enable logging */
  enableLogging?: boolean;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Update Agent Input
 */
export interface UpdateAgentInput {
  /** Agent ID */
  agentId: string;

  /** New name */
  name?: string;

  /** New system prompt */
  systemPrompt?: string;

  /** Update execution mode */
  mode?: "autonomous" | "interactive" | "step";

  /** Enable/disable logging */
  enableLogging?: boolean;

  /** Add tools */
  addTools?: string[];

  /** Remove tools */
  removeTools?: string[];

  /** Clear context */
  clearContext?: boolean;
}

/**
 * Delete Agent Input
 */
export interface DeleteAgentInput {
  /** Agent ID */
  agentId: string;

  /** Whether to force delete (stop if running) */
  force?: boolean;
}

/**
 * List Agents Input
 */
export interface ListAgentsInput {
  /** Filter by state */
  state?: AgentState;

  /** Filter by name pattern */
  namePattern?: string;

  /** Filter by role */
  role?: string;

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort by */
  sortBy?: "name" | "createdAt" | "tasksCompleted" | "uptime";

  /** Sort order */
  sortOrder?: "asc" | "desc";
}

/**
 * Agent Info Output
 */
export interface AgentInfoOutput {
  /** Agent ID */
  id: string;

  /** Agent name */
  name: string;

  /** Agent state */
  state: AgentState;

  /** Agent role */
  role?: string;

  /** Agent type */
  type?: string;

  /** Number of tools */
  toolCount: number;

  /** Number of queued tasks */
  queuedTasks: number;

  /** Statistics */
  stats: AgentStats;

  /** Created at */
  createdAt?: number;

  /** Last active */
  lastActive?: number;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Manage Agent Output
 */
export interface ManageAgentOutput {
  /** Whether operation was successful */
  success: boolean;

  /** Operation type */
  operation: "create" | "update" | "delete" | "list" | "get";

  /** Agent info (for create, update, get operations) */
  agent?: AgentInfoOutput;

  /** List of agents (for list operation) */
  agents?: AgentInfoOutput[];

  /** Total count (for list operation) */
  totalCount?: number;

  /** Error message if failed */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Manage Agent Use Case
 */
export class ManageAgent {
  private agentService: AgentService;
  private agentFactory: AgentFactory;

  constructor(agentService: AgentService, agentFactory: AgentFactory) {
    this.agentService = agentService;
    this.agentFactory = agentFactory;
  }

  /**
   * Create a new agent
   */
  async createAgent(input: CreateAgentInput): Promise<ManageAgentOutput> {
    try {
      let agent: Agent;

      // Create by role (shortcut)
      if (input.role) {
        agent = await this.agentService.createAgentByRole(input.role, {
          name: input.name || `${input.role}-${Date.now()}`,
          metadata: input.metadata,
        });
      }
      // Create with custom config
      else if (input.config) {
        agent = await this.agentService.createAgent(input.config, {
          name: input.name,
          metadata: input.metadata,
        });
      }
      // Create with defaults
      else {
        const defaultConfig: AgentConfig = {
          id: `agent-${Date.now()}`,
          name: input.name || `agent-${Date.now()}`,
          role: "custom",
          type: input.type || "autonomous",
        };
        agent = await this.agentService.createAgent(defaultConfig, {
          metadata: input.metadata,
        });
      }

      return {
        success: true,
        operation: "create",
        agent: this.getAgentInfo(agent),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        operation: "create",
        error: errorMessage,
      };
    }
  }

  /**
   * Update an existing agent
   */
  async updateAgent(input: UpdateAgentInput): Promise<ManageAgentOutput> {
    try {
      const agent = this.agentService.getAgent(input.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${input.agentId}`);
      }

      // Update mode
      if (input.mode) {
        agent.setMode(input.mode);
      }

      // Add tools
      if (input.addTools && input.addTools.length > 0) {
        const toolFactory = this.agentFactory.getToolFactory();
        await toolFactory.initialize();

        for (const toolName of input.addTools) {
          const tool = toolFactory.getTool(toolName);
          if (tool) {
            agent.addTool(tool);
          }
        }
      }

      // Remove tools
      if (input.removeTools && input.removeTools.length > 0) {
        for (const toolName of input.removeTools) {
          agent.removeTool(toolName);
        }
      }

      // Clear context
      if (input.clearContext) {
        await agent.clearContext();
      }

      return {
        success: true,
        operation: "update",
        agent: this.getAgentInfo(agent),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        operation: "update",
        error: errorMessage,
      };
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(input: DeleteAgentInput): Promise<ManageAgentOutput> {
    try {
      const agent = this.agentService.getAgent(input.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${input.agentId}`);
      }

      // Check if agent is running
      const state = agent.getState();
      if ((state === "thinking" || state === "acting") && !input.force) {
        throw new Error(
          "Agent is currently running. Set force=true to stop and delete.",
        );
      }

      // Stop agent if running
      if (state !== "stopped") {
        this.agentService.stopAgent(input.agentId);
      }

      // Remove agent
      const removed = this.agentService.removeAgent(input.agentId);
      if (!removed) {
        throw new Error(`Failed to remove agent: ${input.agentId}`);
      }

      return {
        success: true,
        operation: "delete",
        metadata: {
          agentId: input.agentId,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        operation: "delete",
        error: errorMessage,
      };
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<ManageAgentOutput> {
    try {
      const agent = this.agentService.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      return {
        success: true,
        operation: "get",
        agent: this.getAgentInfo(agent),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        operation: "get",
        error: errorMessage,
      };
    }
  }

  /**
   * List agents with filtering and pagination
   */
  async listAgents(input: ListAgentsInput = {}): Promise<ManageAgentOutput> {
    try {
      let agents = this.agentService.getAllAgents();

      // Filter by state
      if (input.state) {
        agents = agents.filter((agent) => agent.getState() === input.state);
      }

      // Filter by name pattern
      if (input.namePattern) {
        const pattern = new RegExp(input.namePattern, "i");
        agents = agents.filter((agent) =>
          pattern.test(agent.getInfo().name),
        );
      }

      // Filter by role
      if (input.role) {
        agents = agents.filter(
          (agent) => agent.getInfo().config.role === input.role,
        );
      }

      // Sort
      if (input.sortBy) {
        agents = this.sortAgents(agents, input.sortBy, input.sortOrder || "asc");
      }

      const totalCount = agents.length;

      // Pagination
      const offset = input.offset || 0;
      const limit = input.limit || totalCount;
      agents = agents.slice(offset, offset + limit);

      // Convert to output format
      const agentInfos = agents.map((agent) => this.getAgentInfo(agent));

      return {
        success: true,
        operation: "list",
        agents: agentInfos,
        totalCount,
        metadata: {
          offset,
          limit,
          returned: agentInfos.length,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        operation: "list",
        error: errorMessage,
      };
    }
  }

  /**
   * Pause an agent
   */
  async pauseAgent(agentId: string): Promise<ManageAgentOutput> {
    try {
      this.agentService.pauseAgent(agentId);
      const agent = this.agentService.getAgent(agentId);

      return {
        success: true,
        operation: "update",
        agent: agent ? this.getAgentInfo(agent) : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        operation: "update",
        error: errorMessage,
      };
    }
  }

  /**
   * Resume an agent
   */
  async resumeAgent(agentId: string): Promise<ManageAgentOutput> {
    try {
      await this.agentService.resumeAgent(agentId);
      const agent = this.agentService.getAgent(agentId);

      return {
        success: true,
        operation: "update",
        agent: agent ? this.getAgentInfo(agent) : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        operation: "update",
        error: errorMessage,
      };
    }
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<ManageAgentOutput> {
    try {
      this.agentService.stopAgent(agentId);
      const agent = this.agentService.getAgent(agentId);

      return {
        success: true,
        operation: "update",
        agent: agent ? this.getAgentInfo(agent) : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        operation: "update",
        error: errorMessage,
      };
    }
  }

  /**
   * Get agent information
   */
  private getAgentInfo(agent: Agent): AgentInfoOutput {
    const info = agent.getInfo();
    const stats = agent.getStats();

    return {
      id: info.id,
      name: info.name,
      state: info.state,
      role: info.config.role,
      type: info.config.type,
      toolCount: info.toolCount,
      queuedTasks: info.queuedTasks,
      stats,
    };
  }

  /**
   * Sort agents
   */
  private sortAgents(
    agents: Agent[],
    sortBy: string,
    sortOrder: "asc" | "desc",
  ): Agent[] {
    const multiplier = sortOrder === "asc" ? 1 : -1;

    return agents.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.getInfo().name;
          bValue = b.getInfo().name;
          break;
        case "tasksCompleted":
          aValue = a.getStats().tasksCompleted;
          bValue = b.getStats().tasksCompleted;
          break;
        case "uptime":
          aValue = a.getStats().uptime;
          bValue = b.getStats().uptime;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return -1 * multiplier;
      if (aValue > bValue) return 1 * multiplier;
      return 0;
    });
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return this.agentService.getServiceStats();
  }
}
