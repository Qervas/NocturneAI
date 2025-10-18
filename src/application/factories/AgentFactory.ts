/**
 * Agent Factory
 *
 * Factory for creating fully configured agent instances with all dependencies.
 *
 * Features:
 * - Create agents with LLM client, tools, memory, and context
 * - Load agent configurations from files
 * - Validate agent configurations
 * - Dependency injection for all agent components
 * - Support for different agent types (autonomous, interactive, etc.)
 * - Agent lifecycle management
 */

import type { IContextManager } from "../../core/interfaces/IContextManager.js";
import type { ILLMClient } from "../../core/interfaces/ILLMClient.js";
import type { ITool } from "../../core/interfaces/ITool.js";
import type {
  AgentConfig,
  AgentRole,
  AgentType,
  AgentLLMConfig,
  AgentToolConfig,
  AgentMemoryConfig,
} from "../../infrastructure/config/AgentConfigParser.js";
import { AgentConfigParser } from "../../infrastructure/config/AgentConfigParser.js";
import { ToolFactory } from "./ToolFactory.js";
import { ContextFactory } from "./ContextFactory.js";
import { MemoryStore } from "../../infrastructure/memory/MemoryStore.js";
import { VectorStore } from "../../infrastructure/memory/VectorStore.js";
import { CopilotClient } from "../../infrastructure/llm/CopilotClient.js";

/**
 * Agent Factory Configuration
 */
export interface AgentFactoryConfig {
  /** Tool factory instance */
  toolFactory?: ToolFactory;

  /** Context factory instance */
  contextFactory?: ContextFactory;

  /** Default LLM configuration */
  defaultLLM?: {
    provider: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };

  /** Default agent configuration */
  defaultAgentConfig?: Partial<AgentConfig>;

  /** Whether to enable memory by default */
  enableMemoryByDefault?: boolean;

  /** Whether to validate configurations */
  validateConfigs?: boolean;

  /** Agent configuration directory */
  agentConfigDir?: string;
}

/**
 * Agent Creation Options
 */
export interface AgentCreationOptions {
  /** Override agent ID */
  id?: string;

  /** Override agent name */
  name?: string;

  /** Override system prompt */
  systemPrompt?: string;

  /** Override LLM configuration */
  llm?: Partial<AgentLLMConfig>;

  /** Override tool configuration */
  tools?: Partial<AgentToolConfig>;

  /** Override memory configuration */
  memory?: Partial<AgentMemoryConfig>;

  /** Override context max tokens */
  contextMaxTokens?: number;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Agent Dependencies
 */
export interface AgentDependencies {
  /** LLM client */
  llmClient: ILLMClient;

  /** Context manager */
  contextManager: IContextManager;

  /** Available tools */
  tools: ITool[];

  /** Memory store (optional) */
  memoryStore?: MemoryStore;

  /** Vector store (optional) */
  vectorStore?: VectorStore;

  /** Configuration */
  config: AgentConfig;
}

/**
 * Agent Factory
 */
export class AgentFactory {
  private config: AgentFactoryConfig;
  private toolFactory: ToolFactory;
  private contextFactory: ContextFactory;
  private configParser: AgentConfigParser;

  constructor(config: AgentFactoryConfig = {}) {
    this.config = {
      enableMemoryByDefault: config.enableMemoryByDefault ?? true,
      validateConfigs: config.validateConfigs !== false,
      agentConfigDir: config.agentConfigDir,
      defaultLLM: config.defaultLLM || {
        provider: "openai",
        model: "gpt-4",
      },
      defaultAgentConfig: config.defaultAgentConfig,
    };

    // Initialize tool factory
    this.toolFactory = config.toolFactory || new ToolFactory();

    // Initialize context factory
    this.contextFactory = config.contextFactory || new ContextFactory();

    // Initialize config parser
    this.configParser = new AgentConfigParser();
  }

  /**
   * Create an agent from configuration
   */
  async createAgent(
    config: AgentConfig,
    options: AgentCreationOptions = {},
  ): Promise<AgentDependencies> {
    // Merge with options
    const mergedConfig = this.mergeConfig(config, options);

    // Validate configuration
    if (this.config.validateConfigs) {
      const validation = this.configParser.validate(mergedConfig);
      if (!validation.valid) {
        throw new Error(
          `Invalid agent configuration: ${validation.errors?.join(", ")}`,
        );
      }
    }

    // Create LLM client
    const llmClient = await this.createLLMClient(mergedConfig);

    // Create context manager
    const contextManager = await this.createContextManager(mergedConfig);

    // Create tools
    const tools = await this.createTools(mergedConfig);

    // Create memory stores if enabled
    let memoryStore: MemoryStore | undefined;
    let vectorStore: VectorStore | undefined;

    if (this.shouldEnableMemory(mergedConfig)) {
      const memoryStores = await this.createMemoryStores(mergedConfig);
      memoryStore = memoryStores.memoryStore;
      vectorStore = memoryStores.vectorStore;
    }

    return {
      llmClient,
      contextManager,
      tools,
      memoryStore,
      vectorStore,
      config: mergedConfig,
    };
  }

  /**
   * Create an agent from configuration file
   */
  async createAgentFromFile(
    filePath: string,
    options: AgentCreationOptions = {},
  ): Promise<AgentDependencies> {
    // For now, we need to manually parse the file
    // The configParser.parseFile method needs to be implemented
    throw new Error("createAgentFromFile not yet implemented");
  }

  /**
   * Create an agent by role
   */
  async createAgentByRole(
    role: AgentRole,
    options: AgentCreationOptions = {},
  ): Promise<AgentDependencies> {
    const config = this.getDefaultConfigForRole(role);
    return this.createAgent(config, options);
  }

  /**
   * Create an agent by type
   */
  async createAgentByType(
    type: AgentType,
    name: string,
    options: AgentCreationOptions = {},
  ): Promise<AgentDependencies> {
    const config: AgentConfig = {
      id: options.id || this.generateAgentId(),
      name: options.name || name,
      role: "custom",
      type,
      description: options.metadata?.description,
      ...this.config.defaultAgentConfig,
    };

    return this.createAgent(config, options);
  }

  /**
   * Create multiple agents from configurations
   */
  async createAgents(
    configs: AgentConfig[],
    options: AgentCreationOptions = {},
  ): Promise<AgentDependencies[]> {
    const agents: AgentDependencies[] = [];

    for (const config of configs) {
      try {
        const agent = await this.createAgent(config, options);
        agents.push(agent);
      } catch (error) {
        console.warn(`Failed to create agent ${config.name}:`, error);
      }
    }

    return agents;
  }

  /**
   * Create LLM client from configuration
   */
  private async createLLMClient(config: AgentConfig): Promise<ILLMClient> {
    const llmConfig = config.llm || this.config.defaultLLM!;

    // For now, we only support Copilot (OpenAI-compatible)
    // In the future, this could be extended to support other providers
    if (llmConfig.provider === "openai" || !llmConfig.provider) {
      const apiKey = this.resolveApiKey(llmConfig.apiKey);

      return new CopilotClient({
        apiKey,
        model: llmConfig.model,
        baseURL: llmConfig.baseUrl,
      });
    }

    throw new Error(`Unsupported LLM provider: ${llmConfig.provider}`);
  }

  /**
   * Create context manager from configuration
   */
  private async createContextManager(
    config: AgentConfig,
  ): Promise<IContextManager> {
    const maxTokens = config.maxTokens || 4096;

    // Create context manager based on agent role
    if (config.role && config.role !== "custom") {
      return this.contextFactory.createForAgentRole(
        config.role as
          | "coder"
          | "reviewer"
          | "tester"
          | "researcher"
          | "planner",
        maxTokens,
      );
    }

    // Default context manager
    return this.contextFactory.createContextManager({
      maxTokens,
      systemMessage: config.systemPrompt,
    });
  }

  /**
   * Create tools from configuration
   */
  private async createTools(config: AgentConfig): Promise<ITool[]> {
    if (!config.tools) {
      // Return default tools
      await this.toolFactory.initialize();
      return this.toolFactory.createTools([
        "read_file",
        "write_file",
        "list_directory",
        "execute_command",
      ]);
    }

    return this.toolFactory.createToolsFromConfig(config.tools);
  }

  /**
   * Create memory stores from configuration
   */
  private async createMemoryStores(config: AgentConfig): Promise<{
    memoryStore: MemoryStore;
    vectorStore: VectorStore;
  }> {
    const memoryConfig = config.memory || { enabled: true };

    // Create memory store - pass null for now as we need database wrapper
    // In a real implementation, this would be injected or created properly
    const memoryStore = new MemoryStore(null as any);

    // Create vector store - pass null for now as we need database wrapper
    const vectorStore = new VectorStore(null as any);

    return { memoryStore, vectorStore };
  }

  /**
   * Check if memory should be enabled
   */
  private shouldEnableMemory(config: AgentConfig): boolean {
    if (config.memory !== undefined) {
      return config.memory.enabled;
    }
    return this.config.enableMemoryByDefault!;
  }

  /**
   * Merge configuration with options
   */
  private mergeConfig(
    config: AgentConfig,
    options: AgentCreationOptions,
  ): AgentConfig {
    return {
      ...config,
      id: options.id || config.id,
      name: options.name || config.name,
      systemPrompt: options.systemPrompt || config.systemPrompt,
      llm: options.llm
        ? ({ ...config.llm, ...options.llm } as AgentLLMConfig)
        : config.llm,
      tools: options.tools
        ? ({ ...config.tools, ...options.tools } as AgentToolConfig)
        : config.tools,
      memory: options.memory
        ? ({ ...config.memory, ...options.memory } as AgentMemoryConfig)
        : config.memory,
      maxTokens: options.contextMaxTokens || config.maxTokens,
      metadata: options.metadata
        ? { ...config.metadata, ...options.metadata }
        : config.metadata,
    };
  }

  /**
   * Get default configuration for a role
   */
  private getDefaultConfigForRole(role: AgentRole): AgentConfig {
    const baseConfig: Partial<AgentConfig> = {
      id: this.generateAgentId(),
      role,
      type: "autonomous",
      ...this.config.defaultAgentConfig,
    };

    switch (role) {
      case "coder":
        return {
          ...baseConfig,
          name: "Coder Agent",
          description: "AI agent specialized in writing and modifying code",
          capabilities: ["code_generation", "code_modification", "refactoring"],
          systemPrompt:
            "You are an expert software engineer. Write clean, efficient, and well-documented code.",
          temperature: 0.3,
          tools: {
            enabled: [
              "read_file",
              "write_file",
              "list_directory",
              "code_search",
              "symbol_search",
              "git_status",
              "git_diff",
            ],
          },
        } as AgentConfig;

      case "reviewer":
        return {
          ...baseConfig,
          name: "Reviewer Agent",
          description: "AI agent specialized in code review",
          capabilities: ["code_review", "quality_analysis", "security_audit"],
          systemPrompt:
            "You are an expert code reviewer. Provide detailed, constructive feedback on code quality, security, and best practices.",
          temperature: 0.4,
          tools: {
            enabled: [
              "read_file",
              "list_directory",
              "code_search",
              "git_diff",
              "git_log",
            ],
          },
        } as AgentConfig;

      case "tester":
        return {
          ...baseConfig,
          name: "Tester Agent",
          description: "AI agent specialized in writing and running tests",
          capabilities: [
            "test_generation",
            "test_execution",
            "coverage_analysis",
          ],
          systemPrompt:
            "You are an expert software tester. Write comprehensive test cases and identify edge cases.",
          temperature: 0.5,
          tools: {
            enabled: [
              "read_file",
              "write_file",
              "execute_command",
              "code_search",
            ],
          },
        } as AgentConfig;

      case "architect":
        return {
          ...baseConfig,
          name: "Architect Agent",
          description:
            "AI agent specialized in software architecture and design",
          capabilities: [
            "architecture_design",
            "system_design",
            "technical_decisions",
          ],
          systemPrompt:
            "You are an expert software architect. Design scalable, maintainable systems and make sound technical decisions.",
          temperature: 0.6,
          tools: {
            enabled: [
              "read_file",
              "list_directory",
              "code_search",
              "file_search",
            ],
          },
        } as AgentConfig;

      case "researcher":
        return {
          ...baseConfig,
          name: "Researcher Agent",
          description: "AI agent specialized in research and analysis",
          capabilities: [
            "code_analysis",
            "documentation_search",
            "pattern_recognition",
          ],
          systemPrompt:
            "You are an expert researcher. Analyze codebases, find patterns, and provide insights.",
          temperature: 0.7,
          tools: {
            enabled: [
              "read_file",
              "code_search",
              "file_search",
              "symbol_search",
            ],
          },
        } as AgentConfig;

      case "planner":
        return {
          ...baseConfig,
          name: "Planner Agent",
          description: "AI agent specialized in task planning and coordination",
          capabilities: ["task_planning", "workflow_design", "coordination"],
          systemPrompt:
            "You are an expert planner. Break down complex tasks into manageable steps and coordinate execution.",
          temperature: 0.5,
          tools: {
            enabled: ["read_file", "list_directory", "file_search"],
          },
        } as AgentConfig;

      default:
        return {
          id: this.generateAgentId(),
          name: `${role} Agent`,
          role,
          type: "autonomous",
          tools: { enabled: [] },
        } as AgentConfig;
    }
  }

  /**
   * Resolve API key from configuration or environment
   */
  private resolveApiKey(apiKey?: string): string {
    if (!apiKey) {
      // Try to get from environment
      return process.env.OPENAI_API_KEY || "";
    }

    // If apiKey starts with $, treat it as environment variable reference
    if (apiKey.startsWith("$")) {
      const envVar = apiKey.substring(1);
      return process.env[envVar] || "";
    }

    return apiKey;
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get tool factory
   */
  getToolFactory(): ToolFactory {
    return this.toolFactory;
  }

  /**
   * Get context factory
   */
  getContextFactory(): ContextFactory {
    return this.contextFactory;
  }

  /**
   * Get factory configuration
   */
  getConfig(): Readonly<AgentFactoryConfig> {
    return { ...this.config };
  }

  /**
   * Set default LLM configuration
   */
  setDefaultLLM(config: AgentFactoryConfig["defaultLLM"]): void {
    this.config.defaultLLM = config;
  }

  /**
   * Enable/disable memory by default
   */
  setEnableMemoryByDefault(enabled: boolean): void {
    this.config.enableMemoryByDefault = enabled;
  }
}
