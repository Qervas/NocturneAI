/**
 * Configuration Validator
 *
 * Validates configuration data against schemas.
 *
 * Features:
 * - Schema-based validation
 * - Type checking
 * - Required field validation
 * - Custom validators
 * - Nested object validation
 * - Array validation
 * - Range validation
 * - Pattern matching
 */

/**
 * Validation Rule Type
 */
export type ValidationType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "enum"
  | "any";

/**
 * Validation Rule
 */
export interface ValidationRule {
  /** Type of the value */
  type: ValidationType;

  /** Is the field required? */
  required?: boolean;

  /** Default value if not provided */
  default?: any;

  /** Minimum value (for numbers) */
  min?: number;

  /** Maximum value (for numbers) */
  max?: number;

  /** Minimum length (for strings/arrays) */
  minLength?: number;

  /** Maximum length (for strings/arrays) */
  maxLength?: number;

  /** Pattern to match (for strings) */
  pattern?: RegExp | string;

  /** Allowed values (for enum) */
  enum?: any[];

  /** Nested schema (for objects) */
  schema?: ValidationSchema;

  /** Array item schema */
  items?: ValidationRule;

  /** Custom validator function */
  validator?: (value: any) => boolean | string;

  /** Description */
  description?: string;
}

/**
 * Validation Schema
 */
export interface ValidationSchema {
  [key: string]: ValidationRule;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  /** Is the configuration valid? */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Warnings */
  warnings: string[];

  /** Validated and coerced data */
  data?: any;
}

/**
 * Configuration Validator
 */
export class ConfigValidator {
  private schema: ValidationSchema;
  private strict: boolean;

  constructor(schema: ValidationSchema, options?: { strict?: boolean }) {
    this.schema = schema;
    this.strict = options?.strict ?? false;
  }

  /**
   * Validate configuration data
   */
  validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const result: any = {};

    // Validate each field in schema
    for (const [key, rule] of Object.entries(this.schema)) {
      const value = data[key];
      const validation = this.validateField(key, value, rule);

      if (!validation.valid) {
        errors.push(...validation.errors);
      }

      warnings.push(...validation.warnings);

      // Use validated/coerced value
      if (validation.value !== undefined) {
        result[key] = validation.value;
      }
    }

    // Check for unknown fields in strict mode
    if (this.strict) {
      for (const key of Object.keys(data)) {
        if (!(key in this.schema)) {
          warnings.push(`Unknown configuration key: ${key}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: errors.length === 0 ? result : undefined,
    };
  }

  /**
   * Validate a single field
   */
  private validateField(
    key: string,
    value: any,
    rule: ValidationRule,
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    value?: any;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let finalValue = value;

    // Check required
    if (rule.required && (value === undefined || value === null)) {
      errors.push(`Required field missing: ${key}`);
      return { valid: false, errors, warnings };
    }

    // Use default if not provided
    if (value === undefined || value === null) {
      if (rule.default !== undefined) {
        finalValue = rule.default;
      } else {
        return { valid: true, errors, warnings, value: finalValue };
      }
    }

    // Type validation
    const typeValidation = this.validateType(key, finalValue, rule);
    if (!typeValidation.valid) {
      errors.push(...typeValidation.errors);
      return { valid: false, errors, warnings };
    }

    // Coerce type if needed
    finalValue = typeValidation.value;

    // Additional validations based on type
    switch (rule.type) {
      case "string":
        const stringValidation = this.validateString(key, finalValue, rule);
        errors.push(...stringValidation.errors);
        warnings.push(...stringValidation.warnings);
        break;

      case "number":
        const numberValidation = this.validateNumber(key, finalValue, rule);
        errors.push(...numberValidation.errors);
        warnings.push(...numberValidation.warnings);
        break;

      case "array":
        const arrayValidation = this.validateArray(key, finalValue, rule);
        errors.push(...arrayValidation.errors);
        warnings.push(...arrayValidation.warnings);
        if (arrayValidation.value !== undefined) {
          finalValue = arrayValidation.value;
        }
        break;

      case "object":
        const objectValidation = this.validateObject(key, finalValue, rule);
        errors.push(...objectValidation.errors);
        warnings.push(...objectValidation.warnings);
        if (objectValidation.value !== undefined) {
          finalValue = objectValidation.value;
        }
        break;

      case "enum":
        const enumValidation = this.validateEnum(key, finalValue, rule);
        errors.push(...enumValidation.errors);
        break;
    }

    // Custom validator
    if (rule.validator) {
      const customResult = rule.validator(finalValue);
      if (customResult === false) {
        errors.push(`Custom validation failed for field: ${key}`);
      } else if (typeof customResult === "string") {
        errors.push(`${key}: ${customResult}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      value: finalValue,
    };
  }

  /**
   * Validate type
   */
  private validateType(
    key: string,
    value: any,
    rule: ValidationRule,
  ): { valid: boolean; errors: string[]; value: any } {
    const errors: string[] = [];
    let finalValue = value;

    if (rule.type === "any") {
      return { valid: true, errors, value: finalValue };
    }

    const actualType = Array.isArray(value) ? "array" : typeof value;

    // Try to coerce types
    if (actualType !== rule.type) {
      const coerced = this.coerceType(value, rule.type);
      if (coerced.success) {
        finalValue = coerced.value;
      } else {
        errors.push(
          `Type mismatch for ${key}: expected ${rule.type}, got ${actualType}`,
        );
        return { valid: false, errors, value: finalValue };
      }
    }

    return { valid: true, errors, value: finalValue };
  }

  /**
   * Coerce value to target type
   */
  private coerceType(
    value: any,
    targetType: ValidationType,
  ): { success: boolean; value: any } {
    try {
      switch (targetType) {
        case "string":
          return { success: true, value: String(value) };

        case "number":
          const num = Number(value);
          return { success: !isNaN(num), value: num };

        case "boolean":
          if (typeof value === "string") {
            if (value === "true" || value === "1") {
              return { success: true, value: true };
            }
            if (value === "false" || value === "0") {
              return { success: true, value: false };
            }
          }
          return { success: false, value };

        case "array":
          if (typeof value === "string") {
            try {
              const parsed = JSON.parse(value);
              return { success: Array.isArray(parsed), value: parsed };
            } catch {
              return { success: false, value };
            }
          }
          return { success: false, value };

        case "object":
          if (typeof value === "string") {
            try {
              const parsed = JSON.parse(value);
              return {
                success: typeof parsed === "object" && !Array.isArray(parsed),
                value: parsed,
              };
            } catch {
              return { success: false, value };
            }
          }
          return { success: false, value };

        default:
          return { success: false, value };
      }
    } catch {
      return { success: false, value };
    }
  }

  /**
   * Validate string
   */
  private validateString(
    key: string,
    value: string,
    rule: ValidationRule,
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(
        `${key}: minimum length is ${rule.minLength}, got ${value.length}`,
      );
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push(
        `${key}: maximum length is ${rule.maxLength}, got ${value.length}`,
      );
    }

    if (rule.pattern) {
      const pattern =
        typeof rule.pattern === "string"
          ? new RegExp(rule.pattern)
          : rule.pattern;

      if (!pattern.test(value)) {
        errors.push(`${key}: does not match pattern ${pattern.source}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate number
   */
  private validateNumber(
    key: string,
    value: number,
    rule: ValidationRule,
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rule.min !== undefined && value < rule.min) {
      errors.push(`${key}: minimum value is ${rule.min}, got ${value}`);
    }

    if (rule.max !== undefined && value > rule.max) {
      errors.push(`${key}: maximum value is ${rule.max}, got ${value}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate array
   */
  private validateArray(
    key: string,
    value: any[],
    rule: ValidationRule,
  ): { errors: string[]; warnings: string[]; value?: any[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const result: any[] = [];

    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(
        `${key}: minimum array length is ${rule.minLength}, got ${value.length}`,
      );
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push(
        `${key}: maximum array length is ${rule.maxLength}, got ${value.length}`,
      );
    }

    // Validate items if schema provided
    if (rule.items) {
      for (let i = 0; i < value.length; i++) {
        const itemValidation = this.validateField(
          `${key}[${i}]`,
          value[i],
          rule.items,
        );

        if (!itemValidation.valid) {
          errors.push(...itemValidation.errors);
        }

        warnings.push(...itemValidation.warnings);

        if (itemValidation.value !== undefined) {
          result.push(itemValidation.value);
        } else {
          result.push(value[i]);
        }
      }

      return { errors, warnings, value: result };
    }

    return { errors, warnings };
  }

  /**
   * Validate object
   */
  private validateObject(
    key: string,
    value: any,
    rule: ValidationRule,
  ): { errors: string[]; warnings: string[]; value?: any } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate nested schema if provided
    if (rule.schema) {
      const nestedValidator = new ConfigValidator(rule.schema, {
        strict: this.strict,
      });
      const validation = nestedValidator.validate(value);

      if (!validation.valid) {
        errors.push(...validation.errors.map((err) => `${key}.${err}`));
      }

      warnings.push(...validation.warnings.map((warn) => `${key}.${warn}`));

      return { errors, warnings, value: validation.data };
    }

    return { errors, warnings };
  }

  /**
   * Validate enum
   */
  private validateEnum(
    key: string,
    value: any,
    rule: ValidationRule,
  ): { errors: string[] } {
    const errors: string[] = [];

    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(
        `${key}: must be one of [${rule.enum.join(", ")}], got ${value}`,
      );
    }

    return { errors };
  }

  /**
   * Update schema
   */
  setSchema(schema: ValidationSchema): void {
    this.schema = schema;
  }

  /**
   * Get schema
   */
  getSchema(): ValidationSchema {
    return this.schema;
  }

  /**
   * Create a validator from JSON schema
   */
  static fromJSONSchema(jsonSchema: any): ConfigValidator {
    // This is a simplified converter
    // For production, consider using a full JSON Schema library
    const schema: ValidationSchema = {};

    if (jsonSchema.properties) {
      for (const [key, prop] of Object.entries(jsonSchema.properties as any)) {
        const propAny = prop as any;
        schema[key] = {
          type: propAny.type || "any",
          required: jsonSchema.required?.includes(key),
          description: propAny.description,
          min: propAny.minimum,
          max: propAny.maximum,
          minLength: propAny.minLength,
          maxLength: propAny.maxLength,
          pattern: propAny.pattern,
          enum: propAny.enum,
          default: propAny.default,
        };
      }
    }

    return new ConfigValidator(schema);
  }
}
