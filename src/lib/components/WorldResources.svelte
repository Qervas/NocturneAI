<script lang="ts">
    import { onMount } from "svelte";
    import { skillTreeManager } from "../services/PerkManager";
    import { characterManager, characters } from "../services/CharacterManager";
    import { communicationManager } from "../services/CommunicationManager";
    import { simulationController } from "../services/SimulationController";
    import type { AgentSkillTree } from "../services/PerkManager";

    // Component state
    let showWorldResources = false;
    let agentSkillTrees: Record<string, AgentSkillTree> = {};
    let globalStats = {
        totalExperience: 0,
        totalSkillsUnlocked: 0,
        totalAbilitiesUnlocked: 0,
    };
    let simulationStats = {
        tickCount: 0,
        totalRunTime: 0,
        agentActionCount: 0,
    };

    // Reactive calculations
    $: agentList = $characters.filter((c) => c.type === "npc");
    $: activeAgents = agentList.filter((c) => c.status === "online").length;
    $: communicationStats = communicationManager.getNetworkStats();

    // Subscribe to stores
    skillTreeManager.agentSkills.subscribe((value) => {
        agentSkillTrees = value;
    });

    skillTreeManager.globalStats.subscribe((value) => {
        globalStats = value;
    });

    simulationController.statistics.subscribe((value) => {
        simulationStats = value;
    });

    function toggleWorldResources() {
        showWorldResources = !showWorldResources;
    }

    function formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    function formatNumber(num: number): string {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + "M";
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + "K";
        }
        return num.toLocaleString();
    }

    function getResourceColor(
        value: number,
        threshold: { good: number; warning: number },
    ): string {
        if (value >= threshold.good) return "#4CAF50";
        if (value >= threshold.warning) return "#FF9800";
        return "#F44336";
    }

    onMount(() => {
        // Update world resources periodically
        const interval = setInterval(() => {
            // Initialize any new agents
            agentList.forEach((agent) => {
                if (!agentSkillTrees[agent.id]) {
                    skillTreeManager.initializeAgent(agent.id);
                }
            });
        }, 2000);

        return () => clearInterval(interval);
    });
</script>

<!-- World Resources Toggle Button -->
<button
    class="world-resources-toggle"
    on:click={toggleWorldResources}
    class:active={showWorldResources}
    title="World Resources"
>
    🌍
</button>

<!-- World Resources Panel -->
{#if showWorldResources}
    <div class="world-resources-panel">
        <div class="resources-header">
            <h3>🌍 WORLD RESOURCES</h3>
            <button class="toggle-btn" on:click={toggleWorldResources}
                >👁️</button
            >
        </div>

        <div class="resources-grid">
            <!-- Agents Section -->
            <div class="resource-section">
                <div class="section-header">
                    <span class="section-icon">👥</span>
                    <span class="section-title">AGENTS</span>
                </div>
                <div class="resource-stats">
                    <div class="stat-row">
                        <span class="stat-label">Active:</span>
                        <span
                            class="stat-value"
                            style="color: {getResourceColor(activeAgents, {
                                good: 2,
                                warning: 1,
                            })}"
                        >
                            {activeAgents}/{agentList.length}
                        </span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Online Rate:</span>
                        <span class="stat-value">
                            {agentList.length
                                ? Math.round(
                                      (activeAgents / agentList.length) * 100,
                                  )
                                : 0}%
                        </span>
                    </div>
                </div>
            </div>

            <!-- Experience Section -->
            <div class="resource-section">
                <div class="section-header">
                    <span class="section-icon">✨</span>
                    <span class="section-title">EXPERIENCE</span>
                </div>
                <div class="resource-stats">
                    <div class="stat-row">
                        <span class="stat-label">Total XP:</span>
                        <span class="stat-value experience-value">
                            {formatNumber(globalStats.totalExperience)}
                        </span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Skills Unlocked:</span>
                        <span class="stat-value">
                            {formatNumber(globalStats.totalSkillsUnlocked)}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Performance Section -->
            <div class="resource-section">
                <div class="section-header">
                    <span class="section-icon">📊</span>
                    <span class="section-title">PERFORMANCE</span>
                </div>
                <div class="resource-stats">
                    <div class="stat-row">
                        <span class="stat-label">Abilities:</span>
                        <span
                            class="stat-value"
                            style="color: {getResourceColor(
                                globalStats.totalAbilitiesUnlocked,
                                { good: 5, warning: 2 },
                            )}"
                        >
                            {globalStats.totalAbilitiesUnlocked}
                        </span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Actions:</span>
                        <span class="stat-value">
                            {formatNumber(simulationStats.agentActionCount)}
                        </span>
                    </div>
                </div>
            </div>

            <!-- System Section -->
            <div class="resource-section">
                <div class="section-header">
                    <span class="section-icon">⚡</span>
                    <span class="section-title">SYSTEM</span>
                </div>
                <div class="resource-stats">
                    <div class="stat-row">
                        <span class="stat-label">Uptime:</span>
                        <span class="stat-value">
                            {formatTime(simulationStats.totalRunTime)}
                        </span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Ticks:</span>
                        <span class="stat-value">
                            {formatNumber(simulationStats.tickCount)}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Communications Section -->
            <div class="resource-section">
                <div class="section-header">
                    <span class="section-icon">📡</span>
                    <span class="section-title">COMMS</span>
                </div>
                <div class="resource-stats">
                    <div class="stat-row">
                        <span class="stat-label">Messages:</span>
                        <span class="stat-value">
                            {formatNumber(communicationStats.totalMessages)}
                        </span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Relations:</span>
                        <span class="stat-value">
                            {communicationStats.totalRelationships}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Economy Section (Future) -->
            <div class="resource-section">
                <div class="section-header">
                    <span class="section-icon">💰</span>
                    <span class="section-title">ECONOMY</span>
                </div>
                <div class="resource-stats">
                    <div class="stat-row">
                        <span class="stat-label">Credits:</span>
                        <span class="stat-value">
                            {formatNumber(
                                1000 + globalStats.totalExperience / 10,
                            )}
                        </span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Income/h:</span>
                        <span class="stat-value">
                            +{formatNumber(activeAgents * 100)}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Status Indicators -->
        <div class="status-indicators">
            <div class="status-item">
                <div class="status-dot" class:active={activeAgents > 0}></div>
                <span>AI Network</span>
            </div>
            <div class="status-item">
                <div
                    class="status-dot"
                    class:active={globalStats.totalSkillsUnlocked > 0}
                ></div>
                <span>Skills</span>
            </div>
            <div class="status-item">
                <div
                    class="status-dot"
                    class:active={communicationStats.totalMessages > 0}
                ></div>
                <span>Communications</span>
            </div>
        </div>
    </div>
{:else}
    <button
        class="show-resources-btn"
        on:click={toggleWorldResources}
        title="Show World Resources"
    >
        📊
    </button>
{/if}

<style>
    .world-resources-toggle {
        position: fixed;
        top: 80px;
        left: 20px;
        background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.8) 0%,
            rgba(0, 20, 40, 0.8) 100%
        );
        border: 1px solid rgba(0, 255, 136, 0.5);
        border-radius: 50%;
        color: #00ff88;
        cursor: pointer;
        padding: 12px;
        font-size: 18px;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
        z-index: 1001;
    }

    .world-resources-toggle:hover,
    .world-resources-toggle.active {
        background: linear-gradient(
            135deg,
            rgba(0, 255, 136, 0.2) 0%,
            rgba(0, 40, 80, 0.8) 100%
        );
        box-shadow: 0 0 25px rgba(0, 255, 136, 0.6);
        transform: scale(1.1);
    }

    .show-resources-btn {
        position: fixed;
        top: 80px;
        left: 20px;
        background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.8) 0%,
            rgba(0, 20, 40, 0.8) 100%
        );
        border: 1px solid rgba(0, 255, 136, 0.5);
        border-radius: 50%;
        color: #00ff88;
        cursor: pointer;
        padding: 12px;
        font-size: 16px;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
        z-index: 1001;
    }

    .show-resources-btn:hover {
        background: linear-gradient(
            135deg,
            rgba(0, 255, 136, 0.2) 0%,
            rgba(0, 40, 80, 0.8) 100%
        );
        box-shadow: 0 0 25px rgba(0, 255, 136, 0.6);
        transform: scale(1.1) rotate(10deg);
    }

    .world-resources-panel {
        position: fixed;
        top: 140px;
        left: 20px;
        background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.92) 0%,
            rgba(0, 20, 40, 0.92) 100%
        );
        border: 1px solid rgba(0, 255, 136, 0.4);
        border-radius: 12px;
        backdrop-filter: blur(15px);
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
        padding: 16px;
        min-width: 280px;
        max-width: 320px;
        z-index: 1000;
        font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            sans-serif;
        animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .resources-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    }

    .resources-header h3 {
        color: #00ff88;
        font-family: "Courier New", monospace;
        font-size: 14px;
        font-weight: bold;
        margin: 0;
        letter-spacing: 1px;
        text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
    }

    .toggle-btn {
        background: transparent;
        border: 1px solid rgba(0, 255, 136, 0.3);
        border-radius: 4px;
        color: #00ff88;
        cursor: pointer;
        padding: 4px 6px;
        font-size: 12px;
        transition: all 0.3s ease;
    }

    .toggle-btn:hover {
        background: rgba(0, 255, 136, 0.1);
        box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
        transform: scale(1.1);
    }

    .resources-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
    }

    .resource-section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 10px;
        transition: all 0.3s ease;
    }

    .resource-section:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(0, 255, 136, 0.3);
        transform: translateY(-1px);
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
    }

    .section-icon {
        font-size: 14px;
    }

    .section-title {
        font-family: "Courier New", monospace;
        font-size: 10px;
        font-weight: bold;
        color: #00ff88;
        letter-spacing: 0.5px;
    }

    .resource-stats {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .stat-label {
        font-family: "Courier New", monospace;
        font-size: 9px;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .stat-value {
        font-family: "Courier New", monospace;
        font-size: 11px;
        font-weight: bold;
        color: #ffffff;
        text-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
    }

    .experience-value {
        color: #ffd700;
        text-shadow: 0 0 6px rgba(255, 215, 0, 0.5);
    }

    .status-indicators {
        display: flex;
        justify-content: space-around;
        padding-top: 12px;
        border-top: 1px solid rgba(0, 255, 136, 0.2);
    }

    .status-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        font-family: "Courier New", monospace;
        font-size: 8px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #666666;
        transition: all 0.3s ease;
    }

    .status-dot.active {
        background: #00ff88;
        box-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .world-resources-panel {
            top: 120px;
            left: 10px;
            right: 10px;
            min-width: unset;
            max-width: unset;
            width: calc(100vw - 20px);
        }

        .resources-grid {
            grid-template-columns: 1fr;
            gap: 8px;
        }

        .world-resources-toggle,
        .show-resources-btn {
            top: 70px;
            left: 10px;
            padding: 10px;
            font-size: 16px;
        }
    }

    @media (max-width: 480px) {
        .resources-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .section-title {
            font-size: 9px;
        }

        .stat-label {
            font-size: 8px;
        }

        .stat-value {
            font-size: 10px;
        }
    }
</style>
