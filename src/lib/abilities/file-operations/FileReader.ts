import { abilityManager } from '../../services/AbilityManager';

// File type definitions
export interface FileTypeConfig {
  id: string;
  name: string;
  extensions: string[];
  mimeTypes: string[];
  maxSize: number; // in bytes
  supported: boolean;
  description: string;
}

export interface FileReadResult {
  success: boolean;
  content?: string;
  metadata?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    lastModified: Date;
    encoding?: string;
  };
  error?: string;
}

export interface FileReaderConfig {
  allowedFileTypes: string[];
  maxFileSize: number;
  encoding: 'utf-8' | 'ascii' | 'binary';
  extractTextFromPDF: boolean;
  extractTextFromImages: boolean;
  preserveFormatting: boolean;
  includeMetadata: boolean;
}

// Default file type configurations
export const FILE_TYPES: Record<string, FileTypeConfig> = {
  text: {
    id: 'text',
    name: 'Text Files',
    extensions: ['.txt', '.md', '.log', '.csv', '.json', '.xml', '.yaml', '.yml'],
    mimeTypes: ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/xml'],
    maxSize: 10 * 1024 * 1024, // 10MB
    supported: true,
    description: 'Plain text files, markdown, logs, CSV, JSON, XML, YAML'
  },
  code: {
    id: 'code',
    name: 'Code Files',
    extensions: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css', '.php', '.rb', '.go', '.rs'],
    mimeTypes: ['text/javascript', 'text/typescript', 'text/x-python', 'text/x-java-source'],
    maxSize: 5 * 1024 * 1024, // 5MB
    supported: true,
    description: 'Source code files in various programming languages'
  },
  document: {
    id: 'document',
    name: 'Documents',
    extensions: ['.pdf', '.doc', '.docx', '.rtf'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 50 * 1024 * 1024, // 50MB
    supported: true,
    description: 'PDF documents, Word documents, RTF files'
  },
  image: {
    id: 'image',
    name: 'Images',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'],
    maxSize: 20 * 1024 * 1024, // 20MB
    supported: true,
    description: 'Image files with optional text extraction (OCR)'
  },
  spreadsheet: {
    id: 'spreadsheet',
    name: 'Spreadsheets',
    extensions: ['.xls', '.xlsx', '.ods'],
    mimeTypes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 30 * 1024 * 1024, // 30MB
    supported: true,
    description: 'Excel spreadsheets, OpenDocument spreadsheets'
  },
  presentation: {
    id: 'presentation',
    name: 'Presentations',
    extensions: ['.ppt', '.pptx', '.odp'],
    mimeTypes: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    maxSize: 40 * 1024 * 1024, // 40MB
    supported: true,
    description: 'PowerPoint presentations, OpenDocument presentations'
  },
  archive: {
    id: 'archive',
    name: 'Archives',
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
    maxSize: 100 * 1024 * 1024, // 100MB
    supported: false,
    description: 'Compressed archives (not yet supported)'
  },
  binary: {
    id: 'binary',
    name: 'Binary Files',
    extensions: ['.exe', '.dll', '.so', '.dylib', '.bin'],
    mimeTypes: ['application/octet-stream', 'application/x-executable'],
    maxSize: 50 * 1024 * 1024, // 50MB
    supported: false,
    description: 'Executable and binary files (not yet supported)'
  }
};

// Default configuration
export const DEFAULT_FILE_READER_CONFIG: FileReaderConfig = {
  allowedFileTypes: ['text', 'code', 'document'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  encoding: 'utf-8',
  extractTextFromPDF: true,
  extractTextFromImages: false,
  preserveFormatting: true,
  includeMetadata: true
};

export class FileReaderAbility {
  id = 'file_reader';
  name = 'File Reader';
  description = 'Read and extract content from various file types including text, code, documents, and images';
  category = 'file_operations';
  config: FileReaderConfig;

  constructor(config: Partial<FileReaderConfig> = {}) {
    this.config = { ...DEFAULT_FILE_READER_CONFIG, ...config };
  }

  canExecute(params: any): boolean {
    if (!params.filePath && !params.file) {
      return false;
    }
    
    const file = params.file || { name: params.filePath };
    const fileType = this.getFileType(file.name);
    
    return this.config.allowedFileTypes.includes(fileType) && 
           this.isFileSizeAllowed(file.size || 0);
  }

  async execute(params: any): Promise<FileReadResult> {
    try {
      const file = params.file || await this.loadFile(params.filePath);
      
      if (!file) {
        return {
          success: false,
          error: 'No file provided or file not found'
        };
      }

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Read file content based on type
      const fileType = this.getFileType(file.name);
      let content: string;

      switch (fileType) {
        case 'text':
        case 'code':
          content = await this.readTextFile(file);
          break;
        case 'document':
          content = await this.readDocumentFile(file);
          break;
        case 'image':
          content = await this.readImageFile(file);
          break;
        case 'spreadsheet':
          content = await this.readSpreadsheetFile(file);
          break;
        case 'presentation':
          content = await this.readPresentationFile(file);
          break;
        default:
          return {
            success: false,
            error: `Unsupported file type: ${fileType}`
          };
      }

      const metadata = this.config.includeMetadata ? this.extractMetadata(file) : undefined;

      return {
        success: true,
        content,
        metadata
      };

    } catch (error) {
      return {
        success: false,
        error: `File reading failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private getFileType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    for (const [typeId, config] of Object.entries(FILE_TYPES)) {
      if (config.extensions.some(ext => ext.toLowerCase() === `.${extension}`)) {
        return typeId;
      }
    }
    
    return 'text'; // Default to text
  }

  private isFileSizeAllowed(fileSize: number): boolean {
    return fileSize <= this.config.maxFileSize;
  }

  private validateFile(file: any): { valid: boolean; error?: string } {
    const fileType = this.getFileType(file.name);
    const config = FILE_TYPES[fileType];

    if (!config) {
      return { valid: false, error: 'Unknown file type' };
    }

    if (!config.supported) {
      return { valid: false, error: `File type '${config.name}' is not yet supported` };
    }

    if (!this.config.allowedFileTypes.includes(fileType)) {
      return { valid: false, error: `File type '${config.name}' is not allowed` };
    }

    if (file.size && file.size > config.maxSize) {
      return { valid: false, error: `File size exceeds maximum allowed size for ${config.name}` };
    }

    return { valid: true };
  }

  private async loadFile(filePath: string): Promise<File | null> {
    // This would be implemented with actual file system access
    // For now, return null to indicate file not found
    return null;
  }

  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file, this.config.encoding);
    });
  }

  private async readDocumentFile(file: File): Promise<string> {
    const fileType = this.getFileType(file.name);
    
    if (fileType === 'document' && file.name.toLowerCase().endsWith('.pdf')) {
      return this.extractTextFromPDF(file);
    }
    
    // For other document types, we'd need specific libraries
    return `[Document content extraction not implemented for ${file.name}]`;
  }

  private async readImageFile(file: File): Promise<string> {
    if (!this.config.extractTextFromImages) {
      return `[Image file: ${file.name} - Text extraction disabled]`;
    }
    
    return `[OCR text extraction not implemented for ${file.name}]`;
  }

  private async readSpreadsheetFile(file: File): Promise<string> {
    return `[Spreadsheet content extraction not implemented for ${file.name}]`;
  }

  private async readPresentationFile(file: File): Promise<string> {
    return `[Presentation content extraction not implemented for ${file.name}]`;
  }

  private async extractTextFromPDF(file: File): Promise<string> {
    if (!this.config.extractTextFromPDF) {
      return `[PDF file: ${file.name} - Text extraction disabled]`;
    }
    
    return `[PDF text extraction not implemented for ${file.name}]`;
  }

  private extractMetadata(file: File) {
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: this.getFileType(file.name),
      lastModified: new Date(file.lastModified),
      encoding: this.config.encoding
    };
  }

  // Configuration methods
  updateConfig(newConfig: Partial<FileReaderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getSupportedFileTypes(): FileTypeConfig[] {
    return Object.values(FILE_TYPES).filter(type => type.supported);
  }

  getAllowedFileTypes(): string[] {
    return this.config.allowedFileTypes;
  }

  setAllowedFileTypes(types: string[]): void {
    this.config.allowedFileTypes = types;
  }

  getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  setMaxFileSize(size: number): void {
    this.config.maxFileSize = size;
  }
}

// Create and register the ability
const fileReaderAbility = new FileReaderAbility();
abilityManager.registerAbility(fileReaderAbility);

export { fileReaderAbility }; 