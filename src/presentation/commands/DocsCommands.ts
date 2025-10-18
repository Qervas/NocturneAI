/**
 * Documentation Commands
 *
 * CLI commands for generating API documentation from TypeScript source files.
 *
 * Commands:
 * - docs generate: Generate API documentation
 * - docs serve: Serve documentation locally
 *
 * @module DocsCommands
 */

import { Command } from "commander";
import { BaseCommand } from "./BaseCommand";
import { createApiDocsGenerator, DocOutputOptions } from "../docs";
import * as path from "path";
import * as fs from "fs/promises";

/**
 * Documentation generation options
 */
interface DocsGenerateOptions {
  output?: string;
  format?: "markdown" | "html" | "json";
  title?: string;
  description?: string;
  includePrivate?: boolean;
  includeInternal?: boolean;
  groupBy?: "type" | "module" | "none";
  watch?: boolean;
}

/**
 * Documentation Commands
 *
 * Handles all documentation-related CLI commands.
 *
 * @example
 * ```bash
 * # Generate markdown documentation
 * nocturne docs generate src/**\/*.ts --output docs/API.md
 *
 * # Generate HTML documentation
 * nocturne docs generate src/**\/*.ts --format html --output docs/api.html
 *
 * # Generate JSON documentation with private members
 * nocturne docs generate src/**\/*.ts --format json --include-private
 *
 * # Generate docs with custom title
 * nocturne docs generate src/**\/*.ts --title "My API" --description "API documentation"
 * ```
 */
export class DocsCommands extends BaseCommand {
  constructor() {
    super("docs", "Generate and manage API documentation");
  }

  /**
   * Execute command (not used - using action handlers instead)
   */
  protected async execute(_context: any): Promise<any> {
    return { success: true };
  }

  /**
   * Register documentation commands
   */
  register(program: Command): void {
    const docs = program
      .command("docs")
      .description("Generate and manage API documentation");

    // Generate command
    docs
      .command("generate <sources...>")
      .description("Generate API documentation from TypeScript files")
      .option("-o, --output <path>", "Output file path", "docs/API.md")
      .option(
        "-f, --format <format>",
        "Output format (markdown, html, json)",
        "markdown",
      )
      .option("-t, --title <title>", "Documentation title", "API Documentation")
      .option("-d, --description <desc>", "Documentation description")
      .option("--include-private", "Include private members", false)
      .option("--include-internal", "Include internal members", false)
      .option("--group-by <type>", "Group by (type, module, none)", "type")
      .option("-w, --watch", "Watch for changes and regenerate", false)
      .action(async (sources: string[], options: DocsGenerateOptions) => {
        await this.handleGenerate(sources, options);
      });

    // Info command
    docs
      .command("info")
      .description("Show documentation statistics")
      .argument("[sources...]", "Source files to analyze")
      .action(async (sources: string[]) => {
        await this.handleInfo(sources);
      });

    // Validate command
    docs
      .command("validate")
      .description("Validate JSDoc comments in source files")
      .argument("<sources...>", "Source files to validate")
      .option("--strict", "Strict mode (fail on warnings)", false)
      .action(async (sources: string[], options: { strict?: boolean }) => {
        await this.handleValidate(sources, options);
      });
  }

  /**
   * Handle docs generate command
   */
  private async handleGenerate(
    sources: string[],
    options: DocsGenerateOptions,
  ): Promise<void> {
    try {
      this.info("Generating API documentation...");
      this.info(`Sources: ${sources.join(", ")}`);
      this.info(`Format: ${options.format}`);
      this.info(`Output: ${options.output}`);

      const docOptions: DocOutputOptions = {
        format: options.format || "markdown",
        title: options.title || "API Documentation",
        description: options.description,
        includePrivate: options.includePrivate || false,
        includeInternal: options.includeInternal || false,
        includeToc: true,
        groupBy: (options.groupBy as "type" | "module" | "none") || "type",
      };

      const generator = createApiDocsGenerator(docOptions);

      // Add source files
      await generator.addSourceFiles(sources);

      const nodes = generator.getNodes();
      this.success(`Parsed ${nodes.length} documentation nodes`);

      // Generate documentation
      const docs = await generator.generate();

      // Write to file
      const outputPath = options.output || "docs/API.md";
      await generator.writeToFile(outputPath, docs);

      this.success(`Documentation generated: ${outputPath}`);

      // Show statistics
      const stats = this.calculateStats(nodes);
      this.info("\nStatistics:");
      this.info(`  Interfaces: ${stats.interfaces}`);
      this.info(`  Classes: ${stats.classes}`);
      this.info(`  Functions: ${stats.functions}`);
      this.info(`  Types: ${stats.types}`);
      this.info(`  Enums: ${stats.enums}`);
      this.info(`  Total: ${stats.total}`);

      // Watch mode
      if (options.watch) {
        this.info("\nWatching for changes...");
        await this.watchFiles(sources, outputPath, docOptions);
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Handle docs info command
   */
  private async handleInfo(sources: string[]): Promise<void> {
    try {
      const sourcePaths = sources.length > 0 ? sources : ["src/**/*.ts"];

      this.info("Analyzing documentation coverage...");

      const generator = createApiDocsGenerator({
        format: "json",
        includePrivate: true,
        includeInternal: true,
      });

      await generator.addSourceFiles(sourcePaths);
      const nodes = generator.getNodes();

      const stats = this.calculateStats(nodes);
      const coverage = this.calculateCoverage(nodes);

      this.info("\n📊 Documentation Statistics:");
      this.info("─".repeat(50));
      this.info(`Total Items: ${stats.total}`);
      this.info(`  • Interfaces: ${stats.interfaces}`);
      this.info(`  • Classes: ${stats.classes}`);
      this.info(`  • Functions: ${stats.functions}`);
      this.info(`  • Types: ${stats.types}`);
      this.info(`  • Enums: ${stats.enums}`);
      this.info(`  • Variables: ${stats.variables}`);

      this.info("\n📝 Documentation Coverage:");
      this.info("─".repeat(50));
      this.info(`Overall: ${coverage.overall.toFixed(1)}%`);
      this.info(
        `  • With Descriptions: ${coverage.withDescription}/${stats.total}`,
      );
      this.info(`  • With Examples: ${coverage.withExamples}/${stats.total}`);
      this.info(`  • Deprecated: ${coverage.deprecated}`);

      if (coverage.overall < 80) {
        this.warn("\n⚠️  Documentation coverage is below 80%");
      } else if (coverage.overall < 100) {
        this.info("\n✓ Good documentation coverage");
      } else {
        this.success("\n✓ Excellent! 100% documentation coverage");
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Handle docs validate command
   */
  private async handleValidate(
    sources: string[],
    options: { strict?: boolean },
  ): Promise<void> {
    try {
      this.info("Validating JSDoc comments...");

      const generator = createApiDocsGenerator({
        format: "json",
        includePrivate: false,
        includeInternal: false,
      });

      await generator.addSourceFiles(sources);
      const nodes = generator.getNodes();

      const issues: string[] = [];
      let warnings = 0;
      let errors = 0;

      for (const node of nodes) {
        // Check if node has description
        if (!node.description) {
          const issue = `Missing description: ${node.type} ${node.name} (${node.filePath}:${node.line})`;
          issues.push(issue);
          warnings++;
        }

        // Check methods
        if (node.methods) {
          for (const method of node.methods) {
            if (!method.description) {
              const issue = `Missing method description: ${node.name}.${method.name}`;
              issues.push(issue);
              warnings++;
            }

            // Check if all parameters have descriptions
            for (const param of method.parameters) {
              if (!param.description) {
                const issue = `Missing parameter description: ${node.name}.${method.name}(${param.name})`;
                issues.push(issue);
                warnings++;
              }
            }

            // Check if return value has description
            if (method.returnType !== "void" && !method.returnDescription) {
              const issue = `Missing return description: ${node.name}.${method.name}`;
              issues.push(issue);
              warnings++;
            }
          }
        }

        // Check properties
        if (node.properties) {
          for (const prop of node.properties) {
            if (!prop.description) {
              const issue = `Missing property description: ${node.name}.${prop.name}`;
              issues.push(issue);
              warnings++;
            }
          }
        }
      }

      if (issues.length === 0) {
        this.success("✓ All JSDoc comments are valid!");
      } else {
        this.warn(`\nFound ${warnings} warnings and ${errors} errors:\n`);
        issues.forEach((issue) => this.warn(`  • ${issue}`));

        if (options.strict) {
          this.error("\nValidation failed in strict mode");
          process.exit(1);
        }
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Watch files for changes
   */
  private async watchFiles(
    sources: string[],
    outputPath: string,
    options: DocOutputOptions,
  ): Promise<void> {
    // Get all source files
    const files = await this.resolveSourceFiles(sources);

    // Simple file watcher (in production, use chokidar or similar)
    const watchFile = async (file: string) => {
      const stats = await fs.stat(file);
      let lastMtime = stats.mtime;

      setInterval(async () => {
        try {
          const newStats = await fs.stat(file);
          if (newStats.mtime > lastMtime) {
            lastMtime = newStats.mtime;
            this.info(`File changed: ${file}`);
            await this.regenerateDocs(sources, outputPath, options);
          }
        } catch {
          // File might be deleted
        }
      }, 1000);
    };

    for (const file of files) {
      await watchFile(file);
    }
  }

  /**
   * Regenerate documentation
   */
  private async regenerateDocs(
    sources: string[],
    outputPath: string,
    options: DocOutputOptions,
  ): Promise<void> {
    try {
      const generator = createApiDocsGenerator(options);
      await generator.addSourceFiles(sources);
      const docs = await generator.generate();
      await generator.writeToFile(outputPath, docs);
      this.success("Documentation regenerated");
    } catch (error) {
      this.error(`Failed to regenerate: ${(error as Error).message}`);
    }
  }

  /**
   * Resolve source files from patterns
   */
  private async resolveSourceFiles(patterns: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of patterns) {
      if (!pattern.includes("*")) {
        files.push(pattern);
      } else {
        // Simple glob resolution (use glob library in production)
        const dir = path.dirname(pattern.replace(/\*\*.*/, ""));
        const dirFiles = await this.findTsFiles(dir);
        files.push(...dirFiles);
      }
    }

    return files;
  }

  /**
   * Find TypeScript files recursively
   */
  private async findTsFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...(await this.findTsFiles(fullPath)));
        } else if (
          entry.isFile() &&
          entry.name.endsWith(".ts") &&
          !entry.name.endsWith(".d.ts")
        ) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return files;
  }

  /**
   * Calculate documentation statistics
   */
  private calculateStats(nodes: any[]): {
    interfaces: number;
    classes: number;
    functions: number;
    types: number;
    enums: number;
    variables: number;
    total: number;
  } {
    const stats = {
      interfaces: 0,
      classes: 0,
      functions: 0,
      types: 0,
      enums: 0,
      variables: 0,
      total: nodes.length,
    };

    for (const node of nodes) {
      switch (node.type) {
        case "interface":
          stats.interfaces++;
          break;
        case "class":
          stats.classes++;
          break;
        case "function":
          stats.functions++;
          break;
        case "type":
          stats.types++;
          break;
        case "enum":
          stats.enums++;
          break;
        case "variable":
          stats.variables++;
          break;
      }
    }

    return stats;
  }

  /**
   * Calculate documentation coverage
   */
  private calculateCoverage(nodes: any[]): {
    overall: number;
    withDescription: number;
    withExamples: number;
    deprecated: number;
  } {
    let withDescription = 0;
    let withExamples = 0;
    let deprecated = 0;

    for (const node of nodes) {
      if (node.description) withDescription++;
      if (node.examples && node.examples.length > 0) withExamples++;
      if (node.deprecated) deprecated++;
    }

    return {
      overall: nodes.length > 0 ? (withDescription / nodes.length) * 100 : 0,
      withDescription,
      withExamples,
      deprecated,
    };
  }
}
