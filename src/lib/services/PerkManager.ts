import { writable, type Writable } from "svelte/store";
import type {
  Perk,
  Skill,
  AgentPerks,
  PerkCategory,
  PerkAction,
  WorldResources,
  PerkDefinitions,
} from "../types/Perks";
import {
  PERK_EXPERIENCE_REQUIREMENTS,
  SKILL_EXPERIENCE_REQUIREMENTS,
} from "../types/Perks";

export class PerkManager {
  // Stores for reactive UI
  public readonly agentPerks: Writable<Map<string, AgentPerks>> = writable(
    new Map(),
  );
  public readonly worldResources: Writable<WorldResources> = writable({
    totalAgents: 0,
    activeAgents: 0,
    completedTasks: 0,
    totalExperience: 0,
    successRate: 100,
    uptime: 0,
  });

  private perksData = new Map<string, AgentPerks>();
  private perkDefinitions: PerkDefinitions = {
    cognitive: {} as any,
    technical: {} as any,
    creative: {} as any,
    research: {} as any,
    social: {} as any,
    automation: {} as any,
  };

  constructor() {
    this.initializePerkDefinitions();
    this.loadPerksData();
    this.validateAndRepairPerks();
  }

  // ===== INITIALIZATION =====

  private initializePerkDefinitions() {
    this.perkDefinitions = {
      cognitive: {
        id: "cognitive",
        name: "Cognitive",
        description: "Mental processing and analytical thinking",
        icon: "🧠",
        color: "#4A90E2",
        skills: {
          research: {
            id: "research",
            name: "Research",
            description: "Gather and analyze information effectively",
            icon: "📚",
          },
          analysis: {
            id: "analysis",
            name: "Analysis",
            description: "Break down complex problems into components",
            icon: "📊",
          },
          problemSolving: {
            id: "problem_solving",
            name: "Problem Solving",
            description: "Find creative solutions to challenges",
            icon: "🧩",
          },
          memoryEnhancement: {
            id: "memory_enhancement",
            name: "Memory Enhancement",
            description: "Retain and recall information efficiently",
            icon: "🔄",
          },
        },
      },
      technical: {
        id: "technical",
        name: "Technical",
        description: "Programming and technical implementation",
        icon: "💻",
        color: "#50C878",
        skills: {
          webDevelopment: {
            id: "web_development",
            name: "Web Development",
            description: "Build web applications and interfaces",
            icon: "🌐",
          },
          apiIntegration: {
            id: "api_integration",
            name: "API Integration",
            description: "Connect and integrate external services",
            icon: "🔌",
          },
          databaseManagement: {
            id: "database_management",
            name: "Database Management",
            description: "Design and optimize data storage",
            icon: "🗄️",
          },
          devops: {
            id: "devops",
            name: "DevOps",
            description: "Deploy and maintain infrastructure",
            icon: "⚙️",
          },
        },
      },
      creative: {
        id: "creative",
        name: "Creative",
        description: "Innovation and artistic expression",
        icon: "🎨",
        color: "#FF6B9D",
        skills: {
          uiuxDesign: {
            id: "uiux_design",
            name: "UI/UX Design",
            description: "Create intuitive user experiences",
            icon: "🎨",
          },
          contentCreation: {
            id: "content_creation",
            name: "Content Creation",
            description: "Generate engaging written and visual content",
            icon: "✍️",
          },
          brainstorming: {
            id: "brainstorming",
            name: "Brainstorming",
            description: "Generate innovative ideas and concepts",
            icon: "💡",
          },
          storytelling: {
            id: "storytelling",
            name: "Storytelling",
            description: "Craft compelling narratives and presentations",
            icon: "📖",
          },
        },
      },
      research: {
        id: "research",
        name: "Research",
        description: "Information gathering and validation",
        icon: "🔍",
        color: "#FFD700",
        skills: {
          webSearch: {
            id: "web_search",
            name: "Web Search",
            description: "Find relevant information across the internet",
            icon: "🔍",
          },
          dataMining: {
            id: "data_mining",
            name: "Data Mining",
            description: "Extract insights from large datasets",
            icon: "⛏️",
          },
          factChecking: {
            id: "fact_checking",
            name: "Fact Checking",
            description: "Verify information accuracy and credibility",
            icon: "✅",
          },
          marketResearch: {
            id: "market_research",
            name: "Market Research",
            description: "Analyze market trends and opportunities",
            icon: "📈",
          },
        },
      },
      social: {
        id: "social",
        name: "Social",
        description: "Communication and interpersonal skills",
        icon: "🤝",
        color: "#9B59B6",
        skills: {
          negotiation: {
            id: "negotiation",
            name: "Negotiation",
            description: "Reach mutually beneficial agreements",
            icon: "🤝",
          },
          leadership: {
            id: "leadership",
            name: "Leadership",
            description: "Guide and inspire team members",
            icon: "👑",
          },
          teamCoordination: {
            id: "team_coordination",
            name: "Team Coordination",
            description: "Organize and synchronize team efforts",
            icon: "👥",
          },
          customerService: {
            id: "customer_service",
            name: "Customer Service",
            description: "Provide excellent user support and assistance",
            icon: "🎧",
          },
          temporaryConversation: {
            id: "temporary_conversation",
            name: "Temporary Conversation",
            description: "Send simple one-reply messages to other agents",
            icon: "💬",
          },

        },
      },
      automation: {
        id: "automation",
        name: "Automation",
        description: "Process optimization and efficiency",
        icon: "⚙️",
        color: "#F39C12",
        skills: {
          workflowDesign: {
            id: "workflow_design",
            name: "Workflow Design",
            description: "Create efficient process flows",
            icon: "🔄",
          },
          taskAutomation: {
            id: "task_automation",
            name: "Task Automation",
            description: "Automate repetitive tasks and processes",
            icon: "🤖",
          },
          qualityAssurance: {
            id: "quality_assurance",
            name: "Quality Assurance",
            description: "Ensure standards and catch errors",
            icon: "🛡️",
          },
          testing: {
            id: "testing",
            name: "Testing",
            description: "Validate functionality and performance",
            icon: "🧪",
          },
        },
      },
    };
  }

  // ===== AGENT PERK MANAGEMENT =====

  public initializeAgentPerks(
    agentId: string,
    specialization?: PerkCategory,
  ): void {
    if (this.perksData.has(agentId)) return;

    const agentPerks: AgentPerks = {
      agentId,
      perks: new Map(),
      totalExperience: 0,
      availablePoints: 5, // Starting points
      specialization,
    };

    // Initialize all perks
    Object.values(this.perkDefinitions).forEach((perkDef) => {
      const perk: Perk = {
        id: perkDef.id,
        name: perkDef.name,
        description: perkDef.description,
        category: perkDef.id as PerkCategory,
        icon: perkDef.icon,
        color: perkDef.color,
        level: 0,
        experience: 0,
        maxExperience: PERK_EXPERIENCE_REQUIREMENTS[1],
        unlocked: specialization === perkDef.id, // Unlock specialization perk
        skills: [],
        prerequisites: [],
      };

      // Initialize skills for this perk
      Object.values(perkDef.skills).forEach((skillDef: any) => {
        const skill: Skill = {
          id: skillDef.id,
          name: skillDef.name,
          description: skillDef.description,
          icon: skillDef.icon,
          level: 0,
          experience: 0,
          maxExperience: SKILL_EXPERIENCE_REQUIREMENTS[1],
          unlocked: false,
          prerequisites: [],
        };
        perk.skills.push(skill);
      });

      agentPerks.perks.set(perk.id, perk);
    });

    // If agent has specialization, unlock first skill
    if (specialization) {
      const specPerk = agentPerks.perks.get(specialization);
      if (specPerk && specPerk.skills.length > 0) {
        specPerk.skills[0].unlocked = true;
      }
    }

    // Enable temporary conversations for all agents by default
    const socialPerk = agentPerks.perks.get('social');
    if (socialPerk) {
      const tempConversationSkill = socialPerk.skills.find(s => s.id === 'temporary_conversation');
      if (tempConversationSkill) {
        tempConversationSkill.unlocked = true;
        tempConversationSkill.level = 1; // Give them level 1 to start
        console.log(`💬 Enabled temporary conversations for ${agentId}`);
      }
    }

    this.perksData.set(agentId, agentPerks);
    this.updateStore();

    console.log(
      `🎯 Initialized perks for ${agentId} with specialization: ${specialization}`,
    );
  }

  // ===== EXPERIENCE & LEVELING =====

  public grantExperience(
    agentId: string,
    perkCategory: PerkCategory,
    skillId: string,
    amount: number,
  ): boolean {
    const agentPerks = this.perksData.get(agentId);
    if (!agentPerks) return false;

    const perk = agentPerks.perks.get(perkCategory);
    if (!perk) return false;

    const skill = perk.skills.find((s) => s.id === skillId);
    if (!skill || !skill.unlocked) return false;

    // Grant experience to skill
    skill.experience += amount;
    const skillLeveledUp = this.checkSkillLevelUp(skill);

    // Grant partial experience to perk
    perk.experience += Math.floor(amount * 0.3);
    const perkLeveledUp = this.checkPerkLevelUp(perk);

    // Update total experience
    agentPerks.totalExperience += amount;

    // Check for unlock opportunities
    this.checkUnlockOpportunities(agentPerks);

    // Update store
    this.updateStore();

    if (skillLeveledUp || perkLeveledUp) {
      console.log(
        `🎉 ${agentId} leveled up! Skill: ${skill.name} (${skill.level}) | Perk: ${perk.name} (${perk.level})`,
      );
    }

    return true;
  }

  private checkSkillLevelUp(skill: Skill): boolean {
    if (skill.level >= 5) return false;

    const nextLevel = skill.level + 1;
    const requiredExp =
      SKILL_EXPERIENCE_REQUIREMENTS[
        nextLevel as keyof typeof SKILL_EXPERIENCE_REQUIREMENTS
      ];

    if (skill.experience >= requiredExp) {
      skill.level = nextLevel;
      skill.experience = skill.experience - requiredExp;
      skill.maxExperience =
        SKILL_EXPERIENCE_REQUIREMENTS[
          (nextLevel + 1) as keyof typeof SKILL_EXPERIENCE_REQUIREMENTS
        ] || requiredExp;
      return true;
    }
    return false;
  }

  private checkPerkLevelUp(perk: Perk): boolean {
    if (perk.level >= 3) return false;

    const nextLevel = perk.level + 1;
    const requiredExp =
      PERK_EXPERIENCE_REQUIREMENTS[
        nextLevel as keyof typeof PERK_EXPERIENCE_REQUIREMENTS
      ];

    if (perk.experience >= requiredExp) {
      perk.level = nextLevel;
      perk.experience = perk.experience - requiredExp;
      perk.maxExperience =
        PERK_EXPERIENCE_REQUIREMENTS[
          (nextLevel + 1) as keyof typeof PERK_EXPERIENCE_REQUIREMENTS
        ] || requiredExp;
      return true;
    }
    return false;
  }

  private checkUnlockOpportunities(agentPerks: AgentPerks): void {
    agentPerks.perks.forEach((perk) => {
      // Check if perk can be unlocked
      if (!perk.unlocked && agentPerks.availablePoints > 0) {
        // For now, simple unlock: any perk can be unlocked with points
        // Later can add prerequisites
      }

      // Check skills within unlocked perks
      if (perk.unlocked && perk.level > 0) {
        perk.skills.forEach((skill, index) => {
          if (!skill.unlocked) {
            // First skill always unlocked when perk is unlocked
            // Others unlock based on previous skill level or perk level
            if (
              index === 0 ||
              (index > 0 && perk.skills[index - 1].level >= 2)
            ) {
              skill.unlocked = true;
            }
          }
        });
      }
    });
  }

  // ===== PERK ACTIONS =====

  public canPerformAction(agentId: string, action: PerkAction): boolean {
    const agentPerks = this.perksData.get(agentId);
    if (!agentPerks) return false;

    // Find the skill across all perks
    for (const perk of agentPerks.perks.values()) {
      const skill = perk.skills.find((s) => s.id === action.skillId);
      if (skill && skill.unlocked && skill.level >= action.requiredLevel) {
        return true;
      }
    }
    return false;
  }

  public performAction(agentId: string, action: PerkAction): boolean {
    if (!this.canPerformAction(agentId, action)) return false;

    // Calculate success probability based on skill level
    const agentPerks = this.perksData.get(agentId)!;
    let skill: Skill | undefined;
    let perkCategory: PerkCategory | undefined;

    for (const [category, perk] of agentPerks.perks.entries()) {
      const foundSkill = perk.skills.find((s) => s.id === action.skillId);
      if (foundSkill) {
        skill = foundSkill;
        perkCategory = category as PerkCategory;
        break;
      }
    }

    if (!skill || !perkCategory) return false;

    // Roll for success
    const baseSuccessRate = action.successProbability;
    const skillBonus = skill.level * 0.1; // +10% per skill level
    const finalSuccessRate = Math.min(0.95, baseSuccessRate + skillBonus);

    const success = Math.random() < finalSuccessRate;

    // Grant experience regardless of success (learning from failure)
    const expGain = success
      ? action.experienceGain
      : Math.floor(action.experienceGain * 0.5);
    this.grantExperience(agentId, perkCategory, action.skillId, expGain);

    // Update world resources
    this.updateWorldResources(success);

    console.log(
      `🎮 ${agentId} performed ${action.actionType} with ${skill.name}: ${success ? "SUCCESS" : "FAILED"} (+${expGain} XP)`,
    );

    return success;
  }

  // ===== WORLD RESOURCES =====

  private updateWorldResources(taskSuccess: boolean): void {
    const current = this.getWorldResources();
    const updated: WorldResources = {
      ...current,
      completedTasks: current.completedTasks + 1,
      totalExperience: this.getTotalWorldExperience(),
      successRate: this.calculateSuccessRate(taskSuccess),
      uptime: current.uptime + 1,
    };

    this.worldResources.set(updated);
  }

  private getTotalWorldExperience(): number {
    let total = 0;
    this.perksData.forEach((agentPerks) => {
      total += agentPerks.totalExperience;
    });
    return total;
  }

  private calculateSuccessRate(latestSuccess: boolean): number {
    // Simple moving average of recent successes
    // In a real implementation, you'd track this more precisely
    const current = this.getWorldResources();
    const weight = 0.1; // How much the latest result affects the rate
    return (
      current.successRate * (1 - weight) + (latestSuccess ? 100 : 0) * weight
    );
  }

  // ===== GETTERS =====

  public getAgentPerks(agentId: string): AgentPerks | undefined {
    return this.perksData.get(agentId);
  }

  public getWorldResources(): WorldResources {
    let current: WorldResources;
    this.worldResources.subscribe((value) => (current = value))();
    return current!;
  }

  public getPerkDefinitions(): PerkDefinitions {
    console.log("🔍 PerkManager.getPerkDefinitions() called, categories:", Object.keys(this.perkDefinitions));
    return this.perkDefinitions;
  }

  public getAgentSpecialization(agentId: string): PerkCategory | undefined {
    return this.perksData.get(agentId)?.specialization;
  }

  public getAgentTopSkills(
    agentId: string,
    limit: number = 3,
  ): Array<{ skill: Skill; perkCategory: PerkCategory }> {
    const agentPerks = this.perksData.get(agentId);
    if (!agentPerks) return [];

    const allSkills: Array<{ skill: Skill; perkCategory: PerkCategory }> = [];

    agentPerks.perks.forEach((perk, category) => {
      perk.skills.forEach((skill) => {
        if (skill.unlocked && skill.level > 0) {
          allSkills.push({ skill, perkCategory: category as PerkCategory });
        }
      });
    });

    return allSkills
      .sort((a, b) => b.skill.level - a.skill.level)
      .slice(0, limit);
  }

  // ===== PERSISTENCE =====

  private savePerksData(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.perksData.entries()));
      localStorage.setItem("nocturne_agent_perks", serialized);
    } catch (error) {
      console.warn("Failed to save perks data:", error);
    }
  }

  private loadPerksData(): void {
    try {
      const saved = localStorage.getItem("nocturne_agent_perks");
      if (saved) {
        const entries = JSON.parse(saved);
        this.perksData = new Map();

        // Reconstruct the Map with proper Map objects for perks
        entries.forEach(([agentId, agentPerksData]: [string, any]) => {
          const agentPerks: AgentPerks = {
            agentId: agentPerksData.agentId,
            perks: new Map(), // Reconstruct the perks Map
            totalExperience: agentPerksData.totalExperience || 0,
            availablePoints: agentPerksData.availablePoints || 0,
            specialization: agentPerksData.specialization,
          };

          // Convert the perks object back to a Map
          if (
            agentPerksData.perks &&
            typeof agentPerksData.perks === "object"
          ) {
            Object.entries(agentPerksData.perks).forEach(
              ([perkId, perkData]: [string, any]) => {
                agentPerks.perks.set(perkId, perkData as Perk);
              },
            );
          }

          // Validate that the Map was properly reconstructed
          if (typeof agentPerks.perks.get !== "function") {
            console.warn(
              `Invalid perks Map for agent ${agentId}, reinitializing...`,
            );
            this.initializeAgentPerks(agentId, agentPerks.specialization);
            return;
          }

          this.perksData.set(agentId, agentPerks);
        });

        this.updateStore();
      }
    } catch (error) {
      console.warn("Failed to load perks data:", error);
    }
  }

  // ===== UTILITY =====

  private updateStore(): void {
    this.agentPerks.set(new Map(this.perksData));
  }

  public resetAgentPerks(agentId: string): void {
    this.perksData.delete(agentId);
    this.updateStore();
    this.savePerksData();
  }

  public exportAgentPerks(agentId: string): string {
    const agentPerks = this.perksData.get(agentId);
    return agentPerks ? JSON.stringify(agentPerks, null, 2) : "";
  }

  // Auto-save periodically
  public startAutoSave(): void {
    setInterval(() => {
      this.savePerksData();
    }, 30000); // Every 30 seconds
  }

  // Validate and repair corrupted perk data
  public validateAndRepairPerks(): void {
    let hasCorruptedData = false;

    this.perksData.forEach((agentPerks, agentId) => {
      if (typeof agentPerks.perks.get !== "function") {
        console.warn(`Repairing corrupted perks for agent ${agentId}`);
        hasCorruptedData = true;
        this.initializeAgentPerks(agentId, agentPerks.specialization);
      }
    });

    if (hasCorruptedData) {
      this.updateStore();
      this.savePerksData();
    }
  }
}

// Export singleton instance
export const perkManager = new PerkManager();
