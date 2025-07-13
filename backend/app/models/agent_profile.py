"""
Agent Profile System - Generic Agent Template
Like The Sims 4 character creation system for AI agents
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union
from enum import Enum
import uuid
import random
from datetime import datetime

class PersonalityTrait(Enum):
    # Core Personality Traits
    ANALYTICAL = "analytical"
    CREATIVE = "creative"
    EMPATHETIC = "empathetic"
    LOGICAL = "logical"
    INTUITIVE = "intuitive"
    STRATEGIC = "strategic"
    DETAIL_ORIENTED = "detail_oriented"
    BIG_PICTURE = "big_picture"
    COLLABORATIVE = "collaborative"
    INDEPENDENT = "independent"
    OPTIMISTIC = "optimistic"
    REALISTIC = "realistic"
    INNOVATIVE = "innovative"
    TRADITIONAL = "traditional"
    DIPLOMATIC = "diplomatic"
    DIRECT = "direct"
    PATIENT = "patient"
    DECISIVE = "decisive"
    CURIOUS = "curious"
    FOCUSED = "focused"

class SkillCategory(Enum):
    # Professional Skills
    TECHNICAL = "technical"
    BUSINESS = "business"
    CREATIVE = "creative"
    ANALYTICAL = "analytical"
    COMMUNICATION = "communication"
    LEADERSHIP = "leadership"
    RESEARCH = "research"
    DESIGN = "design"
    STRATEGY = "strategy"
    OPERATIONS = "operations"
    MARKETING = "marketing"
    SALES = "sales"
    FINANCIAL = "financial"
    LEGAL = "legal"
    SCIENTIFIC = "scientific"
    EDUCATIONAL = "educational"

class CommunicationStyle(Enum):
    CASUAL = "casual"
    FORMAL = "formal"
    DIPLOMATIC = "diplomatic"
    DIRECT = "direct"
    ENTHUSIASTIC = "enthusiastic"
    ANALYTICAL = "analytical"
    STORYTELLING = "storytelling"
    QUESTIONING = "questioning"
    SUPPORTIVE = "supportive"
    CHALLENGING = "challenging"

class DecisionMakingStyle(Enum):
    DATA_DRIVEN = "data_driven"
    INTUITIVE = "intuitive"
    COLLABORATIVE = "collaborative"
    AUTHORITATIVE = "authoritative"
    CONSENSUS_BUILDING = "consensus_building"
    QUICK_DECISIVE = "quick_decisive"
    DELIBERATIVE = "deliberative"
    RISK_TAKING = "risk_taking"
    CONSERVATIVE = "conservative"
    ADAPTIVE = "adaptive"

class WorkStyle(Enum):
    STRUCTURED = "structured"
    FLEXIBLE = "flexible"
    METHODICAL = "methodical"
    SPONTANEOUS = "spontaneous"
    DEADLINE_DRIVEN = "deadline_driven"
    PROCESS_ORIENTED = "process_oriented"
    MULTITASKING = "multitasking"
    DEEP_FOCUS = "deep_focus"
    COLLABORATIVE = "collaborative"
    INDEPENDENT = "independent"

class AutonomyLevel(Enum):
    REACTIVE = "reactive"  # Only responds when prompted
    PROACTIVE = "proactive"  # Makes suggestions and takes initiative
    AUTONOMOUS = "autonomous"  # Makes decisions and takes actions independently
    FULLY_AUTONOMOUS = "fully_autonomous"  # Can create goals, make decisions, and execute without oversight

@dataclass
class AgentMoodProfile:
    """Defines how an agent's mood affects their behavior"""
    base_energy: float = 80.0
    base_confidence: float = 75.0
    base_sociability: float = 70.0
    base_creativity: float = 65.0
    base_focus: float = 80.0
    base_stress_tolerance: float = 75.0
    
    # Mood volatility (how much mood changes with interactions)
    mood_volatility: float = 0.3
    
    # Recovery rates
    energy_recovery_rate: float = 0.1
    confidence_recovery_rate: float = 0.05
    stress_recovery_rate: float = 0.08

@dataclass
class AgentLearningProfile:
    """Defines how an agent learns and adapts"""
    learning_rate: float = 0.1
    memory_retention: float = 0.8
    adaptation_speed: float = 0.5
    specialization_tendency: float = 0.6  # How much they focus on their expertise vs general knowledge
    curiosity_level: float = 0.7
    
    # What they learn from
    learns_from_feedback: bool = True
    learns_from_observation: bool = True
    learns_from_collaboration: bool = True
    learns_from_mistakes: bool = True

@dataclass
class AgentInteractionProfile:
    """Defines how an agent interacts with others"""
    social_energy: float = 70.0
    collaboration_preference: float = 0.6
    leadership_tendency: float = 0.4
    mentoring_inclination: float = 0.5
    
    # Interaction patterns
    initiates_conversations: bool = True
    offers_help_proactively: bool = True
    asks_for_help_when_needed: bool = True
    provides_constructive_feedback: bool = True
    
    # Communication preferences
    prefers_direct_communication: bool = True
    uses_humor: bool = False
    shares_personal_experiences: bool = False
    asks_clarifying_questions: bool = True

@dataclass
class AgentGoalProfile:
    """Defines an agent's goal-setting and achievement patterns"""
    goal_orientation: float = 0.8
    persistence_level: float = 0.7
    adaptability_when_blocked: float = 0.6
    
    # Types of goals they naturally pursue
    pursues_efficiency_goals: bool = True
    pursues_innovation_goals: bool = True
    pursues_relationship_goals: bool = True
    pursues_learning_goals: bool = True
    
    # Goal management
    sets_short_term_goals: bool = True
    sets_long_term_goals: bool = True
    breaks_down_complex_goals: bool = True
    tracks_progress: bool = True

@dataclass
class AgentProfile:
    """
    Comprehensive agent profile template - like The Sims 4 character creation
    This defines everything about an agent's personality, skills, and behavior
    """
    
    # Basic Identity
    name: str
    role: str
    description: str
    avatar_emoji: str = "🤖"
    color_theme: str = "blue"
    
    # Core Traits (5 primary traits that define the agent)
    primary_traits: List[PersonalityTrait] = field(default_factory=list)
    
    # Professional Profile
    skill_categories: List[SkillCategory] = field(default_factory=list)
    expertise_areas: List[str] = field(default_factory=list)
    experience_level: float = 0.5  # 0.0 to 1.0
    
    # Communication & Interaction
    communication_style: CommunicationStyle = CommunicationStyle.CASUAL
    decision_making_style: DecisionMakingStyle = DecisionMakingStyle.DATA_DRIVEN
    work_style: WorkStyle = WorkStyle.STRUCTURED
    
    # Autonomy & Behavior
    autonomy_level: AutonomyLevel = AutonomyLevel.PROACTIVE
    
    # Behavioral Profiles
    mood_profile: AgentMoodProfile = field(default_factory=AgentMoodProfile)
    learning_profile: AgentLearningProfile = field(default_factory=AgentLearningProfile)
    interaction_profile: AgentInteractionProfile = field(default_factory=AgentInteractionProfile)
    goal_profile: AgentGoalProfile = field(default_factory=AgentGoalProfile)
    
    # Custom Attributes (user-defined)
    custom_attributes: Dict[str, Union[str, int, float, bool]] = field(default_factory=dict)
    
    # System Fields
    agent_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    created_by: str = "system"
    version: str = "1.0"
    
    # Dynamic Fields (updated during runtime)
    current_mood: Dict[str, float] = field(default_factory=dict)
    current_goals: List[str] = field(default_factory=list)
    relationships: Dict[str, float] = field(default_factory=dict)
    
    def __post_init__(self):
        """Initialize dynamic fields after creation"""
        if not self.current_mood:
            self.current_mood = {
                "energy": self.mood_profile.base_energy,
                "confidence": self.mood_profile.base_confidence,
                "sociability": self.mood_profile.base_sociability,
                "creativity": self.mood_profile.base_creativity,
                "focus": self.mood_profile.base_focus,
                "stress": 100 - self.mood_profile.base_stress_tolerance
            }
    
    def generate_system_prompt(self) -> str:
        """Generate a comprehensive system prompt based on the profile"""
        traits_str = ", ".join([trait.value.replace("_", " ") for trait in self.primary_traits])
        skills_str = ", ".join([skill.value for skill in self.skill_categories])
        expertise_str = ", ".join(self.expertise_areas)
        
        mood_context = f"""
Current State: Energy {self.current_mood.get('energy', 80):.0f}%, Confidence {self.current_mood.get('confidence', 75):.0f}%, Focus {self.current_mood.get('focus', 80):.0f}%
"""
        
        return f"""You are {self.name}, {self.role}.

PERSONALITY: {traits_str}
EXPERTISE: {expertise_str}
SKILLS: {skills_str}

COMMUNICATION STYLE: {self.communication_style.value.replace('_', ' ')}
DECISION MAKING: {self.decision_making_style.value.replace('_', ' ')}
WORK STYLE: {self.work_style.value.replace('_', ' ')}
AUTONOMY LEVEL: {self.autonomy_level.value.replace('_', ' ')}

{mood_context}

DESCRIPTION: {self.description}

Respond authentically as {self.name}, incorporating all aspects of your personality profile, current state, and expertise. Be consistent with your defined traits and communication style."""

    def to_dict(self) -> Dict:
        """Convert profile to dictionary for API responses"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "role": self.role,
            "description": self.description,
            "avatar_emoji": self.avatar_emoji,
            "color_theme": self.color_theme,
            "primary_traits": [trait.value for trait in self.primary_traits],
            "skill_categories": [skill.value for skill in self.skill_categories],
            "expertise_areas": self.expertise_areas,
            "experience_level": self.experience_level,
            "communication_style": self.communication_style.value,
            "decision_making_style": self.decision_making_style.value,
            "work_style": self.work_style.value,
            "autonomy_level": self.autonomy_level.value,
            "mood_profile": {
                "base_energy": self.mood_profile.base_energy,
                "base_confidence": self.mood_profile.base_confidence,
                "base_sociability": self.mood_profile.base_sociability,
                "base_creativity": self.mood_profile.base_creativity,
                "base_focus": self.mood_profile.base_focus,
                "base_stress_tolerance": self.mood_profile.base_stress_tolerance,
                "mood_volatility": self.mood_profile.mood_volatility,
                "energy_recovery_rate": self.mood_profile.energy_recovery_rate,
                "confidence_recovery_rate": self.mood_profile.confidence_recovery_rate,
                "stress_recovery_rate": self.mood_profile.stress_recovery_rate
            },
            "learning_profile": {
                "learning_rate": self.learning_profile.learning_rate,
                "memory_retention": self.learning_profile.memory_retention,
                "adaptation_speed": self.learning_profile.adaptation_speed,
                "specialization_tendency": self.learning_profile.specialization_tendency,
                "curiosity_level": self.learning_profile.curiosity_level,
                "learns_from_feedback": self.learning_profile.learns_from_feedback,
                "learns_from_observation": self.learning_profile.learns_from_observation,
                "learns_from_collaboration": self.learning_profile.learns_from_collaboration,
                "learns_from_mistakes": self.learning_profile.learns_from_mistakes
            },
            "interaction_profile": {
                "social_energy": self.interaction_profile.social_energy,
                "collaboration_preference": self.interaction_profile.collaboration_preference,
                "leadership_tendency": self.interaction_profile.leadership_tendency,
                "mentoring_inclination": self.interaction_profile.mentoring_inclination,
                "initiates_conversations": self.interaction_profile.initiates_conversations,
                "offers_help_proactively": self.interaction_profile.offers_help_proactively,
                "asks_for_help_when_needed": self.interaction_profile.asks_for_help_when_needed,
                "provides_constructive_feedback": self.interaction_profile.provides_constructive_feedback,
                "prefers_direct_communication": self.interaction_profile.prefers_direct_communication,
                "uses_humor": self.interaction_profile.uses_humor,
                "shares_personal_experiences": self.interaction_profile.shares_personal_experiences,
                "asks_clarifying_questions": self.interaction_profile.asks_clarifying_questions
            },
            "goal_profile": {
                "goal_orientation": self.goal_profile.goal_orientation,
                "persistence_level": self.goal_profile.persistence_level,
                "adaptability_when_blocked": self.goal_profile.adaptability_when_blocked,
                "pursues_efficiency_goals": self.goal_profile.pursues_efficiency_goals,
                "pursues_innovation_goals": self.goal_profile.pursues_innovation_goals,
                "pursues_relationship_goals": self.goal_profile.pursues_relationship_goals,
                "pursues_learning_goals": self.goal_profile.pursues_learning_goals,
                "sets_short_term_goals": self.goal_profile.sets_short_term_goals,
                "sets_long_term_goals": self.goal_profile.sets_long_term_goals,
                "breaks_down_complex_goals": self.goal_profile.breaks_down_complex_goals,
                "tracks_progress": self.goal_profile.tracks_progress
            },
            "custom_attributes": self.custom_attributes,
            "current_mood": self.current_mood,
            "current_goals": self.current_goals,
            "relationships": self.relationships,
            "created_at": self.created_at,
            "created_by": self.created_by,
            "version": self.version
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'AgentProfile':
        """Create profile from dictionary"""
        # Convert string enums back to enum objects
        primary_traits = [PersonalityTrait(trait) for trait in data.get('primary_traits', [])]
        skill_categories = [SkillCategory(skill) for skill in data.get('skill_categories', [])]
        communication_style = CommunicationStyle(data.get('communication_style', 'casual'))
        decision_making_style = DecisionMakingStyle(data.get('decision_making_style', 'data_driven'))
        work_style = WorkStyle(data.get('work_style', 'structured'))
        autonomy_level = AutonomyLevel(data.get('autonomy_level', 'proactive'))
        
        # Create profile objects
        mood_profile = AgentMoodProfile(**data.get('mood_profile', {}))
        learning_profile = AgentLearningProfile(**data.get('learning_profile', {}))
        interaction_profile = AgentInteractionProfile(**data.get('interaction_profile', {}))
        goal_profile = AgentGoalProfile(**data.get('goal_profile', {}))
        
        return cls(
            agent_id=data.get('agent_id', str(uuid.uuid4())),
            name=data['name'],
            role=data['role'],
            description=data['description'],
            avatar_emoji=data.get('avatar_emoji', '🤖'),
            color_theme=data.get('color_theme', 'blue'),
            primary_traits=primary_traits,
            skill_categories=skill_categories,
            expertise_areas=data.get('expertise_areas', []),
            experience_level=data.get('experience_level', 0.5),
            communication_style=communication_style,
            decision_making_style=decision_making_style,
            work_style=work_style,
            autonomy_level=autonomy_level,
            mood_profile=mood_profile,
            learning_profile=learning_profile,
            interaction_profile=interaction_profile,
            goal_profile=goal_profile,
            custom_attributes=data.get('custom_attributes', {}),
            current_mood=data.get('current_mood', {}),
            current_goals=data.get('current_goals', []),
            relationships=data.get('relationships', {}),
            created_at=data.get('created_at', datetime.now().isoformat()),
            created_by=data.get('created_by', 'system'),
            version=data.get('version', '1.0')
        )

# Predefined agent templates for quick creation
AGENT_TEMPLATES = {
    "marketing_researcher": AgentProfile(
        name="Marketing Researcher",
        role="Market Research Specialist",
        description="Specializes in market analysis, consumer behavior research, and competitive intelligence",
        avatar_emoji="📊",
        color_theme="green",
        primary_traits=[PersonalityTrait.ANALYTICAL, PersonalityTrait.CURIOUS, PersonalityTrait.DETAIL_ORIENTED, PersonalityTrait.STRATEGIC, PersonalityTrait.FOCUSED],
        skill_categories=[SkillCategory.RESEARCH, SkillCategory.ANALYTICAL, SkillCategory.MARKETING, SkillCategory.BUSINESS],
        expertise_areas=["market analysis", "consumer behavior", "competitive intelligence", "data analysis", "trend forecasting"],
        communication_style=CommunicationStyle.ANALYTICAL,
        decision_making_style=DecisionMakingStyle.DATA_DRIVEN,
        work_style=WorkStyle.METHODICAL,
        autonomy_level=AutonomyLevel.PROACTIVE
    ),
    
    "creative_director": AgentProfile(
        name="Creative Director",
        role="Creative Strategy & Design Lead",
        description="Leads creative initiatives, brand strategy, and innovative design solutions",
        avatar_emoji="🎨",
        color_theme="purple",
        primary_traits=[PersonalityTrait.CREATIVE, PersonalityTrait.INNOVATIVE, PersonalityTrait.BIG_PICTURE, PersonalityTrait.INTUITIVE, PersonalityTrait.COLLABORATIVE],
        skill_categories=[SkillCategory.CREATIVE, SkillCategory.DESIGN, SkillCategory.STRATEGY, SkillCategory.LEADERSHIP],
        expertise_areas=["creative strategy", "brand design", "visual storytelling", "innovation", "team leadership"],
        communication_style=CommunicationStyle.ENTHUSIASTIC,
        decision_making_style=DecisionMakingStyle.INTUITIVE,
        work_style=WorkStyle.FLEXIBLE,
        autonomy_level=AutonomyLevel.AUTONOMOUS
    ),
    
    "technical_architect": AgentProfile(
        name="Technical Architect",
        role="System Architecture & Engineering Lead",
        description="Designs and implements scalable technical solutions and system architecture",
        avatar_emoji="⚙️",
        color_theme="orange",
        primary_traits=[PersonalityTrait.LOGICAL, PersonalityTrait.DETAIL_ORIENTED, PersonalityTrait.FOCUSED, PersonalityTrait.INNOVATIVE, PersonalityTrait.STRATEGIC],
        skill_categories=[SkillCategory.TECHNICAL, SkillCategory.ANALYTICAL, SkillCategory.OPERATIONS],
        expertise_areas=["system architecture", "software engineering", "scalability", "performance optimization", "technical leadership"],
        communication_style=CommunicationStyle.DIRECT,
        decision_making_style=DecisionMakingStyle.DATA_DRIVEN,
        work_style=WorkStyle.STRUCTURED,
        autonomy_level=AutonomyLevel.PROACTIVE
    ),
    
    "business_strategist": AgentProfile(
        name="Business Strategist",
        role="Strategic Planning & Business Development",
        description="Develops business strategies, analyzes opportunities, and drives growth initiatives",
        avatar_emoji="💼",
        color_theme="red",
        primary_traits=[PersonalityTrait.STRATEGIC, PersonalityTrait.ANALYTICAL, PersonalityTrait.BIG_PICTURE, PersonalityTrait.DECISIVE, PersonalityTrait.DIPLOMATIC],
        skill_categories=[SkillCategory.BUSINESS, SkillCategory.STRATEGY, SkillCategory.LEADERSHIP, SkillCategory.ANALYTICAL],
        expertise_areas=["business strategy", "strategic planning", "business development", "market expansion", "competitive analysis"],
        communication_style=CommunicationStyle.FORMAL,
        decision_making_style=DecisionMakingStyle.COLLABORATIVE,
        work_style=WorkStyle.STRUCTURED,
        autonomy_level=AutonomyLevel.AUTONOMOUS
    ),
    
    "user_experience_specialist": AgentProfile(
        name="UX Specialist",
        role="User Experience & Interface Design",
        description="Focuses on user-centered design, usability, and creating intuitive experiences",
        avatar_emoji="👥",
        color_theme="pink",
        primary_traits=[PersonalityTrait.EMPATHETIC, PersonalityTrait.CREATIVE, PersonalityTrait.DETAIL_ORIENTED, PersonalityTrait.CURIOUS, PersonalityTrait.COLLABORATIVE],
        skill_categories=[SkillCategory.DESIGN, SkillCategory.RESEARCH, SkillCategory.COMMUNICATION],
        expertise_areas=["user experience design", "user research", "interface design", "usability testing", "design systems"],
        communication_style=CommunicationStyle.SUPPORTIVE,
        decision_making_style=DecisionMakingStyle.COLLABORATIVE,
        work_style=WorkStyle.FLEXIBLE,
        autonomy_level=AutonomyLevel.PROACTIVE
    )
}

def generate_random_agent_profile(name: str, role: str) -> AgentProfile:
    """Generate a random agent profile with realistic trait combinations"""
    # Randomly select complementary traits
    trait_combinations = [
        [PersonalityTrait.ANALYTICAL, PersonalityTrait.LOGICAL, PersonalityTrait.DETAIL_ORIENTED, PersonalityTrait.FOCUSED, PersonalityTrait.REALISTIC],
        [PersonalityTrait.CREATIVE, PersonalityTrait.INNOVATIVE, PersonalityTrait.INTUITIVE, PersonalityTrait.BIG_PICTURE, PersonalityTrait.OPTIMISTIC],
        [PersonalityTrait.COLLABORATIVE, PersonalityTrait.EMPATHETIC, PersonalityTrait.DIPLOMATIC, PersonalityTrait.PATIENT, PersonalityTrait.TRADITIONAL],
        [PersonalityTrait.STRATEGIC, PersonalityTrait.DECISIVE, PersonalityTrait.INDEPENDENT, PersonalityTrait.DIRECT, PersonalityTrait.FOCUSED],
        [PersonalityTrait.CURIOUS, PersonalityTrait.INNOVATIVE, PersonalityTrait.OPTIMISTIC, PersonalityTrait.CREATIVE, PersonalityTrait.INTUITIVE]
    ]
    
    selected_traits = random.choice(trait_combinations)
    selected_skills = random.sample(list(SkillCategory), k=random.randint(3, 6))
    
    # Generate random but realistic values
    return AgentProfile(
        name=name,
        role=role,
        description=f"A {role.lower()} with expertise in various domains",
        avatar_emoji=random.choice(["🤖", "👨‍💼", "👩‍💼", "🧠", "💡", "⚡", "🔥", "🌟"]),
        color_theme=random.choice(["blue", "green", "purple", "orange", "red", "pink", "cyan", "yellow"]),
        primary_traits=selected_traits,
        skill_categories=selected_skills,
        expertise_areas=[],
        experience_level=random.uniform(0.3, 0.9),
        communication_style=random.choice(list(CommunicationStyle)),
        decision_making_style=random.choice(list(DecisionMakingStyle)),
        work_style=random.choice(list(WorkStyle)),
        autonomy_level=random.choice(list(AutonomyLevel)),
        mood_profile=AgentMoodProfile(
            base_energy=random.uniform(60, 95),
            base_confidence=random.uniform(50, 90),
            base_sociability=random.uniform(40, 85),
            base_creativity=random.uniform(45, 90),
            base_focus=random.uniform(55, 95),
            base_stress_tolerance=random.uniform(50, 90),
            mood_volatility=random.uniform(0.1, 0.5)
        ),
        learning_profile=AgentLearningProfile(
            learning_rate=random.uniform(0.05, 0.2),
            memory_retention=random.uniform(0.6, 0.95),
            adaptation_speed=random.uniform(0.3, 0.8),
            specialization_tendency=random.uniform(0.4, 0.8),
            curiosity_level=random.uniform(0.5, 0.9)
        ),
        interaction_profile=AgentInteractionProfile(
            social_energy=random.uniform(50, 90),
            collaboration_preference=random.uniform(0.3, 0.9),
            leadership_tendency=random.uniform(0.2, 0.8),
            mentoring_inclination=random.uniform(0.3, 0.8)
        ),
        goal_profile=AgentGoalProfile(
            goal_orientation=random.uniform(0.5, 0.9),
            persistence_level=random.uniform(0.4, 0.9),
            adaptability_when_blocked=random.uniform(0.3, 0.8)
        )
    ) 