<script lang="ts">
  import { onMount } from 'svelte';
  import { promptManager } from '../services/PromptManager';
  import { selectedAgent, getAgentFullId } from '../services/CharacterManager';
  import type { AgentPromptData, AgentPrompt } from '../services/PromptManager';

  let currentAgentData: AgentPromptData | null = null;
  let showCreateForm = false;
  let newAgentData = {
    agentId: '',
    name: '',
    description: '',
    version: '1.0.0',
    metadata: {
      personality: '',
      specialization: '',
      aiModel: 'gpt-4',
      tags: []
    }
  };

  // Reactive statement to get current agent data
  $: currentAgentData = $selectedAgent ? promptManager.getAgentPromptData(getAgentFullId($selectedAgent)) : null;

  function createNewAgent() {
    if (!newAgentData.agentId || !newAgentData.name) {
      alert('Please fill in agent ID and name');
      return;
    }

    const agentData = {
      ...newAgentData,
      prompts: [
        {
          id: 'system_prompt',
          name: 'System Prompt',
          description: 'Core identity and capabilities',
          category: 'system' as const,
          prompt: `You are ${newAgentData.name}, an AI assistant.`,
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'behavior_prompt',
          name: 'Behavior Prompt',
          description: 'How to approach tasks and interact',
          category: 'behavior' as const,
          prompt: 'I am helpful and direct in my responses.',
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    promptManager.createAgentPrompt(agentData).then(success => {
      if (success) {
        showCreateForm = false;
        newAgentData = {
          agentId: '',
          name: '',
          description: '',
          version: '1.0.0',
          metadata: {
            personality: '',
            specialization: '',
            aiModel: 'gpt-4',
            tags: []
          }
        };
        alert('Agent created successfully!');
      } else {
        alert('Failed to create agent');
      }
    });
  }

  function deleteAgent(agentId: string) {
    if (confirm(`Are you sure you want to delete agent ${agentId}?`)) {
      promptManager.deleteAgentPrompt(agentId).then(success => {
        if (success) {
          alert('Agent deleted successfully!');
        } else {
          alert('Failed to delete agent');
        }
      });
    }
  }

  function exportAgentData(agentId: string) {
    const data = promptManager.getAgentPromptData(agentId);
    if (data) {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${agentId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  function importAgentData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            promptManager.importData({ [data.agentId]: data });
            alert('Agent data imported successfully!');
          } catch (error) {
            alert('Failed to import agent data: ' + error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  onMount(() => {
    // Load all prompts on mount
    promptManager.loadAllPrompts();
  });
</script>

<div class="prompt-file-manager">
  <div class="header">
    <h3>📁 File-Based Prompt Management</h3>
    <div class="actions">
      <button class="btn-primary" on:click={() => showCreateForm = true}>
        ➕ Create New Agent
      </button>
      <button class="btn-secondary" on:click={importAgentData}>
        📥 Import Agent
      </button>
    </div>
  </div>

  <!-- Create New Agent Form -->
  {#if showCreateForm}
    <div class="create-form">
      <h4>Create New Agent</h4>
      <div class="form-group">
        <label>Agent ID:</label>
        <input bind:value={newAgentData.agentId} placeholder="e.g., agent_delta" />
      </div>
      <div class="form-group">
        <label>Name:</label>
        <input bind:value={newAgentData.name} placeholder="e.g., Delta" />
      </div>
      <div class="form-group">
        <label>Description:</label>
        <textarea bind:value={newAgentData.description} placeholder="Agent description..."></textarea>
      </div>
      <div class="form-group">
        <label>Personality:</label>
        <input bind:value={newAgentData.metadata.personality} placeholder="e.g., analytical" />
      </div>
      <div class="form-group">
        <label>Specialization:</label>
        <input bind:value={newAgentData.metadata.specialization} placeholder="e.g., data_analysis" />
      </div>
      <div class="form-actions">
        <button class="btn-primary" on:click={createNewAgent}>Create Agent</button>
        <button class="btn-secondary" on:click={() => showCreateForm = false}>Cancel</button>
      </div>
    </div>
  {/if}

  <!-- Agent List -->
  <div class="agent-list">
    <h4>Available Agents</h4>
    {#each promptManager.getAllAgents() as agentId}
      {@const agentData = promptManager.getAgentPromptData(agentId)}
      {#if agentData}
        <div class="agent-item">
          <div class="agent-info">
            <h5>{agentData.name} ({agentId})</h5>
            <p>{agentData.description}</p>
            <div class="agent-meta">
              <span class="tag">Personality: {agentData.metadata.personality}</span>
              <span class="tag">Specialization: {agentData.metadata.specialization}</span>
              <span class="tag">AI Model: {agentData.metadata.aiModel}</span>
            </div>
          </div>
          <div class="agent-actions">
            <button class="btn-small" on:click={() => exportAgentData(agentId)}>
              📤 Export
            </button>
            <button class="btn-small danger" on:click={() => deleteAgent(agentId)}>
              🗑️ Delete
            </button>
          </div>
        </div>
      {/if}
    {/each}
  </div>

  <!-- Current Agent Details -->
  {#if currentAgentData}
    <div class="current-agent">
      <h4>Current Agent: {currentAgentData.name}</h4>
      <div class="prompts-list">
        {#each currentAgentData.prompts as prompt}
          <div class="prompt-item">
            <div class="prompt-header">
              <span class="prompt-name">{prompt.name}</span>
              <span class="prompt-category">{prompt.category}</span>
              <span class="prompt-status" class:enabled={prompt.isEnabled}>
                {prompt.isEnabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
            <div class="prompt-content">
              <p><strong>Description:</strong> {prompt.description}</p>
              <p><strong>Prompt:</strong></p>
              <pre>{prompt.prompt}</pre>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if $selectedAgent}
    <div class="no-agent-data">
      <p>No prompt data found for agent: {$selectedAgent}</p>
    </div>
  {:else}
    <div class="no-selection">
      <p>Select an agent to view their prompt configuration</p>
    </div>
  {/if}
</div>

<style>
  .prompt-file-manager {
    padding: 20px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    margin: 10px 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .header h3 {
    margin: 0;
    color: #00ff88;
  }

  .actions {
    display: flex;
    gap: 10px;
  }

  .create-form {
    background: rgba(0, 0, 0, 0.2);
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    color: #00ff88;
    font-weight: bold;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
  }

  .form-actions {
    display: flex;
    gap: 10px;
    margin-top: 15px;
  }

  .agent-list {
    margin-bottom: 20px;
  }

  .agent-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    margin-bottom: 10px;
  }

  .agent-info h5 {
    margin: 0 0 5px 0;
    color: #00ff88;
  }

  .agent-info p {
    margin: 0 0 10px 0;
    color: rgba(255, 255, 255, 0.8);
  }

  .agent-meta {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .tag {
    background: rgba(0, 255, 136, 0.1);
    color: #00ff88;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .agent-actions {
    display: flex;
    gap: 5px;
  }

  .current-agent {
    background: rgba(0, 0, 0, 0.2);
    padding: 20px;
    border-radius: 8px;
  }

  .prompts-list {
    margin-top: 15px;
  }

  .prompt-item {
    background: rgba(0, 0, 0, 0.3);
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 10px;
  }

  .prompt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .prompt-name {
    font-weight: bold;
    color: #00ff88;
  }

  .prompt-category {
    background: rgba(0, 255, 136, 0.1);
    color: #00ff88;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .prompt-status {
    font-size: 0.8rem;
  }

  .prompt-status.enabled {
    color: #00ff88;
  }

  .prompt-content pre {
    background: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 4px;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-size: 0.9rem;
  }

  .btn-primary,
  .btn-secondary,
  .btn-small {
    padding: 8px 16px;
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    background: transparent;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: rgba(0, 255, 136, 0.1);
    color: #00ff88;
  }

  .btn-primary:hover {
    background: rgba(0, 255, 136, 0.2);
  }

  .btn-secondary:hover {
    background: rgba(0, 255, 136, 0.1);
    color: #00ff88;
  }

  .btn-small {
    padding: 4px 8px;
    font-size: 0.8rem;
  }

  .btn-small.danger {
    color: #ff6b6b;
    border-color: rgba(255, 107, 107, 0.3);
  }

  .btn-small.danger:hover {
    background: rgba(255, 107, 107, 0.1);
  }

  .no-agent-data,
  .no-selection {
    text-align: center;
    padding: 20px;
    color: rgba(255, 255, 255, 0.6);
  }
</style> 