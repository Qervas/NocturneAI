/**
 * Logger
 *
 * Comprehensive logging system with multiple transports and log levels.
 *
 * Features:
 * - Multiple log levels (debug, info, warn, error, fatal)
 * - Multiple transports (console, file, custom)
 * - Structured logging with context
 * - Log filtering and sampling
 * - Performance tracking
 * - Async logging support
 * - Log rotation
 * - Child loggers with inherited context
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  statSync,
  renameSync,
} from "fs";
import { dirname } from "path";
import type { LogFormatter } from "./LogFormatter.js";

/**
 * Log Level
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  SILENT = 5,
}

/**
 * Log Entry
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;

  /** Timestamp */
  timestamp: number;

  /** Message */
  message: string;

  /** Context data */
  context?: Record<string, any>;

  /** Error object */
  error?: Error;

  /** Logger name */
  logger: string;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Transport Interface
 */
export interface Transport {
  /** Transport name */
  name: string;

  /** Minimum log level for this transport */
  level: LogLevel;

  /** Log entry to transport */
  log(entry: LogEntry): void;

  /** Close/cleanup transport */
  close?(): void;
}

/**
 * Logger Configuration
 */
export interface LoggerConfig {
  /** Logger name */
  name?: string;

  /** Minimum log level */
  level?: LogLevel;

  /** Enable/disable logging */
  enabled?: boolean;

  /** Transports */
  transports?: Transport[];

  /** Formatter */
  formatter?: LogFormatter;

  /** Context data to include in all logs */
  context?: Record<string, any>;

  /** Enable timestamps */
  timestamps?: boolean;

  /** Enable colors (for console) */
  colors?: boolean;

  /** Sample rate (0-1, 1 = log everything) */
  sampleRate?: number;
}

/**
 * Console Transport
 */
export class ConsoleTransport implements Transport {
  name = "console";
  level: LogLevel;
  private colors: boolean;

  constructor(config?: { level?: LogLevel; colors?: boolean }) {
    this.level = config?.level ?? LogLevel.INFO;
    this.colors = config?.colors ?? true;
  }

  log(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = this.colors
      ? this.colorize(levelName, entry.level)
      : levelName;

    let output = `${timestamp} [${prefix}] [${entry.logger}] ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      output += `\n${entry.error.stack || entry.error.message}`;
    }

    const logFn = this.getLogFunction(entry.level);
    logFn(output);
  }

  private colorize(text: string, level: LogLevel): string {
    if (!this.colors) return text;

    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: "\x1b[36m", // Cyan
      [LogLevel.INFO]: "\x1b[32m", // Green
      [LogLevel.WARN]: "\x1b[33m", // Yellow
      [LogLevel.ERROR]: "\x1b[31m", // Red
      [LogLevel.FATAL]: "\x1b[35m", // Magenta
      [LogLevel.SILENT]: "\x1b[0m", // Reset
    };

    const reset = "\x1b[0m";
    return `${colors[level]}${text}${reset}`;
  }

  private getLogFunction(level: LogLevel): (message: string) => void {
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        return console.log;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }
}

/**
 * File Transport
 */
export class FileTransport implements Transport {
  name = "file";
  level: LogLevel;
  private filePath: string;
  private maxSize: number;
  private maxFiles: number;

  constructor(config: {
    filePath: string;
    level?: LogLevel;
    maxSize?: number;
    maxFiles?: number;
  }) {
    this.filePath = config.filePath;
    this.level = config.level ?? LogLevel.INFO;
    this.maxSize = config.maxSize ?? 10 * 1024 * 1024; // 10MB
    this.maxFiles = config.maxFiles ?? 5;

    // Ensure directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  log(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();

    const logObject = {
      timestamp,
      level: levelName,
      logger: entry.logger,
      message: entry.message,
      context: entry.context,
      error: entry.error
        ? {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name,
          }
        : undefined,
      metadata: entry.metadata,
    };

    const logLine = JSON.stringify(logObject) + "\n";

    // Check if rotation is needed
    this.rotateIfNeeded();

    // Append to file
    appendFileSync(this.filePath, logLine, "utf-8");
  }

  private rotateIfNeeded(): void {
    if (!existsSync(this.filePath)) {
      return;
    }

    const stats = statSync(this.filePath);
    if (stats.size < this.maxSize) {
      return;
    }

    // Rotate files
    for (let i = this.maxFiles - 1; i > 0; i--) {
      const oldPath = `${this.filePath}.${i}`;
      const newPath = `${this.filePath}.${i + 1}`;

      if (existsSync(oldPath)) {
        if (i === this.maxFiles - 1) {
          // Delete oldest file
          require("fs").unlinkSync(oldPath);
        } else {
          renameSync(oldPath, newPath);
        }
      }
    }

    // Rename current file to .1
    renameSync(this.filePath, `${this.filePath}.1`);
  }

  close(): void {
    // File transport doesn't need explicit closing
  }
}

/**
 * Logger
 */
export class Logger {
  private config: Required<Omit<LoggerConfig, "formatter" | "transports">> & {
    formatter?: LogFormatter;
    transports: Transport[];
  };
  private childLoggers: Map<string, Logger>;

  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG = {
    name: "app",
    level: LogLevel.INFO,
    enabled: true,
    transports: [],
    context: {},
    timestamps: true,
    colors: true,
    sampleRate: 1.0,
  };

  constructor(config?: LoggerConfig) {
    this.config = {
      ...Logger.DEFAULT_CONFIG,
      ...config,
      transports: config?.transports ?? [new ConsoleTransport()],
    };
    this.childLoggers = new Map();
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log at info level
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log at fatal level
   */
  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Core log method
   */
  log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
  ): void {
    // Check if logging is enabled
    if (!this.config.enabled) {
      return;
    }

    // Check log level
    if (level < this.config.level) {
      return;
    }

    // Sample rate check
    if (
      this.config.sampleRate < 1.0 &&
      Math.random() > this.config.sampleRate
    ) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      message,
      context: {
        ...this.config.context,
        ...context,
      },
      error,
      logger: this.config.name,
    };

    // Format if formatter is provided
    if (this.config.formatter) {
      const formatted = this.config.formatter.format(entry);
      entry.message = formatted;
    }

    // Send to transports
    for (const transport of this.config.transports) {
      if (level >= transport.level) {
        try {
          transport.log(entry);
        } catch (err) {
          // Don't let transport errors break logging
          console.error("Transport error:", err);
        }
      }
    }
  }

  /**
   * Create a child logger with inherited context
   */
  child(name: string, context?: Record<string, any>): Logger {
    const childName = `${this.config.name}.${name}`;

    if (this.childLoggers.has(childName)) {
      return this.childLoggers.get(childName)!;
    }

    const childLogger = new Logger({
      name: childName,
      level: this.config.level,
      enabled: this.config.enabled,
      transports: this.config.transports,
      formatter: this.config.formatter,
      context: {
        ...this.config.context,
        ...context,
      },
      timestamps: this.config.timestamps,
      colors: this.config.colors,
      sampleRate: this.config.sampleRate,
    });

    this.childLoggers.set(childName, childLogger);
    return childLogger;
  }

  /**
   * Add a transport
   */
  addTransport(transport: Transport): void {
    this.config.transports.push(transport);
  }

  /**
   * Remove a transport
   */
  removeTransport(name: string): boolean {
    const index = this.config.transports.findIndex((t) => t.name === name);
    if (index !== -1) {
      const transport = this.config.transports[index];
      if (transport.close) {
        transport.close();
      }
      this.config.transports.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Enable logging
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable logging
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Check if level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean {
    return this.config.enabled && level >= this.config.level;
  }

  /**
   * Add context to all future logs
   */
  addContext(context: Record<string, any>): void {
    this.config.context = {
      ...this.config.context,
      ...context,
    };
  }

  /**
   * Remove context key
   */
  removeContext(key: string): void {
    delete this.config.context[key];
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.config.context = {};
  }

  /**
   * Time a function execution
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    this.debug(`${label} started`);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(
        `${label} failed`,
        error instanceof Error ? error : new Error(String(error)),
        { duration_ms: duration },
      );
      throw error;
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSync<T>(label: string, fn: () => T): T {
    const start = Date.now();
    this.debug(`${label} started`);

    try {
      const result = fn();
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(
        `${label} failed`,
        error instanceof Error ? error : new Error(String(error)),
        { duration_ms: duration },
      );
      throw error;
    }
  }

  /**
   * Close all transports
   */
  close(): void {
    for (const transport of this.config.transports) {
      if (transport.close) {
        transport.close();
      }
    }

    // Close child loggers
    for (const child of this.childLoggers.values()) {
      child.close();
    }
    this.childLoggers.clear();
  }

  /**
   * Create a logger instance
   */
  static create(config?: LoggerConfig): Logger {
    return new Logger(config);
  }

  /**
   * Parse log level from string
   */
  static parseLevel(level: string): LogLevel {
    const upper = level.toUpperCase();
    switch (upper) {
      case "DEBUG":
        return LogLevel.DEBUG;
      case "INFO":
        return LogLevel.INFO;
      case "WARN":
      case "WARNING":
        return LogLevel.WARN;
      case "ERROR":
        return LogLevel.ERROR;
      case "FATAL":
        return LogLevel.FATAL;
      case "SILENT":
        return LogLevel.SILENT;
      default:
        return LogLevel.INFO;
    }
  }
}
