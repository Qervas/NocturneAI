<script lang="ts">
    import { onMount } from "svelte";
    import { skillTreeManager } from "../services/PerkManager";
    import { characterManager, characters, selectedAgent } from "../services/CharacterManager";
    import { settingsManager, settings } from "../services/SettingsManager";
    import type {
        AgentSkillTree,
        SkillNode,
        SkillCategory,
    } from "../services/PerkManager";

    let selectedCategory: SkillCategory = "system_access";
    let agentSkillTrees: Record<string, AgentSkillTree> = {};
    let applyToAllAgents = false; // Default: only current agent

    // Subscribe to skill trees
    skillTreeManager.agentSkills.subscribe((value) => {
        agentSkillTrees = value;
    });

    // Get available agents (NPCs only)
    $: availableAgents = $characters.filter((c) => c.type === "npc");

    // Get current agent's skill tree
    $: currentAgentSkills = $selectedAgent
        ? agentSkillTrees[$selectedAgent]
        : null;

    // Get skills for selected category
    $: categorySkills = skillTreeManager.getSkillsByCategory(selectedCategory);
    
    // Reactive skill states for current agent
    $: currentAgentSkillStates = $selectedAgent && settingsTrigger ? categorySkills.map(skill => ({
        skill,
        state: getSkillState(skill),
        rank: getSkillRank(skill.id),
        owned: hasSkill(skill.id),
        enabled: isSkillEnabled(skill.id)
    })) : [];
    
    // Force reactivity when settings change
    $: settingsTrigger = $settings;

    // Skill categories with icons and colors
    const categories: Array<{ id: SkillCategory; name: string; icon: string; color: string }> = [
        { id: "system_access", name: "System", icon: "💻", color: "#4CAF50" },
        { id: "web_operations", name: "Web", icon: "🌐", color: "#2196F3" },
        { id: "communication", name: "Social", icon: "💬", color: "#FF9800" },
        { id: "analysis", name: "Analysis", icon: "📊", color: "#9C27B0" },
        { id: "automation", name: "Auto", icon: "🤖", color: "#00BCD4" },
        { id: "security", name: "Security", icon: "🔒", color: "#F44336" },
    ];

    function selectCategory(category: SkillCategory) {
        selectedCategory = category;
    }

    function unlockSkill(skillId: string) {
        if (!$selectedAgent) return;
        
        if (applyToAllAgents) {
            // Apply to all agents
            availableAgents.forEach(agent => {
                const success = skillTreeManager.unlockSkill(agent.id, skillId);
                if (success) {
                    settingsManager.ownSkill(agent.id, skillId);
                }
            });
        } else {
            // Apply only to current agent
            const success = skillTreeManager.unlockSkill($selectedAgent, skillId);
            if (success) {
                settingsManager.ownSkill($selectedAgent, skillId);
            }
        }
        
        // Visual feedback for successful unlock
        const skillElement = document.querySelector(`[data-skill="${skillId}"]`);
        if (skillElement) {
            skillElement.classList.add("skill-unlocked-animation");
            setTimeout(() => {
                skillElement.classList.remove("skill-unlocked-animation");
            }, 1000);
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

		// Developer mode: all skills are available (bypass prerequisites)
		return "available";
		
		// Original logic (commented out for developer mode):
		// Check if prerequisites are met
		// const prerequisitesMet = skill.prerequisites.every((prereqId) => {
		// 	const prereq = currentAgentSkills.skills[prereqId];
		// 	return prereq && prereq.currentRank > 0;
		// });
		// return prerequisitesMet ? "available" : "locked";
	}

	function hasSkill(skillId: string): boolean {
		if (!$selectedAgent) return false;
		// Check persistent settings first, then fall back to developer mode
		return settingsManager.isSkillOwned($selectedAgent, skillId) || true; // true for developer mode
	}

	function isSkillEnabled(skillId: string): boolean {
		if (!$selectedAgent) return false;
		return settingsManager.isSkillEnabled($selectedAgent, skillId);
	}

	function toggleSkill(skillId: string) {
		if (!$selectedAgent) return;
		
		if (applyToAllAgents) {
			// Apply to all agents
			availableAgents.forEach(agent => {
				settingsManager.toggleSkill(agent.id, skillId);
			});
		} else {
			// Apply only to current agent
			settingsManager.toggleSkill($selectedAgent, skillId);
		}
	}

    	function getSkillRank(skillId: string): number {
		if (!currentAgentSkills) return 0;
		const skill = currentAgentSkills.skills[skillId];
		if (!skill) return 0;
		return skill.currentRank;
	}

    function getAgentColor(agentId: string): string {
        if (agentId.includes("alpha")) return "#4CAF50";
        if (agentId.includes("beta")) return "#FF9800";
        if (agentId.includes("gamma")) return "#9C27B0";
        return "#2196F3";
    }

    function getAgentName(agentId: string): string {
        if (agentId.includes("alpha")) return "Alpha";
        if (agentId.includes("beta")) return "Beta";
        if (agentId.includes("gamma")) return "Gamma";
        return "Agent";
    }

    function getCategoryColor(categoryId: string): string {
        const category = categories.find((c) => c.id === categoryId);
        return category ? category.color : "#4CAF50";
    }

    function grantTestXP() {
        if ($selectedAgent) {
            skillTreeManager.grantExperience($selectedAgent, 150);
        }
    }

    // Debug function to test persistence
    function debugSettings() {
        if ($selectedAgent) {
            console.log('Current Settings for Agent:', $selectedAgent);
            console.log('Enabled Skills:', settingsManager.getEnabledSkills($selectedAgent));
            console.log('Owned Skills:', settingsManager.getOwnedSkills($selectedAgent));
            console.log('All Settings:', settingsManager.export());
        }
    }


    onMount(() => {
        // Initialize skill trees for all agents
        availableAgents.forEach((agent) => {
            skillTreeManager.initializeAgent(agent.id);
        });
    });
</script>

<!-- Skills Panel -->
<div class="skills-panel">
			{#if $selectedAgent && currentAgentSkills}
			<div class="agent-info">
				<span class="agent-name">{getAgentName($selectedAgent)}</span>
				<span class="agent-xp">XP: {currentAgentSkills.experience}</span>
				<span class="agent-points dev-mode">Points: ∞ (Developer Mode)</span>
				<button class="debug-btn" on:click={debugSettings}>🔧 Debug</button>
			</div>
			
			<!-- Apply to All Toggle -->
			<div class="apply-toggle-container" class:active={applyToAllAgents}>
				<label class="apply-toggle">
					<input 
						type="checkbox" 
						bind:checked={applyToAllAgents}
					>
					<span class="toggle-slider"></span>
					<span class="toggle-label">
						{applyToAllAgents ? "🌐 Apply to All Agents" : "👤 Apply to Current Agent Only"}
					</span>
				</label>
			</div>
		{/if}

    {#if $selectedAgent && currentAgentSkills}
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

        <!-- Skills Grid -->
        <div class="skills-grid">
            			{#each currentAgentSkillStates as skillData (skillData.skill.id)}
				{@const skill = skillData.skill}
				{@const skillState = skillData.state}
				{@const skillRank = skillData.rank}
				{@const owned = skillData.owned}
				{@const enabled = skillData.enabled}
				<div
					class="skill-card"
					class:locked={skillState === "locked"}
					class:available={skillState === "available"}
					class:unlocked={skillState === "unlocked"}
					class:maxed={skillState === "maxed"}
					class:owned={owned}
					class:enabled={enabled}
					data-skill={skill.id}
				>
					{#if owned}
						<div class="owned-badge">OWN</div>
					{/if}
					<div class="skill-header">
						<div class="skill-header-left">
							<span class="skill-icon">{skill.icon}</span>
							<span class="skill-name">{skill.name}</span>
						</div>
						<div class="skill-controls">
							{#if skillRank > 0}
								<span class="skill-rank">Rank {skillRank}</span>
							{/if}
							{#if owned}
								<label 
									class="ios-toggle"
									title={enabled ? "Disable skill" : "Enable skill"}
								>
									<input 
										type="checkbox" 
										checked={enabled}
										on:change|stopPropagation={() => toggleSkill(skill.id)}
									>
									<span class="toggle-slider"></span>
								</label>
							{/if}
						</div>
					</div>
					<div class="skill-description">{skill.description}</div>
					<div class="skill-status">
						{#if !owned}
							<span class="status-locked">🔒 Not Owned</span>
						{:else if enabled}
							<span class="status-enabled">✅ Enabled</span>
						{:else}
							<span class="status-disabled">⏸️ Disabled</span>
						{/if}
					</div>
					<div class="skill-cost">
						{#if owned}
							<span class="cost-owned">OWNED</span>
						{:else}
							<button 
								class="buy-btn"
								on:click|stopPropagation={() => unlockSkill(skill.id)}
							>
								Buy for {skill.cost} points
							</button>
						{/if}
					</div>
				</div>
			{/each}
        </div>


    {:else}
        <div class="no-agent-selected">
            <div class="no-agent-icon">🎯</div>
            <div class="no-agent-text">
                Click on an agent in the simulation to view their skills
            </div>
        </div>
    {/if}
</div>

<style lang="css">
    .skills-panel {
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(0, 255, 136, 0.3);
        border-radius: 8px;
        padding: 16px;
        height: 100%;
        overflow-y: auto;
    }

    	.agent-info {
		display: flex;
		gap: 12px;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 16px;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 6px;
		border: 1px solid rgba(0, 255, 136, 0.2);
	}

    .agent-name {
        color: #00ff88;
        font-weight: bold;
    }

    .agent-xp {
        color: #FFD700;
    }

    	.agent-points {
		color: #2196F3;
	}

	.dev-mode {
		color: #FFD700 !important;
		font-weight: bold;
	}

	.debug-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.7);
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.debug-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.9);
	}

	.apply-toggle-container {
		margin: 12px 0;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.2s ease;
	}

	.apply-toggle-container.active {
		background: rgba(255, 152, 0, 0.1);
		border-color: rgba(255, 152, 0, 0.3);
	}

	.apply-toggle {
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.apply-toggle input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.apply-toggle .toggle-slider {
		position: relative;
		display: inline-block;
		width: 36px;
		height: 20px;
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.apply-toggle .toggle-slider:before {
		position: absolute;
		content: "";
		height: 14px;
		width: 14px;
		left: 2px;
		bottom: 2px;
		background-color: white;
		transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border-radius: 50%;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.apply-toggle input:checked + .toggle-slider {
		background-color: #FF9800;
		border-color: #FF9800;
	}

	.apply-toggle input:checked + .toggle-slider:before {
		transform: translateX(16px);
	}

	.apply-toggle:hover .toggle-slider {
		background-color: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.apply-toggle input:checked + .toggle-slider:hover {
		background-color: #FFB74D;
	}

	.toggle-label {
		font-weight: 500;
		transition: color 0.2s ease;
	}

	.apply-toggle:hover .toggle-label {
		color: rgba(255, 255, 255, 0.9);
	}

    .category-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 16px;
        flex-wrap: wrap;
    }

    .category-tab {
        background: transparent;
        border: 1px solid rgba(0, 255, 136, 0.3);
        color: rgba(255, 255, 255, 0.7);
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .category-tab:hover {
        background: rgba(0, 255, 136, 0.1);
        color: rgba(255, 255, 255, 0.9);
    }

    .category-tab.active {
        background: rgba(0, 255, 136, 0.2);
        color: var(--category-color);
        border-color: var(--category-color);
    }

    .category-icon {
        font-size: 0.9rem;
    }

    .category-name {
        font-weight: 500;
    }

    .skills-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
    }

    .skill-card {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 255, 136, 0.2);
        border-radius: 6px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
    }

    .skill-card:hover {
        border-color: rgba(0, 255, 136, 0.5);
        transform: translateY(-2px);
    }

    .skill-card.locked {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .skill-card.available {
        border-color: #FF9800;
        background: rgba(255, 152, 0, 0.1);
    }

    .skill-card.unlocked {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.1);
    }

    	.skill-card.maxed {
		border-color: #9C27B0;
		background: rgba(156, 39, 176, 0.1);
	}

	.skill-card.owned {
		border-color: #4CAF50;
		background: rgba(76, 175, 80, 0.1);
		position: relative;
	}

	.owned-badge {
		position: absolute;
		top: -8px;
		right: -8px;
		background: #4CAF50;
		color: white;
		font-size: 0.7rem;
		font-weight: bold;
		padding: 4px 8px;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		z-index: 10;
	}

    	.skill-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
		justify-content: space-between;
	}

	.skill-header-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.skill-controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}

    .skill-icon {
        font-size: 1.2rem;
    }

    	.skill-name {
		font-weight: bold;
		color: #ffffff;
		font-size: 0.9rem;
	}

	.skill-rank {
		font-size: 0.7rem;
		color: #FFD700;
		font-weight: bold;
		margin-left: auto;
	}

	.skill-description {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 8px;
		line-height: 1.3;
	}

	.skill-status {
		margin-bottom: 8px;
	}

	.status-locked {
		color: #666666;
		font-size: 0.7rem;
		font-weight: 500;
	}

	.status-available {
		color: #FF9800;
		font-size: 0.7rem;
		font-weight: 500;
	}

	.status-unlocked {
		color: #4CAF50;
		font-size: 0.7rem;
		font-weight: 500;
	}

	.status-maxed {
		color: #9C27B0;
		font-size: 0.7rem;
		font-weight: 500;
	}

	.status-enabled {
		color: #4CAF50;
		font-size: 0.7rem;
		font-weight: 500;
	}

	.status-disabled {
		color: #FF9800;
		font-size: 0.7rem;
		font-weight: 500;
	}

    	.skill-cost {
		font-size: 0.7rem;
		color: #2196F3;
		font-weight: bold;
	}

	.cost-owned {
		color: #4CAF50;
		font-weight: bold;
	}

	.ios-toggle {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
		cursor: pointer;
	}

	.ios-toggle input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(255, 255, 255, 0.2);
		transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 2px;
		bottom: 2px;
		background-color: white;
		transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border-radius: 50%;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	input:checked + .toggle-slider {
		background-color: #4CAF50;
		border-color: #4CAF50;
	}

	input:checked + .toggle-slider:before {
		transform: translateX(20px);
	}

	.ios-toggle:hover .toggle-slider {
		background-color: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
	}

	input:checked + .toggle-slider:hover {
		background-color: #5CBF60;
	}

	.buy-btn {
		background: #FF9800;
		border: none;
		color: white;
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.buy-btn:hover {
		background: #F57C00;
		transform: translateY(-1px);
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

    .skill-unlocked-animation {
        animation: skillUnlocked 1s ease;
    }

    @keyframes skillUnlocked {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
            box-shadow: 0 0 20px rgba(76, 175, 80, 0.8);
        }
        100% {
            transform: scale(1);
        }
    }
</style>
