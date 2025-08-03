import { invoke } from '@tauri-apps/api/core';

export interface FileOperationResult {
  success: boolean;
  message?: string;
  error?: string;
  fileContent?: string;
  fileInfo?: FileInfo;
}

export interface FileInfo {
  name: string;
  size: number;
  fileType: string;
  isImage: boolean;
  isText: boolean;
  dimensions?: [number, number];
}

export interface WorkspaceResult {
  success: boolean;
  message?: string;
  error?: string;
  files?: WorkspaceFileInfo[];
  content?: string;
  path?: string;
}

export interface WorkspaceFileInfo {
  path: string;
  name: string;
  size: number;
  fileType: string;
  lastModified: string;
  content?: string;
}

class FileOperationsService {
  private static instance: FileOperationsService;

  static getInstance(): FileOperationsService {
    if (!FileOperationsService.instance) {
      FileOperationsService.instance = new FileOperationsService();
    }
    return FileOperationsService.instance;
  }

  // Read a file
  async readFile(filePath: string): Promise<FileOperationResult> {
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const result = await invoke<WorkspaceResult>('read_workspace_file', {
          path: filePath
        });

        return {
          success: result.success,
          message: result.message,
          error: result.error,
          fileContent: result.content
        };
      } else {
        // Fallback for development/browser environment
        console.warn('Tauri not available, using fallback file reading');
        return {
          success: false,
          error: 'Tauri backend not available for file operations'
        };
      }
    } catch (error) {
      console.error('File read error:', error);
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Write to a file (creates if doesn't exist, overwrites if exists)
  async writeFile(filePath: string, content: string, createBackup: boolean = true): Promise<FileOperationResult> {
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const result = await invoke<WorkspaceResult>('write_workspace_file', {
          path: filePath,
          content: content,
          createBackup: createBackup
        });

        return {
          success: result.success,
          message: result.message,
          error: result.error
        };
      } else {
        // Fallback for development/browser environment
        console.warn('Tauri not available, using fallback file writing');
        return {
          success: false,
          error: 'Tauri backend not available for file operations'
        };
      }
    } catch (error) {
      console.error('File write error:', error);
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Create a new file
  async createFile(filePath: string, content: string): Promise<FileOperationResult> {
    try {
      const result = await invoke<WorkspaceResult>('create_workspace_file', {
        path: filePath,
        content: content
      });

      return {
        success: result.success,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Delete a file
  async deleteFile(filePath: string): Promise<FileOperationResult> {
    try {
      const result = await invoke<WorkspaceResult>('delete_workspace_file', {
        path: filePath
      });

      return {
        success: result.success,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // List files in a directory
  async listFiles(directoryPath: string): Promise<FileOperationResult> {
    try {
      const result = await invoke<WorkspaceResult>('list_workspace_files', {
        path: directoryPath
      });

      return {
        success: result.success,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Move a file
  async moveFile(sourcePath: string, targetPath: string): Promise<FileOperationResult> {
    try {
      const result = await invoke<WorkspaceResult>('move_workspace_file', {
        sourcePath: sourcePath,
        targetPath: targetPath
      });

      return {
        success: result.success,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to move file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Copy a file
  async copyFile(sourcePath: string, targetPath: string): Promise<FileOperationResult> {
    try {
      const result = await invoke<WorkspaceResult>('copy_workspace_file', {
        sourcePath: sourcePath,
        targetPath: targetPath
      });

      return {
        success: result.success,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to copy file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Modify a file by applying changes
  async modifyFile(filePath: string, modifications: {
    type: 'replace' | 'append' | 'prepend' | 'insert' | 'delete';
    content?: string;
    startLine?: number;
    endLine?: number;
    searchText?: string;
    replaceText?: string;
  }): Promise<FileOperationResult> {
    try {
      // First read the current file
      const readResult = await this.readFile(filePath);
      if (!readResult.success || !readResult.fileContent) {
        return {
          success: false,
          error: `Failed to read file for modification: ${readResult.error}`
        };
      }

      let newContent = readResult.fileContent;
      const lines = newContent.split('\n');

      switch (modifications.type) {
        case 'replace':
          if (modifications.content) {
            newContent = modifications.content;
          }
          break;

        case 'append':
          if (modifications.content) {
            newContent = newContent + '\n' + modifications.content;
          }
          break;

        case 'prepend':
          if (modifications.content) {
            newContent = modifications.content + '\n' + newContent;
          }
          break;

        case 'insert':
          if (modifications.content && modifications.startLine !== undefined) {
            const insertIndex = Math.min(modifications.startLine, lines.length);
            lines.splice(insertIndex, 0, modifications.content);
            newContent = lines.join('\n');
          }
          break;

        case 'delete':
          if (modifications.startLine !== undefined && modifications.endLine !== undefined) {
            const start = Math.max(0, modifications.startLine);
            const end = Math.min(lines.length, modifications.endLine + 1);
            lines.splice(start, end - start);
            newContent = lines.join('\n');
          }
          break;

        default:
          return {
            success: false,
            error: 'Invalid modification type'
          };
      }

      // Write the modified content back
      return await this.writeFile(filePath, newContent, true);
    } catch (error) {
      return {
        success: false,
        error: `Failed to modify file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Check if a file exists
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const result = await this.readFile(filePath);
      return result.success;
    } catch {
      return false;
    }
  }

  // Get file info
  async getFileInfo(filePath: string): Promise<FileOperationResult> {
    try {
      const result = await invoke<FileOperationResult>('agent_read_file', {
        filePath: filePath
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to get file info: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

export const fileOperationsService = FileOperationsService.getInstance(); 