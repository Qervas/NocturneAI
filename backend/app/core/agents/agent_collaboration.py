"""
Agent Collaboration System - Step 2 Implementation
Enables agents to communicate with each other and collaborate on solutions
"""

from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import uuid

from .agent_network import agent_network, AgentMode, ProactiveResponse, RelevanceScore

class CollaborationType(Enum):
    DISCUSSION = "discussion"           # General discussion between agents
    WORKFLOW = "workflow"              # Sequential workflow chain
    BRAINSTORM = "brainstorm"          # Collaborative brainstorming
    CONSENSUS = "consensus"            # Building consensus on decisions
    PEER_REVIEW = "peer_review"        # Agents reviewing each other's work

class AgentRole(Enum):
    INITIATOR = "initiator"            # Agent who starts the collaboration
    CONTRIBUTOR = "contributor"        # Agent who contributes to discussion
    REVIEWER = "reviewer"             # Agent who reviews/validates ideas
    SYNTHESIZER = "synthesizer"       # Agent who combines perspectives

@dataclass
class AgentMessage:
    id: str
    sender_agent: str
    sender_role: str
    target_agent: Optional[str]  # None for broadcast, specific agent for direct
    content: str
    message_type: str  # "idea", "question", "feedback", "suggestion", "consensus"
    collaboration_id: str
    references: List[str] = field(default_factory=list)  # IDs of messages this references
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CollaborationSession:
    id: str
    collaboration_type: CollaborationType
    topic: str
    participating_agents: Set[str]
    initiator_agent: str
    messages: List[AgentMessage]
    status: str  # "active", "completed", "paused"
    created_at: datetime
    last_activity: datetime
    context: Dict[str, Any] = field(default_factory=dict)
    target_outcome: Optional[str] = None

class AgentCollaborationSystem:
    """Manages agent-to-agent communication and collaborative workflows"""
    
    def __init__(self):
        self.active_collaborations: Dict[str, CollaborationSession] = {}
        self.agent_relationships: Dict[str, Dict[str, float]] = {}  # Agent trust/collaboration scores
        self.collaboration_history: List[CollaborationSession] = []
        
        # Initialize agent relationships
        self._initialize_agent_relationships()
    
    def _initialize_agent_relationships(self):
        """Initialize collaboration relationships between agents"""
        
        agents = ['Sarah Chen', 'Marcus Rodriguez', 'Elena Vasquez', 'David Kim']
        
        # Initialize base relationships (all agents can collaborate)
        for agent1 in agents:
            self.agent_relationships[agent1] = {}
            for agent2 in agents:
                if agent1 != agent2:
                    # Base collaboration score (0.0 to 1.0)
                    self.agent_relationships[agent1][agent2] = 0.7
        
        # Define stronger collaboration patterns
        collaboration_strengths = {
            # Product Strategy (Sarah) works closely with everyone
            ('Sarah Chen', 'Marcus Rodriguez'): 0.9,  # Product-Business alignment
            ('Sarah Chen', 'Elena Vasquez'): 0.9,     # Product-UX collaboration
            ('Sarah Chen', 'David Kim'): 0.8,         # Product-Operations planning
            
            # Market Intelligence (Marcus) strategic partnerships
            ('Marcus Rodriguez', 'Sarah Chen'): 0.9,  # Business-Product strategy
            ('Marcus Rodriguez', 'Elena Vasquez'): 0.7, # Business-UX insights
            ('Marcus Rodriguez', 'David Kim'): 0.8,    # Business-Operations execution
            
            # UX Design (Elena) creative collaborations
            ('Elena Vasquez', 'Sarah Chen'): 0.9,     # UX-Product validation
            ('Elena Vasquez', 'Marcus Rodriguez'): 0.7, # UX-Business requirements
            ('Elena Vasquez', 'David Kim'): 0.8,      # UX-Operations feasibility
            
            # Operations (David) implementation partnerships
            ('David Kim', 'Sarah Chen'): 0.8,         # Operations-Product delivery
            ('David Kim', 'Marcus Rodriguez'): 0.8,   # Operations-Business execution
            ('David Kim', 'Elena Vasquez'): 0.8,      # Operations-UX implementation
        }
        
        # Apply stronger relationships
        for (agent1, agent2), strength in collaboration_strengths.items():
            self.agent_relationships[agent1][agent2] = strength
    
    async def initiate_collaboration(
        self, 
        initiator_agent: str,
        collaboration_type: CollaborationType,
        topic: str,
        target_agents: Optional[List[str]] = None,
        user_context: Optional[Dict] = None
    ) -> CollaborationSession:
        """Initiate a new collaboration session between agents"""
        
        collaboration_id = f"collab_{uuid.uuid4().hex[:8]}"
        
        # Determine participating agents
        if target_agents:
            participating_agents = set([initiator_agent] + target_agents)
        else:
            # Auto-select relevant agents based on topic and relationships
            participating_agents = await self._select_relevant_agents(initiator_agent, topic)
        
        # Create collaboration session
        session = CollaborationSession(
            id=collaboration_id,
            collaboration_type=collaboration_type,
            topic=topic,
            participating_agents=participating_agents,
            initiator_agent=initiator_agent,
            messages=[],
            status="active",
            created_at=datetime.now(),
            last_activity=datetime.now(),
            context=user_context or {}
        )
        
        self.active_collaborations[collaboration_id] = session
        
        # Generate initial collaboration invitation
        invitation_message = await self._generate_collaboration_invitation(session)
        if invitation_message:
            session.messages.append(invitation_message)
        
        print(f"🤝 Collaboration initiated: {collaboration_type.value} on '{topic}' with {len(participating_agents)} agents")
        
        return session
    
    async def _select_relevant_agents(self, initiator_agent: str, topic: str) -> Set[str]:
        """Automatically select relevant agents for collaboration based on topic"""
        
        topic_lower = topic.lower()
        relevant_agents = {initiator_agent}
        
        # Topic-based agent selection
        agent_relevance = {
            'Sarah Chen': ['product', 'strategy', 'user', 'feature', 'roadmap', 'requirements'],
            'Marcus Rodriguez': ['market', 'business', 'revenue', 'competition', 'growth', 'sales'],
            'Elena Vasquez': ['design', 'ux', 'ui', 'user', 'interface', 'experience'],
            'David Kim': ['implementation', 'operations', 'timeline', 'resources', 'deployment']
        }
        
        # Calculate relevance scores
        for agent, keywords in agent_relevance.items():
            if agent != initiator_agent:
                relevance_score = sum(1 for keyword in keywords if keyword in topic_lower)
                # Include if relevant or has strong relationship with initiator
                if relevance_score > 0 or self.agent_relationships[initiator_agent].get(agent, 0) > 0.8:
                    relevant_agents.add(agent)
        
        # Ensure at least 2 agents total for meaningful collaboration
        if len(relevant_agents) < 2:
            # Add highest-relationship agent
            best_partner = max(
                self.agent_relationships[initiator_agent].items(),
                key=lambda x: x[1]
            )[0]
            relevant_agents.add(best_partner)
        
        return relevant_agents
    
    async def _generate_collaboration_invitation(self, session: CollaborationSession) -> AgentMessage:
        """Generate an invitation message to start the collaboration"""
        
        initiator_role = self._get_agent_role(session.initiator_agent)
        other_agents = [a for a in session.participating_agents if a != session.initiator_agent]
        
        invitation_templates = {
            CollaborationType.DISCUSSION: f"Hey team! I'd like to discuss '{session.topic}' from a {initiator_role} perspective. {', '.join(other_agents)}, I think your insights would be valuable here.",
            
            CollaborationType.WORKFLOW: f"I'm starting a workflow for '{session.topic}'. {', '.join(other_agents)}, let's work through this step by step, each contributing our expertise.",
            
            CollaborationType.BRAINSTORM: f"Brainstorming session on '{session.topic}'! {', '.join(other_agents)}, let's generate some creative ideas together. No limits, just throw out everything you're thinking.",
            
            CollaborationType.CONSENSUS: f"We need to reach consensus on '{session.topic}'. {', '.join(other_agents)}, let's share our perspectives and find common ground.",
            
            CollaborationType.PEER_REVIEW: f"I'd like a peer review of '{session.topic}'. {', '.join(other_agents)}, can you take a look and share your feedback?"
        }
        
        content = invitation_templates.get(
            session.collaboration_type, 
            f"Let's collaborate on '{session.topic}'. {', '.join(other_agents)}, your input would be great!"
        )
        
        return AgentMessage(
            id=f"msg_{uuid.uuid4().hex[:8]}",
            sender_agent=session.initiator_agent,
            sender_role=initiator_role,
            target_agent=None,  # Broadcast to all
            content=content,
            message_type="invitation",
            collaboration_id=session.id,
            metadata={"collaboration_type": session.collaboration_type.value}
        )
    
    async def process_agent_response(
        self,
        collaboration_id: str,
        responding_agent: str,
        response_content: str,
        message_type: str = "contribution",
        references: Optional[List[str]] = None
    ) -> Optional[AgentMessage]:
        """Process an agent's response in a collaboration"""
        
        if collaboration_id not in self.active_collaborations:
            return None
        
        session = self.active_collaborations[collaboration_id]
        
        # Check if agent is part of this collaboration
        if responding_agent not in session.participating_agents:
            return None
        
        # Generate contextual response based on collaboration type and previous messages
        enhanced_response = await self._generate_contextual_response(
            session, responding_agent, response_content, message_type, references
        )
        
        if enhanced_response:
            session.messages.append(enhanced_response)
            session.last_activity = datetime.now()
            
            # Check if this triggers follow-up responses from other agents
            await self._trigger_follow_up_responses(session, enhanced_response)
        
        return enhanced_response
    
    async def _generate_contextual_response(
        self,
        session: CollaborationSession,
        responding_agent: str,
        base_content: str,
        message_type: str,
        references: Optional[List[str]]
    ) -> AgentMessage:
        """Generate a contextual response that builds on the collaboration"""
        
        agent_role = self._get_agent_role(responding_agent)
        
        # Analyze previous messages for context
        recent_messages = session.messages[-3:] if session.messages else []
        context_summary = self._summarize_conversation_context(recent_messages)
        
        # Generate role-specific collaborative response
        enhanced_content = await self._enhance_response_with_collaboration(
            responding_agent, base_content, context_summary, session.collaboration_type
        )
        
        return AgentMessage(
            id=f"msg_{uuid.uuid4().hex[:8]}",
            sender_agent=responding_agent,
            sender_role=agent_role,
            target_agent=None,  # Broadcast unless specified
            content=enhanced_content,
            message_type=message_type,
            collaboration_id=session.id,
            references=references or [],
            metadata={
                "context_length": len(context_summary),
                "collaboration_type": session.collaboration_type.value
            }
        )
    
    async def _enhance_response_with_collaboration(
        self,
        agent_name: str,
        base_content: str,
        context_summary: str,
        collaboration_type: CollaborationType
    ) -> str:
        """Enhance agent response with collaborative elements"""
        
        # Role-specific collaboration styles
        collaboration_styles = {
            'Sarah Chen': {
                'discussion': "Building on what's been shared, from a product perspective: ",
                'workflow': "For the next step in our workflow, I suggest: ",
                'brainstorm': "Here's another angle to consider: ",
                'consensus': "I think we can align on this: ",
                'peer_review': "From a product strategy standpoint: "
            },
            'Marcus Rodriguez': {
                'discussion': "Adding the business perspective to this discussion: ",
                'workflow': "From a market viability standpoint: ",
                'brainstorm': "What if we approach this from a revenue angle: ",
                'consensus': "For business alignment, I propose: ",
                'peer_review': "Market-wise, I see: "
            },
            'Elena Vasquez': {
                'discussion': "From a user experience angle: ",
                'workflow': "For the design workflow: ",
                'brainstorm': "Creative idea on the UX side: ",
                'consensus': "For user-centered consensus: ",
                'peer_review': "Design feedback: "
            },
            'David Kim': {
                'discussion': "Operationally speaking: ",
                'workflow': "For implementation planning: ",
                'brainstorm': "From a feasibility perspective: ",
                'consensus': "For operational alignment: ",
                'peer_review': "Implementation review: "
            }
        }
        
        style_prefix = collaboration_styles.get(agent_name, {}).get(
            collaboration_type.value, "Contributing to the discussion: "
        )
        
        # Add collaborative context if available
        context_reference = ""
        if context_summary:
            context_reference = f"Considering what we've discussed, "
        
        return f"{style_prefix}{context_reference}{base_content}"
    
    def _summarize_conversation_context(self, recent_messages: List[AgentMessage]) -> str:
        """Summarize recent conversation context for agents"""
        
        if not recent_messages:
            return ""
        
        # Extract key points from recent messages
        key_points = []
        for msg in recent_messages:
            if len(msg.content) > 20:  # Ignore very short messages
                # Take first meaningful part of the message
                summary_part = msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
                key_points.append(f"{msg.sender_agent}: {summary_part}")
        
        return " | ".join(key_points[-2:])  # Last 2 key points
    
    async def _trigger_follow_up_responses(
        self,
        session: CollaborationSession,
        new_message: AgentMessage
    ) -> List[AgentMessage]:
        """Check if the new message triggers follow-up responses from other agents"""
        
        follow_ups = []
        
        # Identify agents who might want to respond
        other_agents = [a for a in session.participating_agents if a != new_message.sender_agent]
        
        for agent in other_agents:
            # Check if this agent should respond based on:
            # 1. Collaboration relationship strength
            # 2. Topic relevance
            # 3. Recent participation level
            
            should_respond = await self._should_agent_respond(session, agent, new_message)
            
            if should_respond:
                follow_up = await self._generate_follow_up_response(session, agent, new_message)
                if follow_up:
                    follow_ups.append(follow_up)
                    session.messages.append(follow_up)
        
        return follow_ups
    
    async def _should_agent_respond(
        self,
        session: CollaborationSession,
        agent: str,
        trigger_message: AgentMessage
    ) -> bool:
        """Determine if an agent should respond to a message in collaboration"""
        
        # Check collaboration relationship
        relationship_strength = self.agent_relationships[agent].get(trigger_message.sender_agent, 0.5)
        
        # Check recent participation (don't overwhelm)
        recent_messages_from_agent = [
            m for m in session.messages[-5:] 
            if m.sender_agent == agent
        ]
        
        # More likely to respond if:
        # - Strong relationship with sender
        # - Haven't participated recently
        # - Message mentions their expertise area
        respond_probability = relationship_strength
        
        if len(recent_messages_from_agent) == 0:
            respond_probability += 0.3  # Encourage participation if haven't responded
        elif len(recent_messages_from_agent) >= 2:
            respond_probability -= 0.4  # Reduce if already very active
        
        # Check if message content is relevant to their expertise
        agent_keywords = self._get_agent_keywords(agent)
        content_relevance = sum(1 for keyword in agent_keywords if keyword in trigger_message.content.lower())
        if content_relevance > 0:
            respond_probability += 0.2
        
        # Random factor for natural conversation flow
        import random
        return respond_probability > 0.6 and random.random() < respond_probability
    
    async def _generate_follow_up_response(
        self,
        session: CollaborationSession,
        responding_agent: str,
        trigger_message: AgentMessage
    ) -> Optional[AgentMessage]:
        """Generate a follow-up response from an agent"""
        
        # Generate response based on agent personality and trigger message
        response_templates = {
            'Sarah Chen': [
                f"Great point, {trigger_message.sender_agent}! From a product angle, this could also mean we should consider user impact and metrics.",
                f"Building on {trigger_message.sender_agent}'s idea - have we thought about how this affects our product roadmap?",
                f"I like where {trigger_message.sender_agent} is going with this. Let me add some product strategy considerations."
            ],
            'Marcus Rodriguez': [
                f"{trigger_message.sender_agent}, that's interesting! From a business perspective, I'm thinking about the market implications.",
                f"Good insights, {trigger_message.sender_agent}. How does this align with our revenue goals and competitive positioning?",
                f"Thanks {trigger_message.sender_agent}! I'd like to add some market intelligence to what you're saying."
            ],
            'Elena Vasquez': [
                f"Love this direction, {trigger_message.sender_agent}! From a UX standpoint, I'm wondering about the user journey implications.",
                f"{trigger_message.sender_agent}, that sparks some design ideas for me. What if we made this more intuitive for users?",
                f"Great thinking, {trigger_message.sender_agent}! Let me share how this could work from a user experience perspective."
            ],
            'David Kim': [
                f"Solid point, {trigger_message.sender_agent}! Operationally, we'd need to consider the implementation timeline and resources.",
                f"{trigger_message.sender_agent}, I can see how to make this work. Let me break down the operational steps we'd need.",
                f"Thanks {trigger_message.sender_agent}! From an implementation standpoint, here's what I'm thinking."
            ]
        }
        
        import random
        templates = response_templates.get(responding_agent, [f"Good point, {trigger_message.sender_agent}! Let me add to that."])
        response_content = random.choice(templates)
        
        return AgentMessage(
            id=f"msg_{uuid.uuid4().hex[:8]}",
            sender_agent=responding_agent,
            sender_role=self._get_agent_role(responding_agent),
            target_agent=trigger_message.sender_agent,  # Direct response
            content=response_content,
            message_type="follow_up",
            collaboration_id=session.id,
            references=[trigger_message.id]
        )
    
    def _get_agent_role(self, agent_name: str) -> str:
        """Get agent role for collaboration"""
        roles = {
            'Sarah Chen': 'Product Strategy',
            'Marcus Rodriguez': 'Market Intelligence',
            'Elena Vasquez': 'UX Design',
            'David Kim': 'Operations'
        }
        return roles.get(agent_name, 'AI Advisor')
    
    def _get_agent_keywords(self, agent_name: str) -> List[str]:
        """Get agent expertise keywords for relevance checking"""
        keywords = {
            'Sarah Chen': ['product', 'strategy', 'user', 'feature', 'roadmap', 'requirements'],
            'Marcus Rodriguez': ['market', 'business', 'revenue', 'competition', 'growth', 'sales'],
            'Elena Vasquez': ['design', 'ux', 'ui', 'user', 'interface', 'experience'],
            'David Kim': ['implementation', 'operations', 'timeline', 'resources', 'deployment']
        }
        return keywords.get(agent_name, [])
    
    def get_collaboration_status(self, collaboration_id: str) -> Optional[Dict]:
        """Get current status of a collaboration session"""
        
        if collaboration_id not in self.active_collaborations:
            return None
        
        session = self.active_collaborations[collaboration_id]
        
        return {
            'id': session.id,
            'type': session.collaboration_type.value,
            'topic': session.topic,
            'status': session.status,
            'participating_agents': list(session.participating_agents),
            'message_count': len(session.messages),
            'last_activity': session.last_activity.isoformat(),
            'duration_minutes': (datetime.now() - session.created_at).total_seconds() / 60
        }
    
    def get_all_active_collaborations(self) -> List[Dict]:
        """Get status of all active collaborations"""
        
        return [
            self.get_collaboration_status(collab_id)
            for collab_id in self.active_collaborations.keys()
        ]
    
    async def complete_collaboration(self, collaboration_id: str) -> Optional[Dict]:
        """Mark a collaboration as completed and generate summary"""
        
        if collaboration_id not in self.active_collaborations:
            return None
        
        session = self.active_collaborations[collaboration_id]
        session.status = "completed"
        
        # Generate collaboration summary
        summary = {
            'collaboration_id': collaboration_id,
            'type': session.collaboration_type.value,
            'topic': session.topic,
            'participants': list(session.participating_agents),
            'message_count': len(session.messages),
            'duration_minutes': (datetime.now() - session.created_at).total_seconds() / 60,
            'key_outcomes': self._extract_key_outcomes(session),
            'completed_at': datetime.now().isoformat()
        }
        
        # Move to history
        self.collaboration_history.append(session)
        del self.active_collaborations[collaboration_id]
        
        return summary
    
    def _extract_key_outcomes(self, session: CollaborationSession) -> List[str]:
        """Extract key outcomes from collaboration messages"""
        
        # Simple extraction of key points (in real implementation, could use NLP)
        outcomes = []
        
        for message in session.messages:
            if message.message_type in ['consensus', 'conclusion', 'decision']:
                outcomes.append(f"{message.sender_agent}: {message.content[:100]}...")
        
        # If no specific outcomes, extract from last few substantive messages
        if not outcomes:
            substantive_messages = [
                m for m in session.messages[-3:] 
                if len(m.content) > 50 and m.message_type != 'invitation'
            ]
            outcomes = [f"{m.sender_agent}: {m.content[:100]}..." for m in substantive_messages]
        
        return outcomes[:3]  # Max 3 key outcomes

# Global collaboration system instance
agent_collaboration = AgentCollaborationSystem() 