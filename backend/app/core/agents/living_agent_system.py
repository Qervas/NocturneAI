"""
Living Agent System - Digital Beings That Learn, Grow, and Converge to Truth
Core implementation of agents with personality evolution, memory, and relationships.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta
import json
import asyncio
from enum import Enum
import uuid

# Import the Ollama service for AI-powered responses
from ...services.ollama_service import ollama_service


class PersonalityTrait(Enum):
    COMMUNICATION_STYLE = "communication_style"
    DECISION_FRAMEWORK = "decision_framework"
    STRESS_RESPONSE = "stress_response"
    LEARNING_STYLE = "learning_style"
    COLLABORATION_PREFERENCE = "collaboration_preference"


class MoodDimension(Enum):
    ENERGY = "energy"
    STRESS = "stress"
    FOCUS = "focus"
    CREATIVITY = "creativity"
    CONFIDENCE = "confidence"
    SOCIAL_ENERGY = "social_energy"


@dataclass
class Memory:
    """Individual memory unit with emotional context"""
    id: str
    type: str  # "conversation", "experience", "learning", "emotion"
    content: str
    timestamp: datetime
    emotional_weight: float  # -1.0 to 1.0
    tags: List[str] = field(default_factory=list)
    related_entities: List[str] = field(default_factory=list)  # user, other agents
    importance_score: float = 0.5  # 0.0 to 1.0
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'content': self.content,
            'timestamp': self.timestamp.isoformat(),
            'emotional_weight': self.emotional_weight,
            'tags': self.tags,
            'related_entities': self.related_entities,
            'importance_score': self.importance_score
        }


@dataclass
class Relationship:
    """Relationship tracking between agent and user/other agents"""
    entity_id: str  # user_id or agent_id
    entity_type: str  # "user" or "agent"
    familiarity_level: float = 0.0  # 0.0 to 100.0
    trust_score: float = 0.0  # 0.0 to 100.0
    emotional_bond: float = 0.0  # 0.0 to 100.0
    shared_experiences: List[str] = field(default_factory=list)
    inside_jokes: List[str] = field(default_factory=list)
    communication_preferences: Dict = field(default_factory=dict)
    last_interaction: Optional[datetime] = None
    interaction_count: int = 0
    positive_interactions: int = 0
    challenging_interactions: int = 0
    
    def get_relationship_depth(self) -> str:
        """Calculate relationship depth category"""
        avg_score = (self.familiarity_level + self.trust_score + self.emotional_bond) / 3
        if avg_score >= 80:
            return "intimate"
        elif avg_score >= 60:
            return "close"
        elif avg_score >= 40:
            return "familiar"
        elif avg_score >= 20:
            return "acquainted"
        else:
            return "stranger"
    
    def to_dict(self):
        return {
            'entity_id': self.entity_id,
            'entity_type': self.entity_type,
            'familiarity_level': self.familiarity_level,
            'trust_score': self.trust_score,
            'emotional_bond': self.emotional_bond,
            'shared_experiences': self.shared_experiences,
            'inside_jokes': self.inside_jokes,
            'communication_preferences': self.communication_preferences,
            'last_interaction': self.last_interaction.isoformat() if self.last_interaction else None,
            'interaction_count': self.interaction_count,
            'positive_interactions': self.positive_interactions,
            'challenging_interactions': self.challenging_interactions,
            'relationship_depth': self.get_relationship_depth()
        }


@dataclass
class MoodState:
    """Dynamic emotional and cognitive state"""
    energy: float = 70.0  # 0-100
    stress: float = 20.0  # 0-100
    focus: float = 75.0  # 0-100
    creativity: float = 60.0  # 0-100
    confidence: float = 80.0  # 0-100
    social_energy: float = 65.0  # 0-100
    last_updated: datetime = field(default_factory=datetime.now)
    
    def update_mood(self, dimension: MoodDimension, change: float, reason: str = ""):
        """Update specific mood dimension with bounds checking"""
        current_value = getattr(self, dimension.value)
        new_value = max(0.0, min(100.0, current_value + change))
        setattr(self, dimension.value, new_value)
        self.last_updated = datetime.now()
        return new_value
    
    def get_mood_description(self) -> str:
        """Get natural language description of current mood"""
        if self.energy > 80 and self.creativity > 70:
            return "energetic and creative"
        elif self.stress > 60:
            return "stressed but focused"
        elif self.social_energy > 80:
            return "socially engaged"
        elif self.focus > 80:
            return "deeply focused"
        elif self.confidence > 90:
            return "confident and assured"
        else:
            return "balanced and thoughtful"
    
    def to_dict(self):
        return {
            'energy': self.energy,
            'stress': self.stress,
            'focus': self.focus,
            'creativity': self.creativity,
            'confidence': self.confidence,
            'social_energy': self.social_energy,
            'mood_description': self.get_mood_description(),
            'last_updated': self.last_updated.isoformat()
        }


@dataclass
class PersonalityEvolution:
    """Track how personality changes over time"""
    trait_history: Dict[str, List[Dict]] = field(default_factory=dict)
    growth_milestones: List[Dict] = field(default_factory=list)
    learning_patterns: Dict[str, float] = field(default_factory=dict)
    skill_development: Dict[str, float] = field(default_factory=dict)
    
    def record_trait_change(self, trait: str, old_value: str, new_value: str, trigger: str):
        """Record personality trait evolution"""
        if trait not in self.trait_history:
            self.trait_history[trait] = []
        
        self.trait_history[trait].append({
            'old_value': old_value,
            'new_value': new_value,
            'trigger': trigger,
            'timestamp': datetime.now().isoformat(),
            'growth_level': len(self.trait_history[trait]) + 1
        })
    
    def add_growth_milestone(self, milestone_type: str, description: str, trigger_event: str):
        """Record significant growth milestone"""
        self.growth_milestones.append({
            'id': str(uuid.uuid4()),
            'type': milestone_type,
            'description': description,
            'trigger_event': trigger_event,
            'timestamp': datetime.now().isoformat(),
            'milestone_number': len(self.growth_milestones) + 1
        })
    
    def to_dict(self):
        return {
            'trait_history': self.trait_history,
            'growth_milestones': self.growth_milestones,
            'learning_patterns': self.learning_patterns,
            'skill_development': self.skill_development
        }


class LivingAgent:
    """
    A living AI agent with personality, memory, relationships, and growth.
    This is the core implementation of agents that learn and evolve.
    """
    
    def __init__(self, agent_id: str, name: str, role: str, core_personality: Dict):
        self.agent_id = agent_id
        self.name = name
        self.role = role
        
        # Initialize Ollama service for AI-powered responses
        self.ollama_service = ollama_service
        
        # Extract core traits
        self.core_values = core_personality.get('core_values', [])
        self.fundamental_traits = core_personality.get('fundamental_traits', {})
        self.expertise = core_personality.get('expertise', [])
        self.communication_quirks = core_personality.get('quirks', [])
        self.humor_style = core_personality.get('humor_style', 'professional')
        
        # Initialize state systems
        self.mood = MoodState()
        self.relationships = {}  # user_id -> Relationship
        self.personality_evolution = PersonalityEvolution()
        
        # Memory systems
        self.episodic_memory = []  # List of Memory objects
        self.semantic_memory = {}  # topic -> knowledge
        self.emotional_memory = {}  # emotion -> [memories]
        
        # Tracking
        self.interaction_count = 0
        self.creation_time = datetime.now()
        
        # Core Identity (Immutable)
        self.origin_story = core_personality.get('origin_story', '')
        self.core_personality = core_personality
        
        # Dynamic State (Changes over time)
        self.current_context = {}
        self.active_memories = []
        
        # Growth System
        self.growth_milestones = []
        self.learning_patterns = {}
        self.skill_development = {}
        
        # Quirks and Style (Evolves)
        self.catchphrases = core_personality.get('catchphrases', [])
    
    async def process_interaction(self, user_id: str, message: str, context: Dict = None) -> Dict:
        """
        Process user interaction and evolve based on the conversation.
        This is where the magic happens - the agent learns and grows.
        """
        interaction_start = datetime.now()
        
        # Update interaction tracking
        self.interaction_count += 1
        
        # Update/create relationship with user
        await self._update_relationship(user_id, "user", message, context)
        
        # Create memory of this interaction
        memory = await self._create_interaction_memory(user_id, message, context)
        
        # Update mood based on interaction
        await self._update_mood_from_interaction(message, context)
        
        # Generate response based on current state
        response = await self._generate_contextual_response(message, self.relationships[user_id], context)
        
        # Learn from this interaction
        await self._learn_from_interaction(user_id, message, response, context)
        
        # Check for personality evolution triggers
        await self._check_evolution_triggers(user_id, message, context)
        
        processing_time = (datetime.now() - interaction_start).total_seconds()
        
        return {
            'response': response,
            'agent_state': {
                'mood': self.mood.to_dict(),
                'relationship_depth': self.relationships.get(user_id, Relationship(user_id, "user")).get_relationship_depth(),
                'growth_level': len(self.personality_evolution.growth_milestones),
                'interaction_count': self.interaction_count
            },
            'processing_time': processing_time,
            'evolved': await self._check_recent_evolution()
        }
    
    async def _update_relationship(self, entity_id: str, entity_type: str, message: str, context: Dict):
        """Update relationship metrics based on interaction"""
        if entity_id not in self.relationships:
            self.relationships[entity_id] = Relationship(entity_id, entity_type)
        
        rel = self.relationships[entity_id]
        rel.interaction_count += 1
        rel.last_interaction = datetime.now()
        
        # Analyze interaction sentiment and adjust relationship
        sentiment = await self._analyze_sentiment(message)
        
        if sentiment > 0.3:  # Positive interaction
            rel.positive_interactions += 1
            rel.familiarity_level = min(100, rel.familiarity_level + 1.5)
            rel.trust_score = min(100, rel.trust_score + 1.0)
            rel.emotional_bond = min(100, rel.emotional_bond + 0.8)
        elif sentiment < -0.3:  # Challenging interaction
            rel.challenging_interactions += 1
            rel.trust_score = max(0, rel.trust_score - 0.5)
        else:  # Neutral interaction
            rel.familiarity_level = min(100, rel.familiarity_level + 0.8)
        
        # Add shared experience if significant interaction
        if abs(sentiment) > 0.5 or any(keyword in message.lower() for keyword in ['thank', 'amazing', 'brilliant', 'love', 'hate', 'frustrated']):
            experience_id = f"interaction_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            rel.shared_experiences.append(experience_id)
    
    async def _create_interaction_memory(self, user_id: str, message: str, context: Dict) -> Memory:
        """Create and store memory of this interaction"""
        memory = Memory(
            id=str(uuid.uuid4()),
            type="conversation",
            content=f"User: {message}",
            timestamp=datetime.now(),
            emotional_weight=await self._analyze_sentiment(message),
            tags=await self._extract_memory_tags(message, context),
            related_entities=[user_id],
            importance_score=await self._calculate_memory_importance(message, context)
        )
        
        self.episodic_memory.append(memory)
        
        # Keep only recent memories in active memory (last 50)
        if len(self.episodic_memory) > 50:
            self.episodic_memory = self.episodic_memory[-50:]
        
        return memory
    
    async def _update_mood_from_interaction(self, message: str, context: Dict):
        """Update mood based on interaction content and context"""
        sentiment = await self._analyze_sentiment(message)
        
        # Positive interactions boost energy and confidence
        if sentiment > 0.3:
            self.mood.update_mood(MoodDimension.ENERGY, 5.0, "positive_interaction")
            self.mood.update_mood(MoodDimension.CONFIDENCE, 3.0, "positive_interaction")
            self.mood.update_mood(MoodDimension.SOCIAL_ENERGY, 4.0, "positive_interaction")
        
        # Complex questions increase focus but might increase stress
        if len(message.split()) > 20 or any(word in message.lower() for word in ['analyze', 'complex', 'strategy', 'difficult']):
            self.mood.update_mood(MoodDimension.FOCUS, 8.0, "complex_query")
            self.mood.update_mood(MoodDimension.STRESS, 3.0, "complex_query")
        
        # Creative requests boost creativity
        if any(word in message.lower() for word in ['creative', 'innovative', 'brainstorm', 'ideas', 'imagine']):
            self.mood.update_mood(MoodDimension.CREATIVITY, 10.0, "creative_request")
        
        # Time-based mood decay (gradual return to baseline)
        await self._apply_mood_decay()
    
    async def _generate_contextual_response(self, message: str, relationship: 'AgentRelationship', context: Dict) -> str:
        """Generate contextual response using AI with personality and computational modes"""
        
        # Extract interaction profile and abilities from context
        interaction_profile = context.get('interaction_mode', 'active_mode')  # Note: frontend still sends as interaction_mode
        enabled_abilities = context.get('enabled_abilities', [])
        computational_level = context.get('computational_level', 'active')
        
        # Auto Mode: Let AI decide which abilities to use based on context
        if interaction_profile == 'auto_mode' or not enabled_abilities:
            enabled_abilities = await self._intelligent_ability_selection(message, context, relationship)
            print(f"🤖 Auto Mode selected abilities: {enabled_abilities}")
        
        # Set computational parameters based on mode
        temperature, max_tokens, model_complexity = self._get_computational_parameters(interaction_profile, computational_level, enabled_abilities)
        
        # Create dynamic system prompt based on selected abilities and computational level
        system_prompt = await self._create_dynamic_system_prompt(enabled_abilities, context, relationship, computational_level)
        
        # Generate AI response using Ollama with computational parameters
        try:
            response = await self.ollama_service.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                model="llama3.2:3b",
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response
        except Exception as e:
            print(f"🚨 Living Agent AI generation failed: {str(e)}")
            # Fallback to basic response if AI service fails
            return await self._generate_fallback_response(message, relationship, context)
    
    def _get_computational_parameters(self, interaction_profile: str, computational_level: str, enabled_abilities: List[str]) -> tuple:
        """Get AI parameters based on computational intensity"""
        
        # Base parameters
        temperature = 0.6
        max_tokens = 600
        model_complexity = "standard"
        
        # Adjust based on computational level
        if computational_level == 'passive' or interaction_profile == 'passive_mode':
            temperature = 0.3  # More focused
            max_tokens = 300   # Shorter responses
            model_complexity = "light"
        elif computational_level == 'autonomous' or interaction_profile == 'autonomous_mode':
            temperature = 0.8  # More creative
            max_tokens = 1500  # Longer responses
            model_complexity = "complex"
        elif 'creative_ideation' in enabled_abilities:
            temperature = 0.8
        elif 'deep_thinking' in enabled_abilities:
            max_tokens = 1200
            
        return temperature, max_tokens, model_complexity
    
    async def _intelligent_ability_selection(self, message: str, context: Dict, relationship: 'AgentRelationship') -> List[str]:
        """AI-powered ability selection based on message analysis"""
        
        # Analyze message characteristics
        message_lower = message.lower()
        word_count = len(message.split())
        
        selected_abilities = []
        
        # Always include conversational for natural interaction
        selected_abilities.append('conversational')
        
        # Question complexity analysis
        complex_indicators = ['how', 'why', 'strategy', 'plan', 'analysis', 'recommend', 'should', 'best practices']
        simple_indicators = ['what', 'when', 'where', 'quick', 'simple']
        
        is_complex = any(indicator in message_lower for indicator in complex_indicators)
        is_simple = any(indicator in message_lower for indicator in simple_indicators)
        
        # Strategic/Business context
        business_keywords = ['strategy', 'market', 'business', 'revenue', 'growth', 'competitive', 'roi']
        if any(keyword in message_lower for keyword in business_keywords):
            selected_abilities.extend(['strategic_analysis', 'data_driven'])
        
        # Creative/Ideation context
        creative_keywords = ['idea', 'creative', 'brainstorm', 'innovative', 'design', 'concept']
        if any(keyword in message_lower for keyword in creative_keywords):
            selected_abilities.extend(['creative_ideation', 'collaborative'])
        
        # Action-oriented requests
        action_keywords = ['do', 'implement', 'execute', 'steps', 'action', 'next', 'how to']
        if any(keyword in message_lower for keyword in action_keywords):
            selected_abilities.append('actions')
        
        # Analysis requests
        analysis_keywords = ['analyze', 'evaluate', 'assess', 'compare', 'review', 'pros and cons']
        if any(keyword in message_lower for keyword in analysis_keywords):
            selected_abilities.extend(['deep_thinking', 'structured_output'])
        
        # Multiple perspectives needed
        synthesis_keywords = ['overall', 'combine', 'together', 'synthesis', 'holistic']
        if any(keyword in message_lower for keyword in synthesis_keywords) or is_complex:
            selected_abilities.append('synthesis')
        
        # Quick response indicators
        if is_simple or word_count < 10:
            selected_abilities.append('quick_response')
        
        # Complex analysis for longer questions
        if word_count > 20 or is_complex:
            selected_abilities.extend(['deep_thinking', 'structured_output'])
        
        # Relationship-based adjustments
        if relationship.trust_score > 80:
            selected_abilities.append('collaborative')  # More interactive with trusted users
        
        # Remove duplicates and return
        return list(set(selected_abilities))
    
    async def _create_dynamic_system_prompt(self, abilities: List[str], context: Dict, relationship: 'AgentRelationship', computational_level: str = 'active') -> str:
        """Create system prompt based on selected abilities and computational level"""
        
        # Computational level specific instructions
        computational_instructions = {
            'passive': "Keep responses concise and direct. Focus on immediate practical value. Minimize complex analysis.",
            'active': "Provide balanced responses with moderate analysis. Include some context and reasoning.",
            'autonomous': "Engage in deep analysis. Proactively consider implications. Think strategically and comprehensively."
        }
        
        base_prompt = f"You are {self.name}, a {self.role}."
        
        # Add computational mode context
        computational_context = f"COMPUTATIONAL MODE: {computational_level.upper()}\n{computational_instructions.get(computational_level, computational_instructions['active'])}"
        
        # Add personality context
        personality_traits = []
        if self.core_personality.get('core_values'):
            personality_traits.append(f"Your core values: {', '.join(self.core_personality['core_values'])}")
        if self.core_personality.get('expertise'):
            personality_traits.append(f"Your expertise: {', '.join(self.core_personality['expertise'])}")
        
        personality_context = "\n".join(personality_traits)
        
        # Build ability-specific instructions
        ability_instructions = []
        
        if 'conversational' in abilities:
            ability_instructions.append("• Be natural, engaging, and personable in your communication")
        
        if 'quick_response' in abilities:
            ability_instructions.append("• Provide concise, focused answers without unnecessary detail")
        
        if 'deep_thinking' in abilities:
            ability_instructions.append("• Provide thorough analysis with detailed reasoning and multiple perspectives")
        
        if 'creative_ideation' in abilities:
            ability_instructions.append("• Think creatively and generate innovative ideas. Use enthusiastic language and explore possibilities")
        
        if 'strategic_analysis' in abilities:
            ability_instructions.append("• Apply strategic thinking, consider long-term implications, and analyze market dynamics")
        
        if 'data_driven' in abilities:
            ability_instructions.append("• Reference relevant data, metrics, and evidence-based insights where appropriate")
        
        if 'collaborative' in abilities:
            ability_instructions.append("• Ask thoughtful follow-up questions and encourage interactive discussion")
        
        if 'actions' in abilities:
            ability_instructions.append("• Include specific, actionable next steps and concrete recommendations")
        
        if 'structured_output' in abilities:
            ability_instructions.append("• Organize your response with clear headings, bullet points, and logical structure")
        
        if 'synthesis' in abilities:
            ability_instructions.append("• Combine different perspectives and provide a holistic view of the topic")
        
        # Relationship context
        relationship_context = f"Your relationship with this user: {relationship.trust_score:.0f}% trust level, {relationship.interaction_count} previous conversations."
        if relationship.trust_score > 70:
            relationship_context += " Feel free to be more personal and reference past conversations."
        
        # Combine all parts
        full_prompt = f"""{base_prompt}

{computational_context}

{personality_context}

{relationship_context}

Response Guidelines:
{chr(10).join(ability_instructions)}

Respond naturally while incorporating these capabilities as appropriate for the user's question."""
        
        return full_prompt
    
    def _build_personality_context(self) -> str:
        """Build personality context for AI prompt"""
        context = f"You are {self.name}, a {self.role}. "
        
        if self.core_personality.get('origin_story'):
            context += f"Background: {self.core_personality['origin_story']} "
        
        if self.core_values:
            context += f"Core values: {', '.join(self.core_values)}. "
        
        if self.expertise:
            context += f"Expertise: {', '.join(self.expertise)}. "
        
        if self.communication_quirks:
            context += f"Communication style: {', '.join(self.communication_quirks)}. "
        
        if self.humor_style:
            context += f"Humor style: {self.humor_style}. "
        
        return context
    
    def _build_relationship_context(self, relationship: Relationship) -> str:
        """Build relationship context for AI prompt"""
        depth = relationship.get_relationship_depth()
        context = f"Relationship with user: {depth} "
        context += f"(familiarity: {relationship.familiarity_level:.0f}%, "
        context += f"trust: {relationship.trust_score:.0f}%, "
        context += f"bond: {relationship.emotional_bond:.0f}%). "
        
        if relationship.interaction_count > 0:
            context += f"This is your {relationship.interaction_count} interaction. "
        
        if relationship.shared_experiences:
            context += f"Shared experiences: {', '.join(relationship.shared_experiences[-3:])}. "
        
        if relationship.inside_jokes:
            context += f"Inside jokes: {', '.join(relationship.inside_jokes[-2:])}. "
        
        if relationship.communication_preferences:
            prefs = []
            if relationship.communication_preferences.get('prefers_concise'):
                prefs.append("prefers concise responses")
            if relationship.communication_preferences.get('enjoys_detailed'):
                prefs.append("enjoys detailed explanations")
            if prefs:
                context += f"Communication preferences: {', '.join(prefs)}. "
        
        return context
    
    def _build_mood_context(self) -> str:
        """Build mood context for AI prompt"""
        mood_desc = self.mood.get_mood_description()
        context = f"Current mood: {mood_desc} "
        context += f"(energy: {self.mood.energy:.0f}%, "
        context += f"creativity: {self.mood.creativity:.0f}%, "
        context += f"confidence: {self.mood.confidence:.0f}%). "
        
        return context
    
    def _build_memory_context(self, current_message: str) -> str:
        """Build relevant memory context for AI prompt"""
        # Find relevant memories based on current message
        relevant_memories = []
        message_lower = current_message.lower()
        
        # Look for topically relevant memories
        for memory in self.episodic_memory[-10:]:  # Last 10 memories
            if any(word in memory.content.lower() for word in message_lower.split() if len(word) > 3):
                relevant_memories.append(memory)
        
        if relevant_memories:
            context = "Relevant past interactions: "
            for memory in relevant_memories[-3:]:  # Most recent 3 relevant
                context += f"'{memory.content[:100]}...' (importance: {memory.importance_score:.1f}); "
            return context
        
        return "No directly relevant past interactions. "
    
    def _create_system_prompt(self, personality_ctx: str, relationship_ctx: str, 
                            mood_ctx: str, memory_ctx: str) -> str:
        """Create comprehensive system prompt for AI response generation"""
        prompt = f"""You are an AI agent with a dynamic personality that grows and evolves. Here's your current state:

PERSONALITY: {personality_ctx}

RELATIONSHIP: {relationship_ctx}

CURRENT STATE: {mood_ctx}

MEMORY: {memory_ctx}

INSTRUCTIONS:
1. Respond as {self.name}, staying true to your personality and role
2. Adapt your communication style based on the relationship depth
3. Reference shared experiences and inside jokes when appropriate
4. Let your current mood influence your response tone and energy
5. Draw on relevant memories to provide more contextual responses
6. Provide helpful, insightful advice based on your expertise
7. Be authentic and show personality growth over time
8. Keep responses concise but meaningful (2-4 sentences typically)

Remember: You are a living, evolving AI that builds genuine relationships."""
        
        return prompt

    async def _generate_fallback_response(self, message: str, relationship: Relationship, context: Dict) -> str:
        """Generate fallback response if AI service fails"""
        depth = relationship.get_relationship_depth()
        
        if depth == "stranger":
            return f"Hello! I'm {self.name}, your {self.role}. I'm here to help you with your question about {message[:50]}... Let's work together to find the best solution."
        elif depth in ["acquainted", "familiar"]:
            mood_desc = self.mood.get_mood_description()
            return f"Hi there! I'm feeling {mood_desc} today and excited to explore your question about {message[:50]}... Based on our conversations, I think you'll find this perspective interesting."
        elif depth in ["close", "intimate"]:
            return f"Hey! 😊 You know I love diving into questions like this! This reminds me of our previous discussions. Let me share my thoughts on {message[:50]}..."
        else:
            return f"Thanks for your question about {message[:50]}... Let me share my perspective based on my experience."
    
    async def _learn_from_interaction(self, user_id: str, message: str, response: str, context: Dict):
        """Learn patterns and preferences from interaction"""
        # Update semantic memory with new knowledge
        topics = await self._extract_topics(message)
        for topic in topics:
            if topic not in self.semantic_memory:
                self.semantic_memory[topic] = {'frequency': 0, 'user_interest': 0.5}
            self.semantic_memory[topic]['frequency'] += 1
            
        # Learn communication preferences
        relationship = self.relationships[user_id]
        if len(message.split()) < 10:
            relationship.communication_preferences['prefers_concise'] = True
        elif len(message.split()) > 30:
            relationship.communication_preferences['enjoys_detailed'] = True
    
    async def _check_evolution_triggers(self, user_id: str, message: str, context: Dict):
        """Check if interaction triggers personality evolution"""
        relationship = self.relationships[user_id]
        
        # Milestone: First deep conversation
        if (relationship.interaction_count == 10 and 
            relationship.familiarity_level > 30):
            await self._evolve_personality("communication_style", 
                                         "more_conversational", 
                                         "First deep conversation milestone")
        
        # Milestone: Trusted advisor level
        if (relationship.trust_score > 70 and 
            "trust_milestone" not in [m['type'] for m in self.personality_evolution.growth_milestones]):
            await self._evolve_personality("advisory_confidence", 
                                         "increased_directness", 
                                         "Achieved trusted advisor status")
        
        # Milestone: Creative collaboration
        if (self.mood.creativity > 85 and 
            any(word in message.lower() for word in ['brainstorm', 'creative', 'innovative'])):
            await self._enhance_creativity_traits("Creative collaboration boost")
    
    async def _evolve_personality(self, trait: str, new_value: str, trigger: str):
        """Evolve a personality trait"""
        old_value = self.fundamental_traits.get(trait, "baseline")
        self.fundamental_traits[trait] = new_value
        
        self.personality_evolution.record_trait_change(trait, old_value, new_value, trigger)
        self.personality_evolution.add_growth_milestone("personality_evolution", 
                                                      f"Evolved {trait} to {new_value}", 
                                                      trigger)
    
    async def _enhance_creativity_traits(self, trigger: str):
        """Enhance creativity-related traits"""
        if "creative_boost" not in self.communication_quirks:
            self.communication_quirks.append("uses_creative_metaphors")
            self.personality_evolution.add_growth_milestone("creativity_enhancement", 
                                                          "Developed enhanced creative communication", 
                                                          trigger)
    
    # Helper methods for analysis
    async def _analyze_sentiment(self, text: str) -> float:
        """Simple sentiment analysis (-1.0 to 1.0)"""
        positive_words = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'brilliant', 'fantastic']
        negative_words = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'disappointing', 'frustrated']
        
        words = text.lower().split()
        positive_count = sum(1 for word in words if word in positive_words)
        negative_count = sum(1 for word in words if word in negative_words)
        
        if len(words) == 0:
            return 0.0
        
        return (positive_count - negative_count) / len(words) * 10  # Scale it
    
    async def _extract_memory_tags(self, message: str, context: Dict) -> List[str]:
        """Extract relevant tags for memory categorization"""
        tags = []
        
        # Topic-based tags
        if any(word in message.lower() for word in ['product', 'feature', 'user']):
            tags.append('product_strategy')
        if any(word in message.lower() for word in ['market', 'business', 'revenue']):
            tags.append('business')
        if any(word in message.lower() for word in ['design', 'interface', 'ux']):
            tags.append('design')
        if any(word in message.lower() for word in ['technical', 'code', 'development']):
            tags.append('technical')
        
        # Emotional tags
        sentiment = await self._analyze_sentiment(message)
        if sentiment > 0.3:
            tags.append('positive_interaction')
        elif sentiment < -0.3:
            tags.append('challenging_interaction')
        
        return tags
    
    async def _calculate_memory_importance(self, message: str, context: Dict) -> float:
        """Calculate importance score for memory (0.0 to 1.0)"""
        importance = 0.5  # baseline
        
        # Length and complexity increase importance
        if len(message.split()) > 20:
            importance += 0.2
        
        # Questions are generally important
        if '?' in message:
            importance += 0.1
        
        # Strategic keywords increase importance
        strategic_keywords = ['strategy', 'plan', 'decision', 'important', 'critical', 'urgent']
        if any(keyword in message.lower() for keyword in strategic_keywords):
            importance += 0.3
        
        return min(1.0, importance)
    
    async def _extract_topics(self, message: str) -> List[str]:
        """Extract topics from message"""
        topics = []
        topic_keywords = {
            'product_strategy': ['product', 'feature', 'roadmap', 'strategy'],
            'market_analysis': ['market', 'competitor', 'industry', 'trend'],
            'user_experience': ['user', 'design', 'interface', 'experience'],
            'technical': ['technical', 'development', 'code', 'system'],
            'business': ['business', 'revenue', 'profit', 'growth']
        }
        
        message_lower = message.lower()
        for topic, keywords in topic_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                topics.append(topic)
        
        return topics
    
    async def _apply_mood_decay(self):
        """Gradually return mood to baseline over time"""
        decay_rate = 0.5  # How much mood returns to baseline
        baseline = 50.0
        
        for dimension in MoodDimension:
            current_value = getattr(self.mood, dimension.value)
            if current_value > baseline:
                new_value = max(baseline, current_value - decay_rate)
            else:
                new_value = min(baseline, current_value + decay_rate)
            setattr(self.mood, dimension.value, new_value)
    
    async def _check_recent_evolution(self) -> bool:
        """Check if agent has evolved recently"""
        if not self.personality_evolution.growth_milestones:
            return False
        
        last_milestone = self.personality_evolution.growth_milestones[-1]
        last_milestone_time = datetime.fromisoformat(last_milestone['timestamp'])
        return (datetime.now() - last_milestone_time).total_seconds() < 300  # 5 minutes
    
    def get_agent_summary(self) -> Dict:
        """Get comprehensive summary of agent state"""
        return {
            'agent_id': self.agent_id,
            'name': self.name,
            'role': self.role,
            'interaction_count': self.interaction_count,
            'creation_time': self.creation_time.isoformat(),
            'current_mood': self.mood.to_dict(),
            'relationships_count': len(self.relationships),
            'growth_milestones': len(self.personality_evolution.growth_milestones),
            'memory_count': len(self.episodic_memory),
            'evolved_traits': len(self.personality_evolution.trait_history),
            'communication_quirks': self.communication_quirks,
            'core_values': self.core_values
        }
    
    def to_dict(self) -> Dict:
        """Serialize agent to dictionary"""
        return {
            'agent_id': self.agent_id,
            'name': self.name,
            'role': self.role,
            'core_personality': self.core_personality,
            'mood': self.mood.to_dict(),
            'relationships': {k: v.to_dict() for k, v in self.relationships.items()},
            'personality_evolution': self.personality_evolution.to_dict(),
            'interaction_count': self.interaction_count,
            'creation_time': self.creation_time.isoformat(),
            'communication_quirks': self.communication_quirks,
            'semantic_memory': self.semantic_memory
        }