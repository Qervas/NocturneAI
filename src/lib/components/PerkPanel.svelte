<script lang="ts">
    import { onMount } from "svelte";
    import { perkManager } from "../services/PerkManager";
    import {
        characterManager,
        characters,
        activeCharacter,
    } from "../services/CharacterManager";
    import type { Perk, Skill, PerkCategory, AgentPerks } from "../types/Perks";

    // Component state
    let showPerkPanel = false;
    let selectedAgent = "";
    let selectedPerkCategory: PerkCategory | null = null;
    let agentPerksStore = perkManager.agentPerks;

    // Reactive stores
    $: agentList = $characters.filter((c) => c.type === "npc");
    $: currentAgentPerks = selectedAgent
        ? $agentPerksStore.get(selectedAgent)
        : undefined;
    $: selectedPerk =
        selectedPerkCategory && currentAgentPerks?.perks && typeof currentAgentPerks.perks.get === 'function'
            ? currentAgentPerks.perks.get(selectedPerkCategory)
            : undefined;

    function togglePerkPanel() {
        showPerkPanel = !showPerkPanel;
        if (showPerkPanel && agentList.length > 0 && !selectedAgent) {
            selectedAgent = agentList[0].id;
        }
    }

    function selectAgent(agentId: string) {
        selectedAgent = agentId;
        selectedPerkCategory = null;
        // Ensure agent perks are initialized
        perkManager.initializeAgentPerks(agentId);
    }

    function selectPerkCategory(category: PerkCategory) {
        selectedPerkCategory = category;
    }

    function unlockPerk(perkId: string) {
        if (
            !currentAgentPerks ||
            !currentAgentPerks.perks ||
            typeof currentAgentPerks.perks.get !== 'function' ||
            currentAgentPerks.availablePoints <= 0
        )
            return;

        const perk = currentAgentPerks.perks.get(perkId);
        if (perk && !perk.unlocked) {
            perk.unlocked = true;
            currentAgentPerks.availablePoints--;

            // Unlock first skill
            if (perk.skills.length > 0) {
                perk.skills[0].unlocked = true;
            }

            console.log(`🎯 Unlocked perk ${perk.name} for ${selectedAgent}`);
        }
    }

    function getSkillProgressPercent(skill: Skill): number {
        if (skill.maxExperience === 0) return 0;
        return (skill.experience / skill.maxExperience) * 100;
    }

    function getPerkProgressPercent(perk: Perk): number {
        if (perk.maxExperience === 0) return 0;
        return (perk.experience / perk.maxExperience) * 100;
    }

    function getAgentSpecializationIcon(agentId: string): string {
        const specialization = perkManager.getAgentSpecialization(agentId);
        const perkDefs = perkManager.getPerkDefinitions();
        return specialization ? perkDefs[specialization].icon : "🤖";
    }

    function simulateSkillUse(skillId: string) {
        if (!selectedAgent || !selectedPerkCategory) return;

        // Grant some experience for testing
        perkManager.grantExperience(
            selectedAgent,
            selectedPerkCategory,
            skillId,
            25,
        );
    }

    onMount(() => {
        // Initialize perks for all agents
        agentList.forEach((agent) => {
            let specialization: PerkCategory | undefined;

            // Assign specializations based on agent
            if (agent.id === "agent_alpha") specialization = "cognitive";
            else if (agent.id === "agent_beta") specialization = "creative";
            else if (agent.id === "agent_gamma") specialization = "technical";

            perkManager.initializeAgentPerks(agent.id, specialization);
        });

        // Start auto-save
        perkManager.startAutoSave();
    });
</script>

<!-- Perk Panel Toggle Button -->
<button
    class="perk-toggle-btn"
    on:click={togglePerkPanel}
    class:active={showPerkPanel}
    title="Agent Perks & Skills"
>
    🎯
</button>

<!-- Perk Management Panel -->
{#if showPerkPanel}
    <div class="perk-panel-overlay" on:click={togglePerkPanel}></div>
    <div class="perk-panel">
        <div class="perk-header">
            <h2>🎯 Agent Perks & Skills</h2>
            <button class="close-btn" on:click={togglePerkPanel}>✕</button>
        </div>

        <div class="perk-content">
            <!-- Agent Selection -->
            <div class="agent-selector">
                <h3>Select Agent:</h3>
                <div class="agent-list">
                    {#each agentList as agent}
                        <button
                            class="agent-btn"
                            class:selected={selectedAgent === agent.id}
                            on:click={() => selectAgent(agent.id)}
                            style="border-color: {agent.color}"
                        >
                            <span class="agent-icon"
                                >{getAgentSpecializationIcon(agent.id)}</span
                            >
                            <span class="agent-name">{agent.name}</span>
                            {#if $agentPerksStore.get(agent.id)}
                                <span class="agent-points">
                                    {(() => {
                                        const agentPerks = $agentPerksStore.get(agent.id);
                                        return agentPerks && typeof agentPerks.availablePoints === 'number' 
                                            ? agentPerks.availablePoints 
                                            : 0;
                                    })()} pts
                                </span>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>

            {#if currentAgentPerks}
                <div class="perk-main">
                    <!-- Perk Categories -->
                    <div class="perk-categories">
                        <h3>Perk Trees:</h3>
                        <div class="category-grid">
                            {#each Object.entries(perkManager.getPerkDefinitions()) as [categoryId, perkDef]}
                                {@const perk =
                                    currentAgentPerks?.perks && typeof currentAgentPerks.perks.get === 'function' 
                                        ? currentAgentPerks.perks.get(categoryId)
                                        : undefined}

                                {#if perk}
                                    <div class="category-item">
                                        <button
                                            class="category-btn"
                                            class:selected={selectedPerkCategory ===
                                                categoryId}
                                            class:unlocked={perk.unlocked}
                                            class:locked={!perk.unlocked}
                                            on:click={() =>
                                                selectPerkCategory(
                                                    categoryId as PerkCategory,
                                                )}
                                            style="--perk-color: {perkDef.color}"
                                        >
                                            <div class="category-icon">
                                                {perkDef.icon}
                                            </div>
                                            <div class="category-name">
                                                {perkDef.name}
                                            </div>
                                            <div class="category-level">
                                                Level {perk.level}
                                            </div>
                                            {#if perk.unlocked}
                                                <div class="category-progress">
                                                    <div
                                                        class="progress-bar"
                                                        style="width: {getPerkProgressPercent(
                                                            perk,
                                                        )}%; background-color: {perkDef.color}"
                                                    ></div>
                                                </div>
                                            {/if}
                                        </button>
                                        {#if !perk.unlocked && currentAgentPerks && currentAgentPerks.availablePoints > 0}
                                            <button
                                                class="unlock-btn"
                                                on:click={() =>
                                                    unlockPerk(categoryId)}
                                            >
                                                Unlock
                                            </button>
                                        {/if}
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    </div>

                    <!-- Selected Perk Details -->
                    {#if selectedPerk}
                        <div class="perk-details">
                            <div class="perk-info">
                                <div class="perk-title">
                                    <span
                                        class="perk-icon"
                                        style="color: {selectedPerk.color}"
                                        >{selectedPerk.icon}</span
                                    >
                                    <h3>{selectedPerk.name}</h3>
                                    <span class="perk-level"
                                        >Level {selectedPerk.level}</span
                                    >
                                </div>
                                <p class="perk-description">
                                    {selectedPerk.description}
                                </p>

                                {#if selectedPerk.unlocked}
                                    <div class="perk-progress-detail">
                                        <div class="progress-label">
                                            Experience: {selectedPerk.experience}
                                            / {selectedPerk.maxExperience}
                                        </div>
                                        <div class="progress-container">
                                            <div
                                                class="progress-fill"
                                                style="width: {getPerkProgressPercent(
                                                    selectedPerk,
                                                )}%; background-color: {selectedPerk.color}"
                                            ></div>
                                        </div>
                                    </div>
                                {/if}
                            </div>

                            <!-- Skills -->
                            <div class="skills-section">
                                <h4>Skills:</h4>
                                <div class="skills-grid">
                                    {#each selectedPerk.skills as skill}
                                        <div
                                            class="skill-card"
                                            class:unlocked={skill.unlocked}
                                            class:locked={!skill.unlocked}
                                        >
                                            <div class="skill-header">
                                                <span class="skill-icon"
                                                    >{skill.icon}</span
                                                >
                                                <div class="skill-info">
                                                    <div class="skill-name">
                                                        {skill.name}
                                                    </div>
                                                    <div class="skill-level">
                                                        {skill.unlocked
                                                            ? `Level ${skill.level}`
                                                            : "Locked"}
                                                    </div>
                                                </div>
                                                {#if skill.unlocked}
                                                    <button
                                                        class="test-skill-btn"
                                                        on:click={() =>
                                                            simulateSkillUse(
                                                                skill.id,
                                                            )}
                                                        title="Test skill (gain XP)"
                                                    >
                                                        🎮
                                                    </button>
                                                {/if}
                                            </div>

                                            <p class="skill-description">
                                                {skill.description}
                                            </p>

                                            {#if skill.unlocked}
                                                <div class="skill-progress">
                                                    <div class="progress-label">
                                                        XP: {skill.experience} /
                                                        {skill.maxExperience}
                                                    </div>
                                                    <div
                                                        class="progress-container"
                                                    >
                                                        <div
                                                            class="progress-fill"
                                                            style="width: {getSkillProgressPercent(
                                                                skill,
                                                            )}%; background-color: {selectedPerk.color}"
                                                        ></div>
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    {:else}
                        <div class="no-selection">
                            <p>Select a perk category to view skills</p>
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="no-agent">
                    <p>Select an agent to manage their perks</p>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .perk-toggle-btn {
        position: fixed;
        top: 20px;
        left: 20px;
        background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.8) 0%,
            rgba(0, 20, 40, 0.8) 100%
        );
        border: 1px solid rgba(255, 215, 0, 0.5);
        border-radius: 50%;
        color: #ffd700;
        cursor: pointer;
        padding: 12px;
        font-size: 20px;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
        z-index: 1001;
    }

    .perk-toggle-btn:hover,
    .perk-toggle-btn.active {
        background: linear-gradient(
            135deg,
            rgba(255, 215, 0, 0.2) 0%,
            rgba(255, 140, 0, 0.8) 100%
        );
        box-shadow: 0 0 25px rgba(255, 215, 0, 0.6);
        transform: scale(1.1);
    }

    .perk-panel-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 1100;
    }

    .perk-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(
            135deg,
            rgba(15, 15, 25, 0.95),
            rgba(25, 25, 40, 0.95)
        );
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 20px;
        backdrop-filter: blur(15px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        width: 90vw;
        max-width: 1200px;
        height: 80vh;
        max-height: 800px;
        z-index: 1101;
        font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            sans-serif;
    }

    .perk-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 30px;
        border-bottom: 1px solid rgba(255, 215, 0, 0.2);
    }

    .perk-header h2 {
        color: #ffd700;
        font-size: 24px;
        font-weight: 700;
        margin: 0;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }

    .close-btn {
        background: none;
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 50%;
        color: #ffd700;
        cursor: pointer;
        padding: 8px 12px;
        font-size: 16px;
        transition: all 0.3s ease;
    }

    .close-btn:hover {
        background: rgba(255, 215, 0, 0.1);
        transform: scale(1.1);
    }

    .perk-content {
        padding: 20px 30px;
        height: calc(100% - 80px);
        overflow-y: auto;
    }

    .agent-selector {
        margin-bottom: 30px;
    }

    .agent-selector h3 {
        color: #ffffff;
        font-size: 18px;
        margin-bottom: 15px;
    }

    .agent-list {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
    }

    .agent-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid;
        border-radius: 12px;
        color: #ffffff;
        cursor: pointer;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        min-width: 120px;
    }

    .agent-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
    }

    .agent-btn.selected {
        background: rgba(255, 215, 0, 0.1);
        border-color: #ffd700;
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
    }

    .agent-icon {
        font-size: 20px;
    }

    .agent-name {
        font-weight: 600;
        flex: 1;
    }

    .agent-points {
        font-size: 12px;
        background: rgba(255, 215, 0, 0.2);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 6px;
        padding: 2px 6px;
        color: #ffd700;
    }

    .perk-main {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 30px;
        height: calc(100% - 120px);
    }

    .perk-categories h3 {
        color: #ffffff;
        font-size: 18px;
        margin-bottom: 15px;
    }

    .category-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 15px;
    }

    .category-item {
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .category-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: #ffffff;
        cursor: pointer;
        padding: 15px;
        text-align: center;
        transition: all 0.3s ease;
        position: relative;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .category-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
    }

    .category-btn.unlocked {
        border-color: var(--perk-color);
        background: rgba(255, 255, 255, 0.08);
    }

    .category-btn.selected {
        border-color: #ffd700;
        background: rgba(255, 215, 0, 0.1);
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
    }

    .category-btn.locked {
        opacity: 0.6;
        filter: grayscale(100%);
    }

    .category-icon {
        font-size: 28px;
        margin-bottom: 8px;
    }

    .category-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
    }

    .category-level {
        font-size: 12px;
        opacity: 0.8;
        margin-bottom: 8px;
    }

    .category-progress {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-bar {
        height: 100%;
        transition: width 0.3s ease;
    }

    .unlock-btn {
        background: rgba(255, 215, 0, 0.2);
        border: 1px solid rgba(255, 215, 0, 0.5);
        border-radius: 6px;
        color: #ffd700;
        cursor: pointer;
        padding: 6px 12px;
        font-size: 12px;
        margin-top: 8px;
        transition: all 0.3s ease;
        width: 100%;
        text-align: center;
    }

    .unlock-btn:hover {
        background: rgba(255, 215, 0, 0.3);
        transform: scale(1.05);
    }

    .perk-details {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        height: 100%;
        overflow-y: auto;
    }

    .perk-info {
        margin-bottom: 25px;
    }

    .perk-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }

    .perk-icon {
        font-size: 32px;
    }

    .perk-title h3 {
        color: #ffffff;
        font-size: 20px;
        margin: 0;
        flex: 1;
    }

    .perk-level {
        background: rgba(255, 215, 0, 0.2);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 6px;
        color: #ffd700;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 600;
    }

    .perk-description {
        color: #cccccc;
        line-height: 1.5;
        margin-bottom: 15px;
    }

    .perk-progress-detail {
        margin-top: 15px;
    }

    .progress-label {
        color: #ffffff;
        font-size: 12px;
        margin-bottom: 6px;
    }

    .progress-container {
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        transition: width 0.3s ease;
    }

    .skills-section h4 {
        color: #ffffff;
        font-size: 18px;
        margin-bottom: 15px;
    }

    .skills-grid {
        display: grid;
        gap: 15px;
    }

    .skill-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 15px;
        transition: all 0.3s ease;
    }

    .skill-card.unlocked {
        border-color: rgba(255, 255, 255, 0.2);
    }

    .skill-card.locked {
        opacity: 0.6;
        filter: grayscale(100%);
    }

    .skill-card:hover {
        background: rgba(255, 255, 255, 0.08);
    }

    .skill-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
    }

    .skill-icon {
        font-size: 20px;
    }

    .skill-info {
        flex: 1;
    }

    .skill-name {
        color: #ffffff;
        font-weight: 600;
        font-size: 14px;
    }

    .skill-level {
        color: #cccccc;
        font-size: 12px;
    }

    .test-skill-btn {
        background: rgba(255, 215, 0, 0.2);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 4px;
        color: #ffd700;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 12px;
        transition: all 0.3s ease;
    }

    .test-skill-btn:hover {
        background: rgba(255, 215, 0, 0.3);
        transform: scale(1.1);
    }

    .skill-description {
        color: #cccccc;
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 12px;
    }

    .skill-progress {
        margin-top: 10px;
    }

    .no-selection,
    .no-agent {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #888888;
        font-style: italic;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .perk-panel {
            width: 95vw;
            height: 90vh;
        }

        .perk-main {
            grid-template-columns: 1fr;
            gap: 20px;
        }

        .category-grid {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        }

        .agent-list {
            justify-content: center;
        }

        .perk-toggle-btn {
            top: 10px;
            left: 10px;
            padding: 10px;
            font-size: 18px;
        }
    }
</style>
