/**
 * Log Formatter
 *
 * Formats log entries into structured output.
 *
 * Features:
 * - Multiple format types (JSON, text, pretty)
 * - Custom templates
 * - Field extraction and transformation
 * - Context serialization
 * - Stack trace formatting
 * - Performance-optimized formatting
 */

import type { LogEntry, LogLevel } from "./Logger.js";

/**
 * Format Type
 */
export type FormatType = "json" | "text" | "pretty" | "custom";

/**
 * Formatter Configuration
 */
export interface FormatterConfig {
  /** Format type */
  type?: FormatType;

  /** Custom template (for text/pretty formats) */
  template?: string;

  /** Include timestamp */
  includeTimestamp?: boolean;

  /** Include log level */
  includeLevel?: boolean;

  /** Include logger name */
  includeLogger?: boolean;

  /** Include context */
  includeContext?: boolean;

  /** Include stack traces */
  includeStackTrace?: boolean;

  /** Pretty print JSON */
  prettyPrint?: boolean;

  /** Indent size for pretty print */
  indent?: number;

  /** Custom field transformers */
  transformers?: Record<string, (value: any) => any>;
}

/**
 * Log Formatter
 */
export class LogFormatter {
  private config: Required<Omit<FormatterConfig, "template" | "transformers">> & {
    template?: string;
    transformers: Record<string, (value: any) => any>;
  };

  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG = {
    type: "text" as FormatType,
    includeTimestamp: true,
    includeLevel: true,
    includeLogger: true,
    includeContext: true,
    includeStackTrace: true,
    prettyPrint: false,
    indent: 2,
    transformers: {},
  };

  /**
   * Default template
   */
  private static readonly DEFAULT_TEMPLATE =
    "{timestamp} [{level}] [{logger}] {message} {context}";

  constructor(config?: FormatterConfig) {
    this.config = {
      ...LogFormatter.DEFAULT_CONFIG,
      ...config,
      transformers: config?.transformers ?? {},
    };
  }

  /**
   * Format a log entry
   */
  format(entry: LogEntry): string {
    switch (this.config.type) {
      case "json":
        return this.formatJSON(entry);
      case "text":
        return this.formatText(entry);
      case "pretty":
        return this.formatPretty(entry);
      case "custom":
        return this.formatCustom(entry);
      default:
        return this.formatText(entry);
    }
  }

  /**
   * Format as JSON
   */
  private formatJSON(entry: LogEntry): string {
    const obj: any = {};

    if (this.config.includeTimestamp) {
      obj.timestamp = new Date(entry.timestamp).toISOString();
    }

    if (this.config.includeLevel) {
      obj.level = this.getLevelName(entry.level);
    }

    if (this.config.includeLogger) {
      obj.logger = entry.logger;
    }

    obj.message = entry.message;

    if (this.config.includeContext && entry.context) {
      obj.context = this.transformContext(entry.context);
    }

    if (entry.error && this.config.includeStackTrace) {
      obj.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      };
    }

    if (entry.metadata) {
      obj.metadata = entry.metadata;
    }

    if (this.config.prettyPrint) {
      return JSON.stringify(obj, null, this.config.indent);
    }

    return JSON.stringify(obj);
  }

  /**
   * Format as text
   */
  private formatText(entry: LogEntry): string {
    const template = this.config.template || LogFormatter.DEFAULT_TEMPLATE;
    let output = template;

    // Replace template variables
    if (this.config.includeTimestamp) {
      const timestamp = new Date(entry.timestamp).toISOString();
      output = output.replace("{timestamp}", timestamp);
    } else {
      output = output.replace("{timestamp}", "");
    }

    if (this.config.includeLevel) {
      const level = this.getLevelName(entry.level);
      output = output.replace("{level}", level);
    } else {
      output = output.replace("{level}", "");
    }

    if (this.config.includeLogger) {
      output = output.replace("{logger}", entry.logger);
    } else {
      output = output.replace("{logger}", "");
    }

    output = output.replace("{message}", entry.message);

    if (this.config.includeContext && entry.context) {
      const contextStr = this.serializeContext(entry.context);
      output = output.replace("{context}", contextStr);
    } else {
      output = output.replace("{context}", "");
    }

    // Clean up extra spaces
    output = output.replace(/\s+/g, " ").trim();

    // Add error if present
    if (entry.error && this.config.includeStackTrace) {
      output += `\n${this.formatError(entry.error)}`;
    }

    return output;
  }

  /**
   * Format as pretty (human-readable)
   */
  private formatPretty(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      const timestamp = new Date(entry.timestamp).toISOString();
      parts.push(`[${timestamp}]`);
    }

    if (this.config.includeLevel) {
      const level = this.getLevelName(entry.level);
      const coloredLevel = this.colorizeLevel(level, entry.level);
      parts.push(`[${coloredLevel}]`);
    }

    if (this.config.includeLogger) {
      parts.push(`[${entry.logger}]`);
    }

    parts.push(entry.message);

    let output = parts.join(" ");

    if (this.config.includeContext && entry.context) {
      const contextStr = this.serializeContext(entry.context);
      if (contextStr) {
        output += `\n  Context: ${contextStr}`;
      }
    }

    if (entry.error && this.config.includeStackTrace) {
      output += `\n  ${this.formatError(entry.error, "  ")}`;
    }

    return output;
  }

  /**
   * Format with custom template
   */
  private formatCustom(entry: LogEntry): string {
    if (!this.config.template) {
      return this.formatText(entry);
    }

    return this.formatText(entry);
  }

  /**
   * Transform context with custom transformers
   */
  private transformContext(context: Record<string, any>): Record<string, any> {
    const transformed: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      if (this.config.transformers[key]) {
        transformed[key] = this.config.transformers[key](value);
      } else {
        transformed[key] = value;
      }
    }

    return transformed;
  }

  /**
   * Serialize context to string
   */
  private serializeContext(context: Record<string, any>): string {
    const transformed = this.transformContext(context);
    const entries = Object.entries(transformed);

    if (entries.length === 0) {
      return "";
    }

    const parts = entries.map(([key, value]) => {
      if (typeof value === "object") {
        return `${key}=${JSON.stringify(value)}`;
      }
      return `${key}=${value}`;
    });

    return parts.join(" ");
  }

  /**
   * Format error with stack trace
   */
  private formatError(error: Error, indent: string = ""): string {
    const lines: string[] = [];
    lines.push(`${indent}Error: ${error.name}: ${error.message}`);

    if (error.stack) {
      const stackLines = error.stack.split("\n").slice(1);
      for (const line of stackLines) {
        lines.push(`${indent}  ${line.trim()}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Get level name
   */
  private getLevelName(level: LogLevel): string {
    const names: Record<LogLevel, string> = {
      0: "DEBUG",
      1: "INFO",
      2: "WARN",
      3: "ERROR",
      4: "FATAL",
      5: "SILENT",
    };
    return names[level] || "UNKNOWN";
  }

  /**
   * Colorize level for console output
   */
  private colorizeLevel(name: string, level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      0: "\x1b[36m", // Cyan
      1: "\x1b[32m", // Green
      2: "\x1b[33m", // Yellow
      3: "\x1b[31m", // Red
      4: "\x1b[35m", // Magenta
      5: "\x1b[0m", // Reset
    };

    const reset = "\x1b[0m";
    return `${colors[level]}${name}${reset}`;
  }

  /**
   * Set format type
   */
  setType(type: FormatType): void {
    this.config.type = type;
  }

  /**
   * Set custom template
   */
  setTemplate(template: string): void {
    this.config.template = template;
  }

  /**
   * Add a field transformer
   */
  addTransformer(field: string, transformer: (value: any) => any): void {
    this.config.transformers[field] = transformer;
  }

  /**
   * Remove a field transformer
   */
  removeTransformer(field: string): void {
    delete this.config.transformers[field];
  }

  /**
   * Enable/disable timestamp
   */
  setIncludeTimestamp(include: boolean): void {
    this.config.includeTimestamp = include;
  }

  /**
   * Enable/disable context
   */
  setIncludeContext(include: boolean): void {
    this.config.includeContext = include;
  }

  /**
   * Enable/disable stack traces
   */
  setIncludeStackTrace(include: boolean): void {
    this.config.includeStackTrace = include;
  }

  /**
   * Create a JSON formatter
   */
  static json(config?: Partial<FormatterConfig>): LogFormatter {
    return new LogFormatter({
      ...config,
      type: "json",
    });
  }

  /**
   * Create a text formatter
   */
  static text(template?: string, config?: Partial<FormatterConfig>): LogFormatter {
    return new LogFormatter({
      ...config,
      type: "text",
      template,
    });
  }

  /**
   * Create a pretty formatter
   */
  static pretty(config?: Partial<FormatterConfig>): LogFormatter {
    return new LogFormatter({
      ...config,
      type: "pretty",
    });
  }

  /**
   * Create a custom formatter with template
   */
  static custom(template: string, config?: Partial<FormatterConfig>): LogFormatter {
    return new LogFormatter({
      ...config,
      type: "custom",
      template,
    });
  }
}
