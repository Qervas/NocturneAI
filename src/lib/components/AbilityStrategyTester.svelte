<script lang="ts">
	import { abilityPromptStrategy } from '../services/AbilityPromptStrategy';
	import { abilityManager } from '../services/AbilityManager';
	import { selectedAgent } from '../services/CharacterManager';
	import type { TaskAnalysis } from '../services/AbilityPromptStrategy';

	let taskInput = '';
	let analysis: TaskAnalysis | null = null;
	let executionResults: any[] = [];
	let isExecuting = false;
	let showTriggers = false;

	// Example tasks for testing
	const exampleTasks = [
		'Read the file example.txt',
		'Create a new file called report.txt',
		'Search for information about AI',
		'Share this information with the team',
		'Write the code to a file',
		'Find the latest news about technology',
		'Open the README file',
		'Generate a report and save it'
	];

	// Analyze task
	function analyzeTask() {
		if (!$selectedAgent || !taskInput.trim()) return;
		
		analysis = abilityPromptStrategy.analyzeTask(taskInput, $selectedAgent);
		executionResults = [];
	}

	// Execute abilities
	async function executeAbilities() {
		if (!$selectedAgent || !taskInput.trim()) return;
		
		isExecuting = true;
		try {
			executionResults = await abilityPromptStrategy.executeTaskAbilities(taskInput, $selectedAgent);
		} catch (error) {
			console.error('Error executing abilities:', error);
		}
		isExecuting = false;
	}

	// Use example task
	function useExample(example: string) {
		taskInput = example;
		analyzeTask();
	}

	// Get all triggers
	$: triggers = abilityPromptStrategy.getAllTriggers();
</script>

<div class="strategy-tester">
	<h2>🎯 Ability Strategy Tester</h2>
	
	<div class="agent-info">
		<strong>Selected Agent:</strong> {$selectedAgent || 'None'}
		{#if $selectedAgent}
			<div class="agent-abilities">
				<strong>Abilities:</strong>
				{#each ['read_files', 'write_files', 'web_search', 'group_chat'] as abilityId}
					<span class="ability-badge {abilityManager.hasAbility($selectedAgent, abilityId) ? 'enabled' : 'disabled'}">
						{abilityId}: {abilityManager.hasAbility($selectedAgent, abilityId) ? '✅' : '❌'}
					</span>
				{/each}
			</div>
		{/if}
	</div>

	<div class="input-section">
		<label for="task-input">Enter a task:</label>
		<textarea 
			id="task-input"
			bind:value={taskInput}
			placeholder="Enter a task like 'Read the file example.txt' or 'Search for information about AI'"
			rows="3"
		></textarea>
		
		<div class="button-group">
			<button class="btn primary" on:click={analyzeTask} disabled={!taskInput.trim() || !$selectedAgent}>
				🔍 Analyze Task
			</button>
			<button class="btn secondary" on:click={executeAbilities} disabled={!taskInput.trim() || !$selectedAgent || isExecuting}>
				⚡ Execute Abilities
			</button>
			<button class="btn info" on:click={() => showTriggers = !showTriggers}>
				📋 {showTriggers ? 'Hide' : 'Show'} Triggers
			</button>
		</div>
	</div>

	{#if showTriggers}
		<div class="triggers-section">
			<h3>🎯 Ability Triggers</h3>
			<div class="triggers-grid">
				{#each triggers as trigger}
					<div class="trigger-card">
						<h4>{trigger.abilityId}</h4>
						<p><strong>Description:</strong> {trigger.description}</p>
						<p><strong>Keywords:</strong> {trigger.keywords.join(', ')}</p>
						<p><strong>Priority:</strong> {trigger.priority}</p>
						<div class="examples">
							<strong>Examples:</strong>
							<ul>
								{#each trigger.examples as example}
									<li>{example}</li>
								{/each}
							</ul>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="examples-section">
		<h3>💡 Example Tasks</h3>
		<div class="examples-grid">
			{#each exampleTasks as example}
				<button class="example-btn" on:click={() => useExample(example)}>
					{example}
				</button>
			{/each}
		</div>
	</div>

	{#if analysis}
		<div class="analysis-section">
			<h3>📊 Task Analysis</h3>
			<div class="analysis-card">
				<p><strong>Task:</strong> {analysis.task}</p>
				<p><strong>Confidence:</strong> {(analysis.confidence * 100).toFixed(1)}%</p>
				<p><strong>Detected Abilities:</strong></p>
				<ul>
					{#each analysis.detectedAbilities as abilityId}
						<li class="ability-item {abilityManager.hasAbility($selectedAgent || '', abilityId) ? 'available' : 'unavailable'}">
							{abilityId}: {abilityManager.hasAbility($selectedAgent || '', abilityId) ? '✅ Available' : '❌ Not Available'}
						</li>
					{/each}
				</ul>
				<p><strong>Suggested Actions:</strong></p>
				<ul>
					{#each analysis.suggestedActions as action}
						<li>{action}</li>
					{/each}
				</ul>
			</div>

			<div class="enhanced-prompt">
				<h4>🎯 Enhanced Prompt</h4>
				<pre>{analysis.enhancedPrompt}</pre>
			</div>
		</div>
	{/if}

	{#if executionResults.length > 0}
		<div class="results-section">
			<h3>⚡ Execution Results</h3>
			{#each executionResults as result, index}
				<div class="result-card {result.success ? 'success' : 'error'}">
					<h4>{result.abilityId}</h4>
					<p><strong>Status:</strong> {result.success ? '✅ Success' : '❌ Error'}</p>
					{#if result.success}
						<details>
							<summary>View Result</summary>
							<pre>{JSON.stringify(result.result, null, 2)}</pre>
						</details>
					{:else}
						<p><strong>Error:</strong> {result.error}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.strategy-tester {
		padding: 20px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.agent-info {
		background: var(--card-bg);
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 20px;
		border: 1px solid var(--border-color);
	}

	.agent-abilities {
		margin-top: 10px;
	}

	.ability-badge {
		display: inline-block;
		padding: 4px 8px;
		margin: 2px;
		border-radius: 4px;
		font-size: 12px;
		font-family: monospace;
	}

	.ability-badge.enabled {
		background: var(--success-bg);
		color: var(--success-text);
	}

	.ability-badge.disabled {
		background: var(--error-bg);
		color: var(--error-text);
	}

	.input-section {
		margin-bottom: 20px;
	}

	.input-section label {
		display: block;
		margin-bottom: 8px;
		font-weight: bold;
	}

	.input-section textarea {
		width: 100%;
		padding: 12px;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		font-family: inherit;
		resize: vertical;
		background: var(--input-bg);
		color: var(--text-color);
	}

	.button-group {
		display: flex;
		gap: 10px;
		margin-top: 10px;
		flex-wrap: wrap;
	}

	.btn {
		padding: 8px 16px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn.primary {
		background: var(--primary-color);
		color: white;
	}

	.btn.secondary {
		background: var(--secondary-color);
		color: white;
	}

	.btn.info {
		background: var(--info-color);
		color: white;
	}

	.triggers-section {
		margin-bottom: 20px;
	}

	.triggers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 15px;
		margin-top: 15px;
	}

	.trigger-card {
		background: var(--card-bg);
		padding: 15px;
		border-radius: 8px;
		border: 1px solid var(--border-color);
	}

	.trigger-card h4 {
		margin: 0 0 10px 0;
		color: var(--primary-color);
		font-family: monospace;
	}

	.trigger-card p {
		margin: 5px 0;
	}

	.examples ul {
		margin: 5px 0;
		padding-left: 20px;
	}

	.examples-section {
		margin-bottom: 20px;
	}

	.examples-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 10px;
		margin-top: 10px;
	}

	.example-btn {
		padding: 8px 12px;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--card-bg);
		color: var(--text-color);
		cursor: pointer;
		text-align: left;
		font-size: 14px;
		transition: all 0.2s;
	}

	.example-btn:hover {
		background: var(--hover-bg);
		border-color: var(--primary-color);
	}

	.analysis-section {
		margin-bottom: 20px;
	}

	.analysis-card {
		background: var(--card-bg);
		padding: 15px;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		margin-bottom: 15px;
	}

	.analysis-card ul {
		margin: 5px 0;
		padding-left: 20px;
	}

	.ability-item {
		font-family: monospace;
	}

	.ability-item.available {
		color: var(--success-text);
	}

	.ability-item.unavailable {
		color: var(--error-text);
	}

	.enhanced-prompt {
		background: var(--card-bg);
		padding: 15px;
		border-radius: 8px;
		border: 1px solid var(--border-color);
	}

	.enhanced-prompt pre {
		background: var(--code-bg);
		padding: 10px;
		border-radius: 4px;
		overflow-x: auto;
		white-space: pre-wrap;
		font-size: 14px;
	}

	.results-section {
		margin-top: 20px;
	}

	.result-card {
		background: var(--card-bg);
		padding: 15px;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		margin-bottom: 10px;
	}

	.result-card.success {
		border-left: 4px solid var(--success-color);
	}

	.result-card.error {
		border-left: 4px solid var(--error-color);
	}

	.result-card h4 {
		margin: 0 0 10px 0;
		font-family: monospace;
		color: var(--primary-color);
	}

	.result-card details {
		margin-top: 10px;
	}

	.result-card summary {
		cursor: pointer;
		font-weight: bold;
		color: var(--primary-color);
	}

	.result-card pre {
		background: var(--code-bg);
		padding: 10px;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 12px;
		margin-top: 10px;
	}

	h2, h3, h4 {
		margin: 0 0 15px 0;
		color: var(--heading-color);
	}

	h2 {
		font-size: 24px;
	}

	h3 {
		font-size: 20px;
	}

	h4 {
		font-size: 16px;
	}
</style> 