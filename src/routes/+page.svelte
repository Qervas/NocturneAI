<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";
  import GamingCanvas from "$lib/components/GamingCanvas.svelte";
  import GameChat from "$lib/components/GameChat.svelte";
  import CharacterPanel from "$lib/components/CharacterPanel.svelte";
  import { characterManager } from "$lib/services/CharacterManager";
  import { communicationManager } from "$lib/services/CommunicationManager";
  import { llmService } from "$lib/services/LLMService";

  let name = $state("");
  let greetMsg = $state("");
  let communicationActive = $state(false);
  let messageCount = $state(0);

  // Update message count periodically
  $effect(() => {
    if (communicationActive) {
      const interval = setInterval(() => {
        messageCount = communicationManager.getNetworkStats().totalMessages;
      }, 1000);
      
      return () => clearInterval(interval);
    }
  });

  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await invoke("greet", { name });
  }

  function toggleCommunications() {
    if (communicationActive) {
      // Stop autonomous interactions by clearing intervals (we'll need to track this)
      communicationActive = false;
      console.log('Autonomous communications stopped');
    } else {
      communicationManager.startAutonomousInteractions();
      communicationActive = true;
      console.log('Autonomous communications started');
    }
  }

  function triggerManualMessage() {
    // Trigger a manual message between random agents
    const agents = ['agent_alpha', 'agent_beta', 'agent_gamma'];
    const fromAgent = agents[Math.floor(Math.random() * agents.length)];
    const toAgent = agents[Math.floor(Math.random() * agents.length)];
    
    if (fromAgent !== toAgent) {
      communicationManager.sendAgentMessage(fromAgent, toAgent, 'social_chat', 'Hello! How are you doing?', 'normal');
      console.log(`Manual message sent from ${fromAgent} to ${toAgent}`);
    }
  }

  onMount(async () => {
    // Initialize character data for the chat to work properly
    characterManager.initializeSampleData();
    console.log('Characters initialized:', characterManager.characters);
    
    // Initialize LLM service
    await llmService.initialize();
    console.log('LLM service initialized');
    
    // Initialize communication manager and start autonomous conversations
    communicationManager.initializeAgentStyles();
    
    // Add agents to the communication system
    communicationManager.addAgent('agent_alpha');
    communicationManager.addAgent('agent_beta');
    communicationManager.addAgent('agent_gamma');
    
    communicationManager.startAutonomousInteractions();
    communicationActive = true;
    console.log('Communication manager initialized and autonomous conversations started');
  });
</script>

<div class="app-layout">
  <!-- Header Section -->
  <header class="app-header">
    <div class="header-content">
      <h1 class="game-title">MULTI-AGENT SYSTEM</h1>
      <p class="subtitle">
        Neural Network Visualization 
        <span class="status-indicator {communicationActive ? 'active' : 'inactive'}">
          {communicationActive ? '🟢 ACTIVE' : '🔴 OFFLINE'}
        </span>
        <span class="message-counter">
          📨 {messageCount}
        </span>
      </p>
    </div>
    <div class="header-controls">
      <button class="control-btn" onclick={triggerManualMessage}>
        💬 Send Message
      </button>
      <button 
        class="control-btn {communicationActive ? 'active' : ''}" 
        onclick={toggleCommunications}
      >
        {communicationActive ? '🔴 Stop Auto' : '🟢 Start Auto'}
      </button>
      <GameChat isVisible={true} />
      <CharacterPanel />
    </div>
  </header>

  <!-- Main Content Area -->
  <main class="app-main">
    <GamingCanvas />
  </main>
</div>

<style>
  :root {
    font-family: 'Courier New', monospace;
    font-size: 16px;
    line-height: 24px;
    font-weight: 400;
    color: #00ff88;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
  }

  /* Main Layout Grid */
  .app-layout {
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: 100vh;
    overflow: hidden;
  }

  /* Header Layout */
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    position: relative;
    z-index: 1000;
  }

  .header-content {
    flex: 1;
    text-align: center;
  }

  .header-controls {
    display: flex;
    gap: 15px;
    align-items: center;
    position: relative;
  }

  .control-btn {
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 20, 40, 0.8) 100%);
    border: 1px solid rgba(0, 255, 136, 0.5);
    border-radius: 6px;
    color: #00FF88;
    cursor: pointer;
    padding: 8px 12px;
    font-size: 12px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
  }

  .control-btn:hover {
    background: linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 40, 80, 0.8) 100%);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
    transform: translateY(-2px);
  }

  .control-btn.active {
    background: linear-gradient(135deg, rgba(255, 100, 100, 0.8) 0%, rgba(180, 0, 0, 0.8) 100%);
    border-color: rgba(255, 100, 100, 0.7);
    color: #FFFFFF;
  }

  .control-btn.active:hover {
    background: linear-gradient(135deg, rgba(255, 150, 150, 0.9) 0%, rgba(200, 50, 50, 0.9) 100%);
    box-shadow: 0 0 20px rgba(255, 100, 100, 0.5);
  }

  /* Main Content Area */
  .app-main {
    position: relative;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Typography */
  .game-title {
    font-size: 2.5rem;
    font-weight: bold;
    color: #00ff88;
    text-shadow: 0 0 20px #00ff88, 0 0 40px #00ff88;
    margin: 0;
    letter-spacing: 0.2em;
    animation: glow 2s ease-in-out infinite alternate;
  }

  .subtitle {
    font-size: 1rem;
    color: #00ffff;
    text-shadow: 0 0 10px #00ffff;
    margin: 0;
    opacity: 0.8;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .status-indicator {
    font-size: 0.8rem;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid;
    transition: all 0.3s ease;
  }

  .status-indicator.active {
    color: #00FF88;
    border-color: rgba(0, 255, 136, 0.5);
    background: rgba(0, 255, 136, 0.1);
    animation: pulse-status 2s ease-in-out infinite;
  }

  .status-indicator.inactive {
    color: #FF6B6B;
    border-color: rgba(255, 107, 107, 0.5);
    background: rgba(255, 107, 107, 0.1);
  }

  .message-counter {
    font-size: 0.8rem;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: #00FFFF;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid rgba(0, 255, 255, 0.3);
    background: rgba(0, 255, 255, 0.1);
    text-shadow: 0 0 5px #00FFFF;
  }

  @keyframes pulse-status {
    0%, 100% { 
      box-shadow: 0 0 5px rgba(0, 255, 136, 0.3); 
    }
    50% { 
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.6); 
    }
  }

  @keyframes glow {
    from {
      text-shadow: 0 0 20px #00ff88, 0 0 40px #00ff88;
    }
    to {
      text-shadow: 0 0 30px #00ff88, 0 0 60px #00ff88, 0 0 80px #00ff88;
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .app-header {
      flex-direction: column;
      gap: 15px;
      padding: 15px;
    }
    
    .header-controls {
      justify-content: center;
    }
    
    .game-title {
      font-size: 2rem;
    }
  }

  @media (prefers-color-scheme: light) {
    :root {
      color: #00ff88;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
    }
  }
</style>
