<script lang="ts">
  	import { onMount } from "svelte";
	import { agentSelectionStore, focusedAgent, type Agent } from "../services/AgentSelectionManager";
	import { settingsManager } from "../services/SettingsManager";
	import type { Character, NPCAgent } from "../types/Character";
	import AgentSettingsModal from "./AgentSettingsModal.svelte";

	// Component state
	let selectedAgentData: Agent | null = null;
	let showAgentSettings = false;

	// Reactive calculations - use the new AgentSelectionManager
	$: {
		const selectionState = $agentSelectionStore;
		selectedAgentData = selectionState.focusedAgent ? 
			selectionState.availableAgents.find(a => a.id === selectionState.focusedAgent) || null : null;
	}

  onMount(() => {
    // No initialization needed for AgentSelectionManager
  });
</script>

<!-- Character Management Panel -->
<div class="character-panel">
	{#if selectedAgentData}
		<!-- Selected Agent Header -->
		<div class="agent-header">
			<div class="agent-icon" style="color: {selectedAgentData.color}">
				{selectedAgentData.avatar}
      </div>
			<div class="agent-info">
				<div class="agent-name">{selectedAgentData.name}</div>
				<div class="agent-status">
					Status: <span class="status-{selectedAgentData.isActive ? 'online' : 'offline'}">{selectedAgentData.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
      </div>

		<!-- Agent Details -->
		<div class="agent-details">
			<div class="detail-section">
				<h4>📋 Basic Info</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Name:</label>
						<span>{selectedAgentData.name}</span>
            </div>
            <div class="detail-item">
						<label>Type:</label>
						<span>{selectedAgentData.type}</span>
            </div>
              <div class="detail-item">
                <label>Avatar:</label>
						<span>{selectedAgentData.avatar}</span>
              </div>
              <div class="detail-item">
                <label>Color:</label>
						<span style="color: {selectedAgentData.color}">{selectedAgentData.color}</span>
					</div>
				</div>
			</div>

			<div class="detail-section">
				<h4>📊 Performance</h4>
				<div class="detail-grid">
					<div class="detail-item">
						<label>Status:</label>
						<span>{selectedAgentData.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div class="detail-item">
                <label>Capabilities:</label>
						<span>{selectedAgentData.capabilities.length} skills</span>
              </div>
              <div class="detail-item">
                <label>Position:</label>
						<span>X: {selectedAgentData.position?.x || 0}, Y: {selectedAgentData.position?.y || 0}</span>
					</div>
					<div class="detail-item">
						<label>Avatar:</label>
						<span>{selectedAgentData.avatar}</span>
					</div>
				</div>
			</div>

			<div class="detail-section">
				<h4>⚙️ Management</h4>
				<div class="management-actions">
					<button class="action-btn primary">
						🔄 Restart Agent
					</button>
					<button class="action-btn secondary" on:click={() => showAgentSettings = true}>
						⚙️ Agent Settings
					</button>
					<button class="action-btn warning">
						⏸️ Pause Agent
					</button>
					<button class="action-btn danger">
						🗑️ Reset Agent
					</button>
				</div>
				<div class="settings-description">
					<strong>Agent Settings:</strong> Configure the agent's basic info, identity prompts, and manage all settings in one unified interface.
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

<!-- Agent Settings Modal -->
<AgentSettingsModal 
	isOpen={showAgentSettings}
	onClose={() => showAgentSettings = false}
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