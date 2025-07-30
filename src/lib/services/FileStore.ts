import { writable } from 'svelte/store';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  content?: string;
}

export const uploadedFiles = writable<UploadedFile[]>([]);

export function addFile(file: UploadedFile) {
  uploadedFiles.update(files => [...files, file]);
}

export function removeFile(fileId: string) {
  uploadedFiles.update(files => files.filter(f => f.id !== fileId));
}

export function updateFile(fileId: string, updates: Partial<UploadedFile>) {
  uploadedFiles.update(files => 
    files.map(f => f.id === fileId ? { ...f, ...updates } : f)
  );
}

export function writeFileContent(fileId: string, content: string): boolean {
  let success = false;
  uploadedFiles.update(files => {
    const fileIndex = files.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
      const updatedFile = {
        ...files[fileIndex],
        content,
        size: new Blob([content]).size
      };
      files[fileIndex] = updatedFile;
      success = true;
    }
    return files;
  });
  return success;
}

export function getFileById(fileId: string): UploadedFile | undefined {
  let result: UploadedFile | undefined;
  uploadedFiles.update(files => {
    result = files.find(f => f.id === fileId);
    return files;
  });
  return result;
}

export function clearFiles() {
  uploadedFiles.set([]);
} 