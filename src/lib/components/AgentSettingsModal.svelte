<script lang="ts">
  import { onMount } from 'svelte';
  import { promptManager } from '../services/PromptManager';
  import { selectedAgent, getAgentFullId } from '../services/CharacterManager';
  import { settingsManager } from '../services/SettingsManager';
  import type { AgentPromptData, AgentPrompt } from '../services/PromptManager';

  export let isOpen: boolean = false;
  export let onClose: () => void;

  let currentAgentData: AgentPromptData | null = null;
  let activeTab = 'basic'; // 'basic' | 'identity' | 'prompts'
  let editingPrompt: AgentPrompt | null = null;
  let isAddingNewPrompt = false;

  // Basic Info Form
  let basicInfo = {
    name: '',
    specialization: '',
    aiModel: '',
    personality: ''
  };

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

  // Subscribe to the prompt manager store for reactive updates
  let promptStoreData: Record<string, AgentPromptData> = {};
  promptManager.store.subscribe(data => {
    promptStoreData = data;
    console.log('📊 Prompt store updated:', Object.keys(data));
  });

  // Reactive statement to get current agent data
  $: currentAgentData = $selectedAgent ? promptStoreData[getAgentFullId($selectedAgent)] || null : null;
  $: if ($selectedAgent) {
    console.log('🔄 Current agent data updated:', currentAgentData?.name);
  }

  // Load current agent data when modal opens or data changes
  $: if (isOpen && $selectedAgent) {
    loadAgentData();
  }

  // Reactive statement to reload data when currentAgentData changes
  $: if (currentAgentData && isOpen) {
    loadAgentData();
  }

  // Reactive statement to reload basic info when settings change
  $: if (isOpen && $selectedAgent) {
    const agentId = getAgentFullId($selectedAgent);
    const savedInfo = settingsManager.getAgentBasicInfo(agentId);
    if (savedInfo) {
      basicInfo.name = savedInfo.name || getDefaultName(agentId);
      basicInfo.specialization = savedInfo.specialization || getDefaultSpecialization(agentId);
      basicInfo.aiModel = savedInfo.aiModel || getDefaultAIModel(agentId);
      basicInfo.personality = savedInfo.personality || getDefaultPersonality(agentId);
    }
  }

  // Force UI update when data changes
  $: if (currentAgentData) {
    // This will trigger UI updates when the data changes
    console.log('🔄 UI update triggered for agent:', currentAgentData.name);
  }

  // Track changes for debugging
  let changeCounter = 0;
  $: if (currentAgentData) {
    changeCounter++;
    console.log(`🔄 Change counter: ${changeCounter} for agent: ${currentAgentData.name}`);
  }

  function loadAgentData() {
    if (!currentAgentData) return;

    // Load basic info from settings or use defaults
    const agentId = $selectedAgent || '';
    const savedInfo = settingsManager.getAgentBasicInfo(agentId);
    
    if (savedInfo) {
      basicInfo.name = savedInfo.name || getDefaultName(agentId);
      basicInfo.specialization = savedInfo.specialization || getDefaultSpecialization(agentId);
      basicInfo.aiModel = savedInfo.aiModel || getDefaultAIModel(agentId);
      basicInfo.personality = savedInfo.personality || getDefaultPersonality(agentId);
    } else {
      // Use defaults
      basicInfo.name = getDefaultName(agentId);
      basicInfo.specialization = getDefaultSpecialization(agentId);
      basicInfo.aiModel = getDefaultAIModel(agentId);
      basicInfo.personality = getDefaultPersonality(agentId);
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

  // Save basic info
  function saveBasicInfo() {
    if (!$selectedAgent) return;

    const agentId = getAgentFullId($selectedAgent);
    
    try {
      // Save to settings manager
      settingsManager.saveAgentBasicInfo(agentId, {
        name: basicInfo.name,
        specialization: basicInfo.specialization,
        aiModel: basicInfo.aiModel,
        personality: basicInfo.personality
      });

      // Update prompt manager metadata
      if (currentAgentData) {
        promptManager.updateAgentPromptData(agentId, {
          name: basicInfo.name,
          description: `${basicInfo.name} - ${basicInfo.specialization} specialist`,
          metadata: {
            ...currentAgentData.metadata,
            personality: basicInfo.personality.toLowerCase().replace(/\s+/g, '_'),
            specialization: basicInfo.specialization.toLowerCase().replace(/\s+/g, '_'),
            aiModel: basicInfo.aiModel
          }
        });
      }

      console.log('✅ Basic info saved for agent:', agentId);
      alert('✅ Basic info saved successfully!');
      
      // Force UI refresh
      setTimeout(() => {
        loadAgentData();
      }, 100);
    } catch (error) {
      console.error('❌ Error saving basic info:', error);
      alert('❌ Failed to save basic info. Please try again.');
    }
  }

  // Prompt management functions
  function openEditPrompt(prompt: AgentPrompt) {
    editingPrompt = { ...prompt };
    isAddingNewPrompt = false;
  }

  function openAddPrompt() {
    editingPrompt = {
      id: '',
      name: '',
      description: '',
      prompt: '',
      category: 'custom',
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    isAddingNewPrompt = true;
  }

  function savePrompt() {
    if (!$selectedAgent || !editingPrompt) return;

    const agentId = getAgentFullId($selectedAgent);

    try {
      if (isAddingNewPrompt) {
        promptManager.addPrompt(agentId, editingPrompt);
      } else {
        promptManager.updatePrompt(agentId, editingPrompt.id, editingPrompt);
      }

      editingPrompt = null;
      console.log('✅ Prompt saved for agent:', agentId);
      alert('✅ Prompt saved successfully!');
      
      // Force UI refresh
      setTimeout(() => {
        loadAgentData();
      }, 100);
    } catch (error) {
      console.error('❌ Error saving prompt:', error);
      alert('❌ Failed to save prompt. Please try again.');
    }
  }

  function deletePrompt(promptId: string) {
    if (!$selectedAgent) return;
    
    const agentId = getAgentFullId($selectedAgent);
    promptManager.deletePrompt(agentId, promptId);
  }

  function togglePrompt(promptId: string, isEnabled: boolean) {
    if (!$selectedAgent) return;
    
    const agentId = getAgentFullId($selectedAgent);
    promptManager.updatePrompt(agentId, promptId, { isEnabled });
  }

  function getCategoryIcon(category: string): string {
    switch (category) {
      case 'system': return '👤';
      case 'behavior': return '🧠';
      case 'custom': return '✨';
      default: return '📄';
    }
  }

  function getCategoryColor(category: string): string {
    switch (category) {
      case 'system': return '#4CAF50';
      case 'behavior': return '#2196F3';
      case 'custom': return '#9C27B0';
      default: return '#757575';
    }
  }

  // Agent management functions
  function restartAgent() {
    if (!$selectedAgent) return;
    console.log('🔄 Restarting agent:', $selectedAgent);
    // TODO: Implement agent restart logic
  }

  function pauseAgent() {
    if (!$selectedAgent) return;
    console.log('⏸️ Pausing agent:', $selectedAgent);
    // TODO: Implement agent pause logic
  }

  function resetAgent() {
    if (!$selectedAgent) return;
    
    if (confirm(`Are you sure you want to reset agent ${$selectedAgent}? This will clear all custom settings.`)) {
      console.log('🗑️ Resetting agent:', $selectedAgent);
      // TODO: Implement agent reset logic
    }
  }

  onMount(() => {
    // Load all prompts on mount
    promptManager.loadAllPrompts();
  });
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={onClose}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>⚙️ Agent Settings - {currentAgentData?.name || $selectedAgent}</h3>
        <button class="close-btn" on:click={onClose}>×</button>
      </div>

      <div class="modal-tabs">
        <button 
          class="tab-btn" 
          class:active={activeTab === 'basic'}
          on:click={() => activeTab = 'basic'}
        >
          📋 Basic Info
        </button>
        <button 
          class="tab-btn" 
          class:active={activeTab === 'identity'}
          on:click={() => activeTab = 'identity'}
        >
          🧠 Agent Identity
        </button>
        <button 
          class="tab-btn" 
          class:active={activeTab === 'prompts'}
          on:click={() => activeTab = 'prompts'}
        >
          📝 Prompts
        </button>
      </div>

      <div class="modal-body">
        {#if activeTab === 'basic'}
          <!-- Basic Info Tab -->
          <div class="tab-content">
            <h4>Basic Information</h4>
            <div class="form-group">
              <label>Agent Name:</label>
              <input bind:value={basicInfo.name} placeholder="Enter agent name" />
            </div>
            <div class="form-group">
              <label>Specialization:</label>
              <select bind:value={basicInfo.specialization}>
                {#each specializations as spec}
                  <option value={spec}>{spec}</option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label>AI Model:</label>
              <select bind:value={basicInfo.aiModel}>
                {#each aiModels as model}
                  <option value={model}>{model}</option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label>Personality:</label>
              <select bind:value={basicInfo.personality}>
                {#each personalities as personality}
                  <option value={personality}>{personality}</option>
                {/each}
              </select>
            </div>
            <div class="form-actions">
              <button class="btn-primary" on:click={saveBasicInfo}>
                💾 Save Basic Info
              </button>
              <button class="btn-secondary" on:click={() => {
                loadAgentData();
                console.log('🔄 Manual refresh triggered');
              }}>
                🔄 Refresh
              </button>
              <button class="btn-secondary" on:click={() => {
                console.log('🔍 Debug: Current basic info:', basicInfo);
                console.log('🔍 Debug: Selected agent:', $selectedAgent);
                if ($selectedAgent) {
                  const agentId = getAgentFullId($selectedAgent);
                  console.log('🔍 Debug: Agent ID:', agentId);
                  console.log('🔍 Debug: Settings manager data:', settingsManager.getAgentBasicInfo(agentId));
                  console.log('🔍 Debug: Prompt manager data:', promptManager.getAgentPromptData(agentId));
                  console.log('🔍 Debug: Prompt store data:', promptStoreData[agentId]);
                  console.log('🔍 Debug: Current agent data:', currentAgentData);
                }
              }}>
                🐛 Debug
              </button>
            </div>
          </div>

        {:else if activeTab === 'identity'}
          <!-- Agent Identity Tab -->
          <div class="tab-content">
            <h4>Agent Identity Configuration</h4>
            {#if currentAgentData}
              <div class="prompts-section">
                <div class="section-header">
                  <h5>Identity Prompts for {currentAgentData.name}</h5>
                  <button class="add-btn" on:click={openAddPrompt}>+ Add Prompt</button>
                </div>
                
                <div class="prompts-list">
                  {#each currentAgentData.prompts as prompt}
                    <div class="prompt-card" class:enabled={prompt.isEnabled}>
                      <div class="prompt-header">
                        <div class="prompt-info">
                          <span class="category-icon" style="color: {getCategoryColor(prompt.category)}">
                            {getCategoryIcon(prompt.category)}
                          </span>
                          <div class="prompt-details">
                            <div class="prompt-name">{prompt.name}</div>
                            <div class="prompt-description">{prompt.description}</div>
                          </div>
                        </div>
                        <div class="prompt-actions">
                          <label class="ios-toggle">
                            <input 
                              type="checkbox" 
                              checked={prompt.isEnabled}
                              on:change={(e) => togglePrompt(prompt.id, (e.target as HTMLInputElement).checked)}
                            />
                            <span class="toggle-slider"></span>
                          </label>
                          <button class="edit-btn" on:click={() => openEditPrompt(prompt)}>✏️</button>
                          <button class="delete-btn" on:click={() => deletePrompt(prompt.id)}>🗑️</button>
                        </div>
                      </div>
                      <div class="prompt-preview">
                        {prompt.prompt.substring(0, 100)}{prompt.prompt.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="no-data">
                <p>No prompt data available for this agent.</p>
              </div>
            {/if}
          </div>

        {:else if activeTab === 'prompts'}
          <!-- Prompts Management Tab -->
          <div class="tab-content">
            <h4>Prompt Management</h4>
            {#if currentAgentData}
              <div class="prompt-management">
                <div class="management-actions">
                  <button class="btn-primary" on:click={openAddPrompt}>+ Add New Prompt</button>
                  <button class="btn-secondary" on:click={() => {
                    if ($selectedAgent) {
                      const agentId = getAgentFullId($selectedAgent);
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
                  }}>📤 Export Prompts</button>
                </div>
                
                <div class="prompt-stats">
                  <div class="stat-item">
                    <span class="stat-label">Total Prompts:</span>
                    <span class="stat-value">{currentAgentData.prompts.length}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Enabled:</span>
                    <span class="stat-value">{currentAgentData.prompts.filter(p => p.isEnabled).length}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Last Updated:</span>
                    <span class="stat-value">{new Date(currentAgentData.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            {:else}
              <div class="no-data">
                <p>No prompt data available for this agent.</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Agent Management Actions -->
      <div class="modal-footer">
        <div class="management-actions">
          <button class="action-btn primary" on:click={restartAgent}>
            🔄 Restart Agent
          </button>
          <button class="action-btn warning" on:click={pauseAgent}>
            ⏸️ Pause Agent
          </button>
          <button class="action-btn danger" on:click={resetAgent}>
            🗑️ Reset Agent
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Prompt Modal -->
{#if editingPrompt}
  <div class="modal-overlay" on:click={() => editingPrompt = null}>
    <div class="modal-content edit-prompt-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h4>{isAddingNewPrompt ? 'Add New Prompt' : 'Edit Prompt'}</h4>
        <button class="close-btn" on:click={() => editingPrompt = null}>×</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label>Name:</label>
          <input bind:value={editingPrompt.name} placeholder="Prompt name" />
        </div>
        
        <div class="form-group">
          <label>Description:</label>
          <input bind:value={editingPrompt.description} placeholder="Brief description" />
        </div>
        
        <div class="form-group">
          <label>Category:</label>
          <select bind:value={editingPrompt.category}>
            <option value="system">System</option>
            <option value="behavior">Behavior</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Prompt:</label>
          <textarea 
            bind:value={editingPrompt.prompt} 
            placeholder="Enter the prompt content..."
            rows="6"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={editingPrompt.isEnabled} />
            Enable this prompt
          </label>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => editingPrompt = null}>Cancel</button>
        <button class="btn-primary" on:click={savePrompt}>
          💾 Save Prompt
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: rgba(0, 0, 0, 0.95);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 8px;
    max-width: 800px;
    width: 90%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
  }

  .modal-header h3 {
    margin: 0;
    color: #00ff88;
  }

  .close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #00ff88;
  }

  .modal-tabs {
    display: flex;
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
  }

  .tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 15px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 2px solid transparent;
  }

  .tab-btn:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 255, 136, 0.1);
  }

  .tab-btn.active {
    color: #00ff88;
    border-bottom-color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .tab-content h4 {
    margin: 0 0 20px 0;
    color: #00ff88;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: bold;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 14px;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 100px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
  }

  .form-actions {
    margin-top: 20px;
    display: flex;
    gap: 10px;
  }

  .prompts-section {
    margin-top: 20px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .section-header h5 {
    margin: 0;
    color: #00ff88;
  }

  .add-btn {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: #00ff88;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .add-btn:hover {
    background: rgba(0, 255, 136, 0.2);
  }

  .prompts-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .prompt-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 255, 136, 0.2);
    border-radius: 6px;
    padding: 15px;
    transition: all 0.2s ease;
  }

  .prompt-card:not(.enabled) {
    opacity: 0.6;
  }

  .prompt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .prompt-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .category-icon {
    font-size: 16px;
  }

  .prompt-details {
    flex: 1;
  }

  .prompt-name {
    font-weight: bold;
    color: #00ff88;
    margin-bottom: 2px;
  }

  .prompt-description {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .prompt-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ios-toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
  }

  .ios-toggle input {
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
    transition: 0.3s;
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
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: #00ff88;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  .edit-btn,
  .delete-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    font-size: 12px;
  }

  .edit-btn:hover {
    color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }

  .delete-btn:hover {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
  }

  .prompt-preview {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(0, 0, 0, 0.3);
    padding: 8px;
    border-radius: 4px;
    white-space: pre-wrap;
  }

  .prompt-management {
    margin-top: 20px;
  }

  .management-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .prompt-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-top: 20px;
  }

  .stat-item {
    background: rgba(0, 0, 0, 0.3);
    padding: 10px;
    border-radius: 6px;
    border: 1px solid rgba(0, 255, 136, 0.2);
  }

  .stat-label {
    display: block;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 4px;
  }

  .stat-value {
    display: block;
    font-size: 16px;
    color: #00ff88;
    font-weight: bold;
  }

  .modal-footer {
    padding: 20px;
    border-top: 1px solid rgba(0, 255, 136, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .action-btn {
    padding: 8px 16px;
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    background: transparent;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
  }

  .action-btn.primary {
    background: rgba(0, 255, 136, 0.1);
    color: #00ff88;
  }

  .action-btn.warning {
    background: rgba(255, 152, 0, 0.1);
    color: #ff9800;
    border-color: rgba(255, 152, 0, 0.3);
  }

  .action-btn.danger {
    background: rgba(255, 107, 107, 0.1);
    color: #ff6b6b;
    border-color: rgba(255, 107, 107, 0.3);
  }

  .action-btn:hover {
    background: rgba(0, 255, 136, 0.2);
    color: #00ff88;
  }

  .btn-primary,
  .btn-secondary {
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

  .no-data {
    text-align: center;
    padding: 40px;
    color: rgba(255, 255, 255, 0.6);
  }

  .edit-prompt-modal {
    max-width: 600px;
  }
</style> 