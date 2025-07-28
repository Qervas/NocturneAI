import type { Ability } from '../services/AbilityManager';
import { abilityManager } from '../services/AbilityManager';

export const FileWriterAbility: Ability = {
	id: 'write_files',
	name: 'File Writer',
	description: 'Ability to create and modify files',
	category: 'system_access',
	
	canExecute: (agentId: string, params?: any): boolean => {
		// Check if agent has the ability
		if (!abilityManager.hasAbility(agentId, 'write_files')) {
			return false;
		}
		
		// Check if file path and content are provided
		if (!params || !params.filePath || !params.content) {
			return false;
		}
		
		// Basic validation - file path and content should be strings
		if (typeof params.filePath !== 'string' || typeof params.content !== 'string') {
			return false;
		}
		
		return true;
	},
	
	execute: async (agentId: string, params?: any): Promise<any> => {
		try {
			const { filePath, content, mode = 'write' } = params;
			
			// Validate parameters
			if (!filePath || typeof filePath !== 'string') {
				throw new Error('Invalid file path provided');
			}
			
			if (!content || typeof content !== 'string') {
				throw new Error('Invalid content provided');
			}
			
			// Security check - prevent directory traversal
			if (filePath.includes('..') || filePath.includes('//')) {
				throw new Error('Invalid file path - security violation');
			}
			
			// Simulate file writing
			const writeResult = await simulateFileWrite(filePath, content, mode);
			
			// Log the action
			console.log(`Agent ${agentId} wrote to file: ${filePath} (${mode} mode)`);
			
			return {
				success: true,
				filePath,
				content,
				mode,
				result: writeResult,
				agentId,
				timestamp: new Date().toISOString()
			};
			
		} catch (error) {
			console.error(`FileWriter ability error for agent ${agentId}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				agentId,
				timestamp: new Date().toISOString()
			};
		}
	}
};

// Simulate file writing (placeholder for real implementation)
async function simulateFileWrite(filePath: string, content: string, mode: string): Promise<any> {
	// In a real implementation, this would use:
	// import { writeFile, appendFile } from 'fs/promises';
	// 
	// if (mode === 'append') {
	//   await appendFile(filePath, content);
	// } else {
	//   await writeFile(filePath, content, 'utf-8');
	// }
	
	// Simulate file system delay
	await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
	
	// Generate file metadata
	const fileSize = content.length;
	const extension = filePath.split('.').pop()?.toLowerCase();
	
	// Simulate different file types
	let fileType = 'text';
	let language = '';
	
	switch (extension) {
		case 'js':
			fileType = 'javascript';
			language = 'JavaScript';
			break;
		case 'ts':
			fileType = 'typescript';
			language = 'TypeScript';
			break;
		case 'json':
			fileType = 'json';
			language = 'JSON';
			break;
		case 'md':
			fileType = 'markdown';
			language = 'Markdown';
			break;
		case 'html':
			fileType = 'html';
			language = 'HTML';
			break;
		case 'css':
			fileType = 'css';
			language = 'CSS';
			break;
		case 'py':
			fileType = 'python';
			language = 'Python';
			break;
		default:
			fileType = 'text';
			language = 'Plain Text';
	}
	
	return {
		filePath,
		fileSize,
		fileType,
		language,
		mode,
		lines: content.split('\n').length,
		created: new Date().toISOString(),
		modified: new Date().toISOString()
	};
}

// Register the ability with the AbilityManager
abilityManager.registerAbility(FileWriterAbility); 