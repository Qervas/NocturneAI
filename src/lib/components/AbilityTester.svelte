<script lang="ts">
	import { onMount } from 'svelte';
	import { abilityManager } from '../services/AbilityManager';
	import { selectedAgent, getAgentFullId } from '../services/CharacterManager';
	import { settingsManager } from '../services/SettingsManager';
	import '../abilities'; // Import all abilities

	let testResults: any[] = [];
	let isTesting = false;

	// Test file reading
	async function testFileReader() {
		if (!$selectedAgent) return;
		
		isTesting = true;
		try {
			const fullAgentId = getAgentFullId($selectedAgent);
			const result = await abilityManager.executeAbility(fullAgentId, 'read_files', {
				filePath: 'example.txt'
			});
			
			testResults = [...testResults, {
				type: 'File Reader',
				result,
				timestamp: new Date().toISOString()
			}];
		} catch (error) {
			testResults = [...testResults, {
				type: 'File Reader',
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}];
		}
		isTesting = false;
	}

	// Test file writing
	async function testFileWriter() {
		if (!$selectedAgent) return;
		
		isTesting = true;
		try {
			const fullAgentId = getAgentFullId($selectedAgent);
			const result = await abilityManager.executeAbility(fullAgentId, 'write_files', {
				filePath: 'output.txt',
				content: 'Hello from the FileWriter ability!\nThis is a test file created by an AI agent.',
				mode: 'write'
			});
			
			testResults = [...testResults, {
				type: 'File Writer',
				result,
				timestamp: new Date().toISOString()
			}];
		} catch (error) {
			testResults = [...testResults, {
				type: 'File Writer',
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}];
		}
		isTesting = false;
	}

	// Test web search
	async function testWebSearch() {
		if (!$selectedAgent) return;
		
		isTesting = true;
		try {
			const fullAgentId = getAgentFullId($selectedAgent);
			const result = await abilityManager.executeAbility(fullAgentId, 'web_search', {
				query: 'artificial intelligence',
				maxResults: 3
			});
			
			testResults = [...testResults, {
				type: 'Web Search',
				result,
				timestamp: new Date().toISOString()
			}];
		} catch (error) {
			testResults = [...testResults, {
				type: 'Web Search',
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}];
		}
		isTesting = false;
	}

	// Test group chat
	async function testGroupChat() {
		if (!$selectedAgent) return;
		
		isTesting = true;
		try {
			const fullAgentId = getAgentFullId($selectedAgent);
			const result = await abilityManager.executeAbility(fullAgentId, 'group_chat', {
				message: 'Hello everyone! How are you all doing today?',
				roomId: 'general'
			});
			
			testResults = [...testResults, {
				type: 'Group Chat',
				result,
				timestamp: new Date().toISOString()
			}];
		} catch (error) {
			testResults = [...testResults, {
				type: 'Group Chat',
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}];
		}
		isTesting = false;
	}

	// Grant abilities for testing
	function grantTestAbilities() {
		if (!$selectedAgent) return;
		
		abilityManager.grantAbility($selectedAgent, 'read_files');
		abilityManager.grantAbility($selectedAgent, 'write_files');
		abilityManager.grantAbility($selectedAgent, 'web_search');
		abilityManager.grantAbility($selectedAgent, 'group_chat');
		
		console.log(`Granted test abilities to agent ${$selectedAgent}`);
	}

	// Check if agent has abilities
	$: hasFileReader = $selectedAgent ? abilityManager.hasAbility(getAgentFullId($selectedAgent), 'read_files') : false;
	$: hasFileWriter = $selectedAgent ? abilityManager.hasAbility(getAgentFullId($selectedAgent), 'write_files') : false;
	$: hasWebSearch = $selectedAgent ? abilityManager.hasAbility(getAgentFullId($selectedAgent), 'web_search') : false;
	$: hasGroupChat = $selectedAgent ? abilityManager.hasAbility(getAgentFullId($selectedAgent), 'group_chat') : false;

	onMount(() => {
		// Grant test abilities on mount
		grantTestAbilities();
	});
</script>

<div class="ability-tester">
	<h3>🧪 Ability Tester</h3>
	
	{#if $selectedAgent}
		<div class="agent-info">
			<strong>Testing Agent:</strong> {$selectedAgent}
		</div>
		
		<div class="ability-status">
			<div class="status-item {hasFileReader ? 'enabled' : 'disabled'}">
				📖 File Reader: {hasFileReader ? '✅ Enabled' : '❌ Disabled'}
			</div>
			<div class="status-item {hasFileWriter ? 'enabled' : 'disabled'}">
				✏️ File Writer: {hasFileWriter ? '✅ Enabled' : '❌ Disabled'}
			</div>
			<div class="status-item {hasWebSearch ? 'enabled' : 'disabled'}">
				🔍 Web Search: {hasWebSearch ? '✅ Enabled' : '❌ Disabled'}
			</div>
			<div class="status-item {hasGroupChat ? 'enabled' : 'disabled'}">
				👥 Group Chat: {hasGroupChat ? '✅ Enabled' : '❌ Disabled'}
			</div>
		</div>
		
		<div class="test-buttons">
			<button 
				class="test-btn" 
				on:click={testFileReader}
				disabled={!hasFileReader || isTesting}
			>
				📖 Test File Reader
			</button>
			
			<button 
				class="test-btn" 
				on:click={testFileWriter}
				disabled={!hasFileWriter || isTesting}
			>
				✏️ Test File Writer
			</button>
			
			<button 
				class="test-btn" 
				on:click={testWebSearch}
				disabled={!hasWebSearch || isTesting}
			>
				🔍 Test Web Search
			</button>
			
			<button 
				class="test-btn" 
				on:click={testGroupChat}
				disabled={!hasGroupChat || isTesting}
			>
				👥 Test Group Chat
			</button>
		</div>
		
		{#if testResults.length > 0}
			<div class="test-results">
				<h4>Test Results:</h4>
				{#each testResults as result, index}
					<div class="result-item">
						<div class="result-header">
							<strong>{result.type}</strong>
							<span class="timestamp">{new Date(result.timestamp).toLocaleTimeString()}</span>
						</div>
						{#if result.error}
							<div class="error">❌ {result.error}</div>
						{:else}
							<div class="success">✅ Success</div>
							<pre class="result-data">{JSON.stringify(result.result, null, 2)}</pre>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<div class="no-agent">
			Please select an agent to test abilities
		</div>
	{/if}
</div>

<style>
	.ability-tester {
		padding: 16px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.agent-info {
		margin-bottom: 12px;
		color: rgba(255, 255, 255, 0.8);
	}

	.ability-status {
		margin-bottom: 16px;
	}

	.status-item {
		padding: 4px 8px;
		margin: 2px 0;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.status-item.enabled {
		background: rgba(76, 175, 80, 0.2);
		color: #4CAF50;
	}

	.status-item.disabled {
		background: rgba(244, 67, 54, 0.2);
		color: #F44336;
	}

	.test-buttons {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}

	.test-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.8);
		padding: 8px 12px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.85rem;
	}

	.test-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.9);
	}

	.test-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.test-results {
		margin-top: 16px;
	}

	.result-item {
		margin-bottom: 12px;
		padding: 8px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 4px;
		border-left: 3px solid rgba(255, 255, 255, 0.2);
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
	}

	.timestamp {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.error {
		color: #F44336;
		font-size: 0.85rem;
	}

	.success {
		color: #4CAF50;
		font-size: 0.85rem;
		margin-bottom: 8px;
	}

	.result-data {
		background: rgba(0, 0, 0, 0.5);
		padding: 8px;
		border-radius: 4px;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.8);
		overflow-x: auto;
		max-height: 200px;
		overflow-y: auto;
	}

	.no-agent {
		color: rgba(255, 255, 255, 0.5);
		text-align: center;
		padding: 20px;
	}
</style> 