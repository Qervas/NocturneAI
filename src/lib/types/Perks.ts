export type PerkCategory =
  | 'cognitive'
  | 'technical'
  | 'creative'
  | 'research'
  | 'social'
  | 'automation';

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number; // 0-5
  experience: number;
  maxExperience: number;
  unlocked: boolean;
  prerequisites?: string[]; // skill IDs
}

export interface Perk {
  id: string;
  name: string;
  description: string;
  category: PerkCategory;
  icon: string;
  color: string;
  level: number; // 0-3 (Novice, Adept, Expert)
  experience: number;
  maxExperience: number;
  unlocked: boolean;
  skills: Skill[];
  prerequisites?: string[]; // perk IDs
}

export interface AgentPerks {
  agentId: string;
  perks: Map<string, Perk>;
  totalExperience: number;
  availablePoints: number;
  specialization?: PerkCategory;
}

export interface PerkAction {
  skillId: string;
  actionType: 'research' | 'create' | 'analyze' | 'automate' | 'communicate' | 'develop';
  parameters: Record<string, any>;
  requiredLevel: number;
  experienceGain: number;
  successProbability: number;
}

export interface PerkDefinitions {
  cognitive: {
    id: 'cognitive';
    name: 'Cognitive';
    description: 'Mental processing and analytical thinking';
    icon: '🧠';
    color: '#4A90E2';
    skills: {
      research: {
        id: 'research';
        name: 'Research';
        description: 'Gather and analyze information effectively';
        icon: '📚';
      };
      analysis: {
        id: 'analysis';
        name: 'Analysis';
        description: 'Break down complex problems into components';
        icon: '📊';
      };
      problemSolving: {
        id: 'problem_solving';
        name: 'Problem Solving';
        description: 'Find creative solutions to challenges';
        icon: '🧩';
      };
      memoryEnhancement: {
        id: 'memory_enhancement';
        name: 'Memory Enhancement';
        description: 'Retain and recall information efficiently';
        icon: '🔄';
      };
    };
  };

  technical: {
    id: 'technical';
    name: 'Technical';
    description: 'Programming and technical implementation';
    icon: '💻';
    color: '#50C878';
    skills: {
      webDevelopment: {
        id: 'web_development';
        name: 'Web Development';
        description: 'Build web applications and interfaces';
        icon: '🌐';
      };
      apiIntegration: {
        id: 'api_integration';
        name: 'API Integration';
        description: 'Connect and integrate external services';
        icon: '🔌';
      };
      databaseManagement: {
        id: 'database_management';
        name: 'Database Management';
        description: 'Design and optimize data storage';
        icon: '🗄️';
      };
      devops: {
        id: 'devops';
        name: 'DevOps';
        description: 'Deploy and maintain infrastructure';
        icon: '⚙️';
      };
    };
  };

  creative: {
    id: 'creative';
    name: 'Creative';
    description: 'Innovation and artistic expression';
    icon: '🎨';
    color: '#FF6B9D';
    skills: {
      uiuxDesign: {
        id: 'uiux_design';
        name: 'UI/UX Design';
        description: 'Create intuitive user experiences';
        icon: '🎨';
      };
      contentCreation: {
        id: 'content_creation';
        name: 'Content Creation';
        description: 'Generate engaging written and visual content';
        icon: '✍️';
      };
      brainstorming: {
        id: 'brainstorming';
        name: 'Brainstorming';
        description: 'Generate innovative ideas and concepts';
        icon: '💡';
      };
      storytelling: {
        id: 'storytelling';
        name: 'Storytelling';
        description: 'Craft compelling narratives and presentations';
        icon: '📖';
      };
    };
  };

  research: {
    id: 'research';
    name: 'Research';
    description: 'Information gathering and validation';
    icon: '🔍';
    color: '#FFD700';
    skills: {
      webSearch: {
        id: 'web_search';
        name: 'Web Search';
        description: 'Find relevant information across the internet';
        icon: '🔍';
      };
      dataMining: {
        id: 'data_mining';
        name: 'Data Mining';
        description: 'Extract insights from large datasets';
        icon: '⛏️';
      };
      factChecking: {
        id: 'fact_checking';
        name: 'Fact Checking';
        description: 'Verify information accuracy and credibility';
        icon: '✅';
      };
      marketResearch: {
        id: 'market_research';
        name: 'Market Research';
        description: 'Analyze market trends and opportunities';
        icon: '📈';
      };
    };
  };

  social: {
    id: 'social';
    name: 'Social';
    description: 'Communication and interpersonal skills';
    icon: '🤝';
    color: '#9B59B6';
    skills: {
      negotiation: {
        id: 'negotiation';
        name: 'Negotiation';
        description: 'Reach mutually beneficial agreements';
        icon: '🤝';
      };
      leadership: {
        id: 'leadership';
        name: 'Leadership';
        description: 'Guide and inspire team members';
        icon: '👑';
      };
      teamCoordination: {
        id: 'team_coordination';
        name: 'Team Coordination';
        description: 'Organize and synchronize team efforts';
        icon: '👥';
      };
      customerService: {
        id: 'customer_service';
        name: 'Customer Service';
        description: 'Provide excellent user support and assistance';
        icon: '🎧';
      };
    };
  };

  automation: {
    id: 'automation';
    name: 'Automation';
    description: 'Process optimization and efficiency';
    icon: '⚙️';
    color: '#F39C12';
    skills: {
      workflowDesign: {
        id: 'workflow_design';
        name: 'Workflow Design';
        description: 'Create efficient process flows';
        icon: '🔄';
      };
      taskAutomation: {
        id: 'task_automation';
        name: 'Task Automation';
        description: 'Automate repetitive tasks and processes';
        icon: '🤖';
      };
      qualityAssurance: {
        id: 'quality_assurance';
        name: 'Quality Assurance';
        description: 'Ensure standards and catch errors';
        icon: '🛡️';
      };
      testing: {
        id: 'testing';
        name: 'Testing';
        description: 'Validate functionality and performance';
        icon: '🧪';
      };
    };
  };
}

export const PERK_EXPERIENCE_REQUIREMENTS = {
  1: 100,
  2: 250,
  3: 500
};

export const SKILL_EXPERIENCE_REQUIREMENTS = {
  1: 50,
  2: 100,
  3: 200,
  4: 350,
  5: 500
};

export interface WorldResources {
  totalAgents: number;
  activeAgents: number;
  completedTasks: number;
  totalExperience: number;
  successRate: number;
  uptime: number;
}
