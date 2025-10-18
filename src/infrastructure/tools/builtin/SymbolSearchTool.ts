/**
 * Symbol Search Tool
 *
 * Finds symbol definitions (functions, classes, interfaces, types) in code files.
 *
 * Features:
 * - Find function definitions
 * - Find class definitions
 * - Find interface definitions
 * - Find type definitions
 * - Find variable/constant definitions
 * - Multi-language support (TypeScript, JavaScript, Python, etc.)
 * - Line number and context reporting
 * - Signature extraction
 * - Documentation extraction
 */

import { promises as fs } from "fs";
import { resolve, relative, join, extname } from "path";
import { BaseTool, type BaseToolConfig } from "../BaseTool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";
import type {
  ToolContext,
  ToolResult,
  ToolStats,
} from "../../../core/interfaces/ITool.js";

/**
 * Symbol Search Tool Configuration
 */
export interface SymbolSearchToolConfig extends BaseToolConfig {
  /** Maximum number of results to return */
  maxResults?: number;

  /** Maximum file size to search (bytes) */
  maxFileSize?: number;

  /** Base directory for searches */
  baseDirectory?: string;

  /** Default exclude patterns */
  defaultExcludes?: string[];

  /** Supported file extensions by language */
  supportedExtensions?: string[];
}

/**
 * Symbol Type
 */
export type SymbolType =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "variable"
  | "constant"
  | "method"
  | "enum";

/**
 * Symbol Search Tool Arguments
 */
export interface SymbolSearchArgs {
  /** Symbol name to search for */
  name: string;

  /** Directory to search in */
  directory?: string;

  /** Type of symbol to find (function, class, interface, etc.) */
  symbolType?: SymbolType | "all";

  /** Whether search is case-sensitive */
  caseSensitive?: boolean;

  /** Patterns to exclude (e.g., "node_modules", "*.test.ts") */
  exclude?: string[];

  /** Maximum number of results to return */
  maxResults?: number;

  /** File extensions to search (e.g., ["ts", "js"]) */
  fileExtensions?: string[];

  /** Whether to include documentation/comments */
  includeDocumentation?: boolean;

  /** Whether to include the full signature */
  includeSignature?: boolean;

  /** Whether to search recursively */
  recursive?: boolean;
}

/**
 * Symbol Definition
 */
export interface SymbolDefinition {
  /** Symbol name */
  name: string;

  /** Symbol type */
  type: SymbolType;

  /** File path */
  file: string;

  /** Line number (1-based) */
  line: number;

  /** Column number (1-based) */
  column: number;

  /** Full signature/definition */
  signature?: string;

  /** Documentation/comments */
  documentation?: string;

  /** Context lines around definition */
  context?: string[];

  /** Visibility/access modifier (public, private, etc.) */
  visibility?: string;

  /** Whether symbol is exported */
  exported?: boolean;

  /** Whether symbol is async */
  async?: boolean;

  /** Parent class/namespace (for methods) */
  parent?: string;
}

/**
 * Symbol Search Result
 */
export interface SymbolSearchResult {
  /** Symbol name searched */
  name: string;

  /** Total matches found */
  totalMatches: number;

  /** Number of files searched */
  filesSearched: number;

  /** Found symbol definitions */
  symbols: SymbolDefinition[];

  /** Whether results were truncated */
  truncated: boolean;

  /** Search statistics */
  statistics: {
    searchTimeMs: number;
    matchesByType: Record<string, number>;
    matchesByLanguage: Record<string, number>;
  };
}

/**
 * Language-specific symbol patterns
 */
const SYMBOL_PATTERNS: Record<string, Record<SymbolType | "all", RegExp[]>> = {
  typescript: {
    function: [
      /^export\s+(?:async\s+)?function\s+(\w+)/,
      /^(?:async\s+)?function\s+(\w+)/,
      /^export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
      /^const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
    ],
    class: [
      /^export\s+(?:abstract\s+)?class\s+(\w+)/,
      /^(?:abstract\s+)?class\s+(\w+)/,
    ],
    interface: [/^export\s+interface\s+(\w+)/, /^interface\s+(\w+)/],
    type: [/^export\s+type\s+(\w+)/, /^type\s+(\w+)/],
    variable: [
      /^export\s+let\s+(\w+)/,
      /^let\s+(\w+)/,
      /^export\s+var\s+(\w+)/,
      /^var\s+(\w+)/,
    ],
    constant: [/^export\s+const\s+(\w+)/, /^const\s+(\w+)/],
    method: [
      /^\s+(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(\w+)\s*\(/,
      /^\s+(?:async\s+)?(\w+)\s*\(/,
    ],
    enum: [/^export\s+enum\s+(\w+)/, /^enum\s+(\w+)/],
    all: [],
  },
  javascript: {
    function: [
      /^export\s+(?:async\s+)?function\s+(\w+)/,
      /^(?:async\s+)?function\s+(\w+)/,
      /^export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
      /^const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
    ],
    class: [/^export\s+class\s+(\w+)/, /^class\s+(\w+)/],
    interface: [],
    type: [],
    variable: [/^let\s+(\w+)/, /^var\s+(\w+)/],
    constant: [/^export\s+const\s+(\w+)/, /^const\s+(\w+)/],
    method: [/^\s+(?:async\s+)?(\w+)\s*\(/],
    enum: [],
    all: [],
  },
  python: {
    function: [/^def\s+(\w+)\s*\(/, /^\s+def\s+(\w+)\s*\(/],
    class: [/^class\s+(\w+)\s*[:(]/],
    interface: [],
    type: [],
    variable: [/^(\w+)\s*=/],
    constant: [/^([A-Z_]+)\s*=/],
    method: [/^\s+def\s+(\w+)\s*\(/],
    enum: [],
    all: [],
  },
  go: {
    function: [/^func\s+(\w+)\s*\(/, /^func\s+\(\w+\s+\*?\w+\)\s+(\w+)\s*\(/],
    class: [],
    interface: [/^type\s+(\w+)\s+interface/],
    type: [/^type\s+(\w+)\s+(?:struct|interface)/],
    variable: [/^var\s+(\w+)/],
    constant: [/^const\s+(\w+)/],
    method: [],
    enum: [],
    all: [],
  },
  rust: {
    function: [/^(?:pub\s+)?fn\s+(\w+)/, /^(?:pub\s+)?async\s+fn\s+(\w+)/],
    class: [],
    interface: [/^(?:pub\s+)?trait\s+(\w+)/],
    type: [/^(?:pub\s+)?type\s+(\w+)/, /^(?:pub\s+)?struct\s+(\w+)/],
    variable: [/^let\s+(?:mut\s+)?(\w+)/],
    constant: [/^const\s+(\w+)/],
    method: [/^\s+(?:pub\s+)?fn\s+(\w+)/],
    enum: [/^(?:pub\s+)?enum\s+(\w+)/],
    all: [],
  },
};

// Initialize "all" patterns by combining all types
for (const lang in SYMBOL_PATTERNS) {
  const patterns = SYMBOL_PATTERNS[lang];
  const allPatterns: RegExp[] = [];
  for (const type in patterns) {
    if (type !== "all") {
      allPatterns.push(...patterns[type as SymbolType]);
    }
  }
  patterns.all = allPatterns;
}

/**
 * Symbol Search Tool
 */
export class SymbolSearchTool extends BaseTool {
  private readonly searchConfig: SymbolSearchToolConfig;

  constructor(config: Partial<SymbolSearchToolConfig> = {}) {
    super(
      "symbol_search",
      "Find symbol definitions (functions, classes, interfaces, types) in code files",
      {
        version: "1.0.0",
        category: "search",
        tags: ["search", "symbol", "function", "class", "code"],
        requiresConfirmation: false,
        hasSideEffects: false,
      },
      config,
    );

    this.searchConfig = {
      enabled: true,
      maxResults: 50,
      maxFileSize: 1024 * 1024, // 1MB
      baseDirectory: process.cwd(),
      supportedExtensions: [
        "ts",
        "js",
        "tsx",
        "jsx",
        "py",
        "go",
        "rs",
        "java",
        "cpp",
        "c",
        "h",
      ],
      defaultExcludes: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/coverage/**",
        "**/*.min.js",
        "**/*.map",
      ],
      ...config,
    };
  }

  /**
   * Get tool definition for LLM
   */
  getDefinition(): ToolDefinition {
    return {
      type: "function",
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Symbol name to search for (function, class, etc.)",
          },
          directory: {
            type: "string",
            description: "Directory to search in (default: current directory)",
          },
          symbolType: {
            type: "string",
            enum: [
              "function",
              "class",
              "interface",
              "type",
              "variable",
              "constant",
              "method",
              "enum",
              "all",
            ],
            description: "Type of symbol to find (default: all)",
          },
          caseSensitive: {
            type: "boolean",
            description: "Whether search is case-sensitive (default: true)",
          },
          exclude: {
            type: "array",
            items: { type: "string" },
            description:
              "Patterns to exclude (e.g., ['node_modules', '*.test.ts'])",
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return (default: 50)",
          },
          fileExtensions: {
            type: "array",
            items: { type: "string" },
            description: "File extensions to search (e.g., ['ts', 'js'])",
          },
          includeDocumentation: {
            type: "boolean",
            description:
              "Whether to include documentation/comments (default: true)",
          },
          includeSignature: {
            type: "boolean",
            description: "Whether to include full signature (default: true)",
          },
          recursive: {
            type: "boolean",
            description: "Whether to search recursively (default: true)",
          },
        },
        required: ["name"],
      },
    };
  }

  /**
   * Validate arguments
   */
  validate(args: Record<string, unknown>): true | string {
    const typedArgs = args as Partial<SymbolSearchArgs>;

    if (!typedArgs.name) {
      return "name is required";
    }

    if (typeof typedArgs.name !== "string") {
      return "name must be a string";
    }

    if (typedArgs.name.trim() === "") {
      return "name cannot be empty";
    }

    if (
      typedArgs.directory !== undefined &&
      typeof typedArgs.directory !== "string"
    ) {
      return "directory must be a string";
    }

    const validSymbolTypes: Array<SymbolType | "all"> = [
      "function",
      "class",
      "interface",
      "type",
      "variable",
      "constant",
      "method",
      "enum",
      "all",
    ];

    if (
      typedArgs.symbolType !== undefined &&
      !validSymbolTypes.includes(typedArgs.symbolType)
    ) {
      return `symbolType must be one of: ${validSymbolTypes.join(", ")}`;
    }

    if (
      typedArgs.maxResults !== undefined &&
      (typeof typedArgs.maxResults !== "number" || typedArgs.maxResults < 1)
    ) {
      return "maxResults must be a positive number";
    }

    return true;
  }

  /**
   * Execute the tool
   */
  protected async executeInternal(
    args: Record<string, unknown>,
    _context?: ToolContext,
  ): Promise<ToolResult> {
    const typedArgs = args as Partial<SymbolSearchArgs>;
    const startTime = Date.now();

    try {
      // Validate name
      if (!typedArgs.name) {
        return {
          success: false,
          error: "name is required",
        };
      }

      // Resolve directory
      const searchDir = typedArgs.directory
        ? resolve(this.searchConfig.baseDirectory!, typedArgs.directory)
        : this.searchConfig.baseDirectory!;

      // Check directory exists
      try {
        const stats = await fs.stat(searchDir);
        if (!stats.isDirectory()) {
          return {
            success: false,
            error: `Path is not a directory: ${searchDir}`,
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Directory not found: ${searchDir}`,
        };
      }

      // Search configuration
      const maxResults = typedArgs.maxResults ?? this.searchConfig.maxResults!;
      const symbolType = typedArgs.symbolType ?? "all";
      const caseSensitive = typedArgs.caseSensitive !== false;
      const recursive = typedArgs.recursive !== false;
      const includeDocumentation = typedArgs.includeDocumentation !== false;
      const includeSignature = typedArgs.includeSignature !== false;

      // Exclude patterns
      const excludePatterns = [
        ...(this.searchConfig.defaultExcludes ?? []),
        ...(typedArgs.exclude ?? []),
      ];

      // File extensions
      const fileExtensions =
        typedArgs.fileExtensions ?? this.searchConfig.supportedExtensions!;

      // Collect files to search
      const filesToSearch = await this.collectFiles(
        searchDir,
        recursive,
        excludePatterns,
        fileExtensions,
      );

      // Search for symbols
      const symbols: SymbolDefinition[] = [];
      const matchesByType: Record<string, number> = {};
      const matchesByLanguage: Record<string, number> = {};
      let truncated = false;

      for (const file of filesToSearch) {
        if (symbols.length >= maxResults) {
          truncated = true;
          break;
        }

        const fileSymbols = await this.searchFile(
          file,
          searchDir,
          typedArgs.name,
          caseSensitive,
          symbolType,
          includeDocumentation,
          includeSignature,
          maxResults - symbols.length,
        );

        for (const symbol of fileSymbols) {
          symbols.push(symbol);
          matchesByType[symbol.type] = (matchesByType[symbol.type] ?? 0) + 1;

          const ext = extname(file).slice(1).toLowerCase();
          const language = this.getLanguageFromExtension(ext);
          matchesByLanguage[language] = (matchesByLanguage[language] ?? 0) + 1;
        }
      }

      const searchTimeMs = Date.now() - startTime;

      const result: SymbolSearchResult = {
        name: typedArgs.name!,
        totalMatches: symbols.length,
        filesSearched: filesToSearch.length,
        symbols,
        truncated,
        statistics: {
          searchTimeMs,
          matchesByType,
          matchesByLanguage,
        },
      };

      return {
        success: true,
        data: result,
        metadata: {
          toolName: this.name,
          toolVersion: this.metadata.version,
          filesSearched: filesToSearch.length,
          symbolsFound: symbols.length,
          searchTimeMs,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Symbol search failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          toolName: this.name,
          toolVersion: this.metadata.version,
        },
      };
    }
  }

  /**
   * Collect files to search
   */
  private async collectFiles(
    directory: string,
    recursive: boolean,
    excludePatterns: string[],
    fileExtensions: string[],
  ): Promise<string[]> {
    const files: string[] = [];

    const walkDir = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = relative(directory, fullPath);

        // Check exclude patterns
        if (this.matchesPattern(relativePath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          if (recursive) {
            await walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          // Check file extension
          const ext = extname(entry.name).slice(1).toLowerCase();
          if (fileExtensions.includes(ext)) {
            // Check file size
            try {
              const stats = await fs.stat(fullPath);
              if (stats.size <= this.searchConfig.maxFileSize!) {
                files.push(fullPath);
              }
            } catch {
              // Skip files we can't stat
            }
          }
        }
      }
    };

    await walkDir(directory);
    return files;
  }

  /**
   * Search a single file for symbol definitions
   */
  private async searchFile(
    filePath: string,
    baseDir: string,
    symbolName: string,
    caseSensitive: boolean,
    symbolType: SymbolType | "all",
    includeDocumentation: boolean,
    includeSignature: boolean,
    maxMatches: number,
  ): Promise<SymbolDefinition[]> {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const lines = content.split("\n");
      const symbols: SymbolDefinition[] = [];
      const relativePath = relative(baseDir, filePath);

      // Determine language
      const ext = extname(filePath).slice(1).toLowerCase();
      const language = this.getLanguageFromExtension(ext);
      const patterns = SYMBOL_PATTERNS[language];

      if (!patterns) {
        return [];
      }

      // Get patterns for the requested symbol type
      const searchPatterns =
        symbolType === "all"
          ? patterns.all
          : (patterns[symbolType as SymbolType] ?? []);

      // Search for symbols
      for (let i = 0; i < lines.length; i++) {
        if (symbols.length >= maxMatches) {
          break;
        }

        const line = lines[i];
        const trimmedLine = line.trim();

        // Try each pattern
        for (const pattern of searchPatterns) {
          const match = trimmedLine.match(pattern);
          if (match && match[1]) {
            const matchedName = match[1];

            // Check if name matches
            const nameMatches = caseSensitive
              ? matchedName === symbolName
              : matchedName.toLowerCase() === symbolName.toLowerCase();

            if (!nameMatches) {
              continue;
            }

            // Determine symbol type from pattern
            const detectedType = this.detectSymbolType(
              trimmedLine,
              language,
              patterns,
            );

            // Extract additional information
            const visibility = this.extractVisibility(trimmedLine);
            const isExported = trimmedLine.includes("export");
            const isAsync = trimmedLine.includes("async");

            // Extract documentation
            let documentation: string | undefined;
            if (includeDocumentation) {
              documentation = this.extractDocumentation(lines, i);
            }

            // Extract signature
            let signature: string | undefined;
            if (includeSignature) {
              signature = this.extractSignature(lines, i, language);
            }

            // Extract context
            const context = this.extractContext(lines, i);

            symbols.push({
              name: matchedName,
              type: detectedType,
              file: relativePath,
              line: i + 1,
              column: line.indexOf(matchedName) + 1,
              signature,
              documentation,
              context,
              visibility,
              exported: isExported,
              async: isAsync,
            });

            if (symbols.length >= maxMatches) {
              break;
            }
          }
        }
      }

      return symbols;
    } catch (error) {
      // Skip files we can't read
      return [];
    }
  }

  /**
   * Detect symbol type from line content
   */
  private detectSymbolType(
    line: string,
    language: string,
    patterns: Record<SymbolType | "all", RegExp[]>,
  ): SymbolType {
    const types: SymbolType[] = [
      "function",
      "class",
      "interface",
      "type",
      "enum",
      "constant",
      "variable",
      "method",
    ];

    for (const type of types) {
      const typePatterns = patterns[type];
      if (typePatterns.some((p) => p.test(line))) {
        return type;
      }
    }

    return "function"; // Default
  }

  /**
   * Extract visibility modifier
   */
  private extractVisibility(line: string): string | undefined {
    if (line.includes("private")) return "private";
    if (line.includes("protected")) return "protected";
    if (line.includes("public")) return "public";
    return undefined;
  }

  /**
   * Extract documentation/comments
   */
  private extractDocumentation(
    lines: string[],
    lineIndex: number,
  ): string | undefined {
    const docs: string[] = [];
    let i = lineIndex - 1;

    // Look backwards for JSDoc or comments
    while (i >= 0) {
      const line = lines[i].trim();

      if (line === "*/") {
        // Found end of JSDoc, continue backwards
        i--;
        continue;
      }

      if (line.startsWith("*") && !line.startsWith("*/")) {
        // JSDoc line
        docs.unshift(line.replace(/^\*\s?/, ""));
        i--;
        continue;
      }

      if (line.startsWith("/**")) {
        // Start of JSDoc
        break;
      }

      if (line.startsWith("//")) {
        // Single line comment
        docs.unshift(line.replace(/^\/\/\s?/, ""));
        i--;
        continue;
      }

      if (line.startsWith("#")) {
        // Python comment
        docs.unshift(line.replace(/^#\s?/, ""));
        i--;
        continue;
      }

      // Empty line is OK
      if (line === "") {
        i--;
        continue;
      }

      // Non-comment line, stop
      break;
    }

    return docs.length > 0 ? docs.join("\n") : undefined;
  }

  /**
   * Extract signature
   */
  private extractSignature(
    lines: string[],
    lineIndex: number,
    language: string,
  ): string {
    const signatureLines: string[] = [];
    let i = lineIndex;
    let braceCount = 0;
    let foundOpening = false;

    // Get lines until we find the opening brace or semicolon
    while (i < lines.length && signatureLines.length < 10) {
      const line = lines[i];
      signatureLines.push(line);

      // Count braces
      for (const char of line) {
        if (char === "{") {
          braceCount++;
          foundOpening = true;
        } else if (char === "}") {
          braceCount--;
        }
      }

      // Stop at semicolon (interface/type) or opening brace
      if (line.includes(";") || (foundOpening && braceCount > 0)) {
        break;
      }

      i++;
    }

    return signatureLines.join("\n").trim();
  }

  /**
   * Extract context lines around definition
   */
  private extractContext(lines: string[], lineIndex: number): string[] {
    const contextBefore = 2;
    const contextAfter = 2;

    const start = Math.max(0, lineIndex - contextBefore);
    const end = Math.min(lines.length, lineIndex + contextAfter + 1);

    return lines.slice(start, end);
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      go: "go",
      rs: "rust",
      java: "java",
      cpp: "cpp",
      c: "c",
      h: "c",
    };

    return languageMap[ext] ?? "javascript";
  }

  /**
   * Check if path matches any pattern
   */
  private matchesPattern(path: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
      return false;
    }

    const normalizedPath = path.replace(/\\/g, "/");

    return patterns.some((pattern) => {
      const normalizedPattern = pattern.replace(/\\/g, "/");
      const regexPattern = normalizedPattern
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, "<<<DOUBLESTAR>>>")
        .replace(/\*/g, "[^/]*")
        .replace(/<<<DOUBLESTAR>>>/g, ".*")
        .replace(/\?/g, ".");

      return new RegExp(`^${regexPattern}$`).test(normalizedPath);
    });
  }

  /**
   * Get tool statistics
   */
  getStats(): ToolStats & {
    searchConfig: SymbolSearchToolConfig;
  } {
    return {
      ...this.stats,
      searchConfig: this.searchConfig,
    };
  }
}
