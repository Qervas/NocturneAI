<script lang="ts">
  import { selectedAgents, focusedAgent } from '../../services/agents/AgentSelectionManager';
import { perkContextManager } from '../../services/context/PerkContextManager';
  import SkillTester from '../modals/SkillTester.svelte';

  export let agent: any; // Agent passed from parent component

  // Use the passed agent instead of getting from stores to avoid duplication
  $: currentAgent = agent;
  
  // Active skill category tab
  let activeSkillCategory = 'core';
  
  // Skill tester state
  let showSkillTester = false;
  let currentTestSkill = 'file-reader';
  


  // Skill categories with their perks (no levels)
  const skillCategories = {
    core: {
      name: 'Core Skills',
      icon: '⚡',
      color: '#00ff88',
      skills: [
        {
          id: 'file-reader',
          name: 'File Reader',
          icon: '📖',
          description: 'Ability to read files from the system',
          requires: ['filesystem_access', 'read_permissions'],
          isEnabled: true,
          isOwned: true
        },
        {
          id: 'file-writer', 
          name: 'File Writer',
          icon: '✏️',
          description: 'Ability to create and modify files',
          requires: ['filesystem_access', 'write_permissions'],
          isEnabled: true,
          isOwned: true
        },
        {
          id: 'directory-master',
          name: 'Directory Master', 
          icon: '📁',
          description: 'Advanced directory and folder operations',
          requires: ['filesystem_access', 'directory_permissions'],
          isEnabled: true,
          isOwned: true
        },
        {
          id: 'system-commander',
          name: 'System Commander',
          icon: '⚡',
          description: 'Execute system commands and scripts',
          requires: ['system_access', 'command_permissions'],
          isEnabled: true,
          isOwned: true
        }
      ]
    },
    communication: {
      name: 'Communication',
      icon: '💬',
      color: '#00bfff',
      skills: [
        {
          id: 'message-handler',
          name: 'Message Handler',
          icon: '📨',
          description: 'Process and respond to messages efficiently',
          requires: ['communication_access'],
          isEnabled: true,
          isOwned: true,
          level: 2,
          maxLevel: 3
        },
        {
          id: 'collaboration',
          name: 'Team Collaboration',
          icon: '🤝',
          description: 'Work effectively with other agents',
          requires: ['team_access'],
          isEnabled: false,
          isOwned: true,
          level: 1,
          maxLevel: 4
        },
        {
          id: 'negotiation',
          name: 'Negotiation',
          icon: '🎯',
          description: 'Resolve conflicts and find compromises',
          requires: ['advanced_reasoning'],
          isEnabled: false,
          isOwned: false,
          level: 0,
          maxLevel: 3
        }
      ]
    },
    analysis: {
      name: 'Analysis',
      icon: '🔍',
      color: '#ff6b6b',
      skills: [
        {
          id: 'data-analyzer',
          name: 'Data Analyzer',
          icon: '📊',
          description: 'Analyze and interpret complex data sets',
          requires: ['data_access', 'processing_power'],
          isEnabled: true,
          isOwned: true,
          level: 3,
          maxLevel: 5
        },
        {
          id: 'pattern-recognition',
          name: 'Pattern Recognition',
          icon: '🧩',
          description: 'Identify patterns and trends in information',
          requires: ['ml_capabilities'],
          isEnabled: true,
          isOwned: true,
          level: 2,
          maxLevel: 4
        },
        {
          id: 'predictive-modeling',
          name: 'Predictive Modeling',
          icon: '🔮',
          description: 'Create models to predict future outcomes',
          requires: ['advanced_analytics', 'ml_capabilities'],
          isEnabled: false,
          isOwned: false,
          level: 0,
          maxLevel: 5
        }
      ]
    },
    security: {
      name: 'Security',
      icon: '🛡️',
      color: '#ffa500',
      skills: [
        {
          id: 'access-control',
          name: 'Access Control',
          icon: '🔐',
          description: 'Manage permissions and access rights',
          requires: ['security_clearance'],
          isEnabled: true,
          isOwned: true,
          level: 2,
          maxLevel: 4
        },
        {
          id: 'threat-detection',
          name: 'Threat Detection',
          icon: '🚨',
          description: 'Identify and respond to security threats',
          requires: ['security_clearance', 'monitoring_access'],
          isEnabled: false,
          isOwned: true,
          level: 1,
          maxLevel: 5
        },
        {
          id: 'encryption',
          name: 'Encryption',
          icon: '🔒',
          description: 'Encrypt and decrypt sensitive information',
          requires: ['crypto_access'],
          isEnabled: false,
          isOwned: false,
          level: 0,
          maxLevel: 3
        }
      ]
    }
  };

  // Mock context flags
  const contextFlags: Record<string, boolean> = {
    'filesystem_access': true,
    'read_permissions': true,
    'write_permissions': true,
    'directory_permissions': true,
    'system_access': true,
    'command_permissions': true,
    'communication_access': true,
    'team_access': true,
    'advanced_reasoning': false,
    'data_access': true,
    'processing_power': true,
    'ml_capabilities': true,
    'advanced_analytics': false,
    'security_clearance': true,
    'monitoring_access': false,
    'crypto_access': false
  };

  function toggleSkill(categoryId: string, skillId: string) {
    const category = skillCategories[categoryId as keyof typeof skillCategories];
    const skill = category?.skills.find(s => s.id === skillId);
    if (skill && skill.isOwned) {
      skill.isEnabled = !skill.isEnabled;
    }
  }

  function getSkillStatus(skill: any): { icon: string, text: string, class: string } {
    if (!skill.isOwned) return { icon: '🔒', text: 'Locked', class: 'status-locked' };
    if (!skill.isEnabled) return { icon: '❌', text: 'Disabled', class: 'status-disabled' };
    
    const allRequirementsMet = skill.requires.every((req: string) => contextFlags[req]);
    if (!allRequirementsMet) return { icon: '⚠️', text: 'Requirements Not Met', class: 'status-warning' };
    
    return { icon: '✅', text: 'Active', class: 'status-active' };
  }

  function formatRequirement(req: string): string {
    return req.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function getSkillLevelColor(level: number, maxLevel: number): string {
    const percentage = level / maxLevel;
    if (percentage >= 0.8) return '#00ff88';
    if (percentage >= 0.6) return '#00bfff';
    if (percentage >= 0.4) return '#ffa500';
    if (percentage >= 0.2) return '#ff6b6b';
    return '#666';
  }
</script>

<div class="modern-perk-panel">
  {#if currentAgent}
    <!-- Skill Category Tabs -->
    <div class="skill-category-tabs">
      {#each Object.entries(skillCategories) as [categoryId, category]}
        <button
          class="category-tab"
          class:active={activeSkillCategory === categoryId}
          style="--category-color: {category.color}"
          on:click={() => activeSkillCategory = categoryId}
        >
          <span class="category-icon">{category.icon}</span>
          <span class="category-name">{category.name}</span>
          <span class="skill-count">{category.skills.filter(s => s.isEnabled).length}/{category.skills.length}</span>
        </button>
      {/each}
    </div>

    <!-- Skills Content -->
    <div class="skills-container">
      {#if skillCategories[activeSkillCategory as keyof typeof skillCategories]}
        {@const activeCategory = skillCategories[activeSkillCategory as keyof typeof skillCategories]}
        <div class="category-header">
          <div class="category-info">
            <span class="category-icon-large" style="color: {activeCategory.color}">{activeCategory.icon}</span>
            <div class="category-details">
              <h3 class="category-title">{activeCategory.name}</h3>
              <p class="category-description">
                {#if activeSkillCategory === 'core'}
                  Essential skills for basic agent operations and file management.
                {:else if activeSkillCategory === 'communication'}
                  Skills for interacting with other agents and handling messages.
                {:else if activeSkillCategory === 'analysis'}
                  Advanced analytical capabilities for data processing and insights.
                {:else if activeSkillCategory === 'security'}
                  Security-focused skills for protection and access control.
                {/if}
              </p>
            </div>
          </div>
          <div class="category-stats">
            <div class="stat">
              <span class="stat-value">{activeCategory.skills.filter(s => s.isEnabled).length}</span>
              <span class="stat-label">Active</span>
            </div>
            <div class="stat">
              <span class="stat-value">{activeCategory.skills.filter(s => s.isOwned).length}</span>
              <span class="stat-label">Owned</span>
            </div>
          </div>
        </div>

        <!-- Skills Grid -->
        <div class="skills-grid">
          {#each activeCategory.skills as skill (skill.id)}
            {@const status = getSkillStatus(skill)}
            <div class="skill-card {status.class}">
              <!-- Skill Header -->
              <div class="skill-header">
                <div class="skill-icon-section">
                  <span class="skill-icon">{skill.icon}</span>
                </div>
                <div class="skill-info">
                  <div class="skill-name">{skill.name}</div>
                  <div class="skill-status">
                    <span class="status-icon">{status.icon}</span>
                    <span class="status-text">{status.text}</span>
                  </div>
                </div>

              </div>

              <!-- Skill Description -->
              <div class="skill-description">
                {skill.description}
              </div>

              <!-- Requirements -->
              <div class="skill-requirements">
                <span class="requirements-label">Requirements:</span>
                <div class="requirements-list">
                  {#each skill.requires as requirement}
                    <span class="requirement-item" class:met={contextFlags[requirement]}>
                      {formatRequirement(requirement)}
                    </span>
                  {/each}
                </div>
              </div>

              <!-- Skill Actions -->
              <div class="skill-actions">
                {#if skill.isOwned}
                  <button 
                    class="toggle-btn"
                    class:enabled={skill.isEnabled}
                    class:disabled={!skill.isEnabled}
                    on:click={() => toggleSkill(activeSkillCategory, skill.id)}
                  >
                    {skill.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  
                  <!-- Test Button -->
                  <button 
                    class="test-btn"
                    title="Test {skill.name}"
                    on:click={() => {
                      currentTestSkill = skill.id;
                      showSkillTester = true;
                    }}
                  >
                    🧪
                  </button>
                {:else}
                  <button class="unlock-btn" disabled>
                    🔓 Unlock
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="no-agent-message">
      <div class="message-icon">⚡</div>
      <div class="message-text">No agent data available</div>
    </div>
  {/if}
  
  <!-- Skill Tester -->
  <SkillTester 
    isOpen={showSkillTester}
    currentSkill={currentTestSkill}
    on:close={() => showSkillTester = false}
  />

</div>

<style>
  .modern-perk-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: rgba(0, 0, 0, 0.05);
  }

  /* Skill Category Tabs */
  .skill-category-tabs {
    display: flex;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    flex-shrink: 0;
  }

  .category-tab {
    flex: 1;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 10px 8px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s ease;
    border-bottom: 2px solid transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .category-tab:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.05);
  }

  .category-tab.active {
    color: var(--category-color);
    border-bottom-color: var(--category-color);
    background: rgba(255, 255, 255, 0.05);
  }

  .category-icon {
    font-size: 16px;
  }

  .category-name {
    font-weight: 500;
  }

  .skill-count {
    font-size: 10px;
    opacity: 0.8;
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 10px;
  }

  /* Skills Container */
  .skills-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  /* Category Header */
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .category-info {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .category-icon-large {
    font-size: 32px;
  }

  .category-details h3 {
    margin: 0 0 4px 0;
    color: rgba(255, 255, 255, 0.95);
    font-size: 18px;
  }

  .category-description {
    margin: 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    line-height: 1.4;
  }

  .category-stats {
    display: flex;
    gap: 16px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: bold;
    color: #00ff88;
  }

  .stat-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
  }

  /* Skills Grid */
  .skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }

  .skill-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .skill-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--status-color);
    transition: all 0.3s ease;
  }

  .skill-card.status-active {
    --status-color: #00ff88;
    border-color: rgba(0, 255, 136, 0.2);
  }

  .skill-card.status-disabled {
    --status-color: #666;
    opacity: 0.7;
  }

  .skill-card.status-locked {
    --status-color: #ff6b6b;
    opacity: 0.6;
  }

  .skill-card.status-warning {
    --status-color: #ffa500;
  }

  .skill-card:hover {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(0, 255, 136, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  /* Skill Header */
  .skill-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .skill-icon-section {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 255, 136, 0.1);
    border-radius: 10px;
    border: 1px solid rgba(0, 255, 136, 0.2);
    flex-shrink: 0;
  }

  .skill-icon {
    font-size: 20px;
  }

  .skill-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .skill-name {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
  }

  .skill-status {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .status-icon {
    font-size: 12px;
  }

  .status-text {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }

  .skill-level {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .level-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .level-text {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
  }

  .level-bar {
    width: 60px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .level-progress {
    height: 100%;
    transition: all 0.3s ease;
  }

  /* Skill Description */
  .skill-description {
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    line-height: 1.4;
    margin-bottom: 12px;
  }

  /* Requirements */
  .skill-requirements {
    margin-bottom: 16px;
  }

  .requirements-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
    display: block;
    margin-bottom: 6px;
  }

  .requirements-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .requirement-item {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.2s ease;
  }

  .requirement-item.met {
    background: rgba(0, 255, 136, 0.2);
    border-color: rgba(0, 255, 136, 0.4);
    color: #00ff88;
  }

  /* Skill Actions */
  .skill-actions {
    display: flex;
    gap: 8px;
  }

  .toggle-btn, .upgrade-btn, .unlock-btn {
    background: transparent;
    border: 1px solid;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 10px;
    font-weight: 600;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .toggle-btn.enabled {
    border-color: #ff6b6b;
    color: #ff6b6b;
  }

  .toggle-btn.enabled:hover {
    background: rgba(255, 107, 107, 0.1);
    transform: translateY(-1px);
  }

  .toggle-btn.disabled {
    border-color: #00ff88;
    color: #00ff88;
  }

  .toggle-btn.disabled:hover {
    background: rgba(0, 255, 136, 0.1);
    transform: translateY(-1px);
  }

  .upgrade-btn {
    border-color: #00bfff;
    color: #00bfff;
    opacity: 0.6;
    cursor: not-allowed;
  }

  .unlock-btn {
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.5);
    cursor: not-allowed;
  }

  .test-btn {
    padding: 6px 8px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
    border: 1px solid rgba(255, 193, 7, 0.3);
  }

  .test-btn:hover {
    background: rgba(255, 193, 7, 0.3);
    border-color: rgba(255, 193, 7, 0.5);
  }

  /* Skill Tester */
  .skill-tester {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tester-btn {
    width: 32px;
    height: 32px;
    background: rgba(0, 255, 136, 0.2);
    border: 1px solid rgba(0, 255, 136, 0.4);
    border-radius: 6px;
    color: #00ff88;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tester-btn:hover {
    background: rgba(0, 255, 136, 0.3);
    border-color: rgba(0, 255, 136, 0.6);
    transform: scale(1.1);
  }

  /* No Agent Message */
  .no-agent-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
  }

  .message-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .message-text {
    font-size: 14px;
    font-style: italic;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .skills-grid {
      grid-template-columns: 1fr;
    }

    .category-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }

    .category-info {
      justify-content: center;
      text-align: center;
    }

    .category-stats {
      justify-content: center;
    }

    .skill-header {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .skill-level {
      align-items: stretch;
    }

    .level-display {
      align-items: stretch;
    }

    .level-bar {
      width: 100%;
    }
  }
</style>