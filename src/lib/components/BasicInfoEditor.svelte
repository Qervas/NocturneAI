<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { settingsManager } from '../services/SettingsManager';

	// Props
	export let isOpen: boolean = false;
	export let agentId: string = '';

	// Events
	const dispatch = createEventDispatcher();

	// Form data
	let agentName = '';
	let specialization = '';
	let aiModel = '';
	let personality = '';

	// Available options
	const specializations = [
		'Data Analysis',
		'Content Generation', 
		'Problem Solving',
		'Creative Writing',
		'Code Development',
		'Research & Analysis',
		'Customer Support',
		'Project Management',
		'General AI'
	];

	const aiModels = [
		'GPT-4 Turbo',
		'GPT-4',
		'Claude-3 Sonnet',
		'Claude-3 Haiku',
		'Gemini Pro',
		'Gemini Flash',
		'Llama 3.1',
		'Custom Model'
	];

	const personalities = [
		'Analytical & Logical',
		'Creative & Expressive',
		'Strategic & Adaptive',
		'Friendly & Helpful',
		'Professional & Formal',
		'Casual & Conversational',
		'Technical & Precise',
		'Balanced'
	];

	// Load current agent data
	$: if (isOpen && agentId) {
		loadAgentData();
	}

	function loadAgentData() {
		// Get current agent data from settings or use defaults
		const savedData = settingsManager.getAgentBasicInfo(agentId);
		
		if (savedData) {
			agentName = savedData.name || getDefaultName(agentId);
			specialization = savedData.specialization || getDefaultSpecialization(agentId);
			aiModel = savedData.aiModel || getDefaultAIModel(agentId);
			personality = savedData.personality || getDefaultPersonality(agentId);
		} else {
			// Use defaults
			agentName = getDefaultName(agentId);
			specialization = getDefaultSpecialization(agentId);
			aiModel = getDefaultAIModel(agentId);
			personality = getDefaultPersonality(agentId);
		}
	}

	function getDefaultName(agentId: string): string {
		if (agentId.includes('alpha')) return 'Alpha';
		if (agentId.includes('beta')) return 'Beta';
		if (agentId.includes('gamma')) return 'Gamma';
		return 'Agent';
	}

	function getDefaultSpecialization(agentId: string): string {
		if (agentId.includes('alpha')) return 'Data Analysis';
		if (agentId.includes('beta')) return 'Content Generation';
		if (agentId.includes('gamma')) return 'Problem Solving';
		return 'General AI';
	}

	function getDefaultPersonality(agentId: string): string {
		if (agentId.includes('alpha')) return 'Analytical & Logical';
		if (agentId.includes('beta')) return 'Creative & Expressive';
		if (agentId.includes('gamma')) return 'Strategic & Adaptive';
		return 'Balanced';
	}

	function getDefaultAIModel(agentId: string): string {
		if (agentId.includes('alpha')) return 'GPT-4 Turbo';
		if (agentId.includes('beta')) return 'Claude-3 Sonnet';
		if (agentId.includes('gamma')) return 'Gemini Pro';
		return 'GPT-4';
	}

	function saveAgentData() {
		const data = {
			name: agentName,
			specialization,
			aiModel,
			personality
		};

		settingsManager.saveAgentBasicInfo(agentId, data);
		dispatch('close');
	}

	function handleClose() {
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

{#if isOpen}
	<div class="modal-overlay" on:click={handleClose}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h3>📋 Edit Basic Info</h3>
				<button class="close-btn" on:click={handleClose}>×</button>
			</div>

			<div class="modal-body">
				<div class="form-group">
					<label for="agent-name">Agent Name:</label>
					<input 
						id="agent-name"
						type="text" 
						bind:value={agentName}
						placeholder="Enter agent name"
						maxlength="20"
					>
				</div>

				<div class="form-group">
					<label for="specialization">Specialization:</label>
					<select id="specialization" bind:value={specialization}>
						{#each specializations as spec}
							<option value={spec}>{spec}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="ai-model">AI Model:</label>
					<select id="ai-model" bind:value={aiModel}>
						{#each aiModels as model}
							<option value={model}>{model}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="personality">Personality:</label>
					<select id="personality" bind:value={personality}>
						{#each personalities as pers}
							<option value={pers}>{pers}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" on:click={handleClose}>
					Cancel
				</button>
				<button class="btn btn-primary" on:click={saveAgentData}>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="css">
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: var(--panel-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px;
		border-bottom: 1px solid var(--border-color);
	}

	.modal-header h3 {
		margin: 0;
		color: var(--text-primary);
		font-size: 1.2rem;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: var(--hover-bg);
		color: var(--text-primary);
	}

	.modal-body {
		padding: 20px;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		margin-bottom: 8px;
		color: var(--text-primary);
		font-weight: 500;
	}

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.9rem;
		transition: border-color 0.2s ease;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 20px;
		border-top: 1px solid var(--border-color);
	}

	.btn {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: var(--accent-color);
		color: var(--text-on-accent);
	}

	.btn-primary:hover {
		background: var(--accent-hover);
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: var(--button-secondary-bg);
		color: var(--text-secondary);
	}

	.btn-secondary:hover {
		background: var(--button-secondary-hover);
		color: var(--text-primary);
	}
</style> 