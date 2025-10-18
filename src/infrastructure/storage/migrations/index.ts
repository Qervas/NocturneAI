/**
 * Database Migrations
 *
 * Central registry for all database migrations.
 * Migrations are applied in order by version number.
 */

import type { Migration } from "../Database.js";
import { initialMigration } from "./001_initial.js";

/**
 * All migrations in order
 */
export const migrations: Migration[] = [
  initialMigration,
  // Future migrations will be added here
  // Example:
  // migration002AddIndexes,
  // migration003AddMemoryTables,
];

/**
 * Get migration by version
 */
export function getMigration(version: number): Migration | undefined {
  return migrations.find((m) => m.version === version);
}

/**
 * Get all migrations up to a specific version
 */
export function getMigrationsUpTo(version: number): Migration[] {
  return migrations.filter((m) => m.version <= version);
}

/**
 * Get latest migration version
 */
export function getLatestVersion(): number {
  if (migrations.length === 0) return 0;
  return Math.max(...migrations.map((m) => m.version));
}

/**
 * Validate migrations (ensure no duplicate versions)
 */
export function validateMigrations(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const versions = new Set<number>();

  for (const migration of migrations) {
    if (versions.has(migration.version)) {
      errors.push(`Duplicate migration version: ${migration.version}`);
    }
    versions.add(migration.version);

    if (!migration.up) {
      errors.push(`Migration ${migration.version} missing 'up' function`);
    }

    if (!migration.down) {
      errors.push(`Migration ${migration.version} missing 'down' function`);
    }
  }

  // Check for gaps in version sequence
  const sortedVersions = Array.from(versions).sort((a, b) => a - b);
  for (let i = 0; i < sortedVersions.length - 1; i++) {
    if (sortedVersions[i + 1] - sortedVersions[i] > 1) {
      errors.push(
        `Gap in migration versions between ${sortedVersions[i]} and ${sortedVersions[i + 1]}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export individual migrations for direct access if needed
export { initialMigration };
