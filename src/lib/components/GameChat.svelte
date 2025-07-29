<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { writable } from "svelte/store";
  import { characterManager, characters, npcs, users, activeCharacter, selectedAgent, getAgentDisplayName } from "../services/CharacterManager";
  import { communicationManager } from "../services/CommunicationManager";
  import { llmService } from "../services/LLMService";
  import { abilityManager } from "../services/AbilityManager";
  import { settingsManager } from "../services/SettingsManager";
  import FileUploader from "./FileUploader.svelte";
  import { uploadedFiles, addFile, removeFile, updateFile } from "../services/FileStore";
  import { renderMarkdownSafe } from "../utils/markdownRenderer";
  import type { Character, NPCAgent, UserPlayer } from "../types/Character";
  import type { CommunicationIntent } from "../types/Communication";



  // Session Management
  interface ChatSession {
    id: string;
    name: string;
    agents: string[]; // Array of agent IDs (short names like 'alpha', 'beta')
    messages: Array<{
      id: string;
    sender: string;
    message: string;
    timestamp: Date;
      type: 'user' | 'agent' | 'system';
    }>;
    createdAt: Date;
    lastActive: Date;
  }

  let chatInput = "";
  let inputElement: HTMLInputElement;
  let chatContainer: HTMLDivElement;
  let isInitialized = false;
  let llmStatus = "🔴 Checking...";
  let showConnectionHelp = false;

  // Session Management
  let sessions: ChatSession[] = [];
  let currentSessionId: string | null = null;
  let isCreatingSession = false;
  let newSessionName = "";

  // CSGO/League of Legends style chat features
  let isChatFocused = false;
  let chatOpacity = 1.0; // Full opacity in sidebar
  let fadeTimeout: number;
  let isTyping = false;
  let lastActivity = Date.now();
  
  // File upload state
  let showFileUploader = false;

  // Get current session
  $: currentSession = sessions.find(s => s.id === currentSessionId) || null;
  $: currentMessages = currentSession?.messages || [];

  // Check if current agent has file reading ability
  $: currentAgentHasFileReading = $selectedAgent ? 
    settingsManager.isSkillEnabled(`agent_${$selectedAgent}`, 'file_read') : false;

  // Load sessions from localStorage
  function loadSessions() {
    try {
      const saved = localStorage.getItem('chatSessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        sessions = parsed.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          lastActive: new Date(session.lastActive),
          messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
          }))
        }));
      }
    } catch (error) {
      console.warn('Failed to load sessions:', error);
    }
  }

  // Save sessions to localStorage
  function saveSessions() {
    try {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    } catch (error) {
      console.warn('Failed to save sessions:', error);
    }
  }

  // Read file content using agent's ability
  async function readFileContent(file: File): Promise<string | null> {
    if (!$selectedAgent || !currentAgentHasFileReading) {
      console.log('❌ Agent does not have file reading ability');
      return null;
    }

    try {
      const agentId = `agent_${$selectedAgent}`;
      console.log('📖 Reading file content for agent:', agentId);
      
      const result = await abilityManager.executeAbility(agentId, 'read_files', {
        file: file
      });
      
      if (result.success && result.content) {
        console.log('✅ File content read successfully');
        return result.content;
      } else {
        console.log('❌ Failed to read file content:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error reading file content:', error);
      return null;
    }
  }

  // Simple file reading function
  async function readFileContentSimple(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        console.log('📖 File content read directly:', content?.length || 0, 'characters');
        resolve(content);
      };
      reader.onerror = () => {
        console.log('❌ Error reading file directly');
        resolve(null);
      };
      reader.readAsText(file);
    });
  }

  // Create new session
  function createSession(name: string, initialAgents: string[] = []) {
    const session: ChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Chat ${sessions.length + 1}`,
      agents: initialAgents,
      messages: [],
      createdAt: new Date(),
      lastActive: new Date()
    };
    
    sessions = [...sessions, session];
    currentSessionId = session.id;
    saveSessions();
    console.log('✅ Created new session:', session);
  }

  // Delete session
  function deleteSession(sessionId: string) {
    sessions = sessions.filter(s => s.id !== sessionId);
    if (currentSessionId === sessionId) {
      currentSessionId = sessions.length > 0 ? sessions[0].id : null;
    }
    saveSessions();
    console.log('🗑️ Deleted session:', sessionId);
  }

  // Add agent to session
  function addAgentToSession(sessionId: string, agentId: string) {
    sessions = sessions.map(s => {
      if (s.id === sessionId && !s.agents.includes(agentId)) {
        return { ...s, agents: [...s.agents, agentId], lastActive: new Date() };
      }
      return s;
    });
    saveSessions();
    console.log('➕ Added agent to session:', agentId);
  }

  // Remove agent from session
  function removeAgentFromSession(sessionId: string, agentId: string) {
    sessions = sessions.map(s => {
      if (s.id === sessionId) {
        return { ...s, agents: s.agents.filter(a => a !== agentId), lastActive: new Date() };
      }
      return s;
    });
    saveSessions();
    console.log('➖ Removed agent from session:', agentId);
  }

  // Add message to current session
  function addMessageToSession(message: any) {
    if (!currentSession) return;
    
    sessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, message],
          lastActive: new Date()
        };
      }
      return s;
    });
    saveSessions();
  }

  // Generate unique message ID
  function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // CSGO/League of Legends style fade management
  function updateChatOpacity() {
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    
    if (isChatFocused || isTyping || timeSinceActivity < 3000) {
      // Full opacity when focused, typing, or recent activity
      chatOpacity = 1.0;
    } else if (timeSinceActivity < 8000) {
      // Gradual fade over 5 seconds
      chatOpacity = 1.0 - ((timeSinceActivity - 3000) / 5000) * 0.7;
    } else {
      // Minimum opacity when inactive
      chatOpacity = 0.3;
    }
  }

  function handleChatActivity() {
    lastActivity = Date.now();
    updateChatOpacity();
    
    // Clear existing timeout
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
    }
    
    // Set new timeout for fade
    fadeTimeout = setTimeout(() => {
      updateChatOpacity();
    }, 3000);
  }

  function handleChatFocus() {
    isChatFocused = true;
    updateChatOpacity();
  }

  function handleChatBlur() {
    isChatFocused = false;
    updateChatOpacity();
  }

  function handleTypingStart() {
    isTyping = true;
    chatOpacity = 1.0;
  }

  function handleTypingEnd() {
    isTyping = false;
    updateChatOpacity();
  }

  onMount(() => {
    // Initialize async operations
    const initAsync = async () => {
      loadSessions();
    
    // Initialize character manager and LLM service
    characterManager.initializeSampleData();
    await llmService.initialize();
    
    // Check LLM connectivity status
    llmStatus = await llmService.getConnectionStatus();
    
    isInitialized = true;
      console.log('Chat initialized, isInitialized:', isInitialized);
      
      // Create default session if none exist
      if (sessions.length === 0) {
        createSession('Welcome Chat', ['alpha']);
      } else {
        currentSessionId = sessions[0].id;
      }

      // Focus input when component mounts
      setTimeout(() => {
        if (inputElement) {
          inputElement.focus();
          console.log('Chat input focused');
        }
      }, 100);
    };

    // Start async initialization
    initAsync();
    
    // Start opacity update loop
    const opacityInterval = setInterval(updateChatOpacity, 100);

    return () => {
      clearInterval(opacityInterval);
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
    }
    };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    } else {
      handleChatActivity(); // Reset fade on any key press
      handleTypingStart();
    }
  }

  async function sendMessage() {
    if (!chatInput.trim() || !currentSession) return;

    console.log('📤 Sending message:', { chatInput: chatInput.trim(), session: currentSession.name });

    const message = {
      id: generateMessageId(),
      sender: 'You',
      message: chatInput.trim(),
      timestamp: new Date(),
      type: 'user' as const
    };

    addMessageToSession(message);
    const currentMessage = chatInput.trim();
    
    // Send through communication manager for visualization
    currentSession.agents.forEach(agentId => {
      const fullAgentId = `agent_${agentId}`;
      communicationManager.sendUserMessage('player_main', fullAgentId, currentMessage, 'question');
      });
    
    chatInput = "";
    handleChatActivity(); // Reset fade on message send
    handleTypingEnd();
    
    // Auto-scroll to bottom
    await tick();
    scrollToBottom();

    // Send to all agents in the session
    currentSession.agents.forEach((agentId, index) => {
      setTimeout(() => sendToAIAgent(agentId, currentMessage, index), 500 + (index * 800) + Math.random() * 1000);
      });
  }

  async function sendToAIAgent(agentId: string, originalMessage: string, responseIndex: number = 0) {
    console.log('🤖 Starting AI agent response:', { agentId, originalMessage, responseIndex });
    
    try {
      // Show typing indicator
      const typingMessage = {
        id: generateMessageId(),
        sender: getAgentDisplayName(agentId),
        message: '💭 Thinking...',
        timestamp: new Date(),
        type: 'agent' as const
      };

      addMessageToSession(typingMessage);
      scrollToBottom();
      handleChatActivity(); // Reset fade on new message

      // Build context with uploaded files
      let contextMessage = originalMessage;
      if ($uploadedFiles.length > 0) {
        const fileList = $uploadedFiles.map(file => 
          `📎 ${file.name} (${formatFileSize(file.size)})`
        ).join('\n');
        contextMessage = `Message: ${originalMessage}\n\nAttached Files:\n${fileList}`;
      }

      console.log('📤 Sending to LLM service:', { agentId, contextMessage });

      // Get response from LLM service
      const llmResponse = await llmService.sendMessageToAgent(agentId, contextMessage, 'You');
      
      console.log('📥 Received LLM response:', llmResponse);

      // Remove typing indicator and add real response
      sessions = sessions.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: s.messages.filter(msg => msg.id !== typingMessage.id)
          };
        }
        return s;
      });
      saveSessions();
      
      const response = {
        id: generateMessageId(),
        sender: getAgentDisplayName(agentId),
        message: llmResponse,
        timestamp: new Date(),
        type: 'agent' as const
      };

      addMessageToSession(response);
      
      // Send agent response through communication manager for visualization
      const fullAgentId = `agent_${agentId}`;
      communicationManager.sendAgentMessage(fullAgentId, 'player_main', 'acknowledge', llmResponse, 'normal');
      
      scrollToBottom();
      handleChatActivity(); // Reset fade on response

      // Refresh status if we got an offline message
      if (llmResponse.includes('offline') || llmResponse.includes('LLM server')) {
        await refreshLLMStatus();
      }

    } catch (error) {
      console.error('❌ Failed to get AI response:', error);
      console.error('🔍 Error details:', { agentId, originalMessage, responseIndex, error: error instanceof Error ? error.message : 'Unknown error' });
      
      // Remove typing indicator
      sessions = sessions.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: s.messages.filter(msg => !msg.message.includes('💭 Thinking...'))
          };
        }
        return s;
      });
      saveSessions();
      
      // Add error message with helpful guidance
      const errorResponse = {
        id: generateMessageId(),
        sender: getAgentDisplayName(agentId),
        message: `I'm having trouble connecting right now! 🔌\n\n` +
                `To chat with me, please start a local LLM server:\n` +
                `• **Ollama**: Run 'ollama run llama3.2'\n` +
                `• **LM Studio**: Start the local server\n\n` +
                `Click the ❓ button above for detailed setup instructions!`,
        timestamp: new Date(),
        type: 'agent' as const
      };

      addMessageToSession(errorResponse);
      scrollToBottom();
      handleChatActivity(); // Reset fade on error message
      
      // Refresh status to show current state
      await refreshLLMStatus();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      const messagesContainer = chatContainer?.querySelector('.messages-container') as HTMLElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 50); // Reduced timeout for faster response
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async function refreshLLMStatus() {
    llmStatus = "🔄 Checking...";
    llmStatus = await llmService.getConnectionStatus();
  }

  function toggleConnectionHelp() {
    showConnectionHelp = !showConnectionHelp;
    handleChatActivity(); // Reset fade on help toggle
  }
  
  // File upload handlers
  async function handleFileUploaded(event: CustomEvent) {
    const { file, fileInfo } = event.detail;
    
    // Add file to uploaded files list
    addFile({
      id: fileInfo.id,
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type
    });
    
    // Add file message to chat
    const fileMessage = {
      id: generateMessageId(),
      sender: 'You',
      message: `📎 Uploaded: ${fileInfo.name} (${formatFileSize(fileInfo.size)})`,
      timestamp: new Date(),
      type: 'user' as const
    };
    addMessageToSession(fileMessage);
    
    // Try to read file content (always read, not just when agent has ability)
    console.log('📖 Attempting to read file content:', fileInfo.name, 'Agent has file reading:', currentAgentHasFileReading);
    
    if (file) {
      const content = await readFileContentSimple(file);
      console.log('📖 File content result:', content ? 'Success' : 'Failed', 'Content length:', content?.length || 0);
      
      if (content) {
        // Update the uploaded file with content
        updateFile(fileInfo.id, { content });
        console.log('📖 File content updated in store:', fileInfo.name);
      } else {
        console.log('❌ Failed to read file content:', fileInfo.name);
      }
    } else {
      console.log('❌ No file object available for reading');
    }
    
    scrollToBottom();
    handleChatActivity();
  }
  
  function handleFileError(event: CustomEvent) {
    const { file, fileInfo, error } = event.detail;
    const errorMessage = {
      id: generateMessageId(),
      sender: 'System',
      message: `❌ Upload failed: ${fileInfo.name} - ${error}`,
      timestamp: new Date(),
      type: 'system' as const
    };
    addMessageToSession(errorMessage);
    scrollToBottom();
    handleChatActivity();
  }
  
  function handleFileRemoved(event: CustomEvent) {
    const { fileId } = event.detail;
    removeFile(fileId);
    handleChatActivity();
  }
  
  function toggleFileUploader() {
    showFileUploader = !showFileUploader;
    handleChatActivity();
  }

  function showFileExplorer() {
    // Dispatch event to show file explorer
    window.dispatchEvent(new CustomEvent('showFileExplorer'));
  }



  function getCharacterColor(sender: string): string {
    if (sender === 'System') return '#f59e0b';
    if (sender === 'You') return '#ffffff';
    if (sender === 'Alpha') return '#059669';  // Dark green
    if (sender === 'Beta') return '#ea580c';   // Dark orange
    if (sender === 'Gamma') return '#7c3aed';  // Dark purple
    return '#059669';
  }

  function isOwnMessage(sender: string): boolean {
    return sender === 'You';
  }

  // Auto-scroll when messages change
  $: if (currentMessages.length > 0) {
    setTimeout(() => scrollToBottom(), 10);
  }
</script>

<!-- ChatGPT-Style Chat Interface -->
<div class="chat-interface">
  <!-- Chat Header (Fixed at top) -->
  <div class="chat-header">
    <div class="chat-title">
      {#if currentSession}
        <h3>{currentSession.name}</h3>
        <div class="session-agents">
          {currentSession.agents.map(agentId => getAgentDisplayName(agentId)).join(', ')}
        </div>
      {:else}
        <h3>No Session Selected</h3>
    {/if}
      </div>

    <div class="chat-controls">
      {#if currentSession}
        <button class="control-btn" on:click={() => isCreatingSession = true} title="Add agent">
          ➕
            </button>
        <button class="control-btn" on:click={() => showConnectionHelp = !showConnectionHelp} title="Connection help">
              ❓
            </button>
      {/if}
          </div>
        </div>

  <!-- Connection Status -->
  <div class="connection-status">
    <span class="status-indicator">{llmStatus}</span>
    <button class="status-btn" on:click={refreshLLMStatus} title="Refresh status">🔄</button>
  </div>

  <!-- Connection Help -->
        {#if showConnectionHelp}
    <div class="connection-help">
            <h4>🤖 How to Connect AI Agents</h4>
            <p><strong>Option 1: Ollama (Recommended)</strong></p>
            <ol>
              <li>Download Ollama from <code>ollama.ai</code></li>
              <li>Install and run: <code>ollama run llama3.2</code></li>
              <li>Agents will connect automatically!</li>
            </ol>
            <p><strong>Option 2: LM Studio</strong></p>
            <ol>
              <li>Download LM Studio from <code>lmstudio.ai</code></li>
              <li>Load a model and start the local server</li>
              <li>Use port 1234 (default)</li>
            </ol>
      <button class="help-close-btn" on:click={() => showConnectionHelp = false}>Close Help</button>
          </div>
        {/if}

  <!-- Sessions List (Compact) -->
  <div class="sessions-list">
    {#each sessions as session (session.id)}
      <div class="session-item" class:active={session.id === currentSessionId} on:click={() => currentSessionId = session.id}>
        <div class="session-info">
          <div class="session-name">{session.name}</div>
          <div class="session-agents">
            {session.agents.map(agentId => getAgentDisplayName(agentId)).join(', ')}
          </div>
        </div>
        <button class="delete-session-btn" on:click={(e) => { e.stopPropagation(); deleteSession(session.id); }}>
          🗑️
        </button>
      </div>
            {/each}
    <button class="new-session-btn" on:click={() => isCreatingSession = true}>
      + New Chat
    </button>
        </div>

  <!-- Scrollable Messages Area -->
  <div class="messages-scroll-area">
    <div class="messages-container" bind:this={chatContainer}>
      {#if currentMessages.length === 0}
          <div class="no-messages">
          <div class="welcome-message">
            <h2>🤖 Multi-Agent Chat</h2>
            <p>Start a conversation with your AI agents!</p>
            {#if currentSession}
              <p>Current session: <strong>{currentSession.name}</strong></p>
              <p>Agents: {currentSession.agents.map(agentId => getAgentDisplayName(agentId)).join(', ')}</p>
            {/if}
          </div>
          </div>
        {:else}
        {#each currentMessages as message (message.id)}
            {@const isOwn = isOwnMessage(message.sender)}
            {@const charColor = getCharacterColor(message.sender)}
          <div class="chat-message {isOwn ? 'own-message' : 'other-message'}" style="--char-color: {charColor}">
            <div class="message-header">
              <span class="sender" style="color: {charColor}">
                    {message.sender}
                </span>
              <span class="time">{formatTime(message.timestamp)}</span>
              </div>
            <div class="message-content {message.message.includes('💭 Thinking...') ? 'thinking' : ''}">
              {@html renderMarkdownSafe(message.message)}
              </div>
            </div>
          {/each}
        {/if}
    </div>
      </div>

  <!-- Chat Input (Fixed at bottom) -->
  <div class="chat-input-container">
    <!-- Uploaded Files Indicator -->
    {#if $uploadedFiles.length > 0}
      <div class="uploaded-files-indicator" on:click={showFileExplorer}>
        <span class="files-label">📎 Attached Files ({$uploadedFiles.length}):</span>
        <div class="files-list">
          {#each $uploadedFiles as file}
            <span class="file-tag" on:click|stopPropagation={showFileExplorer}>
              {file.name}
              <button class="remove-file-btn" on:click={() => {
                removeFile(file.id);
              }}>×</button>
            </span>
          {/each}
        </div>
      </div>
    {/if}
    
    <div class="input-row">
          <input
            bind:this={inputElement}
            bind:value={chatInput}
            on:keydown={handleKeydown}
        on:input={handleChatActivity}
        placeholder={currentSession ? "Type your message..." : "Select a session to start chatting..."}
        class="chat-input"
            maxlength="500"
        disabled={!isInitialized || !currentSession}
        autocomplete="off"
      />
      <div class="input-actions">
        <button 
          class="action-btn file-btn {currentAgentHasFileReading ? 'file-reading-enabled' : ''}" 
          on:click={toggleFileUploader}
          title={currentAgentHasFileReading ? "Attach files (content reading enabled)" : "Attach files (content reading disabled)"}
          disabled={!isInitialized}
        >
          {currentAgentHasFileReading ? '📖' : '📎'}
        </button>

        <button 
          class="send-btn" 
          on:click={sendMessage} 
          disabled={!chatInput.trim() || !isInitialized || !currentSession}
        >
            ➤
          </button>
      </div>
    </div>
  </div>
</div>

<!-- Create Session Modal -->
{#if isCreatingSession}
  <div class="modal-overlay" on:click={() => isCreatingSession = false}>
    <div class="modal-content" on:click={(e) => e.stopPropagation()}>
      <h3>Create New Chat Session</h3>
      <div class="form-group">
        <label for="session-name">Session Name:</label>
        <input 
          id="session-name"
          bind:value={newSessionName}
          placeholder="Enter session name..."
          on:keydown={(e) => {
            if (e.key === 'Enter') {
              createSession(newSessionName);
              newSessionName = '';
              isCreatingSession = false;
            }
          }}
        />
      </div>
      <div class="form-group">
        <label>Select Agents:</label>
        <div class="agent-selection">
          {#each ['alpha', 'beta', 'gamma'] as agentId}
            <label class="agent-checkbox">
              <input type="checkbox" value={agentId} />
              {getAgentDisplayName(agentId)}
            </label>
          {/each}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" on:click={() => isCreatingSession = false}>Cancel</button>
        <button class="btn-primary" on:click={() => {
          const selectedAgents = Array.from(document.querySelectorAll('.agent-selection input:checked')).map((input: any) => input.value);
          createSession(newSessionName, selectedAgents);
          newSessionName = '';
          isCreatingSession = false;
        }}>Create Session</button>
      </div>
    </div>
        </div>
      {/if}

<!-- File Uploader Modal -->
{#if showFileUploader}
  <div class="modal-overlay" on:click={toggleFileUploader}>
    <div class="modal-content" on:click={(e) => e.stopPropagation()}>
      <FileUploader 
        on:fileUploaded={handleFileUploaded}
        on:fileError={handleFileError}
        on:fileRemoved={handleFileRemoved}
      />
    </div>
    </div>
  {/if}



<style>
  .chat-interface {
    height: 100%;
    background: var(--bg-dark);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chat-header {
    flex-shrink: 0;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-darker);
  }

  .connection-status {
    flex-shrink: 0;
    padding: 0.25rem 0.5rem;
    background: var(--bg-darker);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
  }

  .sessions-list {
    flex-shrink: 0;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    max-height: 120px;
    overflow-y: auto;
    background: var(--bg-darker);
  }

  .new-session-btn {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.8rem;
    width: 100%;
    margin-top: 0.5rem;
  }

  .session-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    margin-bottom: 0.25rem;
    background: var(--bg-dark);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background 0.2s ease;
    font-size: 0.8rem;
  }

  .session-item:hover {
    background: var(--bg-hover);
  }

  .session-item.active {
    background: var(--accent-color);
    color: white;
  }

  .session-info {
    flex: 1;
  }

  .session-name {
    font-weight: bold;
    margin-bottom: 0.1rem;
  }

  .session-agents {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .delete-session-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    font-size: 0.8rem;
  }



  .chat-title h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1rem;
  }

  .chat-title .session-agents {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }

  .chat-controls {
    display: flex;
    gap: 0.5rem;
  }

  .control-btn {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .connection-status {
    padding: 0.25rem 0.5rem;
    background: var(--bg-darker);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
  }

  .status-indicator {
    color: var(--text-secondary);
  }

  .status-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .messages-scroll-area {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
  }

  .no-messages {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: var(--text-secondary);
  }

  .welcome-message {
    text-align: center;
  }

  .welcome-message h2 {
    color: var(--accent-color);
    margin-bottom: 1rem;
  }

  .chat-message {
    display: flex;
    flex-direction: column;
    max-width: 80%;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* Responsive design for smaller screens */
  @media (max-width: 768px) {
    .chat-message {
      max-width: 95%;
    }
    
    .message-content {
      padding: 0.75rem;
      font-size: 0.9rem;
  }

  .message-header {
      font-size: 0.8rem;
    }
  }

  .own-message {
    align-self: flex-end;
  }

  .other-message {
    align-self: flex-start;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .sender {
    font-weight: bold;
  }

  .time {
    font-size: 0.8rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .message-content {
    background: var(--bg-dark);
    padding: 1rem;
    border-radius: 0.5rem;
    border-left: 3px solid var(--char-color, var(--accent-color));
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    line-height: 1.4;
    max-width: 100%;
    overflow: hidden;
    hyphens: auto;
  }

  /* Handle very long words/URLs */
  .message-content * {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* Code blocks in messages */
  .message-content code {
    word-break: break-all;
    white-space: pre-wrap;
  }

  /* Links in messages */
  .message-content a {
    word-break: break-all;
  }

  .own-message .message-content {
    background: var(--accent-color);
    color: white;
  }

  .thinking .message-content {
    opacity: 0.7;
    font-style: italic;
  }

  .chat-input-container {
    flex-shrink: 0;
    padding: 0.5rem;
    border-top: 1px solid var(--border-color);
    background: var(--bg-darker);
  }

  .uploaded-files-indicator {
    padding: 8px 12px;
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 6px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .uploaded-files-indicator:hover {
    background: rgba(0, 255, 136, 0.2);
    border-color: rgba(0, 255, 136, 0.5);
  }

  .files-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .files-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.25rem;
  }

  .file-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    font-size: 12px;
    color: #00ff88;
    margin-right: 6px;
    margin-bottom: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .file-tag:hover {
    background: rgba(0, 255, 136, 0.3);
    border-color: rgba(0, 255, 136, 0.5);
  }

  .remove-file-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .chat-input {
    flex: 1;
    background: var(--bg-dark);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 1rem;
  }

  .chat-input:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  .input-actions {
    display: flex;
    gap: 0.25rem;
  }

  .action-btn, .send-btn {
    background: var(--bg-dark);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.75rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .action-btn:hover, .send-btn:hover {
    background: var(--bg-hover);
  }

  .send-btn {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--bg-dark);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }

  .form-group input {
    width: 100%;
    background: var(--bg-darker);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.75rem;
    border-radius: 0.25rem;
  }

  .agent-selection {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .agent-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
  }

  .btn-primary, .btn-secondary {
    padding: 0.75rem 1.5rem;
    border-radius: 0.25rem;
    border: none;
    cursor: pointer;
  }

  .btn-primary {
    background: var(--accent-color);
    color: white;
  }

  .btn-secondary {
    background: var(--bg-darker);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .connection-help {
    padding: 1rem;
    background: var(--bg-darker);
    border-bottom: 1px solid var(--border-color);
  }

  .connection-help h4 {
    margin: 0 0 1rem 0;
    color: var(--accent-color);
  }

  .connection-help ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .connection-help code {
    background: var(--bg-dark);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: monospace;
  }

  .help-close-btn {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    margin-top: 1rem;
  }

     /* CSS Variables */
   :global(:root) {
     --bg-dark: #1a1a1a;
     --bg-darker: #0f0f0f;
     --bg-hover: #2a2a2a;
     --text-primary: #ffffff;
     --text-secondary: #cccccc;
     --border-color: #333333;
     --accent-color: #059669;
   }

   .file-reading-enabled {
     background: rgba(5, 150, 105, 0.2) !important;
     border-color: #059669 !important;
     color: #059669 !important;
   }

   .file-reading-enabled:hover {
     background: rgba(5, 150, 105, 0.3) !important;
   }



   
</style>
