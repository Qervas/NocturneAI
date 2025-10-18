/**
 * Tool Validator
 *
 * Validates tool definitions, names, and arguments.
 *
 * Features:
 * - Tool definition validation
 * - Name validation (format, uniqueness)
 * - Argument validation against JSON Schema
 * - Parameter schema validation
 * - Metadata validation
 */

import { z } from "zod";
import type { ITool, IToolValidator } from "../../../core/interfaces/ITool.js";
import type { ToolDefinition } from "../../../core/types/llm.types.js";

/**
 * Tool name validation rules
 */
const TOOL_NAME_REGEX = /^[a-z][a-z0-9_]*$/;
const MAX_NAME_LENGTH = 64;
const MIN_NAME_LENGTH = 2;

/**
 * Tool description validation rules
 */
const MAX_DESCRIPTION_LENGTH = 500;
const MIN_DESCRIPTION_LENGTH = 10;

/**
 * JSON Schema validator
 */
const jsonSchemaValidator = z.object({
  type: z.string(),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  items: z.any().optional(),
  enum: z.array(z.any()).optional(),
  description: z.string().optional(),
  default: z.any().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  format: z.string().optional(),
  additionalProperties: z.union([z.boolean(), z.any()]).optional(),
  oneOf: z.array(z.any()).optional(),
  anyOf: z.array(z.any()).optional(),
  allOf: z.array(z.any()).optional(),
  not: z.any().optional(),
});

/**
 * Tool definition validator
 */
const toolDefinitionValidator = z.object({
  type: z.literal("function").optional(),
  name: z.string(),
  description: z.string(),
  parameters: jsonSchemaValidator,
  function: z
    .object({
      name: z.string(),
      description: z.string(),
      parameters: jsonSchemaValidator,
    })
    .optional(),
});

/**
 * Tool Validator Implementation
 */
export class ToolValidator implements IToolValidator {
  private registeredNames: Set<string> = new Set();

  /**
   * Validate tool definition
   *
   * @param tool - Tool to validate
   * @returns True if valid, error message if invalid
   */
  validateTool(tool: ITool): boolean | string {
    // Check if tool exists
    if (!tool) {
      return "Tool cannot be null or undefined";
    }

    // Validate name
    const nameValidation = this.validateName(tool.name);
    if (nameValidation !== true) {
      return nameValidation;
    }

    // Validate description
    if (!tool.description || typeof tool.description !== "string") {
      return "Tool must have a description";
    }

    if (tool.description.length < MIN_DESCRIPTION_LENGTH) {
      return `Tool description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
    }

    if (tool.description.length > MAX_DESCRIPTION_LENGTH) {
      return `Tool description must be at most ${MAX_DESCRIPTION_LENGTH} characters`;
    }

    // Validate required methods
    if (typeof tool.execute !== "function") {
      return "Tool must implement execute() method";
    }

    if (typeof tool.getDefinition !== "function") {
      return "Tool must implement getDefinition() method";
    }

    if (typeof tool.validate !== "function") {
      return "Tool must implement validate() method";
    }

    if (typeof tool.isEnabled !== "function") {
      return "Tool must implement isEnabled() method";
    }

    if (typeof tool.getStats !== "function") {
      return "Tool must implement getStats() method";
    }

    // Validate metadata
    if (!tool.metadata || typeof tool.metadata !== "object") {
      return "Tool must have metadata";
    }

    if (!tool.metadata.version || typeof tool.metadata.version !== "string") {
      return "Tool metadata must include version";
    }

    // Validate version format (semantic versioning)
    const versionRegex = /^\d+\.\d+\.\d+(-[a-z0-9]+)?$/;
    if (!versionRegex.test(tool.metadata.version)) {
      return "Tool version must follow semantic versioning (e.g., 1.0.0)";
    }

    // Validate category if provided
    if (tool.metadata.category !== undefined) {
      if (typeof tool.metadata.category !== "string") {
        return "Tool category must be a string";
      }
      if (tool.metadata.category.length === 0) {
        return "Tool category cannot be empty";
      }
    }

    // Validate tags if provided
    if (tool.metadata.tags !== undefined) {
      if (!Array.isArray(tool.metadata.tags)) {
        return "Tool tags must be an array";
      }
      for (const tag of tool.metadata.tags) {
        if (typeof tag !== "string") {
          return "Tool tags must be strings";
        }
      }
    }

    // Validate config
    if (!tool.config || typeof tool.config !== "object") {
      return "Tool must have config";
    }

    if (typeof tool.config.enabled !== "boolean") {
      return "Tool config must include enabled boolean";
    }

    // Validate tool definition
    try {
      const definition = tool.getDefinition();
      const definitionValidation = this.validateDefinition(definition);
      if (definitionValidation !== true) {
        return definitionValidation;
      }
    } catch (error) {
      return `Failed to get tool definition: ${error instanceof Error ? error.message : String(error)}`;
    }

    return true;
  }

  /**
   * Validate tool name
   *
   * @param name - Tool name
   * @returns True if valid, error message if invalid
   */
  validateName(name: string): boolean | string {
    // Check if name exists
    if (!name || typeof name !== "string") {
      return "Tool name must be a non-empty string";
    }

    // Check length
    if (name.length < MIN_NAME_LENGTH) {
      return `Tool name must be at least ${MIN_NAME_LENGTH} characters`;
    }

    if (name.length > MAX_NAME_LENGTH) {
      return `Tool name must be at most ${MAX_NAME_LENGTH} characters`;
    }

    // Check format
    if (!TOOL_NAME_REGEX.test(name)) {
      return "Tool name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores";
    }

    // Check reserved names
    const reservedNames = [
      "constructor",
      "prototype",
      "__proto__",
      "toString",
      "valueOf",
    ];
    if (reservedNames.includes(name)) {
      return `Tool name "${name}" is reserved and cannot be used`;
    }

    return true;
  }

  /**
   * Validate tool arguments
   *
   * @param tool - Tool definition
   * @param args - Arguments to validate
   * @returns True if valid, error message if invalid
   */
  validateArgs(tool: ITool, args: Record<string, unknown>): boolean | string {
    // Get tool definition
    let definition: ToolDefinition;
    try {
      definition = tool.getDefinition();
    } catch (error) {
      return `Failed to get tool definition: ${error instanceof Error ? error.message : String(error)}`;
    }

    // Get parameters schema
    const parameters = definition.parameters || definition.function?.parameters;
    if (!parameters) {
      return "Tool definition missing parameters schema";
    }

    // Check if args is an object
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      return "Arguments must be an object";
    }

    // Validate required parameters
    const required = (parameters.required as string[]) || [];
    for (const requiredParam of required) {
      if (!(requiredParam in args)) {
        return `Missing required parameter: ${requiredParam}`;
      }
      if (args[requiredParam] === null || args[requiredParam] === undefined) {
        return `Parameter "${requiredParam}" cannot be null or undefined`;
      }
    }

    // Validate parameter types
    const properties = (parameters.properties as Record<string, any>) || {};
    for (const [key, value] of Object.entries(args)) {
      // Check if parameter is defined in schema
      if (!(key in (properties as Record<string, any>))) {
        // Check if additional properties are allowed
        if (parameters.additionalProperties === false) {
          return `Unknown parameter: ${key}`;
        }
        continue;
      }

      const schema = (properties as Record<string, any>)[key] as any;
      const typeValidation = this.validateValueAgainstSchema(
        value,
        schema,
        key,
      );
      if (typeValidation !== true) {
        return typeValidation;
      }
    }

    // Use tool's own validation if available
    try {
      const toolValidation = tool.validate(args);
      if (toolValidation !== true) {
        return toolValidation;
      }
    } catch (error) {
      return `Tool validation failed: ${error instanceof Error ? error.message : String(error)}`;
    }

    return true;
  }

  /**
   * Validate tool definition schema
   *
   * @param definition - Tool definition
   * @returns True if valid, error message if invalid
   */
  validateDefinition(definition: ToolDefinition): boolean | string {
    // Validate with Zod schema
    const result = toolDefinitionValidator.safeParse(definition);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message).join(", ");
      return `Invalid tool definition: ${errors}`;
    }

    // Additional validation
    const name = definition.name || definition.function?.name;
    if (!name) {
      return "Tool definition must include a name";
    }

    const nameValidation = this.validateName(name);
    if (nameValidation !== true) {
      return nameValidation;
    }

    const description: string | undefined =
      definition.description || definition.function?.description;
    if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
      return `Tool description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return `Tool description must be at most ${MAX_DESCRIPTION_LENGTH} characters`;
    }

    // Validate parameters schema
    const parameters: any =
      definition.parameters || definition.function?.parameters;
    if (!parameters) {
      return "Tool definition must include parameters schema";
    }

    const schemaValidation = jsonSchemaValidator.safeParse(parameters);
    if (!schemaValidation.success) {
      const errors = schemaValidation.error.errors
        .map((e) => e.message)
        .join(", ");
      return `Invalid parameters schema: ${errors}`;
    }

    // Validate that type is "object" at root level
    if (parameters.type !== "object") {
      return 'Parameters schema root type must be "object"';
    }

    return true;
  }

  /**
   * Validate a value against a JSON Schema property
   */
  private validateValueAgainstSchema(
    value: unknown,
    schema: any,
    paramName: string,
  ): boolean | string {
    const type = schema.type;

    // Type validation
    if (type) {
      const actualType = Array.isArray(value) ? "array" : typeof value;

      if (type === "string" && actualType !== "string") {
        return `Parameter "${paramName}" must be a string`;
      }

      if (type === "number" && actualType !== "number") {
        return `Parameter "${paramName}" must be a number`;
      }

      if (
        type === "integer" &&
        (!Number.isInteger(value) || actualType !== "number")
      ) {
        return `Parameter "${paramName}" must be an integer`;
      }

      if (type === "boolean" && actualType !== "boolean") {
        return `Parameter "${paramName}" must be a boolean`;
      }

      if (type === "array" && !Array.isArray(value)) {
        return `Parameter "${paramName}" must be an array`;
      }

      if (
        type === "object" &&
        (actualType !== "object" || Array.isArray(value))
      ) {
        return `Parameter "${paramName}" must be an object`;
      }
    }

    // Enum validation
    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(value)) {
        return `Parameter "${paramName}" must be one of: ${schema.enum.join(", ")}`;
      }
    }

    // String validations
    if (typeof value === "string") {
      if (schema.minLength && value.length < schema.minLength) {
        return `Parameter "${paramName}" must be at least ${schema.minLength} characters`;
      }

      if (schema.maxLength && value.length > schema.maxLength) {
        return `Parameter "${paramName}" must be at most ${schema.maxLength} characters`;
      }

      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          return `Parameter "${paramName}" does not match required pattern`;
        }
      }
    }

    // Number validations
    if (typeof value === "number") {
      if (schema.minimum !== undefined && value < schema.minimum) {
        return `Parameter "${paramName}" must be at least ${schema.minimum}`;
      }

      if (schema.maximum !== undefined && value > schema.maximum) {
        return `Parameter "${paramName}" must be at most ${schema.maximum}`;
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (schema.minItems && value.length < schema.minItems) {
        return `Parameter "${paramName}" must have at least ${schema.minItems} items`;
      }

      if (schema.maxItems && value.length > schema.maxItems) {
        return `Parameter "${paramName}" must have at most ${schema.maxItems} items`;
      }

      // Validate array items if schema is provided
      if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          const itemValidation = this.validateValueAgainstSchema(
            value[i],
            schema.items,
            `${paramName}[${i}]`,
          );
          if (itemValidation !== true) {
            return itemValidation;
          }
        }
      }
    }

    return true;
  }

  /**
   * Register a tool name (for uniqueness checking)
   *
   * @param name - Tool name to register
   */
  registerName(name: string): void {
    this.registeredNames.add(name);
  }

  /**
   * Unregister a tool name
   *
   * @param name - Tool name to unregister
   */
  unregisterName(name: string): void {
    this.registeredNames.delete(name);
  }

  /**
   * Check if name is already registered
   *
   * @param name - Tool name to check
   * @returns True if name is registered
   */
  isNameRegistered(name: string): boolean {
    return this.registeredNames.has(name);
  }

  /**
   * Clear registered names
   */
  clearRegisteredNames(): void {
    this.registeredNames.clear();
  }

  /**
   * Get all registered names
   *
   * @returns Array of registered tool names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.registeredNames);
  }

  /**
   * Validate multiple tools
   *
   * @param tools - Tools to validate
   * @returns Object with valid tools and errors
   */
  validateMany(tools: ITool[]): {
    valid: ITool[];
    invalid: Array<{ tool: ITool; error: string }>;
  } {
    const valid: ITool[] = [];
    const invalid: Array<{ tool: ITool; error: string }> = [];

    for (const tool of tools) {
      const validation = this.validateTool(tool);
      if (validation === true) {
        valid.push(tool);
      } else {
        invalid.push({ tool, error: validation as string });
      }
    }

    return { valid, invalid };
  }

  /**
   * Get validator statistics
   */
  getStats(): { registeredNames: number } {
    return {
      registeredNames: this.registeredNames.size,
    };
  }
}

/**
 * Create a tool validator
 *
 * @returns New tool validator instance
 */
export function createToolValidator(): ToolValidator {
  return new ToolValidator();
}
