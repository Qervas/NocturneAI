/**
 * Agent Coordinator
 *
 * Orchestrates multiple agents working together on complex tasks.
 * Handles agent communication, task distribution, conflict resolution,
 * and collaborative workflows.
 *
 * Features:
 * - Multi-agent task decomposition
 * - Agent-to-agent communication
 * - Resource sharing and conflict resolution
 * - Hierarchical and peer-to-peer coordination
 * - Progress aggregation and monitoring
 * - Dynamic agent allocation
 * - Fault tolerance and recovery
 *
 * @module AgentCoordinator
 */

import { EventEmitter } from "events";
// Generic agent interface - can be replaced with actual IAgent when available
interface IAgent {
  id: string;
  name?: string;
  [key: string]: any;
}

/**
 * Coordination strategy types
 */
export type CoordinationStrategy =
  | "hierarchical" // Leader-follower pattern
  | "peer-to-peer" // Equal collaboration
  | "pipeline" // Sequential processing
  | "parallel" // Independent parallel tasks
  | "consensus"; // Agreement-based decisions

/**
 * Agent role in coordination
 */
export type AgentRole =
  | "leader" // Orchestrates other agents
  | "worker" // Executes tasks
  | "specialist" // Domain expert
  | "reviewer" // Quality assurance
  | "coordinator"; // Facilitates communication

/**
 * Message types for agent communication
 */
export type MessageType =
  | "task" // Task assignment
  | "query" // Information request
  | "response" // Query response
  | "broadcast" // General announcement
  | "handoff" // Task delegation
  | "completion" // Task completion notification
  | "error"; // Error notification

/**
 * Inter-agent message
 */
export interface AgentMessage {
  id: string;
  from: string;
  to: string | string[];
  type: MessageType;
  content: string;
  data?: any;
  timestamp: number;
  correlationId?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

/**
 * Coordinated task
 */
export interface CoordinatedTask {
  id: string;
  description: string;
  assignedTo?: string;
  dependencies: string[];
  status: "pending" | "in-progress" | "completed" | "failed" | "blocked";
  priority: number;
  result?: any;
  error?: Error;
  startTime?: number;
  endTime?: number;
  retryCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Agent participation in coordination
 */
export interface AgentParticipant {
  agentId: string;
  agent: IAgent;
  role: AgentRole;
  capabilities: string[];
  availability: "available" | "busy" | "offline";
  currentTask?: string;
  tasksCompleted: number;
  tasksActive: number;
  tasksFailed: number;
  joinedAt: number;
  metadata?: Record<string, any>;
}

/**
 * Coordination session
 */
export interface CoordinationSession {
  id: string;
  name: string;
  strategy: CoordinationStrategy;
  participants: Map<string, AgentParticipant>;
  tasks: Map<string, CoordinatedTask>;
  messages: AgentMessage[];
  status: "active" | "paused" | "completed" | "failed";
  startTime: number;
  endTime?: number;
  goal: string;
  result?: any;
  metadata?: Record<string, any>;
}

/**
 * Coordination options
 */
export interface CoordinationOptions {
  strategy: CoordinationStrategy;
  maxAgents?: number;
  timeout?: number;
  retryAttempts?: number;
  enableFaultTolerance?: boolean;
  enableConflictResolution?: boolean;
  messageQueueSize?: number;
  taskPrioritization?: boolean;
}

/**
 * Agent Coordinator
 *
 * Manages multi-agent collaboration and orchestration.
 *
 * @example
 * ```typescript
 * const coordinator = new AgentCoordinator({
 *   strategy: 'hierarchical',
 *   maxAgents: 5,
 *   enableFaultTolerance: true
 * });
 *
 * // Create coordination session
 * const session = await coordinator.createSession(
 *   'code-review',
 *   'Review and improve codebase'
 * );
 *
 * // Add agents
 * await coordinator.addAgent(session.id, leaderAgent, 'leader');
 * await coordinator.addAgent(session.id, reviewerAgent, 'reviewer');
 * await coordinator.addAgent(session.id, workerAgent, 'worker');
 *
 * // Execute coordinated task
 * const result = await coordinator.execute(session.id, {
 *   description: 'Analyze and refactor code',
 *   decompose: true
 * });
 * ```
 */
export class AgentCoordinator extends EventEmitter {
  private sessions: Map<string, CoordinationSession>;
  private options: Required<CoordinationOptions>;
  private messageQueue: Map<string, AgentMessage[]>;
  private taskGraph: Map<string, Set<string>>;

  constructor(options: CoordinationOptions) {
    super();
    this.sessions = new Map();
    this.messageQueue = new Map();
    this.taskGraph = new Map();

    this.options = {
      maxAgents: 10,
      timeout: 300000,
      retryAttempts: 3,
      enableFaultTolerance: true,
      enableConflictResolution: true,
      messageQueueSize: 1000,
      taskPrioritization: true,
      ...options,
    };
  }

  /**
   * Create a new coordination session
   */
  async createSession(
    name: string,
    goal: string,
    strategy?: CoordinationStrategy,
  ): Promise<CoordinationSession> {
    const session: CoordinationSession = {
      id: this.generateId(),
      name,
      goal,
      strategy: strategy || this.options.strategy,
      participants: new Map(),
      tasks: new Map(),
      messages: [],
      status: "active",
      startTime: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.messageQueue.set(session.id, []);

    this.emit("session:created", session);
    return session;
  }

  /**
   * Add agent to coordination session
   */
  async addAgent(
    sessionId: string,
    agent: IAgent,
    role: AgentRole,
    capabilities?: string[],
  ): Promise<void> {
    const session = this.getSession(sessionId);

    if (session.participants.size >= this.options.maxAgents) {
      throw new Error(
        `Maximum number of agents (${this.options.maxAgents}) reached`,
      );
    }

    const participant: AgentParticipant = {
      agentId: agent.id,
      agent,
      role,
      capabilities: capabilities || [],
      availability: "available",
      tasksCompleted: 0,
      tasksActive: 0,
      tasksFailed: 0,
      joinedAt: Date.now(),
    };

    session.participants.set(agent.id, participant);

    this.emit("agent:joined", { sessionId, agentId: agent.id, role });

    // Announce new agent to others
    await this.broadcast(sessionId, {
      type: "broadcast",
      content: `Agent ${agent.id} joined as ${role}`,
      data: { agentId: agent.id, role },
    });
  }

  /**
   * Remove agent from session
   */
  async removeAgent(sessionId: string, agentId: string): Promise<void> {
    const session = this.getSession(sessionId);
    const participant = session.participants.get(agentId);

    if (!participant) {
      throw new Error(`Agent ${agentId} not found in session`);
    }

    // Reassign active tasks
    if (participant.currentTask) {
      await this.reassignTask(sessionId, participant.currentTask);
    }

    session.participants.delete(agentId);

    this.emit("agent:left", { sessionId, agentId });

    await this.broadcast(sessionId, {
      type: "broadcast",
      content: `Agent ${agentId} left the session`,
      data: { agentId },
    });
  }

  /**
   * Execute coordinated task
   */
  async execute(
    sessionId: string,
    options: {
      description: string;
      decompose?: boolean;
      maxParallel?: number;
      context?: any;
    },
  ): Promise<any> {
    const session = this.getSession(sessionId);

    this.emit("execution:started", { sessionId });

    try {
      let result: any;

      switch (session.strategy) {
        case "hierarchical":
          result = await this.executeHierarchical(session, options);
          break;
        case "peer-to-peer":
          result = await this.executePeerToPeer(session, options);
          break;
        case "pipeline":
          result = await this.executePipeline(session, options);
          break;
        case "parallel":
          result = await this.executeParallel(session, options);
          break;
        case "consensus":
          result = await this.executeConsensus(session, options);
          break;
        default:
          throw new Error(`Unknown strategy: ${session.strategy}`);
      }

      session.result = result;
      session.status = "completed";
      session.endTime = Date.now();

      this.emit("execution:completed", { sessionId, result });

      return result;
    } catch (error) {
      session.status = "failed";
      session.endTime = Date.now();

      this.emit("execution:failed", { sessionId, error });
      throw error;
    }
  }

  /**
   * Execute with hierarchical strategy (leader-follower)
   */
  private async executeHierarchical(
    session: CoordinationSession,
    options: { description: string; decompose?: boolean; context?: any },
  ): Promise<any> {
    // Find leader agent
    const leader = this.findAgentByRole(session, "leader");
    if (!leader) {
      throw new Error("No leader agent found for hierarchical coordination");
    }

    // Leader decomposes task
    const tasks = await this.decomposeTask(
      session,
      leader,
      options.description,
    );

    // Assign tasks to workers
    const workers = this.findAgentsByRole(session, "worker");
    const taskResults: any[] = [];

    for (const task of tasks) {
      const worker = this.selectBestAgent(session, workers, task);
      if (worker) {
        const result = await this.assignTask(session, worker, task);
        taskResults.push(result);
      }
    }

    // Leader aggregates results
    const finalResult = await this.aggregateResults(
      session,
      leader,
      taskResults,
    );

    return finalResult;
  }

  /**
   * Execute with peer-to-peer strategy
   */
  private async executePeerToPeer(
    session: CoordinationSession,
    options: { description: string; context?: any },
  ): Promise<any> {
    const agents = Array.from(session.participants.values());

    // All agents collaborate equally
    const proposals: any[] = [];

    for (const participant of agents) {
      const proposal = await this.requestProposal(
        session,
        participant,
        options.description,
      );
      proposals.push(proposal);
    }

    // Merge proposals through discussion
    const result = await this.mergeProposals(session, proposals);

    return result;
  }

  /**
   * Execute with pipeline strategy
   */
  private async executePipeline(
    session: CoordinationSession,
    options: { description: string; context?: any },
  ): Promise<any> {
    const agents = Array.from(session.participants.values());

    let result = options.context;

    // Process sequentially through pipeline
    for (const participant of agents) {
      result = await this.processStage(session, participant, result);
    }

    return result;
  }

  /**
   * Execute with parallel strategy
   */
  private async executeParallel(
    session: CoordinationSession,
    options: { description: string; maxParallel?: number; context?: any },
  ): Promise<any> {
    const agents = Array.from(session.participants.values());
    const maxParallel = options.maxParallel || agents.length;

    // Execute tasks in parallel
    const results = await Promise.all(
      agents
        .slice(0, maxParallel)
        .map((participant) =>
          this.executeIndependentTask(
            session,
            participant,
            options.description,
          ),
        ),
    );

    return results;
  }

  /**
   * Execute with consensus strategy
   */
  private async executeConsensus(
    session: CoordinationSession,
    options: { description: string; context?: any },
  ): Promise<any> {
    const agents = Array.from(session.participants.values());

    // Each agent provides a solution
    const solutions: any[] = [];
    for (const participant of agents) {
      const solution = await this.requestSolution(
        session,
        participant,
        options.description,
      );
      solutions.push(solution);
    }

    // Vote on best solution
    const consensus = await this.reachConsensus(session, solutions);

    return consensus;
  }

  /**
   * Send message between agents
   */
  async sendMessage(
    sessionId: string,
    from: string,
    to: string | string[],
    message: Partial<AgentMessage>,
  ): Promise<void> {
    const session = this.getSession(sessionId);
    const queue = this.messageQueue.get(sessionId) || [];

    const fullMessage: AgentMessage = {
      id: this.generateId(),
      from,
      to,
      type: message.type || "query",
      content: message.content || "",
      data: message.data,
      timestamp: Date.now(),
      correlationId: message.correlationId,
      priority: message.priority || "normal",
    };

    queue.push(fullMessage);
    session.messages.push(fullMessage);

    // Trim queue if too large
    if (queue.length > this.options.messageQueueSize) {
      queue.shift();
    }

    this.emit("message:sent", fullMessage);

    // Deliver to recipient(s)
    await this.deliverMessage(session, fullMessage);
  }

  /**
   * Broadcast message to all agents
   */
  async broadcast(
    sessionId: string,
    message: Partial<AgentMessage>,
  ): Promise<void> {
    const session = this.getSession(sessionId);
    const agentIds = Array.from(session.participants.keys());

    await this.sendMessage(sessionId, "system", agentIds, {
      ...message,
      type: "broadcast",
    });
  }

  /**
   * Get session by ID
   */
  private getSession(sessionId: string): CoordinationSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * Find agent by role
   */
  private findAgentByRole(
    session: CoordinationSession,
    role: AgentRole,
  ): AgentParticipant | undefined {
    return Array.from(session.participants.values()).find(
      (p) => p.role === role,
    );
  }

  /**
   * Find all agents by role
   */
  private findAgentsByRole(
    session: CoordinationSession,
    role: AgentRole,
  ): AgentParticipant[] {
    return Array.from(session.participants.values()).filter(
      (p) => p.role === role,
    );
  }

  /**
   * Decompose task into subtasks
   */
  private async decomposeTask(
    session: CoordinationSession,
    leader: AgentParticipant,
    description: string,
  ): Promise<CoordinatedTask[]> {
    // In a real implementation, this would use the leader agent's LLM
    // to intelligently decompose the task
    const taskId = this.generateId();
    const task: CoordinatedTask = {
      id: taskId,
      description,
      dependencies: [],
      status: "pending",
      priority: 1,
    };

    session.tasks.set(taskId, task);

    return [task]; // Simplified - would decompose into multiple subtasks
  }

  /**
   * Select best agent for task
   */
  private selectBestAgent(
    session: CoordinationSession,
    candidates: AgentParticipant[],
    _task: CoordinatedTask,
  ): AgentParticipant | undefined {
    // Simple selection: choose available agent with fewest active tasks
    return candidates
      .filter((a) => a.availability === "available")
      .sort((a, b) => a.tasksActive - b.tasksActive)[0];
  }

  /**
   * Assign task to agent
   */
  private async assignTask(
    session: CoordinationSession,
    agent: AgentParticipant,
    task: CoordinatedTask,
  ): Promise<any> {
    task.assignedTo = agent.agentId;
    task.status = "in-progress";
    task.startTime = Date.now();

    agent.currentTask = task.id;
    agent.tasksActive++;
    agent.availability = "busy";

    this.emit("task:assigned", {
      sessionId: session.id,
      agentId: agent.agentId,
      taskId: task.id,
    });

    try {
      // Execute task (simplified - would use agent's execute method)
      await this.sendMessage(session.id, "coordinator", agent.agentId, {
        type: "task",
        content: task.description,
        data: { taskId: task.id },
      });

      // Wait for completion (simplified)
      const result = await this.waitForTaskCompletion(session, task.id);

      task.status = "completed";
      task.endTime = Date.now();
      task.result = result;

      agent.tasksCompleted++;
      agent.tasksActive--;
      agent.currentTask = undefined;
      agent.availability = "available";

      this.emit("task:completed", {
        sessionId: session.id,
        taskId: task.id,
        result,
      });

      return result;
    } catch (error) {
      task.status = "failed";
      task.endTime = Date.now();
      task.error = error as Error;

      agent.tasksFailed++;
      agent.tasksActive--;
      agent.currentTask = undefined;
      agent.availability = "available";

      this.emit("task:failed", {
        sessionId: session.id,
        taskId: task.id,
        error,
      });

      if (
        this.options.enableFaultTolerance &&
        (task.retryCount || 0) < this.options.retryAttempts
      ) {
        task.retryCount = (task.retryCount || 0) + 1;
        return this.reassignTask(session.id, task.id);
      }

      throw error;
    }
  }

  /**
   * Reassign task to different agent
   */
  private async reassignTask(sessionId: string, taskId: string): Promise<any> {
    const session = this.getSession(sessionId);
    const task = session.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const workers = this.findAgentsByRole(session, "worker");
    const newAgent = this.selectBestAgent(session, workers, task);

    if (!newAgent) {
      throw new Error("No available agent for task reassignment");
    }

    return this.assignTask(session, newAgent, task);
  }

  /**
   * Wait for task completion
   */
  private async waitForTaskCompletion(
    session: CoordinationSession,
    _taskId: string,
  ): Promise<any> {
    // Simplified implementation - in real system would wait for actual agent response
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 100);
    });
  }

  /**
   * Aggregate results from multiple tasks
   */
  private async aggregateResults(
    _session: CoordinationSession,
    _leader: AgentParticipant,
    results: any[],
  ): Promise<any> {
    // In real implementation, leader agent would aggregate results intelligently
    return results;
  }

  /**
   * Request proposal from agent
   */
  private async requestProposal(
    _session: CoordinationSession,
    agent: AgentParticipant,
    description: string,
  ): Promise<any> {
    await this.sendMessage(session.id, "coordinator", agent.agentId, {
      type: "query",
      content: `Provide proposal for: ${description}`,
    });

    return { agentId: agent.agentId, proposal: "proposal-data" };
  }

  /**
   * Merge proposals from multiple agents
   */
  private async mergeProposals(
    _session: CoordinationSession,
    proposals: any[],
  ): Promise<any> {
    // In real implementation, would facilitate discussion and merge
    return proposals;
  }

  /**
   * Process pipeline stage
   */
  private async processStage(
    _session: CoordinationSession,
    agent: AgentParticipant,
    input: any,
  ): Promise<any> {
    await this.sendMessage(session.id, "coordinator", agent.agentId, {
      type: "task",
      content: "Process pipeline stage",
      data: input,
    });

    return input; // Simplified
  }

  /**
   * Execute independent task
   */
  private async executeIndependentTask(
    session: CoordinationSession,
    agent: AgentParticipant,
    description: string,
  ): Promise<any> {
    await this.sendMessage(session.id, "coordinator", agent.agentId, {
      type: "task",
      content: description,
    });

    return { agentId: agent.agentId, result: "task-result" };
  }

  /**
   * Request solution from agent
   */
  private async requestSolution(
    session: CoordinationSession,
    agent: AgentParticipant,
    description: string,
  ): Promise<any> {
    await this.sendMessage(session.id, "coordinator", agent.agentId, {
      type: "query",
      content: `Provide solution for: ${description}`,
    });

    return { agentId: agent.agentId, solution: "solution-data" };
  }

  /**
   * Reach consensus among agents
   */
  private async reachConsensus(
    _session: CoordinationSession,
    solutions: any[],
  ): Promise<any> {
    // In real implementation, would facilitate voting/discussion
    return solutions[0]; // Return first solution for now
  }

  /**
   * Deliver message to recipient
   */
  private async deliverMessage(
    session: CoordinationSession,
    message: AgentMessage,
  ): Promise<void> {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    for (const recipientId of recipients) {
      const participant = session.participants.get(recipientId);
      if (participant) {
        this.emit("message:delivered", {
          sessionId: session.id,
          message,
          recipientId,
        });
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all sessions
   */
  getSessions(): CoordinationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): CoordinationSession {
    return this.getSession(sessionId);
  }

  /**
   * Pause session
   */
  pauseSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    session.status = "paused";
    this.emit("session:paused", { sessionId });
  }

  /**
   * Resume session
   */
  resumeSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    session.status = "active";
    this.emit("session:resumed", { sessionId });
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);

    // Notify all participants
    await this.broadcast(sessionId, {
      type: "broadcast",
      content: "Session ending",
    });

    session.status = "completed";
    session.endTime = Date.now();

    this.emit("session:ended", { sessionId });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.sessions.clear();
    this.messageQueue.clear();
    this.taskGraph.clear();
    this.removeAllListeners();
  }
}

/**
 * Create agent coordinator
 *
 * @param options - Coordination options
 * @returns Agent coordinator instance
 */
export function createAgentCoordinator(
  options: CoordinationOptions,
): AgentCoordinator {
  return new AgentCoordinator(options);
}
