<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";
  import GamingCanvas from "$lib/components/GamingCanvas.svelte";
  import GameChat from "$lib/components/GameChat.svelte";
  import CharacterPanel from "$lib/components/CharacterPanel.svelte";
  import { characterManager } from "$lib/services/CharacterManager";
  import { llmService } from "$lib/services/LLMService";

  let name = $state("");
  let greetMsg = $state("");

  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await invoke("greet", { name });
  }

  onMount(async () => {
    // Initialize character data for the chat to work properly
    characterManager.initializeSampleData();
    console.log('Characters initialized:', characterManager.characters);
    
    // Initialize LLM service
    await llmService.initialize();
    console.log('LLM service initialized');
  });
</script>

<div class="app-layout">
  <!-- Header Section -->
  <header class="app-header">
    <div class="header-content">
      <h1 class="game-title">MULTI-AGENT SYSTEM</h1>
      <p class="subtitle">Neural Network Visualization</p>
    </div>
    <div class="header-controls">
      <GameChat />
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
