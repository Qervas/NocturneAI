"""
Living Agent Repository - Data Access Layer
Handles all database operations for Living Agents with performance optimization.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, desc, func
from sqlalchemy.orm import selectinload

from app.models.living_agents import (
    LivingAgent, AgentRelationship, AgentMemory, GrowthMilestone,
    PersonalitySnapshot, AgentInteraction, SharedExperience, AgentLearningInsight
)
from app.core.agents.living_agent_system import LivingAgent as LivingAgentCore
import json
import logging

logger = logging.getLogger(__name__)


class LivingAgentRepository:
    """High-performance repository for Living Agent persistence"""
    
    def __init__(self):
        pass
    
    # ===== CORE AGENT OPERATIONS =====
    
    async def create_agent(self, db: AsyncSession, agent: LivingAgentCore, user_id: str) -> LivingAgent:
        """Create a new living agent in the database"""
        try:
            db_agent = LivingAgent(
                agent_id=agent.agent_id,
                user_id=user_id,
                name=agent.name,
                role=agent.role,
                core_personality=agent.core_personality,
                current_mood=agent.mood.to_dict(),
                current_context=agent.current_context,
                personality_evolution=agent.personality_evolution.to_dict(),
                interaction_count=agent.interaction_count,
                episodic_memory_count=len(agent.episodic_memory),
                semantic_memory_count=len(agent.semantic_memory),
                relationship_count=len(agent.relationships),
                last_interaction=datetime.utcnow() if agent.interaction_count > 0 else None
            )
            
            db.add(db_agent)
            await db.flush()  # Get the ID
            
            # Create relationships
            for entity_id, relationship in agent.relationships.items():
                await self._create_relationship(db, db_agent.id, relationship)
            
            # Create memories
            for memory in agent.episodic_memory:
                await self._create_memory(db, db_agent.id, memory)
            
            # Create growth milestones
            for milestone in agent.personality_evolution.growth_milestones:
                await self._create_growth_milestone(db, db_agent.id, milestone)
            
            await db.commit()
            logger.info(f"✅ Created living agent: {agent.name} ({agent.agent_id})")
            return db_agent
            
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to create agent {agent.name}: {str(e)}")
            raise
    
    async def get_agent_by_id(self, db: AsyncSession, agent_id: str) -> Optional[LivingAgent]:
        """Get agent by ID with all relationships loaded"""
        try:
            result = await db.execute(
                select(LivingAgent)
                .options(
                    selectinload(LivingAgent.relationships),
                    selectinload(LivingAgent.memories),
                    selectinload(LivingAgent.growth_milestones)
                )
                .where(LivingAgent.agent_id == agent_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"❌ Failed to get agent {agent_id}: {str(e)}")
            return None
    
    async def get_user_agents(self, db: AsyncSession, user_id: str) -> List[LivingAgent]:
        """Get all agents for a specific user"""
        try:
            result = await db.execute(
                select(LivingAgent)
                .options(
                    selectinload(LivingAgent.relationships),
                    selectinload(LivingAgent.memories),
                    selectinload(LivingAgent.growth_milestones)
                )
                .where(LivingAgent.user_id == user_id)
                .order_by(desc(LivingAgent.created_at))
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"❌ Failed to get agents for user {user_id}: {str(e)}")
            return []
    
    async def update_agent_state(self, db: AsyncSession, agent_id: str, 
                               mood_state: Dict, context: Dict, evolution: Dict,
                               interaction_count: int) -> bool:
        """Update agent's dynamic state efficiently"""
        try:
            await db.execute(
                update(LivingAgent)
                .where(LivingAgent.agent_id == agent_id)
                .values(
                    current_mood=mood_state,
                    current_context=context,
                    personality_evolution=evolution,
                    interaction_count=interaction_count,
                    last_interaction=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
            )
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to update agent state {agent_id}: {str(e)}")
            return False
    
    async def delete_agent(self, db: AsyncSession, agent_id: str) -> bool:
        """Delete agent and all related data"""
        try:
            await db.execute(
                delete(LivingAgent).where(LivingAgent.agent_id == agent_id)
            )
            await db.commit()
            logger.info(f"✅ Deleted agent: {agent_id}")
            return True
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to delete agent {agent_id}: {str(e)}")
            return False
    
    # ===== RELATIONSHIP OPERATIONS =====
    
    async def create_relationship(self, db: AsyncSession, agent_id: str, entity_id: str,
                                entity_type: str, entity_name: str = None) -> AgentRelationship:
        """Create a new relationship"""
        try:
            # Get the database agent ID
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                raise ValueError(f"Agent {agent_id} not found")
            
            relationship = AgentRelationship(
                agent_id=db_agent.id,
                entity_id=entity_id,
                entity_type=entity_type,
                entity_name=entity_name
            )
            
            db.add(relationship)
            await db.commit()
            return relationship
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to create relationship: {str(e)}")
            raise
    
    async def update_relationship(self, db: AsyncSession, agent_id: str, entity_id: str,
                                updates: Dict) -> bool:
        """Update relationship metrics"""
        try:
            # Get the database agent ID
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                return False
            
            await db.execute(
                update(AgentRelationship)
                .where(
                    and_(
                        AgentRelationship.agent_id == db_agent.id,
                        AgentRelationship.entity_id == entity_id
                    )
                )
                .values(**updates, updated_at=datetime.utcnow())
            )
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to update relationship: {str(e)}")
            return False
    
    async def get_agent_relationships(self, db: AsyncSession, agent_id: str) -> List[AgentRelationship]:
        """Get all relationships for an agent"""
        try:
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                return []
            
            result = await db.execute(
                select(AgentRelationship)
                .where(AgentRelationship.agent_id == db_agent.id)
                .order_by(desc(AgentRelationship.last_interaction))
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"❌ Failed to get relationships for {agent_id}: {str(e)}")
            return []
    
    # ===== MEMORY OPERATIONS =====
    
    async def create_memory(self, db: AsyncSession, agent_id: str, memory_type: str,
                          content: str, emotional_weight: float = 0.0,
                          importance_score: float = 0.5, tags: List[str] = None,
                          related_entities: List[str] = None) -> AgentMemory:
        """Create a new memory"""
        try:
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                raise ValueError(f"Agent {agent_id} not found")
            
            memory = AgentMemory(
                agent_id=db_agent.id,
                memory_type=memory_type,
                content=content,
                emotional_weight=emotional_weight,
                importance_score=importance_score,
                tags=tags or [],
                related_entities=related_entities or []
            )
            
            db.add(memory)
            
            # Update memory count
            await db.execute(
                update(LivingAgent)
                .where(LivingAgent.id == db_agent.id)
                .values(episodic_memory_count=LivingAgent.episodic_memory_count + 1)
            )
            
            await db.commit()
            return memory
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to create memory: {str(e)}")
            raise
    
    async def get_agent_memories(self, db: AsyncSession, agent_id: str,
                               memory_type: str = None, limit: int = 50) -> List[AgentMemory]:
        """Get agent memories with optional filtering"""
        try:
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                return []
            
            query = select(AgentMemory).where(AgentMemory.agent_id == db_agent.id)
            
            if memory_type:
                query = query.where(AgentMemory.memory_type == memory_type)
            
            query = query.order_by(desc(AgentMemory.timestamp)).limit(limit)
            
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"❌ Failed to get memories for {agent_id}: {str(e)}")
            return []
    
    async def search_memories(self, db: AsyncSession, agent_id: str, 
                            search_term: str, limit: int = 20) -> List[AgentMemory]:
        """Search agent memories by content"""
        try:
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                return []
            
            result = await db.execute(
                select(AgentMemory)
                .where(
                    and_(
                        AgentMemory.agent_id == db_agent.id,
                        func.lower(AgentMemory.content).like(f"%{search_term.lower()}%")
                    )
                )
                .order_by(desc(AgentMemory.importance_score), desc(AgentMemory.timestamp))
                .limit(limit)
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"❌ Failed to search memories: {str(e)}")
            return []
    
    # ===== GROWTH & EVOLUTION OPERATIONS =====
    
    async def create_growth_milestone(self, db: AsyncSession, agent_id: str,
                                    milestone_type: str, title: str, description: str,
                                    trigger_event: str, significance_score: float = 1.0) -> GrowthMilestone:
        """Create a growth milestone"""
        try:
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                raise ValueError(f"Agent {agent_id} not found")
            
            # Get milestone number
            result = await db.execute(
                select(func.count(GrowthMilestone.id))
                .where(GrowthMilestone.agent_id == db_agent.id)
            )
            milestone_number = (result.scalar() or 0) + 1
            
            milestone = GrowthMilestone(
                agent_id=db_agent.id,
                milestone_type=milestone_type,
                title=title,
                description=description,
                trigger_event=trigger_event,
                significance_score=significance_score,
                milestone_number=milestone_number
            )
            
            db.add(milestone)
            await db.commit()
            return milestone
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to create growth milestone: {str(e)}")
            raise
    
    async def get_agent_milestones(self, db: AsyncSession, agent_id: str) -> List[GrowthMilestone]:
        """Get all growth milestones for an agent"""
        try:
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                return []
            
            result = await db.execute(
                select(GrowthMilestone)
                .where(GrowthMilestone.agent_id == db_agent.id)
                .order_by(desc(GrowthMilestone.achieved_at))
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"❌ Failed to get milestones for {agent_id}: {str(e)}")
            return []
    
    # ===== INTERACTION LOGGING =====
    
    async def log_interaction(self, db: AsyncSession, agent_id: str, interaction_type: str,
                            user_id: str = None, user_input: str = None, 
                            agent_response: str = None, context_data: Dict = None,
                            processing_time: float = None) -> AgentInteraction:
        """Log an agent interaction"""
        try:
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                raise ValueError(f"Agent {agent_id} not found")
            
            interaction = AgentInteraction(
                agent_id=db_agent.id,
                interaction_type=interaction_type,
                user_id=user_id,
                user_input=user_input,
                agent_response=agent_response,
                context_data=context_data,
                processing_time=processing_time
            )
            
            db.add(interaction)
            await db.commit()
            return interaction
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to log interaction: {str(e)}")
            raise
    
    # ===== ANALYTICS & INSIGHTS =====
    
    async def get_agent_analytics(self, db: AsyncSession, agent_id: str) -> Dict:
        """Get comprehensive agent analytics"""
        try:
            db_agent = await self.get_agent_by_id(db, agent_id)
            if not db_agent:
                return {}
            
            # Get relationship stats
            relationship_result = await db.execute(
                select(
                    func.count(AgentRelationship.id).label('total_relationships'),
                    func.avg(AgentRelationship.trust_score).label('avg_trust'),
                    func.avg(AgentRelationship.familiarity_level).label('avg_familiarity'),
                    func.avg(AgentRelationship.emotional_bond).label('avg_bond')
                )
                .where(AgentRelationship.agent_id == db_agent.id)
            )
            relationship_stats = relationship_result.first()
            
            # Get memory stats
            memory_result = await db.execute(
                select(
                    func.count(AgentMemory.id).label('total_memories'),
                    func.avg(AgentMemory.importance_score).label('avg_importance'),
                    func.avg(AgentMemory.emotional_weight).label('avg_emotional_weight')
                )
                .where(AgentMemory.agent_id == db_agent.id)
            )
            memory_stats = memory_result.first()
            
            # Get growth stats
            growth_result = await db.execute(
                select(func.count(GrowthMilestone.id).label('total_milestones'))
                .where(GrowthMilestone.agent_id == db_agent.id)
            )
            growth_stats = growth_result.first()
            
            return {
                'agent_id': agent_id,
                'interaction_count': db_agent.interaction_count,
                'relationship_stats': {
                    'total_relationships': relationship_stats.total_relationships or 0,
                    'average_trust': float(relationship_stats.avg_trust or 0),
                    'average_familiarity': float(relationship_stats.avg_familiarity or 0),
                    'average_emotional_bond': float(relationship_stats.avg_bond or 0)
                },
                'memory_stats': {
                    'total_memories': memory_stats.total_memories or 0,
                    'average_importance': float(memory_stats.avg_importance or 0),
                    'average_emotional_weight': float(memory_stats.avg_emotional_weight or 0)
                },
                'growth_stats': {
                    'total_milestones': growth_stats.total_milestones or 0
                },
                'created_at': db_agent.created_at.isoformat(),
                'last_interaction': db_agent.last_interaction.isoformat() if db_agent.last_interaction else None
            }
        except Exception as e:
            logger.error(f"❌ Failed to get analytics for {agent_id}: {str(e)}")
            return {}
    
    # ===== UTILITY METHODS =====
    
    async def _create_relationship(self, db: AsyncSession, agent_db_id: str, relationship) -> AgentRelationship:
        """Internal method to create relationship from core object"""
        db_relationship = AgentRelationship(
            agent_id=agent_db_id,
            entity_id=relationship.entity_id,
            entity_type=relationship.entity_type,
            familiarity_level=relationship.familiarity_level,
            trust_score=relationship.trust_score,
            emotional_bond=relationship.emotional_bond,
            interaction_count=relationship.interaction_count,
            positive_interactions=relationship.positive_interactions,
            challenging_interactions=relationship.challenging_interactions,
            shared_experiences=relationship.shared_experiences,
            inside_jokes=relationship.inside_jokes,
            communication_preferences=relationship.communication_preferences,
            last_interaction=relationship.last_interaction
        )
        db.add(db_relationship)
        return db_relationship
    
    async def _create_memory(self, db: AsyncSession, agent_db_id: str, memory) -> AgentMemory:
        """Internal method to create memory from core object"""
        db_memory = AgentMemory(
            agent_id=agent_db_id,
            memory_type=memory.type,
            content=memory.content,
            emotional_weight=memory.emotional_weight,
            importance_score=memory.importance_score,
            tags=memory.tags,
            related_entities=memory.related_entities,
            timestamp=memory.timestamp
        )
        db.add(db_memory)
        return db_memory
    
    async def _create_growth_milestone(self, db: AsyncSession, agent_db_id: str, milestone: Dict) -> GrowthMilestone:
        """Internal method to create growth milestone from dict"""
        db_milestone = GrowthMilestone(
            agent_id=agent_db_id,
            milestone_type=milestone.get('type', 'general'),
            title=milestone.get('description', 'Growth Milestone'),
            description=milestone.get('description', ''),
            trigger_event=milestone.get('trigger_event', 'Unknown'),
            significance_score=1.0,
            milestone_number=milestone.get('milestone_number', 1)
        )
        db.add(db_milestone)
        return db_milestone 