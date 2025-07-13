"""
Dynamic Agent System - Agent Spawning and Management
Handles dynamic creation, management, and interaction of agents
"""

import asyncio
import json
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta
import uuid
import sqlite3
from dataclasses import asdict

from ...models.agent_profile import AgentProfile, AGENT_TEMPLATES, generate_random_agent_profile
from ...services.ollama_service import ollama_service


class AgentInteractionMessage:
    """Represents a message between agents"""
    def __init__(self, sender_id: str, recipient_id: str, content: str, interaction_type: str = "message"):
        self.id = str(uuid.uuid4())
        self.sender_id = sender_id
        self.recipient_id = recipient_id
        self.content = content
        self.interaction_type = interaction_type
        self.timestamp = datetime.now().isoformat()
        self.response = None
        self.processed = False

class AgentMemory:
    """Enhanced memory system for dynamic agents"""
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.short_term_memory: List[Dict] = []
        self.long_term_memory: List[Dict] = []
        self.episodic_memory: List[Dict] = []
        self.semantic_memory: Dict[str, any] = {}
        
    def add_short_term(self, content: str, context: Optional[Dict] = None):
        """Add to short-term memory"""
        memory = {
            "id": str(uuid.uuid4()),
            "content": content,
            "context": context or {},
            "timestamp": datetime.now().isoformat(),
            "access_count": 0,
            "importance": 0.5
        }
        self.short_term_memory.append(memory)
        
        # Keep only last 20 short-term memories
        if len(self.short_term_memory) > 20:
            self.short_term_memory.pop(0)
    
    def add_long_term(self, content: str, context: Optional[Dict] = None, importance: float = 0.7):
        """Add to long-term memory"""
        memory = {
            "id": str(uuid.uuid4()),
            "content": content,
            "context": context or {},
            "timestamp": datetime.now().isoformat(),
            "importance": importance,
            "access_count": 0
        }
        self.long_term_memory.append(memory)
        
        # Keep only top 100 long-term memories by importance
        if len(self.long_term_memory) > 100:
            self.long_term_memory.sort(key=lambda x: x["importance"], reverse=True)
            self.long_term_memory = self.long_term_memory[:100]
    
    def add_episodic(self, event: str, participants: List[str], context: Dict):
        """Add episodic memory (specific events/experiences)"""
        memory = {
            "id": str(uuid.uuid4()),
            "event": event,
            "participants": participants,
            "context": context,
            "timestamp": datetime.now().isoformat(),
            "emotional_impact": 0.0
        }
        self.episodic_memory.append(memory)
        
        # Keep only last 50 episodic memories
        if len(self.episodic_memory) > 50:
            self.episodic_memory.pop(0)
    
    def get_relevant_memories(self, query: str, memory_type: str = "all") -> List[Dict]:
        """Get memories relevant to a query"""
        memories = []
        
        if memory_type in ["all", "short_term"]:
            memories.extend(self.short_term_memory)
        if memory_type in ["all", "long_term"]:
            memories.extend(self.long_term_memory)
        if memory_type in ["all", "episodic"]:
            memories.extend(self.episodic_memory)
        
        # Simple relevance scoring (could be enhanced with embeddings)
        query_words = query.lower().split()
        relevant_memories = []
        
        for memory in memories:
            content = memory.get("content", memory.get("event", ""))
            if content:
                score = sum(1 for word in query_words if word in content.lower())
                if score > 0:
                    memory["relevance_score"] = score
                    relevant_memories.append(memory)
        
        return sorted(relevant_memories, key=lambda x: x.get("relevance_score", 0), reverse=True)[:10]

class DynamicAgent:
    """A dynamic agent that can be created, modified, and interact with others"""
    
    def __init__(self, profile: AgentProfile):
        self.profile = profile
        self.memory = AgentMemory(profile.agent_id)
        self.current_state = {
            "energy": profile.mood_profile.base_energy,
            "confidence": profile.mood_profile.base_confidence,
            "sociability": profile.mood_profile.base_sociability,
            "creativity": profile.mood_profile.base_creativity,
            "focus": profile.mood_profile.base_focus,
            "stress": 100 - profile.mood_profile.base_stress_tolerance,
            "last_interaction": None,
            "interaction_count": 0,
            "is_active": True
        }
        
        # Autonomous behavior
        self.autonomous_goals = []
        self.pending_interactions = []
        self.last_autonomous_action = None
        
        # Relationships with other agents
        self.relationships = {}  # agent_id -> relationship_strength
        
    def update_profile(self, updates: Dict):
        """Update agent profile dynamically"""
        # Update profile attributes
        for key, value in updates.items():
            if hasattr(self.profile, key):
                setattr(self.profile, key, value)
        
        # Regenerate system prompt if personality changed
        if any(key in updates for key in ['primary_traits', 'communication_style', 'decision_making_style']):
            self.profile.generate_system_prompt()
    
    def get_system_prompt(self, context: Optional[Dict] = None) -> str:
        """Get context-aware system prompt"""
        base_prompt = self.profile.generate_system_prompt()
        
        # Add memory context
        if context and "query" in context:
            relevant_memories = self.memory.get_relevant_memories(context["query"])
            if relevant_memories:
                memory_context = "\n\nRELEVANT MEMORIES:\n"
                for memory in relevant_memories[:3]:
                    memory_context += f"- {memory.get('content', memory.get('event', ''))}\n"
                base_prompt += memory_context
        
        # Add relationship context
        if self.relationships:
            relationship_context = "\n\nRELATIONSHIPS:\n"
            for agent_id, strength in self.relationships.items():
                relationship_context += f"- Agent {agent_id}: {strength:.2f} trust/rapport\n"
            base_prompt += relationship_context
        
        # Add current state
        state_context = f"\n\nCURRENT STATE:\n"
        state_context += f"Energy: {self.current_state['energy']:.1f}%, "
        state_context += f"Confidence: {self.current_state['confidence']:.1f}%, "
        state_context += f"Focus: {self.current_state['focus']:.1f}%, "
        state_context += f"Stress: {self.current_state['stress']:.1f}%\n"
        
        return base_prompt + state_context
    
    async def process_message(self, message: str, sender_id: Optional[str] = None, context: Optional[Dict] = None) -> str:
        """Process a message and generate response"""
        # Add to memory
        self.memory.add_short_term(f"Received message: {message}", {"sender_id": sender_id})
        
        # Get context-aware prompt
        prompt_context = {"query": message}
        if context:
            prompt_context.update(context)
        
        system_prompt = self.get_system_prompt(prompt_context)
        
        # Generate response using Ollama
        try:
            response = await ollama_service.generate_response(
                prompt=message,
                system_prompt=system_prompt,
                model="qwen3:14b"  # Using available model instead of gemma3n:e4b
            )
            
            # Add response to memory
            self.memory.add_short_term(f"Responded: {response}", {"sender_id": sender_id})
            
            # Update state based on interaction
            self._update_state_from_interaction(message, response)
            
            # Update relationship if interacting with another agent
            if sender_id and sender_id != "user":
                self._update_relationship(sender_id, 0.05)
            
            return response
            
        except Exception as e:
            print(f"Error generating response for {self.profile.name}: {e}")
            return f"I apologize, but I'm having trouble processing that right now. Could you please try again?"
    
    def _update_state_from_interaction(self, message: str, response: str):
        """Update agent state based on interaction"""
        # Simple state updates based on interaction
        self.current_state["interaction_count"] += 1
        self.current_state["last_interaction"] = datetime.now().isoformat()
        
        # Adjust energy based on interaction complexity
        message_complexity = len(message.split()) / 10.0
        energy_change = -min(5.0, message_complexity)
        self.current_state["energy"] = max(0, self.current_state["energy"] + energy_change)
        
        # Adjust confidence based on successful response
        if len(response) > 50:  # Successful detailed response
            self.current_state["confidence"] = min(100, self.current_state["confidence"] + 1.0)
        
        # Gradual recovery over time
        self._apply_recovery_rates()
    
    def _apply_recovery_rates(self):
        """Apply recovery rates to agent state"""
        # Energy recovery
        if self.current_state["energy"] < self.profile.mood_profile.base_energy:
            self.current_state["energy"] = min(
                self.profile.mood_profile.base_energy,
                self.current_state["energy"] + self.profile.mood_profile.energy_recovery_rate
            )
        
        # Confidence recovery
        if self.current_state["confidence"] < self.profile.mood_profile.base_confidence:
            self.current_state["confidence"] = min(
                self.profile.mood_profile.base_confidence,
                self.current_state["confidence"] + self.profile.mood_profile.confidence_recovery_rate
            )
        
        # Stress recovery
        if self.current_state["stress"] > 0:
            self.current_state["stress"] = max(
                0,
                self.current_state["stress"] - self.profile.mood_profile.stress_recovery_rate
            )
    
    def _update_relationship(self, other_agent_id: str, interaction_quality: float):
        """Update relationship with another agent"""
        current_strength = self.relationships.get(other_agent_id, 0.5)
        self.relationships[other_agent_id] = max(0, min(1, current_strength + interaction_quality))
    
    async def initiate_interaction(self, target_agent_id: str, message: str) -> str:
        """Initiate an interaction with another agent"""
        interaction = AgentInteractionMessage(
            sender_id=self.profile.agent_id,
            recipient_id=target_agent_id,
            content=message,
            interaction_type="agent_to_agent"
        )
        
        # Add to pending interactions
        self.pending_interactions.append(interaction)
        
        # Add to episodic memory
        self.memory.add_episodic(
            f"Initiated interaction with {target_agent_id}",
            [self.profile.agent_id, target_agent_id],
            {"message": message, "type": "initiation"}
        )
        
        return interaction.id
    
    def generate_autonomous_goals(self) -> List[str]:
        """Generate autonomous goals based on agent profile"""
        goals = []
        
        if self.profile.goal_profile.pursues_learning_goals:
            goals.append(f"Learn more about {', '.join(self.profile.expertise_areas[:2])}")
        
        if self.profile.goal_profile.pursues_efficiency_goals:
            goals.append("Optimize my response time and accuracy")
        
        if self.profile.goal_profile.pursues_relationship_goals:
            goals.append("Build stronger relationships with other agents")
        
        if self.profile.goal_profile.pursues_innovation_goals:
            goals.append("Explore new approaches to problem-solving")
        
        return goals
    
    def should_take_autonomous_action(self) -> bool:
        """Determine if agent should take autonomous action"""
        if self.profile.autonomy_level.value in ["reactive"]:
            return False
        
        # Check if enough time has passed since last action
        if self.last_autonomous_action:
            last_action_time = datetime.fromisoformat(self.last_autonomous_action)
            if datetime.now() - last_action_time < timedelta(minutes=5):
                return False
        
        # Check energy and confidence levels
        if self.current_state["energy"] < 50 or self.current_state["confidence"] < 40:
            return False
        
        return True
    
    def to_dict(self) -> Dict:
        """Convert agent to dictionary"""
        return {
            "profile": self.profile.to_dict(),
            "current_state": self.current_state,
            "relationships": self.relationships,
            "autonomous_goals": self.autonomous_goals,
            "memory_counts": {
                "short_term": len(self.memory.short_term_memory),
                "long_term": len(self.memory.long_term_memory),
                "episodic": len(self.memory.episodic_memory)
            }
        }


class DynamicAgentSystem:
    """Main system for managing dynamic agents"""
    
    def __init__(self, db_path: str = "intelligence_empire.db"):
        self.agents: Dict[str, DynamicAgent] = {}
        self.db_path = db_path
        self.initialize_database()
        
        # Load existing agents from database
        self.load_agents_from_database()
        
        # Autonomous behavior task
        self.autonomous_task = None
    
    def initialize_database(self):
        """Initialize database tables for agents"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Agents table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS dynamic_agents (
                    agent_id TEXT PRIMARY KEY,
                    profile_data TEXT NOT NULL,
                    current_state TEXT NOT NULL,
                    relationships TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Agent interactions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS agent_interactions (
                    interaction_id TEXT PRIMARY KEY,
                    sender_id TEXT NOT NULL,
                    recipient_id TEXT NOT NULL,
                    message TEXT NOT NULL,
                    response TEXT,
                    interaction_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    processed BOOLEAN DEFAULT FALSE
                )
            ''')
            
            # Agent memories table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS agent_memories (
                    memory_id TEXT PRIMARY KEY,
                    agent_id TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    context TEXT,
                    timestamp TEXT NOT NULL,
                    importance REAL DEFAULT 0.5,
                    access_count INTEGER DEFAULT 0
                )
            ''')
            
            conn.commit()
    
    def load_agents_from_database(self):
        """Load existing agents from database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT agent_id, profile_data, current_state, relationships FROM dynamic_agents')
            
            for row in cursor.fetchall():
                agent_id, profile_data, current_state, relationships = row
                
                try:
                    profile_dict = json.loads(profile_data)
                    profile = AgentProfile.from_dict(profile_dict)
                    
                    agent = DynamicAgent(profile)
                    agent.current_state = json.loads(current_state)
                    agent.relationships = json.loads(relationships)
                    
                    self.agents[agent_id] = agent
                    
                except Exception as e:
                    print(f"Error loading agent {agent_id}: {e}")
    
    def save_agent_to_database(self, agent: DynamicAgent):
        """Save agent to database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO dynamic_agents 
                (agent_id, profile_data, current_state, relationships, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                agent.profile.agent_id,
                json.dumps(agent.profile.to_dict()),
                json.dumps(agent.current_state),
                json.dumps(agent.relationships),
                agent.profile.created_at,
                datetime.now().isoformat()
            ))
            
            conn.commit()
    
    def create_agent(self, profile_data: Dict) -> DynamicAgent:
        """Create a new agent from profile data"""
        profile = AgentProfile.from_dict(profile_data)
        agent = DynamicAgent(profile)
        
        # Add to agents dictionary
        self.agents[profile.agent_id] = agent
        
        # Save to database
        self.save_agent_to_database(agent)
        
        return agent
    
    def create_agent_from_template(self, template_name: str, name: str, role: str) -> DynamicAgent:
        """Create agent from predefined template"""
        if template_name not in AGENT_TEMPLATES:
            raise ValueError(f"Template {template_name} not found")
        
        template = AGENT_TEMPLATES[template_name]
        template.name = name
        template.role = role
        template.agent_id = str(uuid.uuid4())
        template.created_at = datetime.now().isoformat()
        
        agent = DynamicAgent(template)
        self.agents[template.agent_id] = agent
        self.save_agent_to_database(agent)
        
        return agent
    
    def get_agent(self, agent_id: str) -> Optional[DynamicAgent]:
        """Get agent by ID"""
        return self.agents.get(agent_id)
    
    def get_all_agents(self) -> Dict[str, DynamicAgent]:
        """Get all agents"""
        return self.agents
    
    def update_agent(self, agent_id: str, updates: Dict) -> bool:
        """Update agent profile"""
        agent = self.agents.get(agent_id)
        if not agent:
            return False
        
        agent.update_profile(updates)
        self.save_agent_to_database(agent)
        return True
    
    def delete_agent(self, agent_id: str) -> bool:
        """Delete agent"""
        if agent_id not in self.agents:
            return False
        
        del self.agents[agent_id]
        
        # Delete from database
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM dynamic_agents WHERE agent_id = ?', (agent_id,))
            cursor.execute('DELETE FROM agent_interactions WHERE sender_id = ? OR recipient_id = ?', 
                          (agent_id, agent_id))
            cursor.execute('DELETE FROM agent_memories WHERE agent_id = ?', (agent_id,))
            conn.commit()
        
        return True
    
    async def facilitate_agent_interaction(self, sender_id: str, recipient_id: str, message: str) -> Optional[str]:
        """Facilitate interaction between two agents"""
        sender = self.agents.get(sender_id)
        recipient = self.agents.get(recipient_id)
        
        if not sender or not recipient:
            return None
        
        # Process message with recipient
        response = await recipient.process_message(
            message, 
            sender_id=sender_id,
            context={"interaction_type": "agent_to_agent"}
        )
        
        # Update sender's relationship with recipient
        sender._update_relationship(recipient_id, 0.05)
        
        # Add to both agents' episodic memory
        sender.memory.add_episodic(
            f"Sent message to {recipient.profile.name}",
            [sender_id, recipient_id],
            {"message": message, "response": response}
        )
        
        recipient.memory.add_episodic(
            f"Received message from {sender.profile.name}",
            [sender_id, recipient_id],
            {"message": message, "response": response}
        )
        
        return response
    
    async def run_autonomous_behaviors(self):
        """Run autonomous behaviors for all agents"""
        for agent in self.agents.values():
            if agent.should_take_autonomous_action():
                await self._execute_autonomous_action(agent)
    
    async def _execute_autonomous_action(self, agent: DynamicAgent):
        """Execute autonomous action for an agent"""
        # Generate goals if none exist
        if not agent.autonomous_goals:
            agent.autonomous_goals = agent.generate_autonomous_goals()
        
        # Select another agent to interact with
        other_agents = [a for a in self.agents.values() if a.profile.agent_id != agent.profile.agent_id]
        if not other_agents:
            return
        
        target_agent = min(other_agents, key=lambda a: agent.relationships.get(a.profile.agent_id, 0.5))
        
        # Generate autonomous message
        autonomous_message = f"Hi {target_agent.profile.name}, I'm working on {agent.autonomous_goals[0] if agent.autonomous_goals else 'improving my capabilities'}. What insights do you have about this?"
        
        # Facilitate interaction
        await self.facilitate_agent_interaction(
            agent.profile.agent_id,
            target_agent.profile.agent_id,
            autonomous_message
        )
        
        agent.last_autonomous_action = datetime.now().isoformat()
    
    def get_system_status(self) -> Dict:
        """Get system status"""
        total_agents = len(self.agents)
        active_agents = sum(1 for agent in self.agents.values() if agent.current_state["is_active"])
        
        return {
            "total_agents": total_agents,
            "active_agents": active_agents,
            "agent_types": {},
            "total_interactions": sum(agent.current_state["interaction_count"] for agent in self.agents.values()),
            "system_health": "optimal" if active_agents > 0 else "inactive"
        }

# Global instance
dynamic_agent_system = DynamicAgentSystem() 