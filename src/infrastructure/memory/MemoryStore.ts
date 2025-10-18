/**
 * Memory Store
 *
 * Core memory storage and retrieval system for agents.
 *
 * Features:
 * - Short-term and long-term memory
 * - Memory importance scoring
 * - Automatic memory decay
 * - Access tracking
 * - Memory relationships
 * - Memory expiration
 * - Memory consolidation
 */

import type { DatabaseWrapper } from "../storage/Database.js";

/**
 * Memory Entity
 */
export interface Memory {
  id: string;
  agent_id: string;
  session_id: string | null;
  type: MemoryType;
  content: string;
  embedding: string | null; // JSON array of numbers
  importance: number; // 0-1
  access_count: number;
  last_accessed_at: number | null;
  created_at: number;
  expires_at: number | null;
  metadata: string | null; // JSON string
}

/**
 * Memory Type
 */
export type MemoryType =
  | "episodic" // Specific events and experiences
  | "semantic" // Facts and knowledge
  | "procedural" // How to do things
  | "working" // Temporary working memory
  | "conversation" // Conversation history
  | "observation" // Observations about the environment
  | "reflection" // Agent's reflections and insights
  | "goal" // Goals and intentions
  | "error" // Error memories for learning
  | "success"; // Success memories for reinforcement

/**
 * Memory Relationship
 */
export interface MemoryRelationship {
  id: string;
  source_memory_id: string;
  target_memory_id: string;
  relationship_type: RelationshipType;
  strength: number; // 0-1
  created_at: number;
}

/**
 * Relationship Type
 */
export type RelationshipType =
  | "causes" // A causes B
  | "enables" // A enables B
  | "conflicts" // A conflicts with B
  | "supports" // A supports B
  | "similar" // A is similar to B
  | "sequential" // A followed by B
  | "contextual"; // A provides context for B

/**
 * Memory Create Input
 */
export interface MemoryCreateInput {
  id: string;
  agent_id: string;
  session_id?: string | null;
  type: MemoryType;
  content: string;
  embedding?: number[] | null;
  importance?: number;
  expires_at?: number | null;
  metadata?: Record<string, any>;
}

/**
 * Memory Query Options
 */
export interface MemoryQueryOptions {
  agent_id: string;
  session_id?: string | null;
  types?: MemoryType[];
  min_importance?: number;
  limit?: number;
  offset?: number;
  include_expired?: boolean;
  sort_by?: "importance" | "created_at" | "access_count" | "last_accessed_at";
  sort_order?: "ASC" | "DESC";
}

/**
 * Memory Statistics
 */
export interface MemoryStats {
  total: number;
  by_type: Record<MemoryType, number>;
  avg_importance: number;
  avg_access_count: number;
  expired: number;
  working_memory_count: number;
  long_term_memory_count: number;
}

/**
 * Memory Store
 */
export class MemoryStore {
  private db: DatabaseWrapper;

  /**
   * Default memory decay rate (per day)
   */
  private static readonly DECAY_RATE = 0.05;

  /**
   * Working memory TTL (1 hour)
   */
  private static readonly WORKING_MEMORY_TTL = 3600 * 1000;

  /**
   * Minimum importance threshold for long-term storage
   */
  private static readonly MIN_IMPORTANCE = 0.3;

  constructor(db: DatabaseWrapper) {
    this.db = db;
  }

  /**
   * Store a new memory
   */
  store(input: MemoryCreateInput): Memory {
    const now = Date.now();
    const expires_at = this.calculateExpiration(input.type, input.expires_at);

    const memory: Partial<Memory> = {
      id: input.id,
      agent_id: input.agent_id,
      session_id: input.session_id ?? null,
      type: input.type,
      content: input.content,
      embedding: input.embedding ? JSON.stringify(input.embedding) : null,
      importance: input.importance ?? this.calculateInitialImportance(input.type),
      access_count: 0,
      last_accessed_at: null,
      created_at: now,
      expires_at,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    };

    const sql = `
      INSERT INTO memories (
        id, agent_id, session_id, type, content, embedding,
        importance, access_count, last_accessed_at, created_at,
        expires_at, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      memory.id,
      memory.agent_id,
      memory.session_id,
      memory.type,
      memory.content,
      memory.embedding,
      memory.importance,
      memory.access_count,
      memory.last_accessed_at,
      memory.created_at,
      memory.expires_at,
      memory.metadata,
    ]);

    return memory as Memory;
  }

  /**
   * Retrieve a memory by ID
   */
  retrieve(memoryId: string, agentId: string): Memory | null {
    const sql = `
      SELECT * FROM memories
      WHERE id = ? AND agent_id = ?
    `;

    const memory = this.db.queryOne<Memory>(sql, [memoryId, agentId]);

    if (memory) {
      this.updateAccessStats(memoryId);
      this.applyDecay(memory);
    }

    return memory;
  }

  /**
   * Query memories
   */
  query(options: MemoryQueryOptions): Memory[] {
    let sql = `SELECT * FROM memories WHERE agent_id = ?`;
    const params: any[] = [options.agent_id];

    if (options.session_id !== undefined) {
      if (options.session_id === null) {
        sql += ` AND session_id IS NULL`;
      } else {
        sql += ` AND session_id = ?`;
        params.push(options.session_id);
      }
    }

    if (options.types && options.types.length > 0) {
      sql += ` AND type IN (${options.types.map(() => "?").join(", ")})`;
      params.push(...options.types);
    }

    if (options.min_importance !== undefined) {
      sql += ` AND importance >= ?`;
      params.push(options.min_importance);
    }

    if (!options.include_expired) {
      sql += ` AND (expires_at IS NULL OR expires_at > ?)`;
      params.push(Date.now());
    }

    // Sorting
    const sortBy = options.sort_by || "importance";
    const sortOrder = options.sort_order || "DESC";
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Pagination
    if (options.limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const memories = this.db.query<Memory>(sql, params);

    // Apply decay to all retrieved memories
    memories.forEach((memory) => this.applyDecay(memory));

    return memories;
  }

  /**
   * Get recent memories
   */
  getRecent(agentId: string, limit: number = 10, types?: MemoryType[]): Memory[] {
    return this.query({
      agent_id: agentId,
      types,
      limit,
      sort_by: "created_at",
      sort_order: "DESC",
    });
  }

  /**
   * Get important memories
   */
  getImportant(
    agentId: string,
    minImportance: number = 0.7,
    limit: number = 20
  ): Memory[] {
    return this.query({
      agent_id: agentId,
      min_importance: minImportance,
      limit,
      sort_by: "importance",
      sort_order: "DESC",
    });
  }

  /**
   * Get working memory (short-term)
   */
  getWorkingMemory(agentId: string, sessionId?: string): Memory[] {
    return this.query({
      agent_id: agentId,
      session_id: sessionId,
      types: ["working", "conversation"],
      sort_by: "created_at",
      sort_order: "DESC",
      limit: 20,
    });
  }

  /**
   * Get long-term memory
   */
  getLongTermMemory(agentId: string, limit: number = 50): Memory[] {
    return this.query({
      agent_id: agentId,
      types: ["episodic", "semantic", "procedural", "reflection"],
      min_importance: MemoryStore.MIN_IMPORTANCE,
      limit,
      sort_by: "importance",
      sort_order: "DESC",
    });
  }

  /**
   * Get memories by type
   */
  getByType(agentId: string, type: MemoryType, limit?: number): Memory[] {
    return this.query({
      agent_id: agentId,
      types: [type],
      limit,
      sort_by: "created_at",
      sort_order: "DESC",
    });
  }

  /**
   * Search memories by content
   */
  search(agentId: string, pattern: string, limit: number = 20): Memory[] {
    const sql = `
      SELECT * FROM memories
      WHERE agent_id = ? AND content LIKE ?
      AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY importance DESC, created_at DESC
      LIMIT ?
    `;

    return this.db.query<Memory>(sql, [
      agentId,
      `%${pattern}%`,
      Date.now(),
      limit,
    ]);
  }

  /**
   * Update memory importance
   */
  updateImportance(memoryId: string, importance: number): boolean {
    const sql = `
      UPDATE memories
      SET importance = ?
      WHERE id = ?
    `;

    this.db.execute(sql, [Math.max(0, Math.min(1, importance)), memoryId]);
    return true;
  }

  /**
   * Delete a memory
   */
  delete(memoryId: string): boolean {
    const sql = `DELETE FROM memories WHERE id = ?`;
    this.db.execute(sql, [memoryId]);

    const countSql = `SELECT changes() as count`;
    const result = this.db.queryOne<{ count: number }>(countSql, []);
    return (result?.count ?? 0) > 0;
  }

  /**
   * Delete expired memories
   */
  deleteExpired(): number {
    const sql = `
      DELETE FROM memories
      WHERE expires_at IS NOT NULL AND expires_at <= ?
    `;

    this.db.execute(sql, [Date.now()]);

    const countSql = `SELECT changes() as count`;
    const result = this.db.queryOne<{ count: number }>(countSql, []);
    return result?.count ?? 0;
  }

  /**
   * Delete low-importance memories
   */
  deleteUnimportant(threshold: number = 0.1): number {
    const sql = `
      DELETE FROM memories
      WHERE importance < ? AND type NOT IN ('working', 'conversation')
    `;

    this.db.execute(sql, [threshold]);

    const countSql = `SELECT changes() as count`;
    const result = this.db.queryOne<{ count: number }>(countSql, []);
    return result?.count ?? 0;
  }

  /**
   * Create a relationship between memories
   */
  createRelationship(
    id: string,
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    strength: number = 1.0
  ): MemoryRelationship {
    const relationship: MemoryRelationship = {
      id,
      source_memory_id: sourceId,
      target_memory_id: targetId,
      relationship_type: type,
      strength: Math.max(0, Math.min(1, strength)),
      created_at: Date.now(),
    };

    const sql = `
      INSERT INTO memory_relationships (
        id, source_memory_id, target_memory_id, relationship_type, strength, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      relationship.id,
      relationship.source_memory_id,
      relationship.target_memory_id,
      relationship.relationship_type,
      relationship.strength,
      relationship.created_at,
    ]);

    return relationship;
  }

  /**
   * Get related memories
   */
  getRelatedMemories(
    memoryId: string,
    type?: RelationshipType,
    minStrength: number = 0.5
  ): Array<{ memory: Memory; relationship: MemoryRelationship }> {
    let sql = `
      SELECT m.*, r.id as rel_id, r.relationship_type, r.strength, r.created_at as rel_created_at
      FROM memories m
      INNER JOIN memory_relationships r ON m.id = r.target_memory_id
      WHERE r.source_memory_id = ? AND r.strength >= ?
    `;

    const params: any[] = [memoryId, minStrength];

    if (type) {
      sql += ` AND r.relationship_type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY r.strength DESC`;

    const results = this.db.query<any>(sql, params);

    return results.map((row) => ({
      memory: {
        id: row.id,
        agent_id: row.agent_id,
        session_id: row.session_id,
        type: row.type,
        content: row.content,
        embedding: row.embedding,
        importance: row.importance,
        access_count: row.access_count,
        last_accessed_at: row.last_accessed_at,
        created_at: row.created_at,
        expires_at: row.expires_at,
        metadata: row.metadata,
      } as Memory,
      relationship: {
        id: row.rel_id,
        source_memory_id: memoryId,
        target_memory_id: row.id,
        relationship_type: row.relationship_type,
        strength: row.strength,
        created_at: row.rel_created_at,
      } as MemoryRelationship,
    }));
  }

  /**
   * Consolidate memories (strengthen important ones, weaken unimportant ones)
   */
  consolidate(agentId: string): { strengthened: number; weakened: number } {
    return this.db.transaction(() => {
      // Strengthen frequently accessed memories
      const strengthenSql = `
        UPDATE memories
        SET importance = MIN(1.0, importance + 0.1)
        WHERE agent_id = ? AND access_count > 5 AND importance < 1.0
      `;
      this.db.execute(strengthenSql, [agentId]);
      const strengthenResult = this.db.queryOne<{ count: number }>(
        "SELECT changes() as count",
        []
      );
      const strengthened = strengthenResult?.count ?? 0;

      // Weaken rarely accessed old memories
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weakenSql = `
        UPDATE memories
        SET importance = MAX(0.0, importance - 0.05)
        WHERE agent_id = ?
        AND created_at < ?
        AND (last_accessed_at IS NULL OR last_accessed_at < ?)
        AND type NOT IN ('semantic', 'procedural')
      `;
      this.db.execute(weakenSql, [agentId, weekAgo, weekAgo]);
      const weakenResult = this.db.queryOne<{ count: number }>(
        "SELECT changes() as count",
        []
      );
      const weakened = weakenResult?.count ?? 0;

      return { strengthened, weakened };
    });
  }

  /**
   * Get memory statistics
   */
  getStatistics(agentId: string): MemoryStats {
    // Total count
    const totalSql = `SELECT COUNT(*) as count FROM memories WHERE agent_id = ?`;
    const totalResult = this.db.queryOne<{ count: number }>(totalSql, [agentId]);
    const total = totalResult?.count ?? 0;

    // Count by type
    const typeSql = `
      SELECT type, COUNT(*) as count
      FROM memories
      WHERE agent_id = ?
      GROUP BY type
    `;
    const typeResults = this.db.query<{ type: MemoryType; count: number }>(
      typeSql,
      [agentId]
    );

    const by_type: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
      working: 0,
      conversation: 0,
      observation: 0,
      reflection: 0,
      goal: 0,
      error: 0,
      success: 0,
    };

    for (const row of typeResults) {
      by_type[row.type] = row.count;
    }

    // Average importance
    const avgImportanceSql = `
      SELECT AVG(importance) as avg_importance
      FROM memories
      WHERE agent_id = ?
    `;
    const avgImportanceResult = this.db.queryOne<{ avg_importance: number }>(
      avgImportanceSql,
      [agentId]
    );
    const avg_importance = avgImportanceResult?.avg_importance ?? 0;

    // Average access count
    const avgAccessSql = `
      SELECT AVG(access_count) as avg_access
      FROM memories
      WHERE agent_id = ?
    `;
    const avgAccessResult = this.db.queryOne<{ avg_access: number }>(
      avgAccessSql,
      [agentId]
    );
    const avg_access_count = avgAccessResult?.avg_access ?? 0;

    // Expired count
    const expiredSql = `
      SELECT COUNT(*) as count
      FROM memories
      WHERE agent_id = ? AND expires_at IS NOT NULL AND expires_at <= ?
    `;
    const expiredResult = this.db.queryOne<{ count: number }>(expiredSql, [
      agentId,
      Date.now(),
    ]);
    const expired = expiredResult?.count ?? 0;

    // Working memory count
    const working_memory_count = by_type.working + by_type.conversation;

    // Long-term memory count
    const long_term_memory_count =
      by_type.episodic +
      by_type.semantic +
      by_type.procedural +
      by_type.reflection;

    return {
      total,
      by_type,
      avg_importance,
      avg_access_count,
      expired,
      working_memory_count,
      long_term_memory_count,
    };
  }

  /**
   * Clear all memories for an agent
   */
  clear(agentId: string): number {
    const sql = `DELETE FROM memories WHERE agent_id = ?`;
    this.db.execute(sql, [agentId]);

    const countSql = `SELECT changes() as count`;
    const result = this.db.queryOne<{ count: number }>(countSql, []);
    return result?.count ?? 0;
  }

  /**
   * Clear session memories
   */
  clearSession(agentId: string, sessionId: string): number {
    const sql = `DELETE FROM memories WHERE agent_id = ? AND session_id = ?`;
    this.db.execute(sql, [agentId, sessionId]);

    const countSql = `SELECT changes() as count`;
    const result = this.db.queryOne<{ count: number }>(countSql, []);
    return result?.count ?? 0;
  }

  /**
   * Update access statistics
   */
  private updateAccessStats(memoryId: string): void {
    const sql = `
      UPDATE memories
      SET access_count = access_count + 1,
          last_accessed_at = ?
      WHERE id = ?
    `;

    this.db.execute(sql, [Date.now(), memoryId]);
  }

  /**
   * Apply time-based decay to memory importance
   */
  private applyDecay(memory: Memory): void {
    const daysSinceCreation =
      (Date.now() - memory.created_at) / (24 * 60 * 60 * 1000);

    // Don't decay semantic or procedural memories
    if (memory.type === "semantic" || memory.type === "procedural") {
      return;
    }

    const decayAmount = daysSinceCreation * MemoryStore.DECAY_RATE;
    const newImportance = Math.max(0, memory.importance - decayAmount);

    if (newImportance !== memory.importance) {
      this.updateImportance(memory.id, newImportance);
      memory.importance = newImportance;
    }
  }

  /**
   * Calculate expiration time based on memory type
   */
  private calculateExpiration(
    type: MemoryType,
    explicit?: number | null
  ): number | null {
    if (explicit !== undefined) {
      return explicit;
    }

    // Working memory expires after 1 hour
    if (type === "working") {
      return Date.now() + MemoryStore.WORKING_MEMORY_TTL;
    }

    // Conversation memory expires after 24 hours
    if (type === "conversation") {
      return Date.now() + 24 * 60 * 60 * 1000;
    }

    // Other types don't expire by default
    return null;
  }

  /**
   * Calculate initial importance based on memory type
   */
  private calculateInitialImportance(type: MemoryType): number {
    switch (type) {
      case "goal":
        return 0.9;
      case "error":
        return 0.8;
      case "success":
        return 0.7;
      case "reflection":
        return 0.7;
      case "semantic":
        return 0.6;
      case "procedural":
        return 0.6;
      case "episodic":
        return 0.5;
      case "observation":
        return 0.4;
      case "conversation":
        return 0.3;
      case "working":
        return 0.2;
      default:
        return 0.5;
    }
  }
}
