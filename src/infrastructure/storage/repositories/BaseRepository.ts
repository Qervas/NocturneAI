/**
 * Base Repository
 *
 * Abstract base class for all repositories providing common CRUD operations,
 * query building, pagination, and filtering.
 *
 * Features:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Query builder with filtering
 * - Pagination support
 * - Sorting capabilities
 * - Transaction support
 * - Batch operations
 * - Soft delete support
 */

import type { DatabaseWrapper } from "../Database.js";

/**
 * Repository Configuration
 */
export interface RepositoryConfig {
  /** Table name */
  tableName: string;

  /** Primary key column name (default: 'id') */
  primaryKey?: string;

  /** Enable soft delete (default: false) */
  softDelete?: boolean;

  /** Soft delete column name (default: 'deleted_at') */
  softDeleteColumn?: string;
}

/**
 * Query Options
 */
export interface QueryOptions {
  /** Fields to select */
  select?: string[];

  /** WHERE conditions */
  where?: Record<string, any>;

  /** ORDER BY */
  orderBy?: string | string[];

  /** ORDER direction */
  order?: "ASC" | "DESC";

  /** LIMIT */
  limit?: number;

  /** OFFSET */
  offset?: number;

  /** Include soft deleted records */
  includeSoftDeleted?: boolean;
}

/**
 * Pagination Result
 */
export interface PaginatedResult<T> {
  /** Data items */
  items: T[];

  /** Total count */
  total: number;

  /** Current page (1-based) */
  page: number;

  /** Items per page */
  pageSize: number;

  /** Total pages */
  totalPages: number;

  /** Has next page */
  hasNext: boolean;

  /** Has previous page */
  hasPrevious: boolean;
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  /** Page number (1-based) */
  page?: number;

  /** Items per page */
  pageSize?: number;

  /** Sort field */
  sortBy?: string;

  /** Sort order */
  sortOrder?: "ASC" | "DESC";
}

/**
 * Base Repository Abstract Class
 */
export abstract class BaseRepository<T extends Record<string, any>> {
  protected db: DatabaseWrapper;
  protected config: Required<RepositoryConfig>;

  constructor(db: DatabaseWrapper, config: RepositoryConfig) {
    this.db = db;
    this.config = {
      tableName: config.tableName,
      primaryKey: config.primaryKey ?? "id",
      softDelete: config.softDelete ?? false,
      softDeleteColumn: config.softDeleteColumn ?? "deleted_at",
    };
  }

  /**
   * Find by ID
   */
  findById(id: string | number, includeSoftDeleted = false): T | null {
    const sql = this.buildSelectQuery({
      where: { [this.config.primaryKey]: id },
      limit: 1,
      includeSoftDeleted,
    });

    return this.db.queryOne<T>(sql.query, sql.params);
  }

  /**
   * Find all records
   */
  findAll(options: QueryOptions = {}): T[] {
    const sql = this.buildSelectQuery(options);
    return this.db.query<T>(sql.query, sql.params);
  }

  /**
   * Find one record by conditions
   */
  findOne(options: QueryOptions = {}): T | null {
    const sql = this.buildSelectQuery({ ...options, limit: 1 });
    return this.db.queryOne<T>(sql.query, sql.params);
  }

  /**
   * Find with pagination
   */
  findPaginated(
    queryOptions: QueryOptions = {},
    paginationOptions: PaginationOptions = {},
  ): PaginatedResult<T> {
    const page = Math.max(1, paginationOptions.page ?? 1);
    const pageSize = Math.max(
      1,
      Math.min(100, paginationOptions.pageSize ?? 10),
    );
    const offset = (page - 1) * pageSize;

    // Build query with pagination
    const options: QueryOptions = {
      ...queryOptions,
      limit: pageSize,
      offset,
    };

    // Add sorting
    if (paginationOptions.sortBy) {
      options.orderBy = paginationOptions.sortBy;
      options.order = paginationOptions.sortOrder ?? "ASC";
    }

    // Get items
    const items = this.findAll(options);

    // Get total count
    const total = this.count(queryOptions);

    // Calculate pagination info
    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Count records
   */
  count(options: QueryOptions = {}): number {
    const conditions = this.buildWhereClause(
      options.where ?? {},
      options.includeSoftDeleted ?? false,
    );

    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.config.tableName}
      ${conditions.clause}
    `;

    const result = this.db.queryOne<{ count: number }>(sql, conditions.params);
    return result?.count ?? 0;
  }

  /**
   * Check if record exists
   */
  exists(id: string | number): boolean {
    return this.findById(id) !== null;
  }

  /**
   * Create a new record
   */
  create(data: Partial<T>): T {
    const now = Date.now();
    const record: any = {
      ...data,
      created_at: (data as any).created_at ?? now,
      updated_at: (data as any).updated_at ?? now,
    };

    const fields = Object.keys(record);
    const placeholders = fields.map(() => "?").join(", ");
    const values = fields.map((field) => record[field]);

    const sql = `
      INSERT INTO ${this.config.tableName} (${fields.join(", ")})
      VALUES (${placeholders})
    `;

    const result = this.db.execute(sql, values);

    // Return the created record
    if (typeof record[this.config.primaryKey] === "undefined") {
      record[this.config.primaryKey] = result.lastInsertRowid;
    }

    return record as T;
  }

  /**
   * Create multiple records
   */
  createMany(items: Array<Partial<T>>): T[] {
    return this.db.transaction(() => {
      return items.map((item) => this.create(item));
    });
  }

  /**
   * Update a record by ID
   */
  update(id: string | number, data: Partial<T>): T | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updates = {
      ...data,
      updated_at: Date.now(),
    };

    const fields = Object.keys(updates);
    const setClause = fields.map((field) => `${field} = ?`).join(", ");
    const values = [...fields.map((field) => updates[field]), id];

    const sql = `
      UPDATE ${this.config.tableName}
      SET ${setClause}
      WHERE ${this.config.primaryKey} = ?
    `;

    this.db.execute(sql, values);

    return this.findById(id);
  }

  /**
   * Update multiple records
   */
  updateMany(where: Record<string, any>, data: Partial<T>): number {
    const updates = {
      ...data,
      updated_at: Date.now(),
    };

    const fields = Object.keys(updates);
    const setClause = fields.map((field) => `${field} = ?`).join(", ");
    const values = fields.map((field) => updates[field]);

    const conditions = this.buildWhereClause(where, false);
    values.push(...conditions.params);

    const sql = `
      UPDATE ${this.config.tableName}
      SET ${setClause}
      ${conditions.clause}
    `;

    const result = this.db.execute(sql, values);
    return result.changes;
  }

  /**
   * Delete a record by ID
   */
  delete(id: string | number): boolean {
    if (this.config.softDelete) {
      return this.softDeleteById(id);
    } else {
      return this.hardDelete(id);
    }
  }

  /**
   * Delete multiple records
   */
  deleteMany(where: Record<string, any>): number {
    if (this.config.softDelete) {
      return this.updateMany(where, {
        [this.config.softDeleteColumn]: Date.now(),
      } as Partial<T>);
    } else {
      const conditions = this.buildWhereClause(where, false);

      const sql = `
        DELETE FROM ${this.config.tableName}
        ${conditions.clause}
      `;

      const result = this.db.execute(sql, conditions.params);
      return result.changes;
    }
  }

  /**
   * Soft delete a record
   */
  protected softDeleteById(id: string | number): boolean {
    const sql = `
      UPDATE ${this.config.tableName}
      SET ${this.config.softDeleteColumn} = ?
      WHERE ${this.config.primaryKey} = ?
      AND ${this.config.softDeleteColumn} IS NULL
    `;

    const result = this.db.execute(sql, [Date.now(), id]);
    return result.changes > 0;
  }

  /**
   * Hard delete a record (permanent)
   */
  protected hardDelete(id: string | number): boolean {
    const sql = `
      DELETE FROM ${this.config.tableName}
      WHERE ${this.config.primaryKey} = ?
    `;

    const result = this.db.execute(sql, [id]);
    return result.changes > 0;
  }

  /**
   * Restore a soft-deleted record
   */
  restore(id: string | number): boolean {
    if (!this.config.softDelete) {
      return false;
    }

    const sql = `
      UPDATE ${this.config.tableName}
      SET ${this.config.softDeleteColumn} = NULL
      WHERE ${this.config.primaryKey} = ?
    `;

    const result = this.db.execute(sql, [id]);
    return result.changes > 0;
  }

  /**
   * Permanently delete all soft-deleted records
   */
  purge(): number {
    if (!this.config.softDelete) {
      return 0;
    }

    const sql = `
      DELETE FROM ${this.config.tableName}
      WHERE ${this.config.softDeleteColumn} IS NOT NULL
    `;

    const result = this.db.execute(sql);
    return result.changes;
  }

  /**
   * Build SELECT query
   */
  protected buildSelectQuery(options: QueryOptions): {
    query: string;
    params: any[];
  } {
    const select = options.select ? options.select.join(", ") : "*";

    const conditions = this.buildWhereClause(
      options.where ?? {},
      options.includeSoftDeleted ?? false,
    );

    let query = `
      SELECT ${select}
      FROM ${this.config.tableName}
      ${conditions.clause}
    `;

    // Add ORDER BY
    if (options.orderBy) {
      const orderFields = Array.isArray(options.orderBy)
        ? options.orderBy
        : [options.orderBy];
      const order = options.order ?? "ASC";
      query += ` ORDER BY ${orderFields.join(", ")} ${order}`;
    }

    // Add LIMIT
    if (options.limit !== undefined) {
      query += ` LIMIT ${options.limit}`;
    }

    // Add OFFSET
    if (options.offset !== undefined) {
      query += ` OFFSET ${options.offset}`;
    }

    return {
      query,
      params: conditions.params,
    };
  }

  /**
   * Build WHERE clause
   */
  protected buildWhereClause(
    where: Record<string, any>,
    includeSoftDeleted: boolean,
  ): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    // Add soft delete filter
    if (this.config.softDelete && !includeSoftDeleted) {
      conditions.push(`${this.config.softDeleteColumn} IS NULL`);
    }

    // Add WHERE conditions
    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (value === undefined) {
        continue; // Skip undefined values
      } else if (Array.isArray(value)) {
        // IN clause
        const placeholders = value.map(() => "?").join(", ");
        conditions.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else if (typeof value === "object" && value !== null) {
        // Handle operators like { $gt: 5, $lt: 10 }
        if ("$gt" in value) {
          conditions.push(`${key} > ?`);
          params.push(value.$gt);
        }
        if ("$gte" in value) {
          conditions.push(`${key} >= ?`);
          params.push(value.$gte);
        }
        if ("$lt" in value) {
          conditions.push(`${key} < ?`);
          params.push(value.$lt);
        }
        if ("$lte" in value) {
          conditions.push(`${key} <= ?`);
          params.push(value.$lte);
        }
        if ("$ne" in value) {
          conditions.push(`${key} != ?`);
          params.push(value.$ne);
        }
        if ("$like" in value) {
          conditions.push(`${key} LIKE ?`);
          params.push(value.$like);
        }
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    const clause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    return { clause, params };
  }

  /**
   * Execute in transaction
   */
  transaction<R>(fn: () => R): R {
    return this.db.transaction(fn);
  }

  /**
   * Get table name
   */
  getTableName(): string {
    return this.config.tableName;
  }

  /**
   * Get database instance
   */
  getDatabase(): DatabaseWrapper {
    return this.db;
  }
}
