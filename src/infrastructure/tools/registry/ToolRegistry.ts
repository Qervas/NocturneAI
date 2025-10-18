/**
 * Tool Registry
 *
 * Central registry for managing tools in the NocturneAI system.
 *
 * Features:
 * - Tool registration and unregistration
 * - Tool lookup by name
 * - Tool filtering by criteria (category, tags, enabled status)
 * - Enable/disable tools
 * - Get tool definitions for LLM
 * - Statistics tracking
 */

import type {
  ITool,
  IToolRegistry,
  ToolFilterCriteria,
  ToolRegistryStats,
} from "../../../core/interfaces/ITool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";

/**
 * Tool Registry Implementation
 */
export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, ITool> = new Map();

  /**
   * Register a tool
   *
   * @param tool - Tool to register
   * @throws Error if tool with same name already exists
   */
  register(tool: ITool): void {
    if (!tool) {
      throw new Error("Tool cannot be null or undefined");
    }

    if (!tool.name) {
      throw new Error("Tool must have a name");
    }

    if (this.tools.has(tool.name)) {
      throw new Error(
        `Tool with name "${tool.name}" is already registered. Use unregister() first to replace it.`,
      );
    }

    // Validate tool has required methods
    if (typeof tool.execute !== "function") {
      throw new Error(`Tool "${tool.name}" must implement execute() method`);
    }

    if (typeof tool.getDefinition !== "function") {
      throw new Error(
        `Tool "${tool.name}" must implement getDefinition() method`,
      );
    }

    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   *
   * @param name - Tool name
   * @returns True if tool was removed, false if not found
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   *
   * @param name - Tool name
   * @returns Tool or undefined if not found
   */
  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   *
   * @returns Array of all tools
   */
  getAll(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools matching criteria
   *
   * @param criteria - Filter criteria
   * @returns Array of matching tools
   */
  find(criteria: ToolFilterCriteria): ITool[] {
    let tools = this.getAll();

    // Filter by category
    if (criteria.category) {
      tools = tools.filter(
        (tool) => tool.metadata.category === criteria.category,
      );
    }

    // Filter by tags (matches any tag)
    if (criteria.tags && criteria.tags.length > 0) {
      tools = tools.filter((tool) => {
        const toolTags = tool.metadata.tags || [];
        return criteria.tags!.some((tag) => toolTags.includes(tag));
      });
    }

    // Filter by enabled status
    if (criteria.enabled !== undefined) {
      tools = tools.filter((tool) => tool.isEnabled() === criteria.enabled);
    }

    // Filter by name pattern (regex)
    if (criteria.namePattern) {
      const regex = new RegExp(criteria.namePattern, "i");
      tools = tools.filter((tool) => regex.test(tool.name));
    }

    // Apply custom filter function
    if (criteria.filter) {
      tools = tools.filter(criteria.filter);
    }

    return tools;
  }

  /**
   * Check if a tool is registered
   *
   * @param name - Tool name
   * @returns True if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool names
   *
   * @returns Array of tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get all tool definitions for LLM
   *
   * @param filter - Optional filter criteria
   * @returns Array of tool definitions
   */
  getDefinitions(filter?: ToolFilterCriteria): ToolDefinition[] {
    const tools = filter ? this.find(filter) : this.getAll();

    // Only include enabled tools by default
    const enabledTools = filter?.enabled === false
      ? tools
      : tools.filter((tool) => tool.isEnabled());

    return enabledTools.map((tool) => tool.getDefinition());
  }

  /**
   * Enable a tool
   *
   * @param name - Tool name
   * @returns True if tool was enabled, false if not found
   */
  enable(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }

    tool.enable();
    return true;
  }

  /**
   * Disable a tool
   *
   * @param name - Tool name
   * @returns True if tool was disabled, false if not found
   */
  disable(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }

    tool.disable();
    return true;
  }

  /**
   * Enable all tools
   */
  enableAll(): void {
    for (const tool of this.tools.values()) {
      tool.enable();
    }
  }

  /**
   * Disable all tools
   */
  disableAll(): void {
    for (const tool of this.tools.values()) {
      tool.disable();
    }
  }

  /**
   * Get registry statistics
   *
   * @returns Registry statistics
   */
  getStats(): ToolRegistryStats {
    const tools = this.getAll();
    const enabledTools = tools.filter((tool) => tool.isEnabled());
    const disabledTools = tools.filter((tool) => !tool.isEnabled());

    // Group by category
    const toolsByCategory: Record<string, number> = {};
    for (const tool of tools) {
      const category = tool.metadata.category || "uncategorized";
      toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;
    }

    // Find most used tool
    let mostUsedTool:
      | { name: string; executionCount: number }
      | undefined = undefined;

    for (const tool of tools) {
      const stats = tool.getStats();
      if (
        !mostUsedTool ||
        stats.executionCount > mostUsedTool.executionCount
      ) {
        mostUsedTool = {
          name: tool.name,
          executionCount: stats.executionCount,
        };
      }
    }

    return {
      totalTools: tools.length,
      enabledTools: enabledTools.length,
      disabledTools: disabledTools.length,
      toolsByCategory,
      mostUsedTool:
        mostUsedTool && mostUsedTool.executionCount > 0
          ? mostUsedTool
          : undefined,
    };
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get tools by category
   *
   * @param category - Category name
   * @returns Array of tools in category
   */
  getByCategory(category: string): ITool[] {
    return this.find({ category });
  }

  /**
   * Get tools by tag
   *
   * @param tag - Tag name
   * @returns Array of tools with tag
   */
  getByTag(tag: string): ITool[] {
    return this.find({ tags: [tag] });
  }

  /**
   * Get enabled tools
   *
   * @returns Array of enabled tools
   */
  getEnabled(): ITool[] {
    return this.find({ enabled: true });
  }

  /**
   * Get disabled tools
   *
   * @returns Array of disabled tools
   */
  getDisabled(): ITool[] {
    return this.find({ enabled: false });
  }

  /**
   * Search tools by name or description
   *
   * @param query - Search query
   * @returns Array of matching tools
   */
  search(query: string): ITool[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (tool) =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get tool categories
   *
   * @returns Array of unique categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const tool of this.tools.values()) {
      const category = tool.metadata.category || "uncategorized";
      categories.add(category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Get all tags
   *
   * @returns Array of unique tags
   */
  getTags(): string[] {
    const tags = new Set<string>();
    for (const tool of this.tools.values()) {
      const toolTags = tool.metadata.tags || [];
      toolTags.forEach((tag) => tags.add(tag));
    }
    return Array.from(tags).sort();
  }

  /**
   * Bulk register tools
   *
   * @param tools - Array of tools to register
   * @returns Number of successfully registered tools
   */
  registerMany(tools: ITool[]): number {
    let count = 0;
    const errors: Array<{ tool: string; error: string }> = [];

    for (const tool of tools) {
      try {
        this.register(tool);
        count++;
      } catch (error) {
        errors.push({
          tool: tool?.name || "unknown",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (errors.length > 0) {
      console.warn(
        `Failed to register ${errors.length} tool(s):`,
        errors,
      );
    }

    return count;
  }

  /**
   * Export registry state
   *
   * @returns Registry state
   */
  export(): {
    tools: Array<{
      name: string;
      enabled: boolean;
      stats: ReturnType<ITool["getStats"]>;
    }>;
    stats: ToolRegistryStats;
  } {
    const tools = this.getAll().map((tool) => ({
      name: tool.name,
      enabled: tool.isEnabled(),
      stats: tool.getStats(),
    }));

    return {
      tools,
      stats: this.getStats(),
    };
  }

  /**
   * Get registry size
   *
   * @returns Number of registered tools
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Check if registry is empty
   *
   * @returns True if no tools registered
   */
  isEmpty(): boolean {
    return this.tools.size === 0;
  }
}

/**
 * Create a tool registry
 *
 * @returns New tool registry instance
 */
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
