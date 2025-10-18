/**
 * Initial Database Migration
 *
 * Creates the core schema for NocturneAI:
 * - agents: AI agent definitions and state
 * - tasks: Task management and tracking
 * - actions: Action history and execution logs
 * - projects: Project metadata and configuration
 * - workflows: Workflow definitions and execution
 * - sessions: User session data
 * - memories: Agent memory storage
 */

import type { Migration } from "../Database.js";

export const initialMigration: Migration = {
  version: 1,
  name: "initial_schema",

  up: (db) => {
    // Projects table
    db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        path TEXT NOT NULL,
        language TEXT,
        framework TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT
      )
    `);

    db.execute(`
      CREATE INDEX idx_projects_name ON projects(name);
    `);

    db.execute(`
      CREATE INDEX idx_projects_path ON projects(path);
    `);

    // Agents table
    db.execute(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        type TEXT NOT NULL,
        project_id TEXT,
        state TEXT NOT NULL DEFAULT 'idle',
        config TEXT,
        capabilities TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_active_at INTEGER,
        metadata TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    db.execute(`
      CREATE INDEX idx_agents_name ON agents(name);
    `);

    db.execute(`
      CREATE INDEX idx_agents_role ON agents(role);
    `);

    db.execute(`
      CREATE INDEX idx_agents_project ON agents(project_id);
    `);

    db.execute(`
      CREATE INDEX idx_agents_state ON agents(state);
    `);

    // Tasks table
    db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER NOT NULL DEFAULT 0,
        agent_id TEXT,
        project_id TEXT,
        parent_task_id TEXT,
        dependencies TEXT,
        input TEXT,
        output TEXT,
        error TEXT,
        started_at INTEGER,
        completed_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    db.execute(`
      CREATE INDEX idx_tasks_agent ON tasks(agent_id);
    `);

    db.execute(`
      CREATE INDEX idx_tasks_project ON tasks(project_id);
    `);

    db.execute(`
      CREATE INDEX idx_tasks_status ON tasks(status);
    `);

    db.execute(`
      CREATE INDEX idx_tasks_priority ON tasks(priority);
    `);

    db.execute(`
      CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
    `);

    db.execute(`
      CREATE INDEX idx_tasks_created ON tasks(created_at);
    `);

    // Actions table
    db.execute(`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        input TEXT,
        output TEXT,
        success INTEGER NOT NULL,
        error TEXT,
        duration_ms INTEGER,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        metadata TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      )
    `);

    db.execute(`
      CREATE INDEX idx_actions_task ON actions(task_id);
    `);

    db.execute(`
      CREATE INDEX idx_actions_agent ON actions(agent_id);
    `);

    db.execute(`
      CREATE INDEX idx_actions_type ON actions(type);
    `);

    db.execute(`
      CREATE INDEX idx_actions_started ON actions(started_at);
    `);

    // Workflows table
    db.execute(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        project_id TEXT,
        definition TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        version INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    db.execute(`
      CREATE INDEX idx_workflows_name ON workflows(name);
    `);

    db.execute(`
      CREATE INDEX idx_workflows_project ON workflows(project_id);
    `);

    db.execute(`
      CREATE INDEX idx_workflows_status ON workflows(status);
    `);

    // Workflow executions table
    db.execute(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        input TEXT,
        output TEXT,
        error TEXT,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        metadata TEXT,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      )
    `);

    db.execute(`
      CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
    `);

    db.execute(`
      CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
    `);

    db.execute(`
      CREATE INDEX idx_workflow_executions_started ON workflow_executions(started_at);
    `);

    // Sessions table
    db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        project_id TEXT,
        agent_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        context TEXT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        last_activity_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
      )
    `);

    db.execute(`
      CREATE INDEX idx_sessions_user ON sessions(user_id);
    `);

    db.execute(`
      CREATE INDEX idx_sessions_project ON sessions(project_id);
    `);

    db.execute(`
      CREATE INDEX idx_sessions_agent ON sessions(agent_id);
    `);

    db.execute(`
      CREATE INDEX idx_sessions_status ON sessions(status);
    `);

    db.execute(`
      CREATE INDEX idx_sessions_started ON sessions(started_at);
    `);

    // Memories table
    db.execute(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        session_id TEXT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        importance REAL NOT NULL DEFAULT 0.5,
        access_count INTEGER NOT NULL DEFAULT 0,
        last_accessed_at INTEGER,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        metadata TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    db.execute(`
      CREATE INDEX idx_memories_agent ON memories(agent_id);
    `);

    db.execute(`
      CREATE INDEX idx_memories_session ON memories(session_id);
    `);

    db.execute(`
      CREATE INDEX idx_memories_type ON memories(type);
    `);

    db.execute(`
      CREATE INDEX idx_memories_importance ON memories(importance);
    `);

    db.execute(`
      CREATE INDEX idx_memories_created ON memories(created_at);
    `);

    db.execute(`
      CREATE INDEX idx_memories_accessed ON memories(last_accessed_at);
    `);

    // Memory relationships table (for associative memory)
    db.execute(`
      CREATE TABLE IF NOT EXISTS memory_relationships (
        id TEXT PRIMARY KEY,
        source_memory_id TEXT NOT NULL,
        target_memory_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        strength REAL NOT NULL DEFAULT 1.0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (source_memory_id) REFERENCES memories(id) ON DELETE CASCADE,
        FOREIGN KEY (target_memory_id) REFERENCES memories(id) ON DELETE CASCADE
      )
    `);

    db.execute(`
      CREATE INDEX idx_memory_relationships_source ON memory_relationships(source_memory_id);
    `);

    db.execute(`
      CREATE INDEX idx_memory_relationships_target ON memory_relationships(target_memory_id);
    `);

    db.execute(`
      CREATE INDEX idx_memory_relationships_type ON memory_relationships(relationship_type);
    `);

    // Tool usage table
    db.execute(`
      CREATE TABLE IF NOT EXISTS tool_usage (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        task_id TEXT,
        tool_name TEXT NOT NULL,
        input TEXT,
        output TEXT,
        success INTEGER NOT NULL,
        error TEXT,
        duration_ms INTEGER,
        executed_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    db.execute(`
      CREATE INDEX idx_tool_usage_agent ON tool_usage(agent_id);
    `);

    db.execute(`
      CREATE INDEX idx_tool_usage_task ON tool_usage(task_id);
    `);

    db.execute(`
      CREATE INDEX idx_tool_usage_tool ON tool_usage(tool_name);
    `);

    db.execute(`
      CREATE INDEX idx_tool_usage_executed ON tool_usage(executed_at);
    `);

    // Configuration table
    db.execute(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        updated_at INTEGER NOT NULL
      )
    `);

    console.log("Initial schema created successfully");
  },

  down: (db) => {
    // Drop tables in reverse order (respecting foreign key constraints)
    db.execute("DROP TABLE IF EXISTS config");
    db.execute("DROP TABLE IF EXISTS tool_usage");
    db.execute("DROP TABLE IF EXISTS memory_relationships");
    db.execute("DROP TABLE IF EXISTS memories");
    db.execute("DROP TABLE IF EXISTS sessions");
    db.execute("DROP TABLE IF EXISTS workflow_executions");
    db.execute("DROP TABLE IF EXISTS workflows");
    db.execute("DROP TABLE IF EXISTS actions");
    db.execute("DROP TABLE IF EXISTS tasks");
    db.execute("DROP TABLE IF EXISTS agents");
    db.execute("DROP TABLE IF EXISTS projects");

    console.log("Initial schema dropped successfully");
  },
};
