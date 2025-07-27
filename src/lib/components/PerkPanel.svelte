<script lang="ts">
    import { onMount } from "svelte";
    import { skillTreeManager } from "../services/PerkManager";
    import { characters } from "../services/CharacterManager";
    import type {
        AgentSkillTree,
        SkillNode,
        SkillCategory,
    } from "../services/PerkManager";

    let showSkillPanel = false;
    let selectedAgent: string | null = null;
    let selectedCategory: SkillCategory = "system_access";
    let agentSkillTrees: Record<string, AgentSkillTree> = {};
    let hoveredSkill: string | null = null;

    // Subscribe to skill trees
    skillTreeManager.agentSkills.subscribe((value) => {
        agentSkillTrees = value;
    });

    // Get available agents (NPCs only)
    $: availableAgents = $characters.filter((c) => c.type === "npc");

    // Get current agent's skill tree
    $: currentAgentSkills = selectedAgent
        ? agentSkillTrees[selectedAgent]
        : null;

    // Get skills for selected category
    $: categorySkills = skillTreeManager.getSkillsByCategory(selectedCategory);

    // Skill categories with icons and colors
    const categories = [
        { id: "system_access", name: "System", icon: "💻", color: "#4CAF50" },
        { id: "web_operations", name: "Web", icon: "🌐", color: "#2196F3" },
        { id: "communication", name: "Social", icon: "💬", color: "#FF9800" },
        { id: "analysis", name: "Analysis", icon: "📊", color: "#9C27B0" },
        { id: "automation", name: "Auto", icon: "🤖", color: "#00BCD4" },
        { id: "security", name: "Security", icon: "🔒", color: "#F44336" },
    ];

    function toggleSkillPanel() {
        showSkillPanel = !showSkillPanel;
        if (showSkillPanel && !selectedAgent && availableAgents.length > 0) {
            selectedAgent = availableAgents[0].id;
        }
    }

    function selectAgent(agentId: string) {
        selectedAgent = agentId;
        // Initialize agent if not already done
        if (!agentSkillTrees[agentId]) {
            skillTreeManager.initializeAgent(agentId);
        }
    }

    function selectCategory(category: SkillCategory) {
        selectedCategory = category;
    }

    function unlockSkill(skillId: string) {
        if (selectedAgent) {
            const success = skillTreeManager.unlockSkill(
                selectedAgent,
                skillId,
            );
            if (success) {
                // Visual feedback for successful unlock
                const skillElement = document.querySelector(
                    `[data-skill="${skillId}"]`,
                );
                if (skillElement) {
                    skillElement.classList.add("skill-unlocked-animation");
                    setTimeout(() => {
                        skillElement.classList.remove(
                            "skill-unlocked-animation",
                        );
                    }, 1000);
                }
            }
        }
    }

    function getSkillState(
        skill: SkillNode,
    ): "locked" | "available" | "unlocked" | "maxed" {
        if (!currentAgentSkills) return "locked";

        const agentSkill = currentAgentSkills.skills[skill.id];
        if (!agentSkill) return "locked";

        if (agentSkill.currentRank >= agentSkill.maxRank) return "maxed";
        if (agentSkill.currentRank > 0) return "unlocked";

        // Check if prerequisites are met
        const prerequisitesMet = skill.prerequisites.every((prereqId) => {
            const prereq = currentAgentSkills.skills[prereqId];
            return prereq && prereq.currentRank > 0;
        });

        if (
            prerequisitesMet &&
            currentAgentSkills.availablePoints >= skill.cost
        ) {
            return "available";
        }

        return "locked";
    }

    function getSkillRank(skillId: string): number {
        if (!currentAgentSkills) return 0;
        return currentAgentSkills.skills[skillId]?.currentRank || 0;
    }

    function canAffordSkill(skill: SkillNode): boolean {
        if (!currentAgentSkills) return false;
        return currentAgentSkills.availablePoints >= skill.cost;
    }

    function getAgentColor(agentId: string): string {
        const agent = availableAgents.find((a) => a.id === agentId);
        return agent?.color || "#ffffff";
    }

    function getAgentName(agentId: string): string {
        const agent = availableAgents.find((a) => a.id === agentId);
        return agent?.name || agentId;
    }

    function getCategoryColor(categoryId: string): string {
        return categories.find((c) => c.id === categoryId)?.color || "#ffffff";
    }

    function grantTestXP() {
        if (selectedAgent) {
            skillTreeManager.grantExperience(selectedAgent, 150, "testing");
        }
    }

    onMount(() => {
        // Initialize skill trees for all agents
        availableAgents.forEach((agent) => {
            skillTreeManager.initializeAgent(agent.id);
        });
    });
</script>

<!-- Skill Tree Toggle Button -->
<button
    class="skill-tree-toggle"
    on:click={toggleSkillPanel}
    class:active={showSkillPanel}
    title="Agent Skill Trees"
>
    ⚡ Skills
</button>

<!-- Skill Tree Panel -->
{#if showSkillPanel}
    <div class="skill-panel-overlay" on:click={toggleSkillPanel}>
        <div class="skill-panel" on:click|stopPropagation>
            <!-- Header -->
            <div class="skill-header">
                <h2>🎯 Agent Skill Trees</h2>
                <div class="header-controls">
                    <button
                        class="test-xp-btn"
                        on:click={grantTestXP}
                        disabled={!selectedAgent}
                    >
                        +150 XP
                    </button>
                    <button class="close-btn" on:click={toggleSkillPanel}
                        >✕</button
                    >
                </div>
            </div>

            <!-- Agent Selection -->
            <div class="agent-selector">
                <h3>Select Agent</h3>
                <div class="agent-grid">
                    {#each availableAgents as agent}
                        <button
                            class="agent-card"
                            class:selected={selectedAgent === agent.id}
                            on:click={() => selectAgent(agent.id)}
                            style="border-color: {getAgentColor(agent.id)}"
                        >
                            <div
                                class="agent-icon"
                                style="color: {getAgentColor(agent.id)}"
                            >
                                {agent.name === "Alpha"
                                    ? "🧠"
                                    : agent.name === "Beta"
                                      ? "🎨"
                                      : "⚙️"}
                            </div>
                            <div class="agent-info">
                                <div class="agent-name">
                                    {getAgentName(agent.id)}
                                </div>
                                {#if agentSkillTrees[agent.id]}
                                    <div class="agent-stats">
                                        <span
                                            >XP: {agentSkillTrees[agent.id]
                                                .experience}</span
                                        >
                                        <span
                                            >Points: {agentSkillTrees[agent.id]
                                                .availablePoints}</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </button>
                    {/each}
                </div>
            </div>

            {#if currentAgentSkills}
                <!-- Category Tabs -->
                <div class="category-tabs">
                    {#each categories as category}
                        <button
                            class="category-tab"
                            class:active={selectedCategory === category.id}
                            on:click={() => selectCategory(category.id)}
                            style="--category-color: {category.color}"
                        >
                            <span class="category-icon">{category.icon}</span>
                            <span class="category-name">{category.name}</span>
                        </button>
                    {/each}
                </div>

                <!-- Skill Tree Grid -->
                <div class="skill-tree-container">
                    <div class="skill-tree-header">
                        <h3 style="color: {getCategoryColor(selectedCategory)}">
                            {categories.find((c) => c.id === selectedCategory)
                                ?.icon}
                            {categories.find((c) => c.id === selectedCategory)
                                ?.name} Skills
                        </h3>
                        <div class="agent-resources">
                            <span class="experience"
                                >🌟 {currentAgentSkills.experience} XP</span
                            >
                            <span class="points"
                                >💎 {currentAgentSkills.availablePoints} Points</span
                            >
                        </div>
                    </div>

                    <div class="skill-grid">
                        {#each categorySkills as skill, index}
                            {@const skillState = getSkillState(skill)}
                            {@const skillRank = getSkillRank(skill.id)}
                            <div
                                class="skill-node {skillState}"
                                class:hoverable={skillState === "available"}
                                data-skill={skill.id}
                                on:click={() =>
                                    skillState === "available" &&
                                    unlockSkill(skill.id)}
                                on:mouseenter={() => (hoveredSkill = skill.id)}
                                on:mouseleave={() => (hoveredSkill = null)}
                                style="--category-color: {getCategoryColor(
                                    selectedCategory,
                                )}"
                            >
                                <!-- Skill Icon -->
                                <div class="skill-icon">
                                    {skill.icon}
                                    {#if skillRank > 0}
                                        <div class="skill-rank">
                                            {skillRank}
                                        </div>
                                    {/if}
                                </div>

                                <!-- Skill Info -->
                                <div class="skill-info">
                                    <div class="skill-name">{skill.name}</div>
                                    <div class="skill-description">
                                        {skill.description}
                                    </div>

                                    {#if skillState === "locked" && skill.prerequisites.length > 0}
                                        <div class="prerequisites">
                                            Requires: {skill.prerequisites
                                                .map(
                                                    (id) =>
                                                        categorySkills.find(
                                                            (s) => s.id === id,
                                                        )?.name || id,
                                                )
                                                .join(", ")}
                                        </div>
                                    {/if}

                                    {#if skillState === "available"}
                                        <div class="skill-cost">
                                            Cost: {skill.cost} points
                                        </div>
                                    {/if}

                                    {#if skillRank > 0}
                                        <div class="skill-effects">
                                            {#each skill.effects as effect}
                                                <div class="effect">
                                                    • {effect.description}
                                                </div>
                                            {/each}
                                        </div>
                                    {/if}

                                    {#if skillState === "unlocked" && skillRank < skill.maxRank}
                                        <div class="upgrade-info">
                                            Rank {skillRank}/{skill.maxRank} - Can
                                            upgrade for {skill.cost} points
                                        </div>
                                    {/if}
                                </div>

                                <!-- Connection Lines -->
                                {#if skill.prerequisites.length > 0}
                                    {#each skill.prerequisites as prereqId}
                                        {@const prereqIndex =
                                            categorySkills.findIndex(
                                                (s) => s.id === prereqId,
                                            )}
                                        {#if prereqIndex !== -1}
                                            <div
                                                class="skill-connection"
                                                style="--prereq-index: {prereqIndex}; --current-index: {index}"
                                            ></div>
                                        {/if}
                                    {/each}
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Skill Tooltip -->
                {#if hoveredSkill}
                    {@const hoveredSkillData = categorySkills.find(
                        (s) => s.id === hoveredSkill,
                    )}
                    {#if hoveredSkillData}
                        <div class="skill-tooltip">
                            <h4>
                                {hoveredSkillData.icon}
                                {hoveredSkillData.name}
                            </h4>
                            <p>{hoveredSkillData.description}</p>
                            <div class="tooltip-effects">
                                {#each hoveredSkillData.effects as effect}
                                    <div class="tooltip-effect">
                                        <strong>{effect.type}:</strong>
                                        {effect.description}
                                    </div>
                                {/each}
                            </div>
                            <div class="tooltip-stats">
                                <span>Max Rank: {hoveredSkillData.maxRank}</span
                                >
                                <span>Cost: {hoveredSkillData.cost} points</span
                                >
                            </div>
                        </div>
                    {/if}
                {/if}
            {:else}
                <div class="no-agent-selected">
                    <p>Select an agent to view their skill tree</p>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .skill-tree-toggle {
        background: linear-gradient(135deg, #4caf50, #45a049);
        border: none;
        border-radius: 8px;
        color: white;
        padding: 10px 15px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }

    .skill-tree-toggle:hover,
    .skill-tree-toggle.active {
        background: linear-gradient(135deg, #5cbf60, #4caf50);
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }

    .skill-panel-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        animation: fadeIn 0.3s ease;
    }

    .skill-panel {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #4caf50;
        border-radius: 15px;
        width: 90vw;
        height: 85vh;
        max-width: 1200px;
        padding: 20px;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.3s ease;
    }

    .skill-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #4caf50;
    }

    .skill-header h2 {
        color: #4caf50;
        margin: 0;
        font-size: 24px;
        text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
    }

    .header-controls {
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .test-xp-btn {
        background: #ff9800;
        border: none;
        border-radius: 6px;
        color: white;
        padding: 8px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .test-xp-btn:hover:not(:disabled) {
        background: #f57c00;
        transform: scale(1.05);
    }

    .test-xp-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .close-btn {
        background: #f44336;
        border: none;
        border-radius: 6px;
        color: white;
        padding: 8px 12px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .close-btn:hover {
        background: #d32f2f;
        transform: scale(1.1);
    }

    .agent-selector {
        margin-bottom: 20px;
    }

    .agent-selector h3 {
        color: #ffffff;
        margin-bottom: 10px;
        font-size: 16px;
    }

    .agent-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
    }

    .agent-card {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid transparent;
        border-radius: 10px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .agent-card:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
    }

    .agent-card.selected {
        border-color: currentColor;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 15px rgba(76, 175, 80, 0.3);
    }

    .agent-icon {
        font-size: 24px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 50%;
    }

    .agent-info {
        flex: 1;
    }

    .agent-name {
        color: #ffffff;
        font-weight: bold;
        margin-bottom: 5px;
    }

    .agent-stats {
        display: flex;
        gap: 10px;
        font-size: 12px;
        color: #cccccc;
    }

    .category-tabs {
        display: flex;
        gap: 5px;
        margin-bottom: 20px;
        overflow-x: auto;
    }

    .category-tab {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid transparent;
        border-radius: 8px;
        padding: 10px 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        color: #ffffff;
    }

    .category-tab:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .category-tab.active {
        border-color: var(--category-color);
        background: var(--category-color);
        color: #000000;
        box-shadow: 0 0 15px var(--category-color);
    }

    .category-icon {
        font-size: 16px;
    }

    .category-name {
        font-size: 14px;
        font-weight: bold;
    }

    .skill-tree-container {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        padding: 20px;
    }

    .skill-tree-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .skill-tree-header h3 {
        margin: 0;
        font-size: 18px;
    }

    .agent-resources {
        display: flex;
        gap: 15px;
        font-size: 14px;
        color: #ffffff;
    }

    .experience {
        color: #ffd700;
    }

    .points {
        color: #4caf50;
    }

    .skill-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 15px;
        position: relative;
    }

    .skill-node {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 100%
        );
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 15px;
        transition: all 0.3s ease;
        position: relative;
        cursor: default;
    }

    .skill-node.locked {
        opacity: 0.4;
        background: rgba(0, 0, 0, 0.3);
        border-color: #666666;
    }

    .skill-node.available {
        border-color: var(--category-color);
        cursor: pointer;
        animation: pulse 2s infinite;
    }

    .skill-node.available:hover {
        background: rgba(76, 175, 80, 0.2);
        transform: translateY(-3px);
        box-shadow: 0 5px 20px rgba(76, 175, 80, 0.4);
    }

    .skill-node.unlocked {
        border-color: var(--category-color);
        background: linear-gradient(
            135deg,
            rgba(76, 175, 80, 0.2) 0%,
            rgba(76, 175, 80, 0.1) 100%
        );
    }

    .skill-node.maxed {
        border-color: #ffd700;
        background: linear-gradient(
            135deg,
            rgba(255, 215, 0, 0.3) 0%,
            rgba(255, 215, 0, 0.1) 100%
        );
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
    }

    .skill-icon {
        font-size: 28px;
        text-align: center;
        margin-bottom: 10px;
        position: relative;
    }

    .skill-rank {
        position: absolute;
        bottom: -5px;
        right: -5px;
        background: #4caf50;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
    }

    .skill-info {
        text-align: center;
    }

    .skill-name {
        color: #ffffff;
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 8px;
    }

    .skill-description {
        color: #cccccc;
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 10px;
    }

    .prerequisites,
    .skill-cost,
    .upgrade-info {
        font-size: 12px;
        color: #ff9800;
        margin-top: 8px;
    }

    .skill-effects {
        margin-top: 10px;
        text-align: left;
    }

    .effect {
        font-size: 11px;
        color: #4caf50;
        margin-bottom: 3px;
    }

    .skill-tooltip {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #4caf50;
        border-radius: 10px;
        padding: 15px;
        max-width: 300px;
        z-index: 3000;
        animation: fadeIn 0.3s ease;
    }

    .skill-tooltip h4 {
        color: #4caf50;
        margin: 0 0 10px 0;
        font-size: 16px;
    }

    .skill-tooltip p {
        color: #cccccc;
        margin: 0 0 10px 0;
        font-size: 13px;
    }

    .tooltip-effects {
        margin-bottom: 10px;
    }

    .tooltip-effect {
        font-size: 12px;
        color: #ffffff;
        margin-bottom: 3px;
    }

    .tooltip-stats {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #888888;
    }

    .no-agent-selected {
        text-align: center;
        color: #cccccc;
        padding: 50px;
        font-size: 18px;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(50px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes pulse {
        0%,
        100% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
        }
        50% {
            box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
        }
    }

    .skill-unlocked-animation {
        animation: skillUnlock 1s ease;
    }

    @keyframes skillUnlock {
        0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
        }
        50% {
            transform: scale(1.1);
            box-shadow: 0 0 0 15px rgba(76, 175, 80, 0);
        }
        100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
        }
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .skill-panel {
            width: 95vw;
            height: 90vh;
            padding: 15px;
        }

        .skill-grid {
            grid-template-columns: 1fr;
        }

        .category-tabs {
            flex-wrap: wrap;
        }

        .skill-tooltip {
            position: absolute;
            bottom: 10px;
            right: 10px;
            max-width: 250px;
        }
    }
</style>
