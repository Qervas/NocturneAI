<script lang="ts">
  import { onMount } from "svelte";
	import { characterManager, characters, selectedAgent } from "../services/CharacterManager";
	import { settingsManager } from "../services/SettingsManager";
	import type { Character, NPCAgent } from "../types/Character";
	import PromptEditor from "./PromptEditor.svelte";
	import BasicInfoEditor from "./BasicInfoEditor.svelte";

	// Component state
	let selectedAgentData: Character | null = null;
	let showPromptEditor = false;
	let showBasicInfoEditor = false;

	// Reactive calculations
	$: selectedAgentData = $selectedAgent ? $characters.find(c => c.id === $selectedAgent) || null : null;

  function getStatusColor(status: string): string {
    switch (status) {
      case 'online': return '#00ff88';
      case 'offline': return '#666666';
      case 'busy': return '#ff8800';
      case 'idle': return '#ffff00';
      default: return '#ffffff';
    }
  }

  function getCharacterIcon(character: Character): string {
    if (character.type === 'npc') {
      const npc = character as NPCAgent;
      return npc.name === 'Alpha' ? '🧠' : 
             npc.name === 'Beta' ? '🎨' : 
             npc.name === 'Gamma' ? '⚙️' : '🤖';
    }
    return '👤';
  }

	function getAgentColor(agentId: string): string {
		if (agentId.includes('alpha')) return '#4CAF50';
		if (agentId.includes('beta')) return '#FF9800';
		if (agentId.includes('gamma')) return '#9C27B0';
		return '#2196F3';
	}

	function getAgentName(agentId: string): string {
		const savedInfo = settingsManager.getAgentBasicInfo(agentId);
		if (savedInfo?.name) return savedInfo.name;
		
		if (agentId.includes('alpha')) return 'Alpha';
		if (agentId.includes('beta')) return 'Beta';
		if (agentId.includes('gamma')) return 'Gamma';
		return 'Agent';
	}

	function getSpecialization(agentId: string): string {
		const savedInfo = settingsManager.getAgentBasicInfo(agentId);
		if (savedInfo?.specialization) return savedInfo.specialization;
    
		if (agentId.includes('alpha')) return 'Data Analysis';
		if (agentId.includes('beta')) return 'Content Generation';
		if (agentId.includes('gamma')) return 'Problem Solving';
		return 'General AI';
	}

	function getPersonality(agentId: string): string {
		const savedInfo = settingsManager.getAgentBasicInfo(agentId);
		if (savedInfo?.personality) return savedInfo.personality;
		
		if (agentId.includes('alpha')) return 'Analytical & Logical';
		if (agentId.includes('beta')) return 'Creative & Expressive';
		if (agentId.includes('gamma')) return 'Strategic & Adaptive';
		return 'Balanced';
	}

	function getAIModel(agentId: string): string {
		const savedInfo = settingsManager.getAgentBasicInfo(agentId);
		if (savedInfo?.aiModel) return savedInfo.aiModel;
		
		if (agentId.includes('alpha')) return 'GPT-4 Turbo';
		if (agentId.includes('beta')) return 'Claude-3 Sonnet';
		if (agentId.includes('gamma')) return 'Gemini Pro';
		return 'GPT-4';
  }

  onMount(() => {
    characterManager.initializeSampleData();
  });
</script>

<!-- Character Management Panel -->
<div class="character-panel">
	{#if selectedAgentData}
		<!-- Selected Agent Header -->
		<div class="agent-header">
			<div class="agent-icon" style="color: {getAgentColor($selectedAgent || '')}">
				{getCharacterIcon(selectedAgentData)}
      </div>
			<div class="agent-info">
				<div class="agent-name">{getAgentName($selectedAgent || '')}</div>
				<div class="agent-status">
					Status: <span class="status-{selectedAgentData.status}">{selectedAgentData.status}</span>
                </div>
              </div>
      </div>

		<!-- Agent Details -->
		<div class="agent-details">
			<div class="detail-section">
				<h4>📋 Basic Info</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Type:</label>
						<span>NPC Agent</span>
            </div>
            <div class="detail-item">
						<label>Specialization:</label>
						<span>{getSpecialization($selectedAgent || '')}</span>
            </div>
              <div class="detail-item">
                <label>AI Model:</label>
						<span>{getAIModel($selectedAgent || '')}</span>
              </div>
              <div class="detail-item">
                <label>Personality:</label>
						<span>{getPersonality($selectedAgent || '')}</span>
					</div>
				</div>
			</div>

			<div class="detail-section">
				<h4>📊 Performance</h4>
				<div class="detail-grid">
					<div class="detail-item">
						<label>Level:</label>
						<span>Lv.{selectedAgentData.level}</span>
              </div>
              <div class="detail-item">
                <label>Tasks Completed:</label>
						<span>{(selectedAgentData as NPCAgent)?.performance?.tasksCompleted || 0}</span>
              </div>
              <div class="detail-item">
                <label>Success Rate:</label>
						<span>{((selectedAgentData as NPCAgent)?.performance?.successRate || 0) * 100}%</span>
					</div>
					<div class="detail-item">
						<label>Experience:</label>
						<span>{selectedAgentData.experience || 0} XP</span>
					</div>
				</div>
			</div>

			<div class="detail-section">
				<h4>⚙️ Management</h4>
				<div class="management-actions">
					<button class="action-btn primary">
						🔄 Restart Agent
					</button>
					<button class="action-btn secondary" on:click={() => showBasicInfoEditor = true}>
						📋 Edit Basic Info
					</button>
					<button class="action-btn secondary" on:click={() => showPromptEditor = true}>
						🧠 Agent Identity
					</button>
					<button class="action-btn warning">
						⏸️ Pause Agent
					</button>
					<button class="action-btn danger">
						🗑️ Reset Agent
					</button>
				</div>
				<div class="settings-description">
					<strong>Basic Info:</strong> Configure the agent's name, specialization, AI model, and personality traits.
					<br>
					<strong>Agent Identity:</strong> Configure the core personality, behavior, and capabilities that define this agent's unique character.
				</div>
			</div>

			<div class="detail-section">
				<h4>🔧 Advanced</h4>
				<div class="advanced-options">
					<div class="option-item">
						<label>Auto-Response:</label>
						<label class="toggle-switch">
							<input type="checkbox" checked>
							<span class="toggle-slider"></span>
						</label>
					</div>
					<div class="option-item">
						<label>Learning Mode:</label>
						<label class="toggle-switch">
							<input type="checkbox" checked>
							<span class="toggle-slider"></span>
						</label>
					</div>
					<div class="option-item">
						<label>Debug Mode:</label>
						<label class="toggle-switch">
							<input type="checkbox">
							<span class="toggle-slider"></span>
						</label>
					</div>
				</div>
			</div>
              </div>
	{:else}
		<div class="no-agent-selected">
			<div class="no-agent-icon">👤</div>
			<div class="no-agent-text">
				Click on an agent in the simulation to manage their settings
          </div>
        </div>
      {/if}
    </div>

<!-- Prompt Editor Modal -->
<PromptEditor 
	bind:isOpen={showPromptEditor}
	onClose={() => showPromptEditor = false}
/>

<!-- Basic Info Editor Modal -->
<BasicInfoEditor 
	bind:isOpen={showBasicInfoEditor}
	agentId={$selectedAgent || ''}
	on:close={() => showBasicInfoEditor = false}
/>

<style lang="css">
  .character-panel {
		padding: 16px;
		height: 100%;
    overflow-y: auto;
  }

	.agent-header {
    display: flex;
    align-items: center;
		gap: 12px;
		padding: 12px;
    background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		border: 1px solid rgba(0, 255, 136, 0.2);
		margin-bottom: 16px;
  }

	.agent-icon {
		font-size: 2rem;
		width: 50px;
		height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
		border-radius: 50%;
  }

	.agent-info {
    flex: 1;
  }

	.agent-name {
		font-size: 1.2rem;
    font-weight: bold;
		color: #00ff88;
		margin-bottom: 4px;
	}

	.agent-status {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
  }

	.status-online { color: #4CAF50; }
	.status-offline { color: #F44336; }
	.status-idle { color: #FF9800; }
	.status-busy { color: #2196F3; }

	.agent-details {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.detail-section {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		padding: 12px;
		border: 1px solid rgba(0, 255, 136, 0.1);
  }

	.detail-section h4 {
		margin: 0 0 12px 0;
		color: #00ff88;
		font-size: 0.9rem;
		font-weight: bold;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
		gap: 8px;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
		align-items: center;
		padding: 6px 0;
		font-size: 0.8rem;
  }

  .detail-item label {
		color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }

  .detail-item span {
		color: #ffffff;
    font-weight: 600;
  }

	.management-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.action-btn {
		padding: 8px 12px;
		border: none;
		border-radius: 6px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
	}

	.action-btn.primary {
		background: rgba(0, 255, 136, 0.2);
		color: #00ff88;
		border: 1px solid rgba(0, 255, 136, 0.3);
	}

	.action-btn.primary:hover {
		background: rgba(0, 255, 136, 0.3);
	}

	.action-btn.secondary {
		background: rgba(33, 150, 243, 0.2);
		color: #2196F3;
		border: 1px solid rgba(33, 150, 243, 0.3);
	}

	.action-btn.secondary:hover {
		background: rgba(33, 150, 243, 0.3);
	}

	.action-btn.warning {
		background: rgba(255, 152, 0, 0.2);
		color: #FF9800;
		border: 1px solid rgba(255, 152, 0, 0.3);
	}

	.action-btn.warning:hover {
		background: rgba(255, 152, 0, 0.3);
	}

	.action-btn.danger {
		background: rgba(244, 67, 54, 0.2);
		color: #F44336;
		border: 1px solid rgba(244, 67, 54, 0.3);
	}

	.action-btn.danger:hover {
		background: rgba(244, 67, 54, 0.3);
	}
	
	.settings-description {
		margin-top: 12px;
		padding: 8px 12px;
		background: rgba(0, 255, 136, 0.1);
		border: 1px solid rgba(0, 255, 136, 0.2);
		border-radius: 6px;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.4;
	}

	.advanced-options {
		display: flex;
		flex-direction: column;
		gap: 12px;
    }
    
	.option-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
	}

	.option-item label {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 20px;
    }
    
	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(255, 255, 255, 0.2);
		transition: 0.2s;
		border-radius: 20px;
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 16px;
		width: 16px;
		left: 2px;
		bottom: 2px;
		background-color: white;
		transition: 0.2s;
		border-radius: 50%;
	}

	input:checked + .toggle-slider {
		background-color: #00ff88;
	}

	input:checked + .toggle-slider:before {
		transform: translateX(20px);
	}

	.no-agent-selected {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 200px;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
	}

	.no-agent-icon {
		font-size: 3rem;
		margin-bottom: 12px;
		opacity: 0.7;
	}

	.no-agent-text {
		font-size: 0.9rem;
		line-height: 1.4;
  }
</style> 