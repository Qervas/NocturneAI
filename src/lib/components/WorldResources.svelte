<script lang="ts">
    import { onMount } from "svelte";
    import { skillTreeManager } from "../services/PerkManager";
    import { characterManager, characters, selectedAgent, getAgentFullId } from "../services/CharacterManager";
    import { communicationManager } from "../services/CommunicationManager";
    import type { AgentSkillTree } from "../services/PerkManager";

    // Component state
    let agentSkillTrees: Record<string, AgentSkillTree> = {};
    let selectedAgentData: AgentSkillTree | null = null;

    // Reactive calculations
    $: agentList = $characters.filter((c) => c.type === "npc");
    $: selectedAgentData = $selectedAgent ? agentSkillTrees[getAgentFullId($selectedAgent)] : null;
    $: selectedAgentCharacter = $selectedAgent ? agentList.find(c => c.id === getAgentFullId($selectedAgent)) : null;

    // Subscribe to stores
    skillTreeManager.agentSkills.subscribe((value) => {
        agentSkillTrees = value;
    });

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

    function getAgentIcon(agentId: string): string {
        if (agentId.includes('alpha')) return "🧠";
        if (agentId.includes('beta')) return "🎨";
        if (agentId.includes('gamma')) return "⚙️";
        return "🤖";
    }

    function getAgentName(agentId: string): string {
        if (agentId.includes('alpha')) return "Alpha";
        if (agentId.includes('beta')) return "Beta";
        if (agentId.includes('gamma')) return "Gamma";
        return "Agent";
    }

    function getUnlockedSkillsCount(agentData: AgentSkillTree): number {
        return Object.values(agentData.skills).filter(skill => skill.currentRank > 0).length;
    }

    function getTotalSkillsCount(agentData: AgentSkillTree): number {
        return Object.keys(agentData.skills).length;
    }

    onMount(() => {
            // Initialize any new agents
            agentList.forEach((agent) => {
                if (!agentSkillTrees[agent.id]) {
                    skillTreeManager.initializeAgent(agent.id);
                }
            });
    });
</script>

<!-- Agent Resources Panel -->
<div class="agent-resources-panel">

    {#if selectedAgentData && selectedAgentCharacter}
        <!-- Selected Agent Info -->
        <div class="agent-info">
            <div class="agent-header">
                <span class="agent-icon">{getAgentIcon($selectedAgent || '')}</span>
                <span class="agent-name">{getAgentName($selectedAgent || '')}</span>
        </div>
            <div class="agent-status">
                Status: <span class="status-{selectedAgentCharacter.status}">{selectedAgentCharacter.status}</span>
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
                    <span class="stat-label">XP:</span>
                        <span class="stat-value experience-value">
                        {formatNumber(selectedAgentData.experience)}
                        </span>
                    </div>
                    <div class="stat-row">
                    <span class="stat-label">Points:</span>
                        <span class="stat-value">
                        {selectedAgentData.availablePoints}
                        </span>
                    </div>
                </div>
            </div>

        <!-- Skills Section -->
            <div class="resource-section">
                <div class="section-header">
                <span class="section-icon">🎯</span>
                <span class="section-title">SKILLS</span>
                </div>
                <div class="resource-stats">
                    <div class="stat-row">
                    <span class="stat-label">Unlocked:</span>
                    <span class="stat-value">
                        {getUnlockedSkillsCount(selectedAgentData)}/{getTotalSkillsCount(selectedAgentData)}
                        </span>
                    </div>
                    <div class="stat-row">
                    <span class="stat-label">Progress:</span>
                        <span class="stat-value">
                        {getTotalSkillsCount(selectedAgentData) > 0 
                            ? Math.round((getUnlockedSkillsCount(selectedAgentData) / getTotalSkillsCount(selectedAgentData)) * 100)
                            : 0}%
                        </span>
                    </div>
                </div>
            </div>

        <!-- Communication Section -->
            <div class="resource-section">
                <div class="section-header">
                <span class="section-icon">💬</span>
                <span class="section-title">COMMUNICATION</span>
                </div>
                <div class="resource-stats">
                    <div class="stat-row">
                        <span class="stat-label">Messages:</span>
                        <span class="stat-value">
                        {communicationManager.getNetworkStats().totalMessages}
                        </span>
                </div>
                    <div class="stat-row">
                    <span class="stat-label">Active:</span>
                        <span class="stat-value">
                        {communicationManager.getNetworkStats().activeConversations}
                        </span>
                </div>
            </div>
        </div>

    {:else}
        <!-- No Agent Selected -->
        <div class="no-agent-selected">
            <div class="no-agent-icon">🎯</div>
            <div class="no-agent-text">
                Click on an agent in the simulation to view their resources
            </div>
        </div>
    {/if}
    </div>

<style lang="css">
    .agent-resources-panel {
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(0, 255, 136, 0.3);
        border-radius: 8px;
        padding: 16px;
        height: 100%;
        overflow-y: auto;
    }



    .agent-info {
        background: rgba(0, 255, 136, 0.1);
        border: 1px solid rgba(0, 255, 136, 0.3);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 16px;
    }

    .agent-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
    }

    .agent-icon {
        font-size: 1.5rem;
    }

    .agent-name {
        font-size: 1.1rem;
        font-weight: bold;
        color: #00ff88;
    }

    .agent-status {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.8);
    }

    .status-online {
        color: #4CAF50;
    }

    .status-offline {
        color: #F44336;
    }

    .status-idle {
        color: #FF9800;
    }

    .resource-section {
        margin-bottom: 16px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        border: 1px solid rgba(0, 255, 136, 0.1);
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
    }

    .section-icon {
        font-size: 1rem;
    }

    .section-title {
        font-size: 0.9rem;
        font-weight: bold;
        color: #00ff88;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .resource-stats {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .stat-label {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
    }

    .stat-value {
        font-size: 0.85rem;
        font-weight: bold;
        color: #ffffff;
    }

    .experience-value {
        color: #FFD700;
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
