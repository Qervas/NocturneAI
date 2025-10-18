/**
 * Database
 *
 * SQLite database wrapper with connection management, transactions, and migrations.
 *
 * Features:
 * - Connection pooling and lifecycle management
 * - Transaction support with rollback
 * - Migration system
 * - Query execution with prepared statements
 * - Error handling and logging
 * - WAL mode for better concurrency
 * - Backup and restore support
 */

import Database from "better-sqlite3";
import { join, dirname } from "path";
import { existsSync, mkdirSync } from "fs";
import type { Database as DatabaseType, Statement } from "better-sqlite3";

/**
 * Database Configuration
 */
export interface DatabaseConfig {
  /** Database file path */
  path: string;

  /** Enable WAL mode (default: true) */
  wal?: boolean;

  /** Enable foreign keys (default: true) */
  foreignKeys?: boolean;

  /** Connection timeout in ms (default: 5000) */
  timeout?: number;

  /** Enable verbose logging (default: false) */
  verbose?: boolean;

  /** Enable read-only mode (default: false) */
  readonly?: boolean;

  /** Memory mode (default: false) */
  memory?: boolean;
}

/**
 * Migration Definition
 */
export interface Migration {
  /** Migration version number */
  version: number;

  /** Migration name */
  name: string;

  /** Up migration (apply changes) */
  up: (db: DatabaseWrapper) => void;

  /** Down migration (revert changes) */
  down: (db: DatabaseWrapper) => void;
}

/**
 * Query Result
 */
export interface QueryResult<T = any> {
  /** Result rows */
  rows: T[];

  /** Number of rows affected */
  changes: number;

  /** Last inserted row ID */
  lastInsertRowid: number;
}

/**
 * Transaction Options
 */
export interface TransactionOptions {
  /** Transaction mode */
  mode?: "deferred" | "immediate" | "exclusive";
}

/**
 * Database Wrapper
 */
export class DatabaseWrapper {
  private db: DatabaseType | null = null;
  private config: Required<DatabaseConfig>;
  private migrations: Migration[] = [];
  private isOpen = false;

  constructor(config: DatabaseConfig) {
    this.config = {
      path: config.path,
      wal: config.wal !== false,
      foreignKeys: config.foreignKeys !== false,
      timeout: config.timeout ?? 5000,
      verbose: config.verbose ?? false,
      readonly: config.readonly ?? false,
      memory: config.memory ?? false,
    };
  }

  /**
   * Open database connection
   */
  open(): void {
    if (this.isOpen) {
      return;
    }

    try {
      // Ensure directory exists
      if (!this.config.memory) {
        const dir = dirname(this.config.path);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      // Open database
      this.db = new Database(
        this.config.memory ? ":memory:" : this.config.path,
        {
          readonly: this.config.readonly,
          timeout: this.config.timeout,
          verbose: this.config.verbose ? console.log : undefined,
        },
      );

      // Enable WAL mode for better concurrency
      if (this.config.wal && !this.config.readonly) {
        this.db.pragma("journal_mode = WAL");
      }

      // Enable foreign keys
      if (this.config.foreignKeys) {
        this.db.pragma("foreign_keys = ON");
      }

      // Set busy timeout
      this.db.pragma(`busy_timeout = ${this.config.timeout}`);

      this.isOpen = true;
    } catch (error) {
      throw new Error(
        `Failed to open database: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (!this.isOpen || !this.db) {
      return;
    }

    try {
      this.db.close();
      this.db = null;
      this.isOpen = false;
    } catch (error) {
      throw new Error(
        `Failed to close database: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if database is open
   */
  isConnected(): boolean {
    return this.isOpen && this.db !== null;
  }

  /**
   * Execute a query that returns rows
   */
  query<T = any>(sql: string, params: any[] = []): T[] {
    this.ensureOpen();

    try {
      const stmt = this.db!.prepare(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      throw new Error(
        `Query failed: ${error instanceof Error ? error.message : String(error)}\nSQL: ${sql}`,
      );
    }
  }

  /**
   * Execute a query that returns a single row
   */
  queryOne<T = any>(sql: string, params: any[] = []): T | null {
    this.ensureOpen();

    try {
      const stmt = this.db!.prepare(sql);
      return (stmt.get(...params) as T) || null;
    } catch (error) {
      throw new Error(
        `Query failed: ${error instanceof Error ? error.message : String(error)}\nSQL: ${sql}`,
      );
    }
  }

  /**
   * Execute a query that doesn't return rows (INSERT, UPDATE, DELETE)
   */
  execute(sql: string, params: any[] = []): QueryResult {
    this.ensureOpen();

    try {
      const stmt = this.db!.prepare(sql);
      const info = stmt.run(...params);

      return {
        rows: [],
        changes: info.changes,
        lastInsertRowid: Number(info.lastInsertRowid),
      };
    } catch (error) {
      throw new Error(
        `Execute failed: ${error instanceof Error ? error.message : String(error)}\nSQL: ${sql}`,
      );
    }
  }

  /**
   * Execute multiple statements (separated by semicolons)
   */
  executeMany(sql: string): void {
    this.ensureOpen();

    try {
      this.db!.exec(sql);
    } catch (error) {
      throw new Error(
        `Execute many failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Prepare a statement for later execution
   */
  prepare(sql: string): Statement {
    this.ensureOpen();

    try {
      return this.db!.prepare(sql);
    } catch (error) {
      throw new Error(
        `Prepare failed: ${error instanceof Error ? error.message : String(error)}\nSQL: ${sql}`,
      );
    }
  }

  /**
   * Execute a function within a transaction
   */
  transaction<T>(
    fn: (db: DatabaseWrapper) => T,
    options: TransactionOptions = {},
  ): T {
    this.ensureOpen();

    const mode = options.mode ?? "deferred";
    const transaction = this.db!.transaction(fn);

    try {
      return transaction(this) as T;
    } catch (error) {
      throw new Error(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Register multiple migrations
   */
  registerMigrations(migrations: Migration[]): void {
    migrations.forEach((m) => this.registerMigration(m));
  }

  /**
   * Run all pending migrations
   */
  migrate(): void {
    this.ensureOpen();

    // Create migrations table if it doesn't exist
    this.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      )
    `);

    // Get applied migrations
    const appliedVersions = new Set(
      this.query<{ version: number }>("SELECT version FROM migrations").map(
        (row) => row.version,
      ),
    );

    // Apply pending migrations
    for (const migration of this.migrations) {
      if (!appliedVersions.has(migration.version)) {
        console.log(
          `Applying migration ${migration.version}: ${migration.name}`,
        );

        this.transaction(() => {
          migration.up(this);

          this.execute(
            "INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)",
            [migration.version, migration.name, Date.now()],
          );
        });

        console.log(`Migration ${migration.version} applied successfully`);
      }
    }
  }

  /**
   * Rollback to a specific migration version
   */
  rollback(targetVersion: number): void {
    this.ensureOpen();

    // Get applied migrations in reverse order
    const appliedMigrations = this.query<{ version: number; name: string }>(
      "SELECT version, name FROM migrations WHERE version > ? ORDER BY version DESC",
      [targetVersion],
    );

    // Rollback migrations
    for (const applied of appliedMigrations) {
      const migration = this.migrations.find(
        (m) => m.version === applied.version,
      );

      if (!migration) {
        throw new Error(
          `Migration ${applied.version} (${applied.name}) not found in registered migrations`,
        );
      }

      console.log(
        `Rolling back migration ${migration.version}: ${migration.name}`,
      );

      this.transaction(() => {
        migration.down(this);

        this.execute("DELETE FROM migrations WHERE version = ?", [
          migration.version,
        ]);
      });

      console.log(`Migration ${migration.version} rolled back successfully`);
    }
  }

  /**
   * Get current migration version
   */
  getCurrentVersion(): number {
    this.ensureOpen();

    // Create migrations table if it doesn't exist
    this.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      )
    `);

    const result = this.queryOne<{ version: number }>(
      "SELECT version FROM migrations ORDER BY version DESC LIMIT 1",
    );

    return result?.version ?? 0;
  }

  /**
   * Get all applied migrations
   */
  getAppliedMigrations(): Array<{
    version: number;
    name: string;
    appliedAt: Date;
  }> {
    this.ensureOpen();

    const rows = this.query<{
      version: number;
      name: string;
      applied_at: number;
    }>("SELECT version, name, applied_at FROM migrations ORDER BY version");

    return rows.map((row) => ({
      version: row.version,
      name: row.name,
      appliedAt: new Date(row.applied_at),
    }));
  }

  /**
   * Create a backup of the database
   */
  backup(destinationPath: string): void {
    this.ensureOpen();

    try {
      // better-sqlite3 backup API
      const backup = this.db!.backup(destinationPath) as any;
      while (backup.step(100) !== 0) {
        // Continue backing up
      }
      backup.close();
    } catch (error) {
      throw new Error(
        `Backup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get database statistics
   */
  getStats(): {
    pageCount: number;
    pageSize: number;
    freePages: number;
    size: number;
    walMode: boolean;
  } {
    this.ensureOpen();

    const pageCount = this.db!.pragma("page_count", { simple: true }) as number;
    const pageSize = this.db!.pragma("page_size", { simple: true }) as number;
    const freePages = this.db!.pragma("freelist_count", {
      simple: true,
    }) as number;
    const journalMode = this.db!.pragma("journal_mode", {
      simple: true,
    }) as string;

    return {
      pageCount,
      pageSize,
      freePages,
      size: pageCount * pageSize,
      walMode: journalMode === "wal",
    };
  }

  /**
   * Optimize database (VACUUM)
   */
  optimize(): void {
    this.ensureOpen();

    try {
      this.db!.exec("VACUUM");
    } catch (error) {
      throw new Error(
        `Optimize failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check database integrity
   */
  checkIntegrity(): boolean {
    this.ensureOpen();

    try {
      const result = this.db!.pragma("integrity_check", { simple: true });
      return result === "ok";
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the underlying better-sqlite3 database instance
   */
  getConnection(): DatabaseType {
    this.ensureOpen();
    return this.db!;
  }

  /**
   * Ensure database is open
   */
  private ensureOpen(): void {
    if (!this.isOpen || !this.db) {
      throw new Error("Database is not open. Call open() first.");
    }
  }
}

/**
 * Create a new database instance
 */
export function createDatabase(config: DatabaseConfig): DatabaseWrapper {
  return new DatabaseWrapper(config);
}
