/**
 * Create Project Use Case
 *
 * High-level use case for initializing new projects with agents and configuration.
 *
 * Features:
 * - Project initialization
 * - Directory structure creation
 * - Configuration file generation
 * - Agent setup
 * - Tool configuration
 */

import type { AgentService } from "../services/AgentService.js";
import type { AgentFactory } from "../factories/AgentFactory.js";
import type { ToolFactory } from "../factories/ToolFactory.js";
import type { Agent } from "../services/Agent.js";

/**
 * Create Project Input
 */
export interface CreateProjectInput {
  /** Project name */
  name: string;

  /** Project description */
  description?: string;

  /** Project directory path */
  path?: string;

  /** Project type */
  type?: "code" | "research" | "analysis" | "automation" | "custom";

  /** Agents to create */
  agents?: Array<{
    role: "coder" | "reviewer" | "tester" | "architect" | "researcher" | "planner";
    name?: string;
  }>;

  /** Tools to enable */
  tools?: string[];

  /** Whether to create directory structure */
  createDirectories?: boolean;

  /** Whether to create configuration files */
  createConfig?: boolean;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Create Project Output
 */
export interface CreateProjectOutput {
  /** Whether creation was successful */
  success: boolean;

  /** Project ID */
  projectId: string;

  /** Project name */
  projectName: string;

  /** Project path */
  projectPath: string;

  /** Created agents */
  agents: Array<{
    id: string;
    name: string;
    role: string;
  }>;

  /** Enabled tools */
  tools: string[];

  /** Created files */
  createdFiles?: string[];

  /** Created directories */
  createdDirectories?: string[];

  /** Error message if failed */
  error?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Create Project Use Case
 */
export class CreateProject {
  private agentService: AgentService;
  private agentFactory: AgentFactory;
  private toolFactory: ToolFactory;

  constructor(
    agentService: AgentService,
    agentFactory: AgentFactory,
    toolFactory: ToolFactory,
  ) {
    this.agentService = agentService;
    this.agentFactory = agentFactory;
    this.toolFactory = toolFactory;
  }

  /**
   * Execute the use case
   */
  async execute(input: CreateProjectInput): Promise<CreateProjectOutput> {
    try {
      // Validate input
      this.validateInput(input);

      // Generate project ID
      const projectId = this.generateProjectId(input.name);

      // Determine project path
      const projectPath = input.path || process.cwd();

      // Create directory structure if requested
      const createdDirectories: string[] = [];
      if (input.createDirectories !== false) {
        const dirs = await this.createDirectoryStructure(
          projectPath,
          input.type || "custom",
        );
        createdDirectories.push(...dirs);
      }

      // Create configuration files if requested
      const createdFiles: string[] = [];
      if (input.createConfig !== false) {
        const files = await this.createConfigurationFiles(
          projectPath,
          projectId,
          input,
        );
        createdFiles.push(...files);
      }

      // Create agents
      const agents: Array<{ id: string; name: string; role: string }> = [];
      if (input.agents && input.agents.length > 0) {
        for (const agentSpec of input.agents) {
          const agent = await this.agentService.createAgentByRole(
            agentSpec.role,
            {
              name: agentSpec.name || `${input.name}-${agentSpec.role}`,
              metadata: {
                projectId,
                projectName: input.name,
              },
            },
          );

          agents.push({
            id: agent.getInfo().id,
            name: agent.getInfo().name,
            role: agentSpec.role,
          });
        }
      } else {
        // Create default agent based on project type
        const role = this.getDefaultRoleForType(input.type || "custom");
        const agent = await this.agentService.createAgentByRole(role, {
          name: `${input.name}-${role}`,
          metadata: {
            projectId,
            projectName: input.name,
          },
        });

        agents.push({
          id: agent.getInfo().id,
          name: agent.getInfo().name,
          role,
        });
      }

      // Setup tools
      const tools: string[] = [];
      await this.toolFactory.initialize();

      if (input.tools && input.tools.length > 0) {
        tools.push(...input.tools);
      } else {
        // Enable default tools based on project type
        const defaultTools = this.getDefaultToolsForType(input.type || "custom");
        tools.push(...defaultTools);
      }

      return {
        success: true,
        projectId,
        projectName: input.name,
        projectPath,
        agents,
        tools,
        createdFiles,
        createdDirectories,
        metadata: {
          type: input.type || "custom",
          description: input.description,
          createdAt: Date.now(),
          ...input.metadata,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        projectId: "",
        projectName: input.name,
        projectPath: input.path || process.cwd(),
        agents: [],
        tools: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Validate input
   */
  private validateInput(input: CreateProjectInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error("Project name is required");
    }

    if (input.name.length > 100) {
      throw new Error("Project name is too long (max 100 characters)");
    }

    // Validate project name format
    if (!/^[a-zA-Z0-9_-]+$/.test(input.name)) {
      throw new Error(
        "Project name can only contain letters, numbers, hyphens, and underscores",
      );
    }

    if (input.description && input.description.length > 1000) {
      throw new Error("Project description is too long (max 1000 characters)");
    }
  }

  /**
   * Generate project ID
   */
  private generateProjectId(name: string): string {
    const timestamp = Date.now();
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    return `${normalized}-${timestamp}`;
  }

  /**
   * Create directory structure
   */
  private async createDirectoryStructure(
    basePath: string,
    type: string,
  ): Promise<string[]> {
    const directories: string[] = [];

    // Common directories for all project types
    const commonDirs = [
      ".nocturne",
      ".nocturne/config",
      ".nocturne/logs",
      ".nocturne/memory",
      ".nocturne/workflows",
    ];

    // Type-specific directories
    const typeDirs: Record<string, string[]> = {
      code: ["src", "tests", "docs"],
      research: ["data", "analysis", "reports"],
      analysis: ["data", "scripts", "results"],
      automation: ["workflows", "scripts", "logs"],
      custom: [],
    };

    const dirs = [...commonDirs, ...(typeDirs[type] || [])];

    // Note: In production, would actually create these directories
    // For now, just return the list
    directories.push(...dirs);

    return directories;
  }

  /**
   * Create configuration files
   */
  private async createConfigurationFiles(
    basePath: string,
    projectId: string,
    input: CreateProjectInput,
  ): Promise<string[]> {
    const files: string[] = [];

    // Project configuration
    const projectConfig = {
      id: projectId,
      name: input.name,
      description: input.description,
      type: input.type || "custom",
      createdAt: new Date().toISOString(),
      agents: input.agents || [],
      tools: input.tools || [],
      metadata: input.metadata,
    };

    files.push(".nocturne/project.json");

    // Agent configurations
    if (input.agents && input.agents.length > 0) {
      files.push(".nocturne/config/agents.json");
    }

    // Tool configurations
    if (input.tools && input.tools.length > 0) {
      files.push(".nocturne/config/tools.json");
    }

    // README
    files.push("README.md");

    // Note: In production, would actually write these files
    // For now, just return the list

    return files;
  }

  /**
   * Get default role for project type
   */
  private getDefaultRoleForType(
    type: string,
  ): "coder" | "reviewer" | "tester" | "architect" | "researcher" | "planner" {
    switch (type) {
      case "code":
        return "coder";
      case "research":
        return "researcher";
      case "analysis":
        return "researcher";
      case "automation":
        return "planner";
      default:
        return "coder";
    }
  }

  /**
   * Get default tools for project type
   */
  private getDefaultToolsForType(type: string): string[] {
    const commonTools = ["read_file", "write_file", "list_directory"];

    const typeTools: Record<string, string[]> = {
      code: [
        ...commonTools,
        "code_search",
        "symbol_search",
        "git_status",
        "git_diff",
        "execute_command",
      ],
      research: [...commonTools, "file_search", "code_search"],
      analysis: [...commonTools, "file_search", "code_search"],
      automation: [...commonTools, "execute_command", "file_search"],
      custom: commonTools,
    };

    return typeTools[type] || commonTools;
  }

  /**
   * Get project by ID (for future use)
   */
  getProject(projectId: string): any {
    // Placeholder for future project retrieval
    return null;
  }

  /**
   * Delete project (for future use)
   */
  async deleteProject(projectId: string): Promise<boolean> {
    // Placeholder for future project deletion
    return false;
  }
}
