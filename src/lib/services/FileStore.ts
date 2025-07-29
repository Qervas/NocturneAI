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

export function clearFiles() {
  uploadedFiles.set([]);
} 