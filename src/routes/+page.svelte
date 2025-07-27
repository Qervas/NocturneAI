<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { onMount } from "svelte";
    import GamingCanvas from "$lib/components/GamingCanvas.svelte";
    import GameChat from "$lib/components/GameChat.svelte";
    import CharacterPanel from "$lib/components/CharacterPanel.svelte";
    import SimulationControls from "$lib/components/SimulationControls.svelte";
    import PerkPanel from "$lib/components/PerkPanel.svelte";
    import WorldResources from "$lib/components/WorldResources.svelte";
    import { characterManager } from "$lib/services/CharacterManager";
    import { communicationManager } from "$lib/services/CommunicationManager";
    import { simulationController } from "$lib/services/SimulationController";
    import { perkManager } from "$lib/services/PerkManager";
    import { llmService } from "$lib/services/LLMService";

    let name = $state("");
    let greetMsg = $state("");
    let communicationActive = $state(false);
    let messageCount = $state(0);

    // Update message count periodically
    $effect(() => {
        const interval = setInterval(() => {
            messageCount = communicationManager.getNetworkStats().totalMessages;
        }, 2000);

        return () => clearInterval(interval);
    });

    async function greet(event: Event) {
        event.preventDefault();
        greetMsg = await invoke("greet", { name });
    }

    onMount(async () => {
        // Initialize character data for the chat to work properly
        characterManager.initializeSampleData();
        console.log("Characters initialized:", characterManager.characters);

        // Initialize LLM service
        await llmService.initialize();
        console.log("LLM service initialized");

        // Initialize communication manager
        communicationManager.initializeAgentStyles();

        // Add agents to the communication system
        communicationManager.addAgent("agent_alpha");
        communicationManager.addAgent("agent_beta");
        communicationManager.addAgent("agent_gamma");

        // Initialize perk manager
        console.log("Perk manager initialized");

        // Note: Autonomous interactions are now controlled by the SimulationController
        communicationActive = true;
        console.log(
            "System initialized - autonomous conversations controlled by simulation",
        );
    });
</script>

<div class="app-layout">
    <!-- Header Section -->
    <header class="app-header">
        <div class="header-content">
            <h1 class="game-title">MULTI-AGENT SYSTEM</h1>
            <p class="subtitle">
                AI Company Management System
                <span class="message-counter">
                    📨 {messageCount} messages
                </span>
            </p>
        </div>
        <div class="header-controls">
            <GameChat isVisible={true} />
            <CharacterPanel />
        </div>
    </header>

    <!-- Main Content Area -->
    <main class="app-main">
        <GamingCanvas />

        <!-- Game UI Components -->
        <PerkPanel />
        <WorldResources />

        <!-- Simulation Controls - Sims-like time controls -->
        <SimulationControls />
    </main>
</div>

<style>
    :root {
        font-family: "Courier New", monospace;
        font-size: 16px;
        line-height: 24px;
        font-weight: 400;
        color: #00ff88;
        background: linear-gradient(
            135deg,
            #0a0a0a 0%,
            #1a1a2e 50%,
            #16213e 100%
        );
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
        padding: 12px 20px; /* Reduced from 20px to 12px for more compact header */
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
        background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.8) 0%,
            rgba(0, 20, 40, 0.8) 100%
        );
        border: 1px solid rgba(0, 255, 136, 0.5);
        border-radius: 6px;
        color: #00ff88;
        cursor: pointer;
        padding: 8px 12px;
        font-size: 12px;
        font-family: "Courier New", monospace;
        font-weight: bold;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
    }

    .control-btn:hover {
        background: linear-gradient(
            135deg,
            rgba(0, 255, 136, 0.2) 0%,
            rgba(0, 40, 80, 0.8) 100%
        );
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
        transform: translateY(-2px);
    }

    .control-btn.active {
        background: linear-gradient(
            135deg,
            rgba(255, 100, 100, 0.8) 0%,
            rgba(180, 0, 0, 0.8) 100%
        );
        border-color: rgba(255, 100, 100, 0.7);
        color: #ffffff;
    }

    .control-btn.active:hover {
        background: linear-gradient(
            135deg,
            rgba(255, 150, 150, 0.9) 0%,
            rgba(200, 50, 50, 0.9) 100%
        );
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
        text-shadow:
            0 0 20px #00ff88,
            0 0 40px #00ff88;
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
        font-family: "Courier New", monospace;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid;
        transition: all 0.3s ease;
    }

    .status-indicator.active {
        color: #00ff88;
        border-color: rgba(0, 255, 136, 0.5);
        background: rgba(0, 255, 136, 0.1);
        animation: pulse-status 2s ease-in-out infinite;
    }

    .status-indicator.inactive {
        color: #ff6b6b;
        border-color: rgba(255, 107, 107, 0.5);
        background: rgba(255, 107, 107, 0.1);
    }

    .message-counter {
        font-size: 0.8rem;
        font-family: "Courier New", monospace;
        font-weight: bold;
        color: #00ffff;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid rgba(0, 255, 255, 0.3);
        background: rgba(0, 255, 255, 0.1);
        text-shadow: 0 0 5px #00ffff;
    }

    @keyframes pulse-status {
        0%,
        100% {
            box-shadow: 0 0 5px rgba(0, 255, 136, 0.3);
        }
        50% {
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
        }
    }

    @keyframes glow {
        from {
            text-shadow:
                0 0 20px #00ff88,
                0 0 40px #00ff88;
        }
        to {
            text-shadow:
                0 0 30px #00ff88,
                0 0 60px #00ff88,
                0 0 80px #00ff88;
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
            background: linear-gradient(
                135deg,
                #0a0a0a 0%,
                #1a1a2e 50%,
                #16213e 100%
            );
        }
    }
</style>
