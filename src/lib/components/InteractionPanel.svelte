<script lang="ts">
  import { onMount } from 'svelte';
  import { agentSelectionStore, selectedAgents, focusedAgent, agentSelectionManager, type Agent } from '../services/AgentSelectionManager';
  import { databaseManager } from '../services/DatabaseManager';
  import { selectedAgent, characterManager, getAgentShortName } from '../services/CharacterManager';

  // Types for better TypeScript support
  type PerkId = 'file-reader' | 'file-writer' | 'directory-master' | 'system-commander';
  
  interface Message {
    id: string;
    type: 'user' | 'agent' | 'system' | 'perk-execution';
    content: string;
    timestamp: Date;
    agentId?: string;
    perkId?: PerkId;
    result?: any;
  }

  // Component state
  let messages: Message[] = [];
  let newMessage = '';
  let isLoading = false;
  let fileInput: HTMLInputElement;
  let showAgentDropdown = false;

  // Reactive stores
  $: currentSelectedAgents = $selectedAgents;
  $: currentFocusedAgent = $focusedAgent;
  $: availableAgents = $agentSelectionStore.availableAgents;

  // Perk status tracking
  let perkStatus: Record<PerkId, { executing: boolean; lastResult: any }> = {
    'file-reader': { executing: false, lastResult: null },
    'file-writer': { executing: false, lastResult: null },
    'directory-master': { executing: false, lastResult: null },
    'system-commander': { executing: false, lastResult: null }
  };

  // Agent selection functions
  // Agent selection functions
  function toggleAgentSelection(agentId: string) {
    agentSelectionManager.toggleAgentSelection(agentId);
    syncToLegacySystem(agentId);
  }

  function removeAgentFromSelection(agentId: string) {
    agentSelectionManager.removeAgentFromSelection(agentId);
    // Sync the first remaining selected agent to legacy system
    const remainingAgents = currentSelectedAgents.filter(a => a.id !== agentId);
    if (remainingAgents.length > 0) {
      syncToLegacySystem(remainingAgents[0].id);
    }
  }

  function selectSingleAgent(agentId: string) {
    agentSelectionManager.selectAgent(agentId);
    syncToLegacySystem(agentId);
    showAgentDropdown = false;
  }

  function syncToLegacySystem(agentId: string) {
    // Sync selection to legacy CharacterManager for terminal compatibility
    const agent = availableAgents.find(a => a.id === agentId);
    if (agent) {
      const shortName = getAgentShortName(agentId);
      selectedAgent.set(shortName);
      characterManager.setActiveCharacter(agentId);
    }
  }

  function toggleAgentDropdown() {
    showAgentDropdown = !showAgentDropdown;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    if (!target.closest('.agent-controls')) {
      showAgentDropdown = false;
    }
  }

  // Message handling
  async function sendMessage() {
    if (!newMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: newMessage.trim(),
      timestamp: new Date()
    };

    messages = [...messages, userMessage];
    const messageContent = newMessage.trim();
    newMessage = '';
    isLoading = true;

    try {
      // Process message with selected agents
      for (const agent of currentSelectedAgents) {
        await processMessageWithAgent(messageContent, agent);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      addSystemMessage('Error processing your message. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  async function processMessageWithAgent(content: string, agent: Agent) {
    // Check if agent has required capabilities and execute perks
    const availableCapabilities = agent.capabilities;
    
    // Simulate perk execution based on message content
    if (content.toLowerCase().includes('read') && availableCapabilities.includes('file-reader')) {
      await executePerk('file-reader', agent.id, content);
    }
    
    if (content.toLowerCase().includes('write') && availableCapabilities.includes('file-writer')) {
      await executePerk('file-writer', agent.id, content);
    }
    
    if (content.toLowerCase().includes('directory') && availableCapabilities.includes('directory-master')) {
      await executePerk('directory-master', agent.id, content);
    }
    
    if (content.toLowerCase().includes('command') && availableCapabilities.includes('system-commander')) {
      await executePerk('system-commander', agent.id, content);
    }

    // Add agent response
    const agentResponse: Message = {
      id: `msg-${Date.now()}-${agent.id}`,
      type: 'agent',
      content: `${agent.name}: I've processed your request "${content}". ${availableCapabilities.length > 0 ? 'Available capabilities: ' + availableCapabilities.join(', ') : 'No capabilities enabled.'}`,
      timestamp: new Date(),
      agentId: agent.id
    };

    messages = [...messages, agentResponse];
  }

  async function executePerk(perkId: PerkId, agentId: string, context: string) {
    if (perkStatus[perkId as keyof typeof perkStatus].executing) return;

    perkStatus[perkId as keyof typeof perkStatus].executing = true;
    perkStatus = { ...perkStatus };

    try {
      // Simulate perk execution
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const result = `${perkId} executed successfully for context: "${context}"`;
      perkStatus[perkId as keyof typeof perkStatus].lastResult = result;

      const perkMessage: Message = {
        id: `perk-${Date.now()}-${perkId}`,
        type: 'perk-execution',
        content: `🔧 ${perkId.replace('-', ' ').toUpperCase()} executed`,
        timestamp: new Date(),
        agentId,
        perkId,
        result
      };

      messages = [...messages, perkMessage];

      // Save to database
      await databaseManager.addInteraction({
        userId: 'current-user',
        agentId,
        type: 'perk-execution',
        content: context,
        result,
        perkId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`Error executing ${perkId}:`, error);
      addSystemMessage(`Failed to execute ${perkId}: ${error}`);
    } finally {
      perkStatus[perkId as keyof typeof perkStatus].executing = false;
      perkStatus = { ...perkStatus };
    }
  }

  function addSystemMessage(content: string) {
    const systemMessage: Message = {
      id: `sys-${Date.now()}`,
      type: 'system',
      content,
      timestamp: new Date()
    };
    messages = [...messages, systemMessage];
  }

  // File upload handling
  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const fileMessage: Message = {
          id: `file-${Date.now()}-${file.name}`,
          type: 'user',
          content: `📎 Uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
          timestamp: new Date()
        };
        messages = [...messages, fileMessage];
      });
    }
  }

  function triggerFileUpload() {
    fileInput?.click();
  }

  // Keyboard handling
  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  // Initialize component
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    
    // Load initial messages
    addSystemMessage('InteractionPanel initialized. Select agents and start interacting!');
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="interaction-panel">
  <!-- Header with Agent Selection -->
  <div class="panel-header">
    <div class="selected-agents">
      {#each currentSelectedAgents as agent (agent.id)}
        <div class="agent-chip" style="border-color: {agent.color}">
          <span class="agent-avatar">{agent.avatar}</span>
          <span class="agent-name">{agent.name}</span>
          <button 
            class="remove-agent" 
            on:click={() => removeAgentFromSelection(agent.id)}
            title="Remove {agent.name}"
          >
            ×
          </button>
        </div>
      {/each}
      
      {#if currentSelectedAgents.length === 0}
        <div class="no-agents-selected">
          <span>No agents selected</span>
        </div>
      {/if}
    </div>

    <div class="agent-controls">
      <button 
        class="agent-selector-btn" 
        class:active={showAgentDropdown}
        on:click={toggleAgentDropdown}
      >
        + Select Agents
      </button>
      
      {#if showAgentDropdown}
        <div class="agent-dropdown">
          {#each availableAgents as agent (agent.id)}
            <button 
              class="agent-option"
              class:selected={currentSelectedAgents.some(a => a.id === agent.id)}
              class:disabled={!agent.isActive}
              on:click={() => toggleAgentSelection(agent.id)}
              disabled={!agent.isActive}
            >
              <span class="agent-avatar">{agent.avatar}</span>
              <div class="agent-details">
                <div class="agent-name">{agent.name}</div>
                <div class="agent-type">{agent.type}</div>
              </div>
              {#if currentSelectedAgents.some(a => a.id === agent.id)}
                <span class="selection-indicator">✓</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Messages Area -->
  <div class="messages-container">
    {#each messages as message (message.id)}
      <div class="message {message.type}">
        <div class="message-header">
          <span class="message-type">
            {#if message.type === 'user'}
              👤 You
            {:else if message.type === 'agent'}
              {availableAgents.find(a => a.id === message.agentId)?.avatar || '🤖'} 
              {availableAgents.find(a => a.id === message.agentId)?.name || 'Agent'}
            {:else if message.type === 'perk-execution'}
              🔧 Perk Execution
            {:else}
              ℹ️ System
            {/if}
          </span>
          <span class="message-time">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <div class="message-content">
          {message.content}
          {#if message.result}
            <div class="perk-result">
              <strong>Result:</strong> {message.result}
            </div>
          {/if}
        </div>
      </div>
    {/each}
    
    {#if isLoading}
      <div class="loading-indicator">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        Processing with {currentSelectedAgents.length} agent{currentSelectedAgents.length !== 1 ? 's' : ''}...
      </div>
    {/if}
  </div>

  <!-- Input Area -->
  <div class="input-area">
    <div class="input-controls">
      <button class="control-btn" on:click={triggerFileUpload} title="Upload File">
        📎
      </button>
      <input
        bind:this={fileInput}
        type="file"
        multiple
        style="display: none;"
        on:change={handleFileUpload}
      />
    </div>
    
    <textarea
      bind:value={newMessage}
      placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
      on:keypress={handleKeyPress}
      disabled={isLoading || currentSelectedAgents.length === 0}
      rows="3"
    ></textarea>
    
    <button 
      class="send-btn" 
      on:click={sendMessage}
      disabled={isLoading || !newMessage.trim() || currentSelectedAgents.length === 0}
    >
      {#if isLoading}
        ⏳
      {:else}
        Send
      {/if}
    </button>
  </div>
</div>

<style>
  .interaction-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    gap: 12px;
    flex-wrap: wrap;
  }

  .selected-agents {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    flex: 1;
  }

  .agent-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid;
    border-radius: 16px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
  }

  .agent-chip .agent-avatar {
    font-size: 14px;
  }

  .agent-chip .agent-name {
    font-weight: 500;
  }

  .remove-agent {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    padding: 0;
    margin-left: 4px;
    font-size: 14px;
    line-height: 1;
  }

  .remove-agent:hover {
    color: #ff6b6b;
  }

  .no-agents-selected {
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
    font-size: 12px;
  }

  .agent-controls {
    position: relative;
  }

  .agent-selector-btn {
    background: transparent;
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .agent-selector-btn:hover,
  .agent-selector-btn.active {
    border-color: #00ff88;
    color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }

  .agent-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 8px;
    min-width: 200px;
    z-index: 1000;
    backdrop-filter: blur(10px);
  }

  .agent-option {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .agent-option:hover:not(:disabled) {
    background: rgba(0, 255, 136, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .agent-option.selected {
    background: rgba(0, 255, 136, 0.2);
    color: #00ff88;
  }

  .agent-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .agent-option .agent-avatar {
    font-size: 16px;
  }

  .agent-option .agent-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .agent-option .agent-name {
    font-size: 13px;
    font-weight: 500;
  }

  .agent-option .agent-type {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
  }

  .selection-indicator {
    font-size: 14px;
    color: #00ff88;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .message {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 8px;
    border-left: 3px solid;
  }

  .message.user {
    background: rgba(0, 100, 255, 0.1);
    border-left-color: #0066ff;
    align-self: flex-end;
    max-width: 80%;
  }

  .message.agent {
    background: rgba(0, 255, 136, 0.1);
    border-left-color: #00ff88;
    align-self: flex-start;
    max-width: 80%;
  }

  .message.system {
    background: rgba(255, 255, 255, 0.05);
    border-left-color: rgba(255, 255, 255, 0.3);
    align-self: center;
    max-width: 90%;
  }

  .message.perk-execution {
    background: rgba(255, 165, 0, 0.1);
    border-left-color: #ffa500;
    align-self: flex-start;
    max-width: 80%;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    opacity: 0.8;
    margin-bottom: 4px;
  }

  .message-content {
    font-size: 13px;
    line-height: 1.4;
  }

  .perk-result {
    margin-top: 8px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    font-size: 12px;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(0, 255, 136, 0.1);
    border-radius: 8px;
    font-size: 12px;
    color: #00ff88;
  }

  .loading-dots {
    display: flex;
    gap: 4px;
  }

  .loading-dots span {
    width: 6px;
    height: 6px;
    background: #00ff88;
    border-radius: 50%;
    animation: loading-pulse 1.4s infinite ease-in-out;
  }

  .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
  .loading-dots span:nth-child(2) { animation-delay: -0.16s; }

  @keyframes loading-pulse {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }

  .input-area {
    display: flex;
    gap: 8px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(0, 255, 136, 0.2);
  }

  .input-controls {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .control-btn {
    background: transparent;
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    padding: 6px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .control-btn:hover {
    border-color: #00ff88;
    color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }

  textarea {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 6px;
    padding: 8px 12px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;
    resize: none;
    font-family: inherit;
  }

  textarea:focus {
    outline: none;
    border-color: #00ff88;
    background: rgba(0, 0, 0, 0.4);
  }

  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .send-btn {
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid #00ff88;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    color: #00ff88;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    align-self: flex-end;
  }

  .send-btn:hover:not(:disabled) {
    background: rgba(0, 255, 136, 0.3);
    transform: translateY(-1px);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .panel-header {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .selected-agents {
      justify-content: center;
    }

    .message {
      max-width: 95%;
    }

    .input-area {
      flex-direction: column;
    }

    .input-controls {
      flex-direction: row;
      justify-content: center;
    }
  }
</style>