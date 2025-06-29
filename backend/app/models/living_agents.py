"""
Living Agent Database Models - Persistent Storage for Digital Beings
SQLAlchemy models for personality, memory, relationships, and evolution tracking.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, DateTime, Text, JSON, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import uuid

from .database import Base


class LivingAgent(Base):
    """Core living agent entity with personality and state"""
    __tablename__ = "living_agents"
    
    # Primary Identity
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, unique=True, nullable=False, index=True)  # Application-level ID
    user_id = Column(String, nullable=False, index=True)  # Owner of this agent
    
    # Core Identity (Immutable)
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=False)
    core_personality = Column(JSON, nullable=False)  # Foundation traits, values, origin story
    
    # Dynamic State (Changes over time)
    current_mood = Column(JSON, nullable=False)  # MoodState as JSON
    current_context = Column(JSON, nullable=True)  # Current situational context
    
    # Evolution Tracking
    personality_evolution = Column(JSON, nullable=False)  # Growth milestones and trait changes
    interaction_count = Column(Integer, default=0)
    
    # Memory Counters (for performance)
    episodic_memory_count = Column(Integer, default=0)
    semantic_memory_count = Column(Integer, default=0)
    relationship_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_interaction = Column(DateTime, nullable=True)
    
    # Relationships
    relationships = relationship("AgentRelationship", back_populates="agent", cascade="all, delete-orphan")
    memories = relationship("AgentMemory", back_populates="agent", cascade="all, delete-orphan")
    growth_milestones = relationship("GrowthMilestone", back_populates="agent", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<LivingAgent(id={self.agent_id}, name={self.name}, role={self.role})>"


class AgentRelationship(Base):
    """Relationship tracking between agents and users/other agents"""
    __tablename__ = "agent_relationships"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("living_agents.id"), nullable=False, index=True)
    
    # Relationship Target
    entity_id = Column(String, nullable=False, index=True)  # user_id or other agent_id
    entity_type = Column(String, nullable=False)  # "user" or "agent"
    entity_name = Column(String, nullable=True)  # Friendly name for display
    
    # Relationship Metrics (0.0 to 100.0)
    familiarity_level = Column(Float, default=0.0)
    trust_score = Column(Float, default=0.0)
    emotional_bond = Column(Float, default=0.0)
    
    # Interaction History
    interaction_count = Column(Integer, default=0)
    positive_interactions = Column(Integer, default=0)
    challenging_interactions = Column(Integer, default=0)
    last_interaction = Column(DateTime, nullable=True)
    
    # Shared Context
    shared_experiences = Column(JSON, default=list)  # List of experience IDs
    inside_jokes = Column(JSON, default=list)  # List of inside jokes/references
    communication_preferences = Column(JSON, default=dict)  # Learned preferences
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    agent = relationship("LivingAgent", back_populates="relationships")
    
    def __repr__(self):
        return f"<AgentRelationship(agent={self.agent_id}, entity={self.entity_id}, type={self.entity_type})>"


class AgentMemory(Base):
    """Individual memory units with emotional context and tags"""
    __tablename__ = "agent_memories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("living_agents.id"), nullable=False, index=True)
    
    # Memory Content
    memory_type = Column(String, nullable=False, index=True)  # conversation, experience, learning, emotion
    content = Column(Text, nullable=False)
    
    # Emotional Context
    emotional_weight = Column(Float, default=0.0)  # -1.0 to 1.0 (negative to positive)
    importance_score = Column(Float, default=0.5)  # 0.0 to 1.0
    
    # Categorization
    tags = Column(JSON, default=list)  # List of tags for categorization
    related_entities = Column(JSON, default=list)  # Related users/agents
    
    # Context Links
    related_conversation_id = Column(String, nullable=True)  # Link to conversation if applicable
    related_memory_ids = Column(JSON, default=list)  # Links to related memories
    
    # Lifecycle
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # Some memories may fade
    
    # Timestamps
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)  # When memory was formed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    agent = relationship("LivingAgent", back_populates="memories")
    
    def __repr__(self):
        return f"<AgentMemory(id={self.id}, type={self.memory_type}, agent={self.agent_id})>"


class GrowthMilestone(Base):
    """Significant personality evolution and growth events"""
    __tablename__ = "growth_milestones"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("living_agents.id"), nullable=False, index=True)
    
    # Milestone Details
    milestone_type = Column(String, nullable=False)  # personality_evolution, skill_development, relationship_milestone
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    
    # Trigger Information
    trigger_event = Column(String, nullable=False)  # What caused this growth
    trigger_context = Column(JSON, nullable=True)  # Additional context about the trigger
    
    # Evolution Data
    trait_changes = Column(JSON, nullable=True)  # What traits changed and how
    skill_improvements = Column(JSON, nullable=True)  # Skill developments
    relationship_impacts = Column(JSON, nullable=True)  # How relationships were affected
    
    # Significance
    significance_score = Column(Float, default=1.0)  # How significant this milestone is
    milestone_number = Column(Integer, nullable=False)  # Sequential number for this agent
    
    # Timestamps
    achieved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    agent = relationship("LivingAgent", back_populates="growth_milestones")
    
    def __repr__(self):
        return f"<GrowthMilestone(id={self.id}, type={self.milestone_type}, agent={self.agent_id})>"


class PersonalitySnapshot(Base):
    """Periodic snapshots of agent personality for evolution tracking"""
    __tablename__ = "personality_snapshots"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("living_agents.id"), nullable=False, index=True)
    
    # Snapshot Data
    snapshot_type = Column(String, nullable=False)  # daily, milestone, manual
    personality_state = Column(JSON, nullable=False)  # Complete personality state at this time
    mood_state = Column(JSON, nullable=False)  # Mood state at snapshot time
    
    # Context
    interaction_count_at_snapshot = Column(Integer, default=0)
    relationship_count_at_snapshot = Column(Integer, default=0)
    memory_count_at_snapshot = Column(Integer, default=0)
    
    # Trigger
    trigger_reason = Column(String, nullable=True)  # Why this snapshot was taken
    
    # Timestamps
    snapshot_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    agent = relationship("LivingAgent")
    
    def __repr__(self):
        return f"<PersonalitySnapshot(id={self.id}, type={self.snapshot_type}, agent={self.agent_id})>"


class AgentInteraction(Base):
    """Log of all agent interactions for learning and analysis"""
    __tablename__ = "agent_interactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("living_agents.id"), nullable=False, index=True)
    
    # Interaction Details
    interaction_type = Column(String, nullable=False)  # user_message, agent_collaboration, system_event
    user_id = Column(String, nullable=True, index=True)  # If interaction involved a user
    other_agent_id = Column(String, nullable=True)  # If interaction involved another agent
    
    # Content
    user_input = Column(Text, nullable=True)
    agent_response = Column(Text, nullable=True)
    context_data = Column(JSON, nullable=True)
    
    # Interaction Metrics
    processing_time = Column(Float, nullable=True)  # Response generation time
    user_satisfaction = Column(Float, nullable=True)  # If measurable
    effectiveness_score = Column(Float, nullable=True)  # Agent's effectiveness
    
    # Learning Triggers
    triggered_learning = Column(Boolean, default=False)
    triggered_evolution = Column(Boolean, default=False)
    learning_insights = Column(JSON, nullable=True)  # What was learned
    
    # Context
    conversation_id = Column(String, nullable=True)  # Link to conversation if applicable
    session_id = Column(String, nullable=True)  # Session context
    
    # Timestamps
    interaction_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    agent = relationship("LivingAgent")
    
    def __repr__(self):
        return f"<AgentInteraction(id={self.id}, type={self.interaction_type}, agent={self.agent_id})>"


class SharedExperience(Base):
    """Shared experiences between users and agents for relationship building"""
    __tablename__ = "shared_experiences"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    experience_id = Column(String, unique=True, nullable=False, index=True)  # Application-level ID
    
    # Experience Details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    experience_type = Column(String, nullable=False)  # conversation, collaboration, milestone, achievement
    
    # Participants
    user_id = Column(String, nullable=False, index=True)
    agent_ids = Column(JSON, nullable=False)  # List of participating agents
    
    # Experience Data
    emotional_tone = Column(String, nullable=True)  # positive, negative, neutral, mixed
    significance_level = Column(Float, default=1.0)  # How significant this experience was
    impact_description = Column(Text, nullable=True)
    
    # Context
    conversation_context = Column(JSON, nullable=True)
    project_context = Column(JSON, nullable=True)
    
    # References
    conversation_id = Column(String, nullable=True)  # Link to conversation
    milestone_id = Column(String, nullable=True)  # Link to milestone if applicable
    
    # Timestamps
    experienced_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<SharedExperience(id={self.experience_id}, type={self.experience_type})>"


class AgentLearningInsight(Base):
    """Learning insights generated from agent interactions"""
    __tablename__ = "agent_learning_insights"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("living_agents.id"), nullable=False, index=True)
    
    # Insight Details
    learning_type = Column(String, nullable=False)  # user_preference, interaction_pattern, success_pattern
    pattern_identified = Column(String, nullable=False)
    insight_description = Column(Text, nullable=False)
    
    # Confidence and Application
    confidence_level = Column(Float, default=0.5)  # 0.0 to 1.0
    application_suggestions = Column(JSON, nullable=False)  # List of how to apply this insight
    evidence = Column(JSON, nullable=False)  # Evidence supporting this insight
    
    # Application Tracking
    applied = Column(Boolean, default=False)
    application_results = Column(JSON, nullable=True)  # Results when applied
    effectiveness_score = Column(Float, nullable=True)  # How effective the application was
    
    # Context
    learning_context = Column(JSON, nullable=True)  # Context when insight was generated
    related_interactions = Column(JSON, nullable=True)  # Related interaction IDs
    
    # Timestamps
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    applied_at = Column(DateTime, nullable=True)
    
    # Relationships
    agent = relationship("LivingAgent")
    
    def __repr__(self):
        return f"<AgentLearningInsight(id={self.id}, type={self.learning_type}, agent={self.agent_id})>" 