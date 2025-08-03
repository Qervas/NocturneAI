import { abilityManager } from "../../services/core/AbilityManager";

export interface WorkspaceFileInfo {
  path: string;
  name: string;
  size: number;
  type: "file" | "directory";
  lastModified: Date;
  content?: string;
}

export interface WorkspaceOperationResult {
  success: boolean;
  message?: string;
  error?: string;
  files?: WorkspaceFileInfo[];
  content?: string;
  path?: string;
}

interface TauriFileListResult {
  files: WorkspaceFileInfo[];
}

interface TauriFileResult {
  content: string;
}

interface TauriOperationResult {
  success: boolean;
}

export interface WorkspaceConfig {
  workspacePath: string;
  allowedExtensions: string[];
  maxFileSize: number; // in bytes
  allowedOperations: string[];
  createBackups: boolean;
}

// Default configuration
export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  workspacePath: "./workspace",
  allowedExtensions: [
    ".txt",
    ".md",
    ".log",
    ".csv",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".js",
    ".ts",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".html",
    ".css",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".sql",
    ".sh",
    ".bat",
    ".ps1",
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedOperations: [
    "read",
    "write",
    "list",
    "create",
    "delete",
    "move",
    "copy",
  ],
  createBackups: true,
};

export class WorkspaceDirectoryAbility {
  id = "workspace";
  name = "Workspace Directory";
  description = "Work with files in a workspace directory";
  category = "file_operations";
  config: WorkspaceConfig;

  constructor(config: Partial<WorkspaceConfig> = {}) {
    this.config = { ...DEFAULT_WORKSPACE_CONFIG, ...config };
  }

  canExecute(agentId: string, params?: any): boolean {
    if (!params?.operation) {
      return false;
    }

    const { operation, path } = params;

    // Check if operation is allowed
    if (!this.config.allowedOperations.includes(operation)) {
      return false;
    }

    // For file operations, check path safety
    if (path && !this.isPathSafe(path)) {
      return false;
    }

    return true;
  }

  async execute(
    agentId: string,
    params?: any,
  ): Promise<WorkspaceOperationResult> {
    try {
      const { operation, path, content, targetPath } = params;

      switch (operation) {
        case "list":
          return await this.listFiles(path);
        case "read":
          return await this.readFile(path);
        case "write":
          return await this.writeFile(path, content);
        case "create":
          return await this.createFile(path, content);
        case "delete":
          return await this.deleteFile(path);
        case "move":
          return await this.moveFile(path, targetPath);
        case "copy":
          return await this.copyFile(path, targetPath);
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private async listFiles(path?: string): Promise<WorkspaceOperationResult> {
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const tauriModule = await import(
            /* @vite-ignore */ "@tauri-apps/api/core"
          );
          const { invoke } = tauriModule;

          const result = (await invoke("list_workspace_files", {
            path: path || this.config.workspacePath,
          })) as TauriFileListResult;

          return {
            success: true,
            files: result.files,
            message: `Listed ${result.files?.length || 0} files`,
          };
        } catch (tauriError) {
          console.warn(
            "Tauri API not available, falling back to simulation:",
            tauriError,
          );
          // Fall through to simulation
        }
      }

      // Fallback for web environment - simulate file listing
      console.log("📁 Workspace files simulated (web environment):", path);

      const mockFiles: WorkspaceFileInfo[] = [
        {
          path: "./workspace/test.txt",
          name: "test.txt",
          size: 1024,
          type: "file" as const,
          lastModified: new Date(),
          content: "This is a test file",
        },
        {
          path: "./workspace/README.md",
          name: "README.md",
          size: 2048,
          type: "file" as const,
          lastModified: new Date(),
          content: "# Project README\n\nThis is a sample project.",
        },
        {
          path: "./workspace/config.json",
          name: "config.json",
          size: 512,
          type: "file" as const,
          lastModified: new Date(),
          content: '{"name": "test-project", "version": "1.0.0"}',
        },
      ];

      return {
        success: true,
        files: mockFiles,
        message: `Listed ${mockFiles.length} files (simulated)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list files",
      };
    }
  }

  private async readFile(path: string): Promise<WorkspaceOperationResult> {
    try {
      if (!this.isPathSafe(path)) {
        return {
          success: false,
          error: "Path is not safe or allowed",
        };
      }

      // Check if we're in a Tauri environment
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const tauriModule = await import(
            /* @vite-ignore */ "@tauri-apps/api/core"
          );
          const { invoke } = tauriModule;

          const result = (await invoke("read_workspace_file", {
            path: this.resolvePath(path),
          })) as TauriFileResult;

          return {
            success: true,
            content: result.content,
            path,
            message: `Read file: ${path}`,
          };
        } catch (tauriError) {
          console.warn(
            "Tauri API not available, falling back to simulation:",
            tauriError,
          );
          // Fall through to simulation
        }
      }

      // Fallback for web environment - simulate file reading
      console.log("📖 File read simulated (web environment):", path);

      const mockContent = `# Simulated File Content

This is a simulated file read in web environment.

File: ${path}
Timestamp: ${new Date().toISOString()}

## Content
This content is simulated for development purposes.
The actual file system operations are only available in the Tauri desktop app.`;

      return {
        success: true,
        content: mockContent,
        path,
        message: `Read file: ${path} (simulated)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read file",
      };
    }
  }

  private async writeFile(
    path: string,
    content: string,
  ): Promise<WorkspaceOperationResult> {
    try {
      if (!this.isPathSafe(path)) {
        return {
          success: false,
          error: "Path is not safe or allowed",
        };
      }

      if (!this.isFileTypeAllowed(path)) {
        return {
          success: false,
          error: "File type not allowed",
        };
      }

      if (content.length > this.config.maxFileSize) {
        return {
          success: false,
          error: `File size exceeds maximum allowed size (${this.config.maxFileSize} bytes)`,
        };
      }

      // Check if we're in a Tauri environment
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const tauriModule = await import(
            /* @vite-ignore */ "@tauri-apps/api/core"
          );
          const { invoke } = tauriModule;

          const result = (await invoke("write_workspace_file", {
            path: this.resolvePath(path),
            content,
            createBackup: this.config.createBackups,
          })) as TauriOperationResult;

          return {
            success: true,
            path,
            message: `Wrote file: ${path}`,
          };
        } catch (tauriError) {
          console.warn(
            "Tauri API not available, falling back to simulation:",
            tauriError,
          );
          // Fall through to simulation
        }
      }

      // Fallback for web environment - simulate file writing
      console.log("✏️ File write simulated (web environment):", path);

      return {
        success: true,
        path,
        message: `Wrote file: ${path} (simulated)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to write file",
      };
    }
  }

  private async createFile(
    path: string,
    content?: string,
  ): Promise<WorkspaceOperationResult> {
    try {
      if (!this.isPathSafe(path)) {
        return {
          success: false,
          error: "Path is not safe or allowed",
        };
      }

      if (!this.isFileTypeAllowed(path)) {
        return {
          success: false,
          error: "File type not allowed",
        };
      }

      // Check if we're in a Tauri environment
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const tauriModule = await import(
            /* @vite-ignore */ "@tauri-apps/api/core"
          );
          const { invoke } = tauriModule;

          const result = (await invoke("create_workspace_file", {
            path: this.resolvePath(path),
            content: content || "",
          })) as TauriOperationResult;

          return {
            success: true,
            path,
            message: `Created file: ${path}`,
          };
        } catch (tauriError) {
          console.warn(
            "Tauri API not available, falling back to simulation:",
            tauriError,
          );
          // Fall through to simulation
        }
      }

      // Fallback for web environment - simulate file creation
      console.log("📄 File creation simulated (web environment):", path);

      return {
        success: true,
        path,
        message: `Created file: ${path} (simulated)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create file",
      };
    }
  }

  private async deleteFile(path: string): Promise<WorkspaceOperationResult> {
    try {
      if (!this.isPathSafe(path)) {
        return {
          success: false,
          error: "Path is not safe or allowed",
        };
      }

      // Check if we're in a Tauri environment
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const tauriModule = await import(
            /* @vite-ignore */ "@tauri-apps/api/core"
          );
          const { invoke } = tauriModule;

          const result = (await invoke("delete_workspace_file", {
            path: this.resolvePath(path),
          })) as TauriOperationResult;

          return {
            success: true,
            path,
            message: `Deleted file: ${path}`,
          };
        } catch (tauriError) {
          console.warn(
            "Tauri API not available, falling back to simulation:",
            tauriError,
          );
          // Fall through to simulation
        }
      }

      // Fallback for web environment - simulate file deletion
      console.log("🗑️ File deletion simulated (web environment):", path);

      return {
        success: true,
        path,
        message: `Deleted file: ${path} (simulated)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete file",
      };
    }
  }

  private async moveFile(
    path: string,
    targetPath: string,
  ): Promise<WorkspaceOperationResult> {
    try {
      if (!this.isPathSafe(path) || !this.isPathSafe(targetPath)) {
        return {
          success: false,
          error: "Path is not safe or allowed",
        };
      }

      // Check if we're in a Tauri environment
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const tauriModule = await import(
            /* @vite-ignore */ "@tauri-apps/api/core"
          );
          const { invoke } = tauriModule;

          const result = (await invoke("move_workspace_file", {
            sourcePath: this.resolvePath(path),
            targetPath: this.resolvePath(targetPath),
          })) as TauriOperationResult;

          return {
            success: true,
            path: targetPath,
            message: `Moved file from ${path} to ${targetPath}`,
          };
        } catch (tauriError) {
          console.warn(
            "Tauri API not available, falling back to simulation:",
            tauriError,
          );
          // Fall through to simulation
        }
      }

      // Fallback for web environment - simulate file moving
      console.log(
        "📦 File move simulated (web environment):",
        path,
        "->",
        targetPath,
      );

      return {
        success: true,
        path: targetPath,
        message: `Moved file from ${path} to ${targetPath} (simulated)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to move file",
      };
    }
  }

  private async copyFile(
    path: string,
    targetPath: string,
  ): Promise<WorkspaceOperationResult> {
    try {
      if (!this.isPathSafe(path) || !this.isPathSafe(targetPath)) {
        return {
          success: false,
          error: "Path is not safe or allowed",
        };
      }

      // Check if we're in a Tauri environment
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const tauriModule = await import(
            /* @vite-ignore */ "@tauri-apps/api/core"
          );
          const { invoke } = tauriModule;

          const result = (await invoke("copy_workspace_file", {
            sourcePath: this.resolvePath(path),
            targetPath: this.resolvePath(targetPath),
          })) as TauriOperationResult;

          return {
            success: true,
            path: targetPath,
            message: `Copied file from ${path} to ${targetPath}`,
          };
        } catch (tauriError) {
          console.warn(
            "Tauri API not available, falling back to simulation:",
            tauriError,
          );
          // Fall through to simulation
        }
      }

      // Fallback for web environment - simulate file copying
      console.log(
        "📋 File copy simulated (web environment):",
        path,
        "->",
        targetPath,
      );

      return {
        success: true,
        path: targetPath,
        message: `Copied file from ${path} to ${targetPath} (simulated)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to copy file",
      };
    }
  }

  private isPathSafe(path: string): boolean {
    // Prevent directory traversal attacks
    if (path.includes("..") || path.includes("//")) {
      return false;
    }

    // Ensure path is within workspace
    const resolvedPath = this.resolvePath(path);
    const workspacePath = this.config.workspacePath;

    return resolvedPath.startsWith(workspacePath);
  }

  private isFileTypeAllowed(path: string): boolean {
    const extension = this.getFileExtension(path);
    return this.config.allowedExtensions.includes(extension);
  }

  private getFileExtension(path: string): string {
    const lastDotIndex = path.lastIndexOf(".");
    if (lastDotIndex === -1) return "";
    return path.substring(lastDotIndex).toLowerCase();
  }

  private resolvePath(path: string): string {
    if (path.startsWith("/") || path.startsWith("./")) {
      return path;
    }
    return `${this.config.workspacePath}/${path}`;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<WorkspaceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getWorkspacePath(): string {
    return this.config.workspacePath;
  }

  setWorkspacePath(path: string): void {
    this.config.workspacePath = path;
  }

  getAllowedExtensions(): string[] {
    return this.config.allowedExtensions;
  }

  setAllowedExtensions(extensions: string[]): void {
    this.config.allowedExtensions = extensions;
  }

  getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  setMaxFileSize(size: number): void {
    this.config.maxFileSize = size;
  }

  getAllowedOperations(): string[] {
    return this.config.allowedOperations;
  }

  setAllowedOperations(operations: string[]): void {
    this.config.allowedOperations = operations;
  }

  isBackupEnabled(): boolean {
    return this.config.createBackups;
  }

  setBackupEnabled(enabled: boolean): void {
    this.config.createBackups = enabled;
  }
}

// Create the ability instance
const workspaceAbility = new WorkspaceDirectoryAbility();

export { workspaceAbility as workspaceDirectoryAbility };
