import type { Ability } from '../services/AbilityManager';
import { abilityManager } from '../services/AbilityManager';

export const FileReaderAbility: Ability = {
	id: 'read_files',
	name: 'File Reader',
	description: 'Ability to read files from the system',
	category: 'system_access',
	
	canExecute: (agentId: string, params?: any): boolean => {
		// Check if agent has the ability
		if (!abilityManager.hasAbility(agentId, 'read_files')) {
			return false;
		}
		
		// Check if file path is provided
		if (!params || !params.filePath) {
			return false;
		}
		
		// Basic validation - file path should be a string
		if (typeof params.filePath !== 'string') {
			return false;
		}
		
		return true;
	},
	
	execute: async (agentId: string, params?: any): Promise<any> => {
		try {
			const { filePath } = params;
			
			// Validate file path
			if (!filePath || typeof filePath !== 'string') {
				throw new Error('Invalid file path provided');
			}
			
			// Security check - prevent directory traversal
			if (filePath.includes('..') || filePath.includes('//')) {
				throw new Error('Invalid file path - security violation');
			}
			
			// For now, we'll simulate file reading
			// In a real implementation, this would use Node.js fs module or similar
			const fileContent = await simulateFileRead(filePath);
			
			// Log the action
			console.log(`Agent ${agentId} read file: ${filePath}`);
			
			return {
				success: true,
				filePath,
				content: fileContent,
				agentId,
				timestamp: new Date().toISOString()
			};
			
		} catch (error) {
			console.error(`FileReader ability error for agent ${agentId}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				agentId,
				timestamp: new Date().toISOString()
			};
		}
	}
};

// Simulate file reading (placeholder for real implementation)
async function simulateFileRead(filePath: string): Promise<string> {
	// In a real implementation, this would use:
	// import { readFile } from 'fs/promises';
	// return await readFile(filePath, 'utf-8');
	
	// For now, return simulated content based on file extension
	const extension = filePath.split('.').pop()?.toLowerCase();
	
	switch (extension) {
		case 'txt':
			return `This is a simulated text file content for: ${filePath}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
		
		case 'json':
			return JSON.stringify({
				file: filePath,
				type: 'json',
				content: 'Simulated JSON content',
				timestamp: new Date().toISOString()
			}, null, 2);
		
		case 'js':
		case 'ts':
			return `// Simulated ${extension} file: ${filePath}\n\nfunction example() {\n  console.log("Hello from ${filePath}");\n}\n\nexport default example;`;
		
		case 'md':
			return `# Simulated Markdown File\n\nThis is a simulated markdown file: ${filePath}\n\n## Features\n- Feature 1\n- Feature 2\n\n## Usage\n\`\`\`javascript\nconsole.log("Example");\n\`\`\``;
		
		default:
			return `Simulated file content for: ${filePath}\n\nThis is a generic file with unknown extension.`;
	}
}

// Register the ability with the AbilityManager
abilityManager.registerAbility(FileReaderAbility); 