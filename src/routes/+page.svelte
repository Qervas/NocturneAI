<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";
  import GamingCanvas from "$lib/components/GamingCanvas.svelte";
  import GameChat from "$lib/components/GameChat.svelte";
  import CharacterPanel from "$lib/components/CharacterPanel.svelte";
  import { characterManager } from "$lib/services/CharacterManager";

  let name = $state("");
  let greetMsg = $state("");

  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await invoke("greet", { name });
  }

  onMount(() => {
    // Initialize character data for the chat to work properly
    characterManager.initializeSampleData();
    console.log('Characters initialized:', characterManager.characters);
  });
</script>

<main class="container">
  <h1 class="game-title">MULTI-AGENT SYSTEM</h1>
  <p class="subtitle">Neural Network Visualization</p>

  <GamingCanvas />
  <GameChat />
  <CharacterPanel />
</main>

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

  .container {
    margin: 0;
    padding-top: 5vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    min-height: 100vh;
  }

  .game-title {
    font-size: 3.5rem;
    font-weight: bold;
    text-align: center;
    color: #00ff88;
    text-shadow: 0 0 20px #00ff88, 0 0 40px #00ff88;
    margin-bottom: 0.5rem;
    letter-spacing: 0.2em;
    animation: glow 2s ease-in-out infinite alternate;
  }

  .subtitle {
    font-size: 1.2rem;
    color: #00ffff;
    text-shadow: 0 0 10px #00ffff;
    margin-bottom: 2rem;
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

  @media (prefers-color-scheme: light) {
    :root {
      color: #00ff88;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
    }
  }
</style>
