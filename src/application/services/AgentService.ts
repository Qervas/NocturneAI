/**
 * Agent Service
 *
 * Service for managing agent lifecycle, orchestration, and coordination.
 *
 * Features:
 * - Create and manage multiple agents
 * - Agent lifecycle management (start, stop, pause, resume)
 * - Agent state tracking and persistence
 * - Agent CRUD operations
 * - Multi-agent coordination
 * - Agent event handling
 * - Resource management
 */

import type { AgentConfig } from "../../infrastructure/config/AgentConfigParser.js";
import { Agent, type AgentState, type AgentTask, type AgentStats, type AgentExecutionMode } from "./Agent.js";
import { AgentFactory, type AgentFactoryConfig, type AgentCreationOptions } from "../factories/AgentFactory.js";

/**
 * Agent Service Configuration
 */
export interface AgentServiceConfig {
  /** Agent factory instance */
  agentFactory?: AgentFactory;

  /** Maximum number of agents */
  maxAgents?: number;

  /** Enable auto-cleanup of stopped agents */
  autoCleanup?: boolean;

  /** Auto-cleanup interval (ms) */
  cleanupInterval?: number;

  /** Enable event logging */
  enableLogging?: boolean;

  /** Agent storage directory */
  storageDir?: string;
}

/**
 * Agent Registry Entry
 */
interface AgentEntry {
  /** Agent instance */
  agent: Agent;

  /** Agent creation timestamp */
  createdAt: number;

  /** Last active timestamp */
  lastActive: number;

  /** Agent metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent Event
 */
export interface AgentEvent {
  /** Event type */
  type: "created" | "started" | "stopped" | "paused" | "resumed" | "task_completed" | "error";

  /** Agent ID */
  agentId: string;

  /** Timestamp */
  timestamp: number;

  /** Event data */
  data?: Record<string, unknown>;
}

/**
 * Agent Service Statistics
 */
export interface AgentServiceStats {
  /** Total agents created */
  totalAgents: number;

  /** Active agents */
  activeAgents: number;

  /** Paused agents */
  pausedAgents: number;

  /** Stopped agents */
  stoppedAgents: number;

  /** Total tasks completed */
  totalTasksCompleted: number;

  /** Total tasks failed */
  totalTasksFailed: number;

  /** Service uptime (ms) */
  uptime: number;
}

/**
 * Agent Service
 */
export class AgentService {
  private config: AgentServiceConfig;
  private agentFactory: AgentFactory;
  private agents: Map<string, AgentEntry> = new Map();
  private events: AgentEvent[] = [];
  private cleanupTimer?: NodeJS.Timeout;
  private startTime: number = Date.now();

  constructor(config: AgentServiceConfig = {}) {
    this.config = {
      maxAgents: config.maxAgents || 100,
      autoCleanup: config.autoCleanup !== false,
      cleanupInterval: config.cleanupInterval || 300000, // 5 minutes
      enableLogging: config.enableLogging !== false,
      storageDir: config.storageDir,
    };

    // Initialize agent factory
    this.agentFactory = config.agentFactory || new AgentFactory();

    // Start auto-cleanup if enabled
    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(
    config: AgentConfig,
    options: AgentCreationOptions = {},
  ): Promise<Agent> {
    // Check max agents limit
    if (this.agents.size >= this.config.maxAgents!) {
      throw new Error(
        `Maximum number of agents (${this.config.maxAgents}) reached`,
      );
    }

    // Create agent dependencies using factory
    const dependencies = await this.agentFactory.createAgent(config, options);

    // Create agent instance
    const agent = new Agent({
      id: dependencies.config.id,
      name: dependencies.config.name,
      config: dependencies.config,
      llmClient: dependencies.llmClient,
      contextManager: dependencies.contextManager,
      tools: dependencies.tools,
      memoryStore: dependencies.memoryStore,
      vectorStore: dependencies.vectorStore,
      enableLogging: this.config.enableLogging,
    });

    // Register agent
    this.agents.set(agent.getInfo().id, {
      agent,
      createdAt: Date.now(),
      lastActive: Date.now(),
      metadata: options.metadata,
    });

    // Emit event
    this.emitEvent({
      type: "created",
      agentId: agent.getInfo().id,
      timestamp: Date.now(),
      data: { name: agent.getInfo().name },
    });

    this.log(`Created agent: ${agent.getInfo().name} (${agent.getInfo().id})`);

    return agent;
  }

  /**
   * Create agent by role
   */
  async createAgentByRole(
    role: "coder" | "reviewer" | "tester" | "architect" | "researcher" | "planner",
    options: AgentCreationOptions = {},
  ): Promise<Agent> {
    const dependencies = await this.agentFactory.createAgentByRole(role, options);

    const agent = new Agent({
      id: dependencies.config.id,
      name: dependencies.config.name,
      config: dependencies.config,
      llmClient: dependencies.llmClient,
      contextManager: dependencies.contextManager,
      tools: dependencies.tools,
      memoryStore: dependencies.memoryStore,
      vectorStore: dependencies.vectorStore,
      enableLogging: this.config.enableLogging,
    });

    this.agents.set(agent.getInfo().id, {
      agent,
      createdAt: Date.now(),
      lastActive: Date.now(),
      metadata: { role, ...options.metadata },
    });

    this.emitEvent({
      type: "created",
      agentId: agent.getInfo().id,
      timestamp: Date.now(),
      data: { name: agent.getInfo().name, role },
    });

    this.log(`Created ${role} agent: ${agent.getInfo().name}`);

    return agent;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    const entry = this.agents.get(agentId);
    if (entry) {
      entry.lastActive = Date.now();
    }
    return entry?.agent;
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values()).map((entry) => entry.agent);
  }

  /**
   * Get agents by state
   */
  getAgentsByState(state: AgentState): Agent[] {
    return this.getAllAgents().filter(
      (agent) => agent.getState() === state,
    );
  }

  /**
   * Execute task with agent
   */
  async executeTask(
    agentId: string,
    description: string,
    context?: Record<string, unknown>,
  ): Promise<AgentTask> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const task = await agent.executeTask(description, context);

    // Wait for task completion (polling)
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (task.status === "completed") {
          clearInterval(checkInterval);
          this.emitEvent({
            type: "task_completed",
            agentId,
            timestamp: Date.now(),
            data: { taskId: task.id },
          });
          resolve(task);
        } else if (task.status === "failed") {
          clearInterval(checkInterval);
          this.emitEvent({
            type: "error",
            agentId,
            timestamp: Date.now(),
            data: { taskId: task.id, error: "Task failed" },
          });
          reject(new Error("Task execution failed"));
        }
      }, 100);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (task.status === "in_progress") {
          reject(new Error("Task execution timeout"));
        }
      }, 300000);
    });
  }

  /**
   * Pause agent
   */
  pauseAgent(agentId: string): void {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.pause();

    this.emitEvent({
      type: "paused",
      agentId,
      timestamp: Date.now(),
    });

    this.log(`Paused agent: ${agentId}`);
  }

  /**
   * Resume agent
   */
  async resumeAgent(agentId: string): Promise<void> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    await agent.resume();

    this.emitEvent({
      type: "resumed",
      agentId,
      timestamp: Date.now(),
    });

    this.log(`Resumed agent: ${agentId}`);
  }

  /**
   * Stop agent
   */
  stopAgent(agentId: string): void {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.stop();

    this.emitEvent({
      type: "stopped",
      agentId,
      timestamp: Date.now(),
    });

    this.log(`Stopped agent: ${agentId}`);
  }

  /**
   * Stop all agents
   */
  stopAllAgents(): void {
    for (const [agentId, entry] of this.agents.entries()) {
      entry.agent.stop();
      this.emitEvent({
        type: "stopped",
        agentId,
        timestamp: Date.now(),
      });
    }

    this.log("Stopped all agents");
  }

  /**
   * Remove agent
   */
  removeAgent(agentId: string): boolean {
    const entry = this.agents.get(agentId);
    if (!entry) {
      return false;
    }

    // Stop agent first
    entry.agent.stop();

    // Remove from registry
    const removed = this.agents.delete(agentId);

    if (removed) {
      this.log(`Removed agent: ${agentId}`);
    }

    return removed;
  }

  /**
   * Clear all stopped agents
   */
  clearStoppedAgents(): number {
    let count = 0;
    const stoppedAgents = this.getAgentsByState("stopped");

    for (const agent of stoppedAgents) {
      const agentId = agent.getInfo().id;
      if (this.removeAgent(agentId)) {
        count++;
      }
    }

    if (count > 0) {
      this.log(`Cleared ${count} stopped agents`);
    }

    return count;
  }

  /**
   * Get agent statistics
   */
  getAgentStats(agentId: string): AgentStats | undefined {
    const agent = this.getAgent(agentId);
    return agent?.getStats();
  }

  /**
   * Get service statistics
   */
  getServiceStats(): AgentServiceStats {
    const allAgents = this.getAllAgents();
    const activeAgents = this.getAgentsByState("idle").length +
      this.getAgentsByState("thinking").length +
      this.getAgentsByState("acting").length +
      this.getAgentsByState("observing").length;
    const pausedAgents = this.getAgentsByState("paused").length;
    const stoppedAgents = this.getAgentsByState("stopped").length;

    let totalTasksCompleted = 0;
    let totalTasksFailed = 0;

    for (const agent of allAgents) {
      const stats = agent.getStats();
      totalTasksCompleted += stats.tasksCompleted;
      totalTasksFailed += stats.tasksFailed;
    }

    return {
      totalAgents: this.agents.size,
      activeAgents,
      pausedAgents,
      stoppedAgents,
      totalTasksCompleted,
      totalTasksFailed,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): AgentEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events for agent
   */
  getAgentEvents(agentId: string, count: number = 10): AgentEvent[] {
    return this.events
      .filter((event) => event.agentId === agentId)
      .slice(-count);
  }

  /**
   * Export all agent states
   */
  async exportAllStates(): Promise<Record<string, any>> {
    const states: Record<string, any> = {};

    for (const [agentId, entry] of this.agents.entries()) {
      states[agentId] = {
        ...(await entry.agent.exportState()),
        entry: {
          createdAt: entry.createdAt,
          lastActive: entry.lastActive,
          metadata: entry.metadata,
        },
      };
    }

    return states;
  }

  /**
   * Start auto-cleanup timer
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.clearStoppedAgents();
    }, this.config.cleanupInterval!);
  }

  /**
   * Stop auto-cleanup timer
   */
  private stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Emit event
   */
  private emitEvent(event: AgentEvent): void {
    this.events.push(event);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * Log message
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[AgentService] ${message}`);
    }
  }

  /**
   * Get agent factory
   */
  getAgentFactory(): AgentFactory {
    return this.agentFactory;
  }

  /**
   * Get service configuration
   */
  getConfig(): Readonly<AgentServiceConfig> {
    return { ...this.config };
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    this.log("Shutting down agent service...");

    // Stop auto-cleanup
    this.stopAutoCleanup();

    // Stop all agents
    this.stopAllAgents();

    // Clear agents
    this.agents.clear();

    this.log("Agent service shutdown complete");
  }
}
