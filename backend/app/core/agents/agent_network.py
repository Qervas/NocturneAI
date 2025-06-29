"""
Agent Network System - Active Mode Implementation
Enables agents to monitor conversations and proactively participate
"""

from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import uuid

class AgentMode(Enum):
    PASSIVE = "passive"      # Only responds when directly asked
    ACTIVE = "active"        # Monitors conversations, proactively participates
    AUTONOMOUS = "autonomous"  # Future: Fully autonomous behavior

class RelevanceScore(Enum):
    LOW = 1       # Minimal relevance
    MEDIUM = 2    # Some relevance
    HIGH = 3      # Strong relevance
    CRITICAL = 4  # Must participate

@dataclass
class ConversationContext:
    channel_id: str
    channel_type: str  # "channel" or "dm"
    conversation_id: str
    participants: List[str]
    messages: List[Dict]
    last_activity: datetime
    topics: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    active_agents: Set[str] = field(default_factory=set)

@dataclass
class ProactiveResponse:
    agent_name: str
    agent_role: str
    response_type: str  # "suggestion", "question", "expertise", "collaboration"
    content: str
    relevance_score: RelevanceScore
    reasoning: str
    triggered_by: List[str]  # Keywords that triggered this response
    timestamp: datetime

@dataclass
class AgentParticipationRule:
    agent_name: str
    mode: AgentMode
    expertise_keywords: List[str]
    collaboration_triggers: List[str]
    max_participation_per_hour: int = 5
    cooldown_minutes: int = 10
    last_participation: Optional[datetime] = None
    participation_count: int = 0

class AgentNetworkMonitor:
    """Monitors conversations and enables proactive agent participation"""
    
    def __init__(self):
        self.active_conversations: Dict[str, ConversationContext] = {}
        self.agent_rules: Dict[str, AgentParticipationRule] = {}
        self.participation_history: List[ProactiveResponse] = []
        self.monitoring_enabled = True
        
        # Initialize default agent rules
        self._initialize_agent_rules()
    
    def _initialize_agent_rules(self):
        """Initialize participation rules for each agent"""
        
        # Sarah Chen - Product Strategy
        self.agent_rules['Sarah Chen'] = AgentParticipationRule(
            agent_name='Sarah Chen',
            mode=AgentMode.ACTIVE,
            expertise_keywords=[
                'product', 'strategy', 'user', 'feature', 'roadmap', 'requirements',
                'metrics', 'kpi', 'analytics', 'feedback', 'validation', 'testing',
                'mvp', 'scope', 'prioritization', 'backlog'
            ],
            collaboration_triggers=[
                'market research', 'user research', 'competitive analysis',
                'pricing strategy', 'go-to-market'
            ]
        )
        
        # Marcus Rodriguez - Market Intelligence  
        self.agent_rules['Marcus Rodriguez'] = AgentParticipationRule(
            agent_name='Marcus Rodriguez',
            mode=AgentMode.ACTIVE,
            expertise_keywords=[
                'market', 'business', 'revenue', 'pricing', 'competition', 'sales',
                'growth', 'roi', 'investment', 'funding', 'partnership', 'deal',
                'customers', 'acquisition', 'retention', 'churn'
            ],
            collaboration_triggers=[
                'product strategy', 'technical feasibility', 'user experience',
                'operational planning'
            ]
        )
        
        # Elena Vasquez - UX Design
        self.agent_rules['Elena Vasquez'] = AgentParticipationRule(
            agent_name='Elena Vasquez', 
            mode=AgentMode.ACTIVE,
            expertise_keywords=[
                'design', 'ux', 'ui', 'user', 'interface', 'experience', 'usability',
                'accessibility', 'visual', 'interaction', 'wireframe', 'prototype',
                'user flow', 'user journey', 'persona', 'research'
            ],
            collaboration_triggers=[
                'product requirements', 'technical constraints', 'business goals',
                'market positioning'
            ]
        )
        
        # David Kim - Operations
        self.agent_rules['David Kim'] = AgentParticipationRule(
            agent_name='David Kim',
            mode=AgentMode.ACTIVE,
            expertise_keywords=[
                'operations', 'implementation', 'timeline', 'resources', 'budget',
                'team', 'project', 'planning', 'execution', 'deployment', 'testing',
                'infrastructure', 'scalability', 'performance', 'security'
            ],
            collaboration_triggers=[
                'product planning', 'design requirements', 'business timeline',
                'market launch'
            ]
        )
    
    def set_agent_mode(self, agent_name: str, mode: AgentMode):
        """Set agent participation mode"""
        if agent_name in self.agent_rules:
            self.agent_rules[agent_name].mode = mode
            print(f"📊 {agent_name} mode set to {mode.value}")
    
    async def update_conversation(self, channel_id: str, channel_type: str, new_message: Dict):
        """Update conversation context with new message"""
        
        conversation_id = f"{channel_type}_{channel_id}"
        
        # Create or update conversation context
        if conversation_id not in self.active_conversations:
            self.active_conversations[conversation_id] = ConversationContext(
                channel_id=channel_id,
                channel_type=channel_type,
                conversation_id=conversation_id,
                participants=[],
                messages=[],
                last_activity=datetime.now()
            )
        
        context = self.active_conversations[conversation_id]
        context.messages.append(new_message)
        context.last_activity = datetime.now()
        
        # Add participant if not already present
        sender = new_message.get('sender', 'unknown')
        if sender not in context.participants:
            context.participants.append(sender)
        
        # Extract topics and keywords from message
        await self._analyze_message_content(context, new_message)
        
        # Check for proactive agent participation
        if self.monitoring_enabled:
            await self._check_proactive_participation(context, new_message)
    
    async def _analyze_message_content(self, context: ConversationContext, message: Dict):
        """Analyze message content for topics and keywords"""
        
        content = message.get('content', '').lower()
        
        # Extract key topics (simple keyword matching for now)
        topic_keywords = {
            'product_strategy': ['product', 'strategy', 'roadmap', 'feature'],
            'market_analysis': ['market', 'competition', 'revenue', 'pricing'],
            'user_experience': ['design', 'ux', 'user', 'interface'],
            'operations': ['implementation', 'timeline', 'resources', 'planning']
        }
        
        detected_topics = []
        detected_keywords = []
        
        for topic, keywords in topic_keywords.items():
            if any(keyword in content for keyword in keywords):
                detected_topics.append(topic)
                detected_keywords.extend([kw for kw in keywords if kw in content])
        
        # Update context
        context.topics = list(set(context.topics + detected_topics))
        context.keywords = list(set(context.keywords + detected_keywords))
    
    async def _check_proactive_participation(self, context: ConversationContext, message: Dict) -> List[ProactiveResponse]:
        """Check if any agents should proactively participate"""
        
        proactive_responses = []
        content = message.get('content', '').lower()
        sender = message.get('sender', '')
        
        # Skip if message is from an agent
        if sender in self.agent_rules:
            return proactive_responses
        
        for agent_name, rules in self.agent_rules.items():
            # Skip if agent is not in active mode
            if rules.mode != AgentMode.ACTIVE:
                continue
            
            # Skip if agent already participated in this conversation recently
            if not self._can_agent_participate(agent_name, context):
                continue
            
            # Check relevance
            relevance_score = self._calculate_relevance(content, context, rules)
            
            if relevance_score.value >= RelevanceScore.MEDIUM.value:
                # Generate proactive response
                response = await self._generate_proactive_response(
                    agent_name, rules, context, message, relevance_score
                )
                if response:
                    proactive_responses.append(response)
                    self._record_participation(agent_name)
        
        # Store responses for processing
        self.participation_history.extend(proactive_responses)
        
        return proactive_responses
    
    def _can_agent_participate(self, agent_name: str, context: ConversationContext) -> bool:
        """Check if agent can participate based on rules"""
        
        rules = self.agent_rules[agent_name]
        now = datetime.now()
        
        # Check if agent already participated recently
        if agent_name in context.active_agents:
            return False
        
        # Check cooldown period
        if rules.last_participation:
            time_since_last = now - rules.last_participation
            if time_since_last < timedelta(minutes=rules.cooldown_minutes):
                return False
        
        # Check hourly participation limit
        one_hour_ago = now - timedelta(hours=1)
        recent_participations = [
            p for p in self.participation_history 
            if p.agent_name == agent_name and p.timestamp > one_hour_ago
        ]
        
        if len(recent_participations) >= rules.max_participation_per_hour:
            return False
        return True
    
    def _calculate_relevance(self, content: str, context: ConversationContext, rules: AgentParticipationRule) -> RelevanceScore:
        """Calculate how relevant this conversation is to the agent"""
        
        relevance_points = 0
        
        # Check expertise keywords
        expertise_matches = sum(1 for keyword in rules.expertise_keywords if keyword in content)
        relevance_points += expertise_matches * 2
        
        # Check collaboration triggers
        collaboration_matches = sum(1 for trigger in rules.collaboration_triggers if trigger in content)
        relevance_points += collaboration_matches * 3
        
        # Check conversation topics
        topic_matches = sum(1 for topic in context.topics if any(keyword in topic for keyword in rules.expertise_keywords))
        relevance_points += topic_matches
        
        # Determine relevance score (lower thresholds for testing)
        if relevance_points >= 6:
            return RelevanceScore.CRITICAL
        elif relevance_points >= 3:
            return RelevanceScore.HIGH
        elif relevance_points >= 1:  # Lower threshold to trigger more responses
            return RelevanceScore.MEDIUM
        else:
            return RelevanceScore.LOW
    
    async def _generate_proactive_response(self, agent_name: str, rules: AgentParticipationRule, 
                                         context: ConversationContext, message: Dict, 
                                         relevance_score: RelevanceScore) -> Optional[ProactiveResponse]:
        """Generate a proactive response from the agent"""
        
        content = message.get('content', '')
        sender = message.get('sender', 'User')
        
        # Determine response type based on relevance and context
        if relevance_score == RelevanceScore.CRITICAL:
            response_type = "expertise"
        elif relevance_score == RelevanceScore.HIGH:
            response_type = "collaboration"
        else:
            response_type = "suggestion"
        
        # Generate response content based on agent and context
        response_content = await self._create_response_content(
            agent_name, response_type, content, context
        )
        
        if response_content:
            return ProactiveResponse(
                agent_name=agent_name,
                agent_role=self._get_agent_role(agent_name),
                response_type=response_type,
                content=response_content,
                relevance_score=relevance_score,
                reasoning=f"Detected {relevance_score.name.lower()} relevance based on expertise keywords",
                triggered_by=self._get_triggered_keywords(content, rules),
                timestamp=datetime.now()
            )
        
        return None
    
    async def _create_response_content(self, agent_name: str, response_type: str, 
                                     original_content: str, context: ConversationContext) -> str:
        """Create the actual response content"""
        
        role = self._get_agent_role(agent_name)
        
        if response_type == "expertise":
            responses = {
                'Sarah Chen': f"From a product perspective, I'd like to add that we should also consider the user impact and metrics for this. Have we thought about how to measure success?",
                'Marcus Rodriguez': f"Looking at this from a business angle - this could affect our market positioning. Should we analyze the competitive implications?",
                'Elena Vasquez': f"From a UX standpoint, I'm thinking about how users will actually interact with this. Want me to sketch some user flow ideas?",
                'David Kim': f"Operationally speaking, we'll need to consider implementation complexity and timeline. I can break this down into actionable phases."
            }
        elif response_type == "collaboration":
            responses = {
                'Sarah Chen': f"This connects to some product strategy work I've been thinking about. Mind if I share some insights that might help?",
                'Marcus Rodriguez': f"I've been tracking similar market trends that could inform this discussion. Want me to pull some data?",
                'Elena Vasquez': f"I have some design patterns that could work well here. Should I create a quick mockup to visualize this?",
                'David Kim': f"I can see some operational dependencies here that we should plan for. Let me suggest a implementation approach."
            }
        else:  # suggestion
            responses = {
                'Sarah Chen': f"Quick thought - have we considered the user feedback we got on similar features?",
                'Marcus Rodriguez': f"Just a heads up - this might impact our Q3 targets. Worth discussing timing?",
                'Elena Vasquez': f"Design suggestion: we could make this more intuitive with a simple workflow change.",
                'David Kim': f"Implementation note: this would be easier if we handle the backend infrastructure first."
            }
        
        return responses.get(agent_name, f"I have some thoughts on this from a {role} perspective.")
    
    def _get_agent_role(self, agent_name: str) -> str:
        """Get agent role for response generation"""
        roles = {
            'Sarah Chen': 'Product Strategy',
            'Marcus Rodriguez': 'Market Intelligence',
            'Elena Vasquez': 'UX Design', 
            'David Kim': 'Operations'
        }
        return roles.get(agent_name, 'AI Advisor')
    
    def _get_triggered_keywords(self, content: str, rules: AgentParticipationRule) -> List[str]:
        """Get keywords that triggered this response"""
        return [kw for kw in rules.expertise_keywords if kw in content.lower()]
    
    def _record_participation(self, agent_name: str):
        """Record agent participation"""
        if agent_name in self.agent_rules:
            self.agent_rules[agent_name].last_participation = datetime.now()
            self.agent_rules[agent_name].participation_count += 1
    
    def get_pending_responses(self, channel_id: str) -> List[ProactiveResponse]:
        """Get pending proactive responses for a channel"""
        conversation_id = f"channel_{channel_id}"  # Assuming channel type
        
        # Get recent responses for this conversation
        recent_responses = [
            r for r in self.participation_history 
            if r.timestamp > datetime.now() - timedelta(minutes=5)
        ]
        
        return recent_responses
    
    def clear_participation_history(self, older_than_hours: int = 24):
        """Clear old participation history"""
        cutoff = datetime.now() - timedelta(hours=older_than_hours)
        self.participation_history = [
            r for r in self.participation_history if r.timestamp > cutoff
        ]
    
    def get_network_status(self) -> Dict:
        """Get current network monitoring status"""
        return {
            'monitoring_enabled': self.monitoring_enabled,
            'active_conversations': len(self.active_conversations),
            'agent_modes': {name: rules.mode.value for name, rules in self.agent_rules.items()},
            'recent_participations': len([
                r for r in self.participation_history 
                if r.timestamp > datetime.now() - timedelta(hours=1)
            ])
        }

# Global network monitor instance
agent_network = AgentNetworkMonitor() 