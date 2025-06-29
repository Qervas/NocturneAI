"""
Living Agent Service - Business Logic Layer
Bridges the Living Agent core system with database persistence.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.agents.living_agent_system import (
    LivingAgentSystem, LivingAgent as LivingAgentCore, 
    Relationship, MoodState, PersonalityEvolution, Memory
)
from app.services.living_agent_repository import LivingAgentRepository
from app.models.living_agents import LivingAgent as LivingAgentDB
import uuid

logger = logging.getLogger(__name__)


class LivingAgentService:
    """Service layer for Living Agent operations with persistence"""
    
    def __init__(self):
        self.repository = LivingAgentRepository()
        self.living_system = LivingAgentSystem()
    
    # ===== AGENT LIFECYCLE =====
    
    async def initialize_agent(self, db: AsyncSession, user_id: str, 
                             name: str, role: str, personality_traits: Dict) -> Dict:
        """Initialize a new living agent with persistence"""
        try:
            # Create agent using the core system
            agent_id = str(uuid.uuid4())
            core_agent = self.living_system.initialize_agent(
                agent_id=agent_id,
                user_id=user_id,
                name=name,
                role=role,
                personality_traits=personality_traits
            )
            
            # Persist to database
            db_agent = await self.repository.create_agent(db, core_agent, user_id)
            
            logger.info(f"✅ Initialized living agent: {name} ({agent_id})")
            
            return {
                "success": True,
                "agent_id": agent_id,
                "name": name,
                "role": role,
                "personality": core_agent.core_personality,
                "mood": core_agent.mood.to_dict(),
                "message": f"Living agent '{name}' initialized successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize agent {name}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to initialize agent '{name}'"
            }
    
    async def get_agent(self, db: AsyncSession, agent_id: str) -> Optional[Dict]:
        """Get agent with current state"""
        try:
            # Get from database
            db_agent = await self.repository.get_agent_by_id(db, agent_id)
            if not db_agent:
                return None
            
            # Convert to response format
            return {
                "agent_id": db_agent.agent_id,
                "name": db_agent.name,
                "role": db_agent.role,
                "core_personality": db_agent.core_personality,
                "current_mood": db_agent.current_mood,
                "current_context": db_agent.current_context,
                "personality_evolution": db_agent.personality_evolution,
                "interaction_count": db_agent.interaction_count,
                "memory_counts": {
                    "episodic": db_agent.episodic_memory_count,
                    "semantic": db_agent.semantic_memory_count
                },
                "relationship_count": db_agent.relationship_count,
                "created_at": db_agent.created_at.isoformat(),
                "last_interaction": db_agent.last_interaction.isoformat() if db_agent.last_interaction else None
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get agent {agent_id}: {str(e)}")
            return None
    
    async def get_user_agents(self, db: AsyncSession, user_id: str) -> List[Dict]:
        """Get all agents for a user"""
        try:
            db_agents = await self.repository.get_user_agents(db, user_id)
            
            return [{
                "agent_id": agent.agent_id,
                "name": agent.name,
                "role": agent.role,
                "current_mood": agent.current_mood,
                "interaction_count": agent.interaction_count,
                "relationship_count": agent.relationship_count,
                "created_at": agent.created_at.isoformat(),
                "last_interaction": agent.last_interaction.isoformat() if agent.last_interaction else None
            } for agent in db_agents]
            
        except Exception as e:
            logger.error(f"❌ Failed to get agents for user {user_id}: {str(e)}")
            return []
    
    async def delete_agent(self, db: AsyncSession, agent_id: str) -> Dict:
        """Delete an agent and all related data"""
        try:
            success = await self.repository.delete_agent(db, agent_id)
            
            if success:
                # Also remove from in-memory system if loaded
                if agent_id in self.living_system.agents:
                    del self.living_system.agents[agent_id]
                
                return {
                    "success": True,
                    "message": f"Agent {agent_id} deleted successfully"
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to delete agent {agent_id}"
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to delete agent {agent_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Error deleting agent {agent_id}"
            }
    
    # ===== AGENT INTERACTION =====
    
    async def interact_with_agent(self, db: AsyncSession, agent_id: str, 
                                user_id: str, user_input: str, 
                                context: Dict = None) -> Dict:
        """Process user interaction with agent - SIMPLIFIED VERSION"""
        try:
            logger.info(f"🔍 Starting interaction with agent {agent_id} for user {user_id}")
            start_time = datetime.utcnow()
            
            # Get agent from database
            logger.info(f"🔍 Looking up agent {agent_id} in database...")
            db_agent = await self.repository.get_agent_by_id(db, agent_id)
            if not db_agent:
                logger.error(f"❌ Agent {agent_id} not found in database")
                return {
                    "success": False,
                    "error": "Agent not found",
                    "message": f"Agent {agent_id} not found"
                }
            
            logger.info(f"✅ Found agent: {db_agent.name}")
            
            # Generate a response based on agent's personality
            response_text = await self._generate_personality_response(db_agent, user_input, context)
            logger.info(f"✅ Generated response: {response_text[:100]}...")
            
            # Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Log interaction to database
            await self.repository.log_interaction(
                db=db,
                agent_id=agent_id,
                interaction_type="user_message",
                user_id=user_id,
                user_input=user_input,
                agent_response=response_text,
                context_data=context,
                processing_time=processing_time
            )
            
            # Update interaction count
            await self.repository.update_agent_state(
                db=db,
                agent_id=agent_id,
                mood_state=db_agent.current_mood,
                context=db_agent.current_context,
                evolution=db_agent.personality_evolution,
                interaction_count=db_agent.interaction_count + 1
            )
            
            logger.info(f"✅ Interaction completed successfully")
            
            return {
                "success": True,
                "response": response_text,
                "agent_state": {
                    "mood": db_agent.current_mood,
                    "learning_triggered": False,
                    "evolution_triggered": False
                },
                "processing_time": processing_time,
                "interaction_count": db_agent.interaction_count + 1
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to process interaction with agent {agent_id}: {str(e)}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to process interaction with agent {agent_id}"
            }
    
    async def _generate_personality_response(self, db_agent, user_input: str, context: Dict = None) -> str:
        """Generate a response based on agent's personality traits"""
        try:
            # Extract personality information
            personality = db_agent.core_personality
            name = db_agent.name
            role = db_agent.role
            
            # Get expertise areas
            expertise = personality.get('expertise', [])
            communication_style = personality.get('communication_style', 'professional')
            core_values = personality.get('core_values', [])
            
            # Create a personality-based response
            if 'product' in user_input.lower() and 'Sarah' in name:
                response = f"Hi! As your Product Strategy advisor, I'd love to help with that. "
                if 'roadmap' in user_input.lower():
                    response += "For product roadmaps, I always recommend starting with user value - what problem are we solving? Let's prioritize features based on user impact and business goals."
                elif 'strategy' in user_input.lower():
                    response += "Great strategic question! I believe in data-driven frameworks. We should validate our assumptions with user research and competitive analysis."
                else:
                    response += "I'm here to help with product strategy, user research, market analysis, and roadmapping. What specific challenge can I assist you with?"
                    
            elif 'market' in user_input.lower() and 'Marcus' in name:
                response = f"Hello! Marcus here, your Market Intelligence advisor. "
                response += "I'm passionate about spotting market opportunities and competitive advantages. What business challenge are you facing?"
                
            elif 'design' in user_input.lower() and 'Elena' in name:
                response = f"Hi there! Elena speaking, your UX Design advisor. "
                response += "I'm all about creating user-centered experiences. Whether it's interface design, user research, or accessibility - I'm here to help!"
                
            elif 'operations' in user_input.lower() and 'David' in name:
                response = f"Hello! David from Operations here. "
                response += "I love systematic approaches and efficient processes. What operational challenge can I help you tackle?"
                
            else:
                # Generic response based on role
                response = f"Hello! I'm {name}, your {role}. "
                if expertise:
                    response += f"I specialize in {', '.join(expertise[:3])}. "
                response += f"How can I assist you today? Feel free to ask me anything related to my expertise!"
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Failed to generate personality response: {str(e)}")
            return f"Hello! I'm {db_agent.name}, your {db_agent.role}. I'm here to help! How can I assist you today?"
    
    # ===== RELATIONSHIP MANAGEMENT =====
    
    async def create_relationship(self, db: AsyncSession, agent_id: str, 
                                entity_id: str, entity_type: str, 
                                entity_name: str = None) -> Dict:
        """Create a relationship between agent and user/other agent"""
        try:
            relationship = await self.repository.create_relationship(
                db=db,
                agent_id=agent_id,
                entity_id=entity_id,
                entity_type=entity_type,
                entity_name=entity_name
            )
            
            return {
                "success": True,
                "relationship_id": relationship.id,
                "message": f"Relationship created between {agent_id} and {entity_id}"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create relationship: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to create relationship"
            }
    
    async def get_agent_relationships(self, db: AsyncSession, agent_id: str) -> List[Dict]:
        """Get all relationships for an agent"""
        try:
            relationships = await self.repository.get_agent_relationships(db, agent_id)
            
            return [{
                "entity_id": rel.entity_id,
                "entity_type": rel.entity_type,
                "entity_name": rel.entity_name,
                "familiarity_level": rel.familiarity_level,
                "trust_score": rel.trust_score,
                "emotional_bond": rel.emotional_bond,
                "interaction_count": rel.interaction_count,
                "positive_interactions": rel.positive_interactions,
                "challenging_interactions": rel.challenging_interactions,
                "last_interaction": rel.last_interaction.isoformat() if rel.last_interaction else None,
                "shared_experiences": rel.shared_experiences,
                "inside_jokes": rel.inside_jokes
            } for rel in relationships]
            
        except Exception as e:
            logger.error(f"❌ Failed to get relationships for {agent_id}: {str(e)}")
            return []
    
    # ===== MEMORY MANAGEMENT =====
    
    async def get_agent_memories(self, db: AsyncSession, agent_id: str, 
                               memory_type: str = None, limit: int = 50) -> List[Dict]:
        """Get agent memories with optional filtering"""
        try:
            memories = await self.repository.get_agent_memories(
                db=db,
                agent_id=agent_id,
                memory_type=memory_type,
                limit=limit
            )
            
            return [{
                "memory_id": memory.id,
                "memory_type": memory.memory_type,
                "content": memory.content,
                "emotional_weight": memory.emotional_weight,
                "importance_score": memory.importance_score,
                "tags": memory.tags,
                "related_entities": memory.related_entities,
                "access_count": memory.access_count,
                "timestamp": memory.timestamp.isoformat(),
                "created_at": memory.created_at.isoformat()
            } for memory in memories]
            
        except Exception as e:
            logger.error(f"❌ Failed to get memories for {agent_id}: {str(e)}")
            return []
    
    async def search_agent_memories(self, db: AsyncSession, agent_id: str, 
                                  search_term: str, limit: int = 20) -> List[Dict]:
        """Search agent memories by content"""
        try:
            memories = await self.repository.search_memories(
                db=db,
                agent_id=agent_id,
                search_term=search_term,
                limit=limit
            )
            
            return [{
                "memory_id": memory.id,
                "memory_type": memory.memory_type,
                "content": memory.content,
                "emotional_weight": memory.emotional_weight,
                "importance_score": memory.importance_score,
                "tags": memory.tags,
                "timestamp": memory.timestamp.isoformat()
            } for memory in memories]
            
        except Exception as e:
            logger.error(f"❌ Failed to search memories for {agent_id}: {str(e)}")
            return []
    
    # ===== GROWTH & ANALYTICS =====
    
    async def get_agent_milestones(self, db: AsyncSession, agent_id: str) -> List[Dict]:
        """Get agent growth milestones"""
        try:
            milestones = await self.repository.get_agent_milestones(db, agent_id)
            
            return [{
                "milestone_id": milestone.id,
                "milestone_type": milestone.milestone_type,
                "title": milestone.title,
                "description": milestone.description,
                "trigger_event": milestone.trigger_event,
                "significance_score": milestone.significance_score,
                "milestone_number": milestone.milestone_number,
                "achieved_at": milestone.achieved_at.isoformat()
            } for milestone in milestones]
            
        except Exception as e:
            logger.error(f"❌ Failed to get milestones for {agent_id}: {str(e)}")
            return []
    
    async def get_agent_analytics(self, db: AsyncSession, agent_id: str) -> Dict:
        """Get comprehensive agent analytics"""
        try:
            return await self.repository.get_agent_analytics(db, agent_id)
        except Exception as e:
            logger.error(f"❌ Failed to get analytics for {agent_id}: {str(e)}")
            return {}
    
    # ===== UTILITY METHODS =====
    
    async def _load_agent_to_memory(self, db: AsyncSession, agent_id: str) -> bool:
        """Load agent from database to in-memory system"""
        try:
            db_agent = await self.repository.get_agent_by_id(db, agent_id)
            if not db_agent:
                return False
            
            # Recreate core agent object
            from app.core.agents.living_agent_system import LivingAgent
            core_agent = LivingAgent(
                agent_id=db_agent.agent_id,
                name=db_agent.name,
                role=db_agent.role,
                core_personality=db_agent.core_personality
            )
            
            # Restore state
            from app.core.agents.living_agent_system import MoodState
            core_agent.mood = MoodState.from_dict(db_agent.current_mood)
            core_agent.current_context = db_agent.current_context
            core_agent.interaction_count = db_agent.interaction_count
            
            # Add to memory
            self.living_system.agents[agent_id] = core_agent
            
            logger.info(f"✅ Loaded agent {agent_id} to memory")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load agent {agent_id} to memory: {str(e)}")
            return False
    
    async def _sync_agent_to_database(self, db: AsyncSession, agent_id: str) -> bool:
        """Sync in-memory agent state back to database"""
        try:
            agent = self.living_system.agents.get(agent_id)
            if not agent:
                return False
            
            success = await self.repository.update_agent_state(
                db=db,
                agent_id=agent_id,
                mood_state=agent.mood.to_dict(),
                context=agent.current_context,
                evolution=agent.personality_evolution.to_dict(),
                interaction_count=agent.interaction_count
            )
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Failed to sync agent {agent_id} to database: {str(e)}")
            return False 