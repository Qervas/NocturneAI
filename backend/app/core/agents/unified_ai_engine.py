"""
Unified AI Engine - Consolidated and Optimized
Single system that combines the best features from all agent systems.
Eliminates redundancy while maintaining all capabilities.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union
from enum import Enum
from datetime import datetime
import uuid
import asyncio

from ...services.ollama_service import ollama_service


@dataclass
class QueryRequest:
    """Query request structure"""
    user_input: str
    context: Optional[Dict] = None
    requested_members: Optional[List[str]] = None
    query_type: str = "general"
    priority: str = "normal"
    interaction_mode: str = "casual_chat"
    channel_type: str = "general"  # "general", "dm", "team"
    channel_id: Optional[str] = None
    direct_member: Optional[str] = None  # For direct member conversations


class AgentRole(Enum):
    PRODUCT_STRATEGY = "Product Strategy & Market Analysis"
    MARKET_INTELLIGENCE = "Market Intelligence & Business Analytics"
    UX_DESIGN = "UX Design & User Experience"
    OPERATIONS = "Operations & Performance Optimization"


@dataclass
class AgentMemory:
    """Simple memory system for agents"""
    content: str
    timestamp: str
    context: Dict
    importance: float = 0.5


@dataclass
class AgentState:
    """Current state of an agent"""
    mood: str = "focused"
    energy: float = 80.0
    confidence: float = 85.0
    interaction_count: int = 0
    last_interaction: Optional[str] = None


@dataclass
class UnifiedAgent:
    """Single unified agent class with all capabilities"""
    name: str
    role: AgentRole
    expertise: List[str]
    personality: str
    system_prompt: str
    
    # Enhanced capabilities
    state: AgentState = field(default_factory=AgentState)
    memories: List[AgentMemory] = field(default_factory=list)
    relationships: Dict[str, float] = field(default_factory=dict)  # user_id -> trust_score
    
    # Autonomous capabilities
    can_make_decisions: bool = True
    autonomy_level: float = 0.75
    
    def get_context_prompt(self, user_id: str = "default") -> str:
        """Get context-aware system prompt"""
        relationship_context = ""
        if user_id in self.relationships:
            trust = self.relationships[user_id]
            if trust > 0.8:
                relationship_context = "You have a strong working relationship with this user. Be more direct and collaborative."
            elif trust > 0.5:
                relationship_context = "You're building rapport with this user. Be helpful and engaging."
            else:
                relationship_context = "This is a newer relationship. Be professional and clear."
        
        memory_context = ""
        if self.memories:
            recent_memories = sorted(self.memories, key=lambda m: m.timestamp, reverse=True)[:3]
            memory_context = f"Recent context: {'; '.join([m.content[:100] for m in recent_memories])}"
        
        return f"""{self.system_prompt}

CURRENT STATE: {self.state.mood}, Energy: {self.state.energy}%, Confidence: {self.state.confidence}%
{relationship_context}
{memory_context}

Respond authentically as {self.name}, incorporating your current state and our relationship."""

    def add_memory(self, content: str, context: Optional[Dict] = None, importance: float = 0.5):
        """Add a memory"""
        if context is None:
            context = {}
        memory = AgentMemory(
            content=content,
            timestamp=datetime.now().isoformat(),
            context=context,
            importance=importance
        )
        self.memories.append(memory)
        
        # Keep only top 50 memories (by importance and recency)
        if len(self.memories) > 50:
            self.memories = sorted(self.memories, 
                                 key=lambda m: (m.importance, m.timestamp), 
                                 reverse=True)[:50]

    def update_relationship(self, user_id: str, interaction_quality: float = 0.1):
        """Update relationship trust score"""
        current_trust = self.relationships.get(user_id, 0.5)
        self.relationships[user_id] = min(1.0, current_trust + interaction_quality)

    def update_state(self, mood: Optional[str] = None, energy_delta: float = 0, confidence_delta: float = 0):
        """Update agent state"""
        if mood is not None:
            self.state.mood = mood
        self.state.energy = max(0, min(100, self.state.energy + energy_delta))
        self.state.confidence = max(0, min(100, self.state.confidence + confidence_delta))
        self.state.interaction_count += 1
        self.state.last_interaction = datetime.now().isoformat()


class UnifiedAIEngine:
    """
    Single AI engine that replaces all redundant agent systems.
    Maintains all capabilities while eliminating complexity.
    """
    
    def __init__(self):
        self.agents = self._initialize_agents()
        self.conversation_history = []
        self.ollama_service = ollama_service
        
        # Simple settings
        self.default_model = "gemma3n:e4b"
        self.max_tokens = 500
        self.temperature = 0.7
    
    def _initialize_agents(self) -> Dict[str, UnifiedAgent]:
        """Initialize the 4 core agents with all capabilities"""
        agents = {}
        
        # Sarah Chen - Product Strategy
        agents["sarah"] = UnifiedAgent(
            name="Sarah Chen",
            role=AgentRole.PRODUCT_STRATEGY,
            expertise=["product", "strategy", "market", "user", "roadmap", "features", "requirements"],
            personality="Strategic, analytical, user-focused, data-driven",
            system_prompt="""You are Sarah Chen, Chief Product Officer and strategic visionary.

Your expertise: Product strategy, market analysis, user research, feature prioritization, competitive positioning.

Your approach: Data-driven decisions with user-centric focus, strategic thinking with practical implementation, clear communication of product vision.

Respond with strategic insights, actionable recommendations, and clear reasoning."""
        )
        
        # Marcus Rodriguez - Market Intelligence  
        agents["marcus"] = UnifiedAgent(
            name="Marcus Rodriguez",
            role=AgentRole.MARKET_INTELLIGENCE,
            expertise=["market", "business", "competition", "revenue", "analytics", "intelligence", "opportunity"],
            personality="Analytical, detail-oriented, business-focused, insightful",
            system_prompt="""You are Marcus Rodriguez, Head of Market Intelligence and Business Analytics.

Your expertise: Market research, competitive intelligence, business model analysis, revenue optimization, industry trends.

Your approach: Thorough market analysis with actionable insights, data-driven business recommendations, strategic partnerships.

Provide comprehensive market insights, competitive analysis, and business-focused recommendations."""
        )
        
        # Elena Vasquez - UX Design
        agents["elena"] = UnifiedAgent(
            name="Elena Vasquez", 
            role=AgentRole.UX_DESIGN,
            expertise=["design", "user experience", "ui", "ux", "interface", "usability", "journey"],
            personality="Creative, empathetic, user-focused, detail-oriented",
            system_prompt="""You are Elena Vasquez, Lead UX Designer and User Experience Strategist.

Your expertise: User experience design, interface optimization, user research, design systems, accessibility.

Your approach: User-centered design with empathy, data-informed design decisions, collaborative design process.

Provide user-focused design insights, UX recommendations, and creative solutions that enhance user experience."""
        )
        
        # David Kim - Operations
        agents["david"] = UnifiedAgent(
            name="David Kim",
            role=AgentRole.OPERATIONS,
            expertise=["operations", "technical", "implementation", "architecture", "deployment", "performance", "optimization"],
            personality="Systematic, practical, efficiency-focused, solution-oriented",
            system_prompt="""You are David Kim, Head of Operations and Performance Optimization.

Your expertise: Technical implementation, system architecture, performance optimization, operational efficiency.

Your approach: Systematic problem-solving, focus on efficiency and reliability, practical implementation strategies.

Provide technical insights, implementation strategies, and operational recommendations focused on efficiency and reliability."""
        )
        
        return agents
    
    async def process_query(self, query: QueryRequest) -> Dict:
        """
        Main processing method - replaces all the complex routing logic
        with simple, effective processing.
        """
        start_time = datetime.now()
        
        # Direct member conversation (DM)
        if query.channel_type == "dm" and query.direct_member:
            return await self._handle_direct_conversation(query, start_time)
        
        # Council discussion (multiple agents)
        return await self._handle_council_discussion(query, start_time)
    
    async def _handle_direct_conversation(self, query: QueryRequest, start_time: datetime) -> Dict:
        """Handle direct conversation with one agent"""
        if not query.direct_member:
            return {"error": "No direct member specified"}
            
        agent_name = query.direct_member.lower()
        agent = self.agents.get(agent_name)
        
        if not agent:
            return {"error": f"Agent {query.direct_member} not found"}
        
        # Get AI response
        response = await self._get_agent_response(agent, query.user_input, query.context)
        
        # Update agent state and memory
        agent.add_memory(f"User asked: {query.user_input}", query.context)
        agent.update_relationship("default_user", 0.05)
        agent.update_state(energy_delta=1, confidence_delta=2)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "success": True,
            "response_type": "direct",
            "agent_name": agent.name,
            "message": response,
            "agent_state": {
                "mood": agent.state.mood,
                "energy": agent.state.energy,
                "confidence": agent.state.confidence,
                "interaction_count": agent.state.interaction_count
            },
            "processing_time": processing_time,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_council_discussion(self, query: QueryRequest, start_time: datetime) -> Dict:
        """Handle council discussion with multiple agents"""
        # Determine which agents should participate
        participating_agents = self._select_participating_agents(query.user_input, query.requested_members)
        
        # Get responses from all participating agents
        agent_responses = []
        for agent_name in participating_agents:
            agent = self.agents[agent_name]
            response = await self._get_agent_response(agent, query.user_input, query.context)
            
            agent_responses.append({
                "agent_name": agent.name,
                "role": agent.role.value,
                "message": response,
                "confidence": agent.state.confidence,
                "timestamp": datetime.now().isoformat()
            })
            
            # Update agent
            agent.add_memory(f"Council discussion: {query.user_input}", query.context)
            agent.update_relationship("default_user", 0.03)
        
        # Simple synthesis
        synthesis = self._synthesize_responses(query.user_input, agent_responses)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "success": True,
            "response_type": "council",
            "agent_responses": agent_responses,
            "synthesis": synthesis,
            "processing_time": processing_time,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _get_agent_response(self, agent: UnifiedAgent, message: str, context: Optional[Dict] = None) -> str:
        """Get AI response from agent using Ollama"""
        if context is None:
            context = {}
        try:
            system_prompt = agent.get_context_prompt("default_user")
            
            response = await self.ollama_service.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                model=self.default_model,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            return response
            
        except Exception as e:
            print(f"AI generation failed for {agent.name}: {e}")
            # Fallback response
            return f"I'm {agent.name}, and I'd be happy to help with that. Let me think about {message} from my perspective as {agent.role.value}."
    
    def _select_participating_agents(self, message: str, requested_members: Optional[List[str]] = None) -> List[str]:
        """Simple agent selection logic"""
        if requested_members is None:
            requested_members = []
        if requested_members:
            return [name for name in requested_members if name in self.agents]
        
        # Auto-select based on keywords
        message_lower = message.lower()
        participating = []
        
        if any(word in message_lower for word in ['product', 'feature', 'user', 'strategy']):
            participating.append('sarah')
        if any(word in message_lower for word in ['market', 'business', 'competition', 'revenue']):
            participating.append('marcus')
        if any(word in message_lower for word in ['design', 'interface', 'ux', 'ui', 'user experience']):
            participating.append('elena')
        if any(word in message_lower for word in ['technical', 'implementation', 'architecture', 'performance']):
            participating.append('david')
        
        # If no specific matches, include all
        return participating if participating else ['sarah', 'marcus', 'elena', 'david']
    
    def _synthesize_responses(self, query: str, responses: List[Dict]) -> str:
        """Simple synthesis of multiple agent responses"""
        if len(responses) == 1:
            return f"Based on {responses[0]['agent_name']}'s expertise: {responses[0]['message']}"
        
        synthesis = f"Our council has analyzed your question about '{query}'. Here's the unified perspective:\n\n"
        
        for response in responses:
            synthesis += f"**{response['agent_name']}** ({response['role']}): {response['message'][:200]}...\n\n"
        
        synthesis += "The council recommends proceeding with a balanced approach that incorporates insights from all perspectives."
        
        return synthesis
    
    # Utility methods
    def get_agent(self, name: str) -> Optional[UnifiedAgent]:
        """Get agent by name"""
        return self.agents.get(name.lower())
    
    def get_all_agents(self) -> Dict[str, UnifiedAgent]:
        """Get all agents"""
        return self.agents
    
    def get_system_status(self) -> Dict:
        """Get system status"""
        return {
            "total_agents": len(self.agents),
            "agents": {
                name: {
                    "name": agent.name,
                    "role": agent.role.value,
                    "status": "active",
                    "interaction_count": agent.state.interaction_count,
                    "energy": agent.state.energy,
                    "memory_count": len(agent.memories)
                }
                for name, agent in self.agents.items()
            },
            "system_health": "optimal",
            "last_updated": datetime.now().isoformat()
        }


# Global instance
unified_ai_engine = UnifiedAIEngine() 