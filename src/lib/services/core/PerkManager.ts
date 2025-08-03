import { writable } from "svelte/store";
import type { Character } from "../../types/Character";
import { abilityManager } from "./AbilityManager";

// RPG-Style Skill Trees for AI Agents
export interface SkillNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxRank: number;
  currentRank: number;
  unlocked: boolean;
  prerequisites: string[];
  cost: number; // XP cost to unlock
  category: SkillCategory;
  effects: SkillEffect[];
}

export interface SkillEffect {
  type: "ability" | "stat_boost" | "unlock_feature";
  value: string | number;
  description: string;
}

export type SkillCategory =
  | "system_access"
  | "web_operations"
  | "communication"
  | "analysis"
  | "automation"
  | "security";

export interface AgentSkillTree {
  agentId: string;
  experience: number;
  availablePoints: number;
  skills: Record<string, SkillNode>;
  unlockedAbilities: string[];
}

export interface SkillTreeDefinition {
  category: SkillCategory;
  name: string;
  icon: string;
  description: string;
  skills: SkillNode[];
}

class SkillTreeManager {
  // Reactive stores
  public readonly agentSkills = writable<Record<string, AgentSkillTree>>({});
  public readonly globalStats = writable({
    totalExperience: 0,
    totalSkillsUnlocked: 0,
    totalAbilitiesUnlocked: 0,
  });

  private skillDefinitions!: Record<SkillCategory, SkillTreeDefinition>;

  constructor() {
    this.initializeSkillTrees();
    this.loadSavedData();
    
    // Sync existing abilities with the ability manager
    setTimeout(() => {
      this.syncAbilitiesWithManager();
      console.log('🔄 Synced skill abilities with ability manager');
    }, 100);
  }

  private initializeSkillTrees() {
    this.skillDefinitions = {
      system_access: {
        category: "system_access",
        name: "System Access",
        icon: "💻",
        description: "File operations and system control",
        skills: [
          {
            id: "file_read",
            name: "File Reader",
            description: "Ability to read files from the system",
            icon: "📖",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: [],
            cost: 100,
            category: "system_access",
            effects: [
              {
                type: "ability",
                value: "read_files",
                description: "Can read text files",
              },
              {
                type: "stat_boost",
                value: 25,
                description: "+25% file operation speed",
              },
            ],
          },
          {
            id: "file_write",
            name: "File Writer",
            description: "Ability to create and modify files",
            icon: "✏️",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["file_read"],
            cost: 200,
            category: "system_access",
            effects: [
              {
                type: "ability",
                value: "write_files",
                description: "Can create and edit files",
              },
              {
                type: "unlock_feature",
                value: "file_manager",
                description: "Unlocks file management UI",
              },
            ],
          },
          {
            id: "directory_ops",
            name: "Directory Master",
            description: "Advanced directory and folder operations",
            icon: "📁",
            maxRank: 2,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["file_write"],
            cost: 300,
            category: "system_access",
            effects: [
              {
                type: "ability",
                value: "directory_operations",
                description: "Can create/delete directories",
              },
              {
                type: "ability",
                value: "batch_operations",
                description: "Can perform batch file operations",
              },
            ],
          },
          {
            id: "system_commands",
            name: "System Commander",
            description: "Execute system commands and scripts",
            icon: "⚡",
            maxRank: 2,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["directory_ops"],
            cost: 500,
            category: "system_access",
            effects: [
              {
                type: "ability",
                value: "execute_commands",
                description: "Can run system commands",
              },
              {
                type: "unlock_feature",
                value: "terminal_access",
                description: "Unlocks terminal interface",
              },
            ],
          },
        ],
      },

      web_operations: {
        category: "web_operations",
        name: "Web Operations",
        icon: "🌐",
        description: "Internet and API interactions",
        skills: [
          {
            id: "web_search",
            name: "Web Searcher",
            description: "Search the internet for information",
            icon: "🔍",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: [],
            cost: 150,
            category: "web_operations",
            effects: [
              {
                type: "ability",
                value: "web_search",
                description: "Can search the web",
              },
              {
                type: "stat_boost",
                value: 30,
                description: "+30% search accuracy",
              },
            ],
          },
          {
            id: "api_calls",
            name: "API Master",
            description: "Make API calls and handle responses",
            icon: "🔌",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["web_search"],
            cost: 250,
            category: "web_operations",
            effects: [
              {
                type: "ability",
                value: "api_integration",
                description: "Can make REST API calls",
              },
              {
                type: "unlock_feature",
                value: "api_manager",
                description: "Unlocks API management interface",
              },
            ],
          },
          {
            id: "web_scraping",
            name: "Data Harvester",
            description: "Extract data from websites",
            icon: "🕷️",
            maxRank: 2,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["api_calls"],
            cost: 400,
            category: "web_operations",
            effects: [
              {
                type: "ability",
                value: "web_scraping",
                description: "Can scrape website data",
              },
              {
                type: "ability",
                value: "data_extraction",
                description: "Advanced data extraction techniques",
              },
            ],
          },
          {
            id: "real_time_data",
            name: "Data Streamer",
            description: "Access real-time data feeds",
            icon: "📡",
            maxRank: 2,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["web_scraping"],
            cost: 600,
            category: "web_operations",
            effects: [
              {
                type: "ability",
                value: "real_time_feeds",
                description: "Can access live data streams",
              },
              {
                type: "unlock_feature",
                value: "dashboard_widgets",
                description: "Unlocks real-time dashboards",
              },
            ],
          },
        ],
      },

      communication: {
        category: "communication",
        name: "Communication",
        icon: "💬",
        description: "Enhanced agent interaction abilities",
        skills: [
          {
            id: "multi_agent_chat",
            name: "Group Communicator",
            description: "Participate in multi-agent conversations",
            icon: "👥",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: [],
            cost: 100,
            category: "communication",
            effects: [
              {
                type: "ability",
                value: "group_chat",
                description: "Can join group conversations",
              },
              {
                type: "stat_boost",
                value: 20,
                description: "+20% communication effectiveness",
              },
            ],
          },
          {
            id: "context_memory",
            name: "Memory Keeper",
            description: "Remember conversation context longer",
            icon: "🧠",
            maxRank: 5,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["multi_agent_chat"],
            cost: 200,
            category: "communication",
            effects: [
              {
                type: "stat_boost",
                value: 50,
                description: "+50% context retention",
              },
              {
                type: "ability",
                value: "long_term_memory",
                description: "Extended conversation memory",
              },
            ],
          },
          {
            id: "emotion_detection",
            name: "Emotion Reader",
            description: "Detect emotional context in messages",
            icon: "😊",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["context_memory"],
            cost: 350,
            category: "communication",
            effects: [
              {
                type: "ability",
                value: "emotion_analysis",
                description: "Can detect emotional states",
              },
              {
                type: "unlock_feature",
                value: "mood_indicators",
                description: "Shows agent mood in UI",
              },
            ],
          },
          {
            id: "persuasion",
            name: "Persuasion Master",
            description: "Influence other agents effectively",
            icon: "🎭",
            maxRank: 2,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["emotion_detection"],
            cost: 500,
            category: "communication",
            effects: [
              {
                type: "ability",
                value: "influence_agents",
                description: "Can influence agent decisions",
              },
              {
                type: "stat_boost",
                value: 75,
                description: "+75% persuasion effectiveness",
              },
            ],
          },
        ],
      },

      analysis: {
        category: "analysis",
        name: "Data Analysis",
        icon: "📊",
        description: "Advanced data processing and pattern recognition",
        skills: [
          {
            id: "pattern_recognition",
            name: "Pattern Hunter",
            description: "Identify patterns in data",
            icon: "🔍",
            maxRank: 4,
            currentRank: 0,
            unlocked: false,
            prerequisites: [],
            cost: 150,
            category: "analysis",
            effects: [
              {
                type: "ability",
                value: "pattern_analysis",
                description: "Can detect data patterns",
              },
              {
                type: "stat_boost",
                value: 30,
                description: "+30% analysis speed",
              },
            ],
          },
          {
            id: "data_mining",
            name: "Data Miner",
            description: "Extract insights from large datasets",
            icon: "⛏️",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["pattern_recognition"],
            cost: 300,
            category: "analysis",
            effects: [
              {
                type: "ability",
                value: "data_mining",
                description: "Can process large datasets",
              },
              {
                type: "unlock_feature",
                value: "data_visualizer",
                description: "Unlocks data visualization tools",
              },
            ],
          },
          {
            id: "predictive_modeling",
            name: "Oracle",
            description: "Predict future trends and outcomes",
            icon: "🔮",
            maxRank: 2,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["data_mining"],
            cost: 500,
            category: "analysis",
            effects: [
              {
                type: "ability",
                value: "prediction",
                description: "Can make predictive models",
              },
              {
                type: "ability",
                value: "trend_analysis",
                description: "Advanced trend detection",
              },
            ],
          },
        ],
      },

      automation: {
        category: "automation",
        name: "Automation",
        icon: "🤖",
        description: "Task automation and workflow management",
        skills: [
          {
            id: "task_chaining",
            name: "Task Chainer",
            description: "Chain multiple tasks together",
            icon: "⛓️",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: [],
            cost: 200,
            category: "automation",
            effects: [
              {
                type: "ability",
                value: "task_sequences",
                description: "Can create task chains",
              },
              {
                type: "stat_boost",
                value: 40,
                description: "+40% task efficiency",
              },
            ],
          },
          {
            id: "scheduling",
            name: "Time Master",
            description: "Schedule and manage timed tasks",
            icon: "⏰",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["task_chaining"],
            cost: 300,
            category: "automation",
            effects: [
              {
                type: "ability",
                value: "task_scheduling",
                description: "Can schedule tasks",
              },
              {
                type: "unlock_feature",
                value: "calendar_interface",
                description: "Unlocks task calendar",
              },
            ],
          },
          {
            id: "workflow_optimization",
            name: "Efficiency Expert",
            description: "Optimize workflows automatically",
            icon: "⚙️",
            maxRank: 2,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["scheduling"],
            cost: 450,
            category: "automation",
            effects: [
              {
                type: "ability",
                value: "workflow_optimization",
                description: "Can optimize task workflows",
              },
              {
                type: "stat_boost",
                value: 60,
                description: "+60% overall efficiency",
              },
            ],
          },
        ],
      },

      security: {
        category: "security",
        name: "Security",
        icon: "🔒",
        description: "Security and access control systems",
        skills: [
          {
            id: "access_control",
            name: "Gatekeeper",
            description: "Manage access permissions",
            icon: "🚪",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: [],
            cost: 250,
            category: "security",
            effects: [
              {
                type: "ability",
                value: "permission_management",
                description: "Can manage access controls",
              },
              {
                type: "unlock_feature",
                value: "security_dashboard",
                description: "Unlocks security monitoring",
              },
            ],
          },
          {
            id: "encryption",
            name: "Cipher Master",
            description: "Encrypt and decrypt data",
            icon: "🔐",
            maxRank: 3,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["access_control"],
            cost: 400,
            category: "security",
            effects: [
              {
                type: "ability",
                value: "data_encryption",
                description: "Can encrypt sensitive data",
              },
              {
                type: "ability",
                value: "secure_communication",
                description: "Encrypted agent communication",
              },
            ],
          },
          {
            id: "threat_detection",
            name: "Sentinel",
            description: "Detect and respond to threats",
            icon: "🛡️",
            maxRank: 2,
            currentRank: 0,
            unlocked: false,
            prerequisites: ["encryption"],
            cost: 600,
            category: "security",
            effects: [
              {
                type: "ability",
                value: "threat_monitoring",
                description: "Can detect security threats",
              },
              {
                type: "ability",
                value: "automated_response",
                description: "Automatic threat response",
              },
            ],
          },
        ],
      },
    };
  }

  // Initialize an agent's skill tree
  public initializeAgent(agentId: string): void {
    this.agentSkills.update((skills) => {
      if (!skills[agentId]) {
        const agentSkills: AgentSkillTree = {
          agentId,
          experience: 0,
          availablePoints: 5, // Starting points
          skills: {},
          unlockedAbilities: [],
        };

        // Initialize all skills as locked
        Object.values(this.skillDefinitions).forEach((category) => {
          category.skills.forEach((skill) => {
            agentSkills.skills[skill.id] = {
              ...skill,
              currentRank: 0,
              unlocked: skill.prerequisites.length === 0 ? true : false, // Auto-unlock skills with no prerequisites
            };
          });
        });

        skills[agentId] = agentSkills;
      }
      return skills;
    });
  }

  // Award experience to an agent
  public grantExperience(
    agentId: string,
    amount: number,
    reason?: string,
  ): void {
    this.agentSkills.update((skills) => {
      if (skills[agentId]) {
        skills[agentId].experience += amount;
        skills[agentId].availablePoints += Math.floor(amount / 100); // 1 point per 100 XP

        console.log(
          `🌟 Agent ${agentId} gained ${amount} XP${reason ? ` for ${reason}` : ""}`,
        );

        this.updateGlobalStats();
      }
      return skills;
    });
  }

  // Unlock a skill for an agent
  public unlockSkill(agentId: string, skillId: string): boolean {
    let success = false;

    this.agentSkills.update((skills) => {
      const agentTree = skills[agentId];
      if (!agentTree) return skills;

      const skill = agentTree.skills[skillId];
      if (!skill) return skills;

      // Check if already at max rank
      if (skill.currentRank >= skill.maxRank) {
        console.warn(`Skill ${skillId} is already at max rank`);
        return skills;
      }

      // Developer mode: bypass point cost check
      // if (agentTree.availablePoints < skill.cost) {
      //   console.warn(`Not enough points to unlock ${skillId}`);
      //   return skills;
      // }

      // Check prerequisites
      const prerequisitesMet = skill.prerequisites.every((prereqId) => {
        const prereq = agentTree.skills[prereqId];
        return prereq && prereq.currentRank > 0;
      });

      if (!prerequisitesMet) {
        console.warn(`Prerequisites not met for ${skillId}`);
        return skills;
      }

      // Unlock the skill
      skill.currentRank++;
      skill.unlocked = true;
      // Developer mode: don't deduct points
      // agentTree.availablePoints -= skill.cost;

      // Add abilities to unlocked list and grant to AbilityManager
      skill.effects.forEach((effect) => {
        if (
          effect.type === "ability" &&
          !agentTree.unlockedAbilities.includes(effect.value as string)
        ) {
          agentTree.unlockedAbilities.push(effect.value as string);
          
          // Grant ability to the agent in AbilityManager
          abilityManager.grantAbility(agentId, effect.value as string);
        }
      });

      console.log(
        `✨ Agent ${agentId} unlocked ${skill.name} (Rank ${skill.currentRank})`,
      );
      success = true;

      this.updateGlobalStats();
      return skills;
    });

    return success;
  }

  // Check if an agent has a specific ability
  public hasAbility(agentId: string, ability: string): boolean {
    let hasIt = false;
    this.agentSkills.subscribe((skills) => {
      const agentTree = skills[agentId];
      hasIt = agentTree ? agentTree.unlockedAbilities.includes(ability) : false;
    })();
    return hasIt;
  }

  // Get skill tree for an agent
  public getAgentSkills(agentId: string): AgentSkillTree | null {
    let agentTree: AgentSkillTree | null = null;
    this.agentSkills.subscribe((skills) => {
      agentTree = skills[agentId] || null;
    })();
    return agentTree;
  }

  // Get all skill categories
  public getSkillCategories(): SkillTreeDefinition[] {
    return Object.values(this.skillDefinitions);
  }

  // Get skills by category
  public getSkillsByCategory(category: SkillCategory): SkillNode[] {
    return this.skillDefinitions[category]?.skills || [];
  }

  private updateGlobalStats(): void {
    this.agentSkills.subscribe((allSkills) => {
      let totalXP = 0;
      let totalSkills = 0;
      let totalAbilities = 0;

      Object.values(allSkills).forEach((agentTree) => {
        totalXP += agentTree.experience;
        totalSkills += Object.values(agentTree.skills).filter(
          (skill) => skill.currentRank > 0,
        ).length;
        totalAbilities += agentTree.unlockedAbilities.length;
      });

      this.globalStats.set({
        totalExperience: totalXP,
        totalSkillsUnlocked: totalSkills,
        totalAbilitiesUnlocked: totalAbilities,
      });
    })();
  }

  private loadSavedData(): void {
    try {
      const saved = localStorage.getItem("nocturne_skill_trees");
      if (saved) {
        const data = JSON.parse(saved);
        this.agentSkills.set(data.agentSkills || {});
        this.updateGlobalStats();
      }
    } catch (error) {
      console.warn("Failed to load skill tree data:", error);
    }
  }

  public saveData(): void {
    try {
      this.agentSkills.subscribe((skills) => {
        const data = { agentSkills: skills };
        localStorage.setItem("nocturne_skill_trees", JSON.stringify(data));
      })();
    } catch (error) {
      console.warn("Failed to save skill tree data:", error);
    }
  }

  // Auto-save every 30 seconds
  public startAutoSave(): void {
    setInterval(() => this.saveData(), 30000);
  }

  // Reset an agent's skills
  public resetAgent(agentId: string): void {
    this.agentSkills.update((skills) => {
      if (skills[agentId]) {
        delete skills[agentId];
        this.initializeAgent(agentId);
      }
      return skills;
    });
  }

  // Sync all unlocked abilities with the ability manager
  public syncAbilitiesWithManager(): void {
    this.agentSkills.subscribe((skills) => {
      Object.entries(skills).forEach(([agentId, agentTree]) => {
        agentTree.unlockedAbilities.forEach((abilityId) => {
          abilityManager.grantAbility(agentId, abilityId);
        });
      });
    })();
  }
}

// Export singleton instance
export const skillTreeManager = new SkillTreeManager();
