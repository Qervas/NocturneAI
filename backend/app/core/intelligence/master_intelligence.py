"""
Master Intelligence - Your Extended Mind
Central coordinator for your entire AI Council and Intelligence Empire.
"""

import os
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Union
import openai
import anthropic
from dataclasses import dataclass

from app.core.agents.council_members import AICouncil, CouncilMember, CouncilResponse
from app.services.ollama_service import ollama_service


@dataclass
class IntelligenceQuery:
    user_input: str
    context: Dict = None
    requested_members: List[str] = None
    query_type: str = "general"
    priority: str = "normal"
    interaction_mode: str = "casual_chat"
    channel_type: str = "general"  # "general", "dm", "team"
    channel_id: str = None
    direct_member: str = None  # For direct member conversations


@dataclass
class IntelligenceResponse:
    query: IntelligenceQuery
    council_responses: List[CouncilResponse]
    synthesis: str
    recommended_actions: List[str]
    confidence_score: float
    processing_time: float
    timestamp: str


# NEW: Individual Member Response for direct conversations
@dataclass
class IndividualMemberResponse:
    member_name: str
    role: str
    message: str
    confidence_level: float
    reasoning: str
    suggested_actions: List[str]
    timestamp: str
    conversation_context: Dict = None
    is_direct_response: bool = True


class MasterIntelligence:
    """
    Your Personal Chief of Staff - Coordinates all AI Council members
    and provides strategic synthesis of their expertise.
    """
    
    def __init__(self):
        self.council = AICouncil()
        self.conversation_history = []
        self.user_preferences = {}
        self.context_memory = {}
        
        # AI Provider Configuration
        self.primary_model = os.getenv("PRIMARY_MODEL", "ollama")
        
        # Initialize AI clients
        self.openai_client = None
        self.anthropic_client = None
        self.ollama_service = ollama_service
        self._initialize_ai_clients()
    
    def _initialize_ai_clients(self):
        """Initialize AI provider clients"""
        openai_key = os.getenv("OPENAI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        
        if openai_key:
            openai.api_key = openai_key
            self.openai_client = openai
        
        if anthropic_key:
            self.anthropic_client = anthropic.Client(api_key=anthropic_key)
    
    async def process_query(self, query: IntelligenceQuery) -> Union[IntelligenceResponse, IndividualMemberResponse]:
        """
        Main intelligence processing pipeline with first-principle routing:
        - Direct Member Conversations (DMs): Route directly to individual member
        - Council Discussions (Channels): Route to multiple members with synthesis
        """
        start_time = datetime.now()
        
        # FIRST PRINCIPLE: Direct member conversations should be personal and direct
        if query.channel_type == "dm" and query.direct_member:
            print(f"DEBUG: Processing direct conversation with {query.direct_member}")
            return await self._handle_direct_member_conversation(query, start_time)
        
        # FIRST PRINCIPLE: Council discussions involve multiple perspectives and synthesis
        else:
            print(f"DEBUG: Processing council discussion")
            return await self._handle_council_discussion(query, start_time)
    
    async def _handle_direct_member_conversation(self, query: IntelligenceQuery, start_time: datetime) -> IndividualMemberResponse:
        """Handle direct conversation with a specific council member"""
        member = self.council.get_member(query.direct_member.lower())
        if not member:
            raise ValueError(f"Unknown council member: {query.direct_member}")
        
        # Get direct response from the specific member
        response = await self._get_direct_member_response(member, query)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Store in conversation history (different format for individual conversations)
        individual_response = IndividualMemberResponse(
            member_name=response.member_name,
            role=response.role.value,
            message=response.message,
            confidence_level=response.confidence_level,
            reasoning=response.reasoning,
            suggested_actions=response.suggested_actions,
            timestamp=datetime.now().isoformat(),
            conversation_context={
                "channel_type": query.channel_type,
                "channel_id": query.channel_id,
                "processing_time": processing_time
            },
            is_direct_response=True
        )
        
        return individual_response
    
    async def _handle_council_discussion(self, query: IntelligenceQuery, start_time: datetime) -> IntelligenceResponse:
        """Handle council discussion with multiple members and synthesis"""
        # Determine which council members should respond
        target_members = await self._determine_council_participation(query)
        
        # Get responses from relevant council members
        council_responses = await self._gather_council_responses(query, target_members)
        
        # Synthesize responses into strategic guidance
        synthesis = await self._synthesize_council_input(query, council_responses)
        
        # Generate recommended actions
        actions = await self._generate_recommended_actions(query, council_responses)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        response = IntelligenceResponse(
            query=query,
            council_responses=council_responses,
            synthesis=synthesis,
            recommended_actions=actions,
            confidence_score=self._calculate_confidence(council_responses),
            processing_time=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
        # Store in conversation history
        self.conversation_history.append(response)
        
        return response
    
    async def _determine_council_participation(self, query: IntelligenceQuery) -> List[str]:
        """Analyze query to determine which council members should participate"""
        
        # If specific members requested (from channels/DMs), use those STRICTLY
        if query.requested_members:
            print(f"DEBUG: Using requested members: {query.requested_members}")
            return query.requested_members
        
        # Only use keyword-based routing for #general channel (no specific members)
        query_lower = query.user_input.lower()
        participating_members = []
        
        # Product strategy keywords
        if any(word in query_lower for word in ['product', 'feature', 'user', 'roadmap', 'strategy']):
            participating_members.append('sarah')
        
        # Market intelligence keywords  
        if any(word in query_lower for word in ['market', 'competition', 'business', 'opportunity', 'revenue']):
            participating_members.append('marcus')
        
        # UX design keywords
        if any(word in query_lower for word in ['design', 'interface', 'user experience', 'ui', 'ux']):
            participating_members.append('elena')
        
        # Operations keywords
        if any(word in query_lower for word in ['implementation', 'technical', 'architecture', 'deployment', 'timeline']):
            participating_members.append('david')
        
        # If no specific matches, include all members for comprehensive analysis
        if not participating_members:
            participating_members = ['sarah', 'marcus', 'elena', 'david']
        
        print(f"DEBUG: Auto-assigned members: {participating_members}")
        return participating_members
    
    async def _gather_council_responses(self, query: IntelligenceQuery, members: List[str]) -> List[CouncilResponse]:
        """Gather responses from specified council members"""
        responses = []
        
        # Process council members in parallel
        tasks = []
        for member_name in members:
            member = self.council.get_member(member_name)
            if member:
                tasks.append(self._get_member_response(member, query))
        
        if tasks:
            responses = await asyncio.gather(*tasks)
        
        return responses
    
    async def _get_member_response(self, member: CouncilMember, query: IntelligenceQuery) -> CouncilResponse:
        """Get response from a specific council member using AI"""
        
        try:
            # For now, use simulated responses to avoid WebSocket issues
            print(f"Getting simulated response from {member.name}")
            return await self._get_simulated_response(member, query)
            
        except Exception as e:
            print(f"Error getting response from {member.name}: {e}")
            return await self._get_simulated_response(member, query)
    
    async def _call_ai_provider(self, system_prompt: str, user_prompt: str) -> str:
        """Call AI provider based on preference order"""
        
        # Skip all AI providers for now - use simple fallback
        return f"Simple response to: {user_prompt}"
        if self.openai_client:
            try:
                return await self._call_openai(system_prompt, user_prompt)
            except Exception as e:
                print(f"OpenAI failed: {e}, falling back to Anthropic...")
        
        # Fallback to Anthropic
        if self.anthropic_client:
            try:
                return await self._call_anthropic(system_prompt, user_prompt)
            except Exception as e:
                print(f"Anthropic failed: {e}")
        
        # Ultimate fallback
        raise Exception("No AI providers available")

    def _extract_actions_from_response(self, response: str) -> List[str]:
        """Extract actionable items from AI response"""
        # Simple implementation - look for action-oriented phrases
        actions = []
        
        # Look for common action patterns
        action_phrases = [
            "should", "recommend", "suggest", "consider", "implement",
            "develop", "create", "build", "test", "analyze", "review"
        ]
        
        sentences = response.split('. ')
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(phrase in sentence_lower for phrase in action_phrases):
                actions.append(sentence.strip())
        
        # Limit to top 3 actions
        return actions[:3] if actions else [f"Review and analyze the implications"]

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> str:
        """Call OpenAI API with proper error handling"""
        try:
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=400,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    async def _call_anthropic(self, system_prompt: str, user_prompt: str) -> str:
        """Call Anthropic API with proper error handling"""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=400,
                temperature=0.7,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            return response.content[0].text
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")
    
    async def _get_simulated_response(self, member: CouncilMember, query: IntelligenceQuery) -> CouncilResponse:
        """Generate simulated response for testing without API keys"""
        
        # Personality-based simulated responses with casual chat support
        interaction_mode = getattr(query, 'interaction_mode', 'casual_chat')
        
        if interaction_mode == 'casual_chat':
            responses_by_member = {
                'Sarah': f"Hey! 👋 Nice to hear from you! {query.user_input} sounds interesting. From a product perspective, I think there's definitely potential here. What specific aspects are you curious about?",
                'Marcus': f"Hi there! 😊 Great question about {query.user_input}. I see some solid market opportunities here. Want to dive into the business side of things?", 
                'Elena': f"Hello! 🎨 Love chatting about {query.user_input}! From a design standpoint, I'm already picturing some cool user experiences. What's your vision for how people would interact with this?",
                'David': f"Hey! 👨‍💻 Thanks for reaching out about {query.user_input}. Operationally, this looks doable. What's your timeline looking like? Let's make it happen!"
            }
        else:
            responses_by_member = {
                'Sarah': f"From a product strategy perspective: {query.user_input} requires careful analysis of user value and market fit. I recommend we prioritize this based on data-driven frameworks.",
                'Marcus': f"This presents an interesting market opportunity. {query.user_input} could give us significant competitive advantages if we move quickly and strategically.",
                'Elena': f"From a UX standpoint: {query.user_input} needs to prioritize user experience and intuitive design. I'm envisioning interfaces that feel natural and engaging.",
                'David': f"Operationally speaking: {query.user_input} will require careful timeline planning and risk assessment. I estimate we need proper resource allocation for this initiative."
            }
        
        return CouncilResponse(
            member_name=member.name,
            role=member.role,
            message=responses_by_member.get(member.name, f"[{member.name}] Let me analyze this thoroughly..."),
            confidence_level=0.7,
            reasoning=f"Initial {member.role.value} assessment",
            suggested_actions=[f"Deep dive into {member.role.value} aspects", "Gather more context"],
            timestamp=datetime.now().isoformat()
        )
    
    async def _synthesize_council_input(self, query: IntelligenceQuery, responses: List[CouncilResponse]) -> str:
        """Synthesize council responses into strategic guidance using AI"""
        
        if not responses:
            return "I need more information to provide strategic guidance on this matter."
        
        # Handle different interaction modes
        interaction_mode = getattr(query, 'interaction_mode', 'casual_chat')
        
        # Handle DM responses differently (single member = direct response)
        if len(responses) == 1:
            single_response = responses[0]
            
            if interaction_mode == 'casual_chat':
                return single_response.message  # Just the raw response for casual chat
            else:
                return f"**{single_response.member_name} responds:**\n\n{single_response.message}"
        
        # For multiple members, provide full synthesis
        council_input = f"User Query: {query.user_input}\n\nCouncil Member Responses:\n\n"
        
        for response in responses:
            council_input += f"**{response.member_name}** ({response.role.value.replace('_', ' ').title()}):\n{response.message}\n\n"
        
        # Create synthesis prompt based on number of members
        if len(responses) == 2:
            synthesis_prompt = f"""You are coordinating a focused discussion between 2 expert team members.

{council_input}

Provide a concise synthesis that:
- Highlights key insights from each expert
- Shows how their perspectives align or complement each other
- Gives clear next steps based on their combined expertise

Keep it focused and actionable."""
        else:
            synthesis_prompt = f"""You are the Master Intelligence coordinator for a strategic AI Council. Your job is to synthesize multiple expert perspectives into a unified strategic recommendation.

COUNCIL INPUT:
{council_input}

SYNTHESIS REQUIREMENTS:
1. Identify key themes and agreements across all council members
2. Highlight any conflicts or tensions between different perspectives  
3. Provide a unified strategic framework that integrates all viewpoints
4. Prioritize the most critical recommendations
5. Create actionable next steps based on the collective wisdom

Your synthesis should be concise, strategic, and immediately actionable. Focus on what the user should DO, not just what they should think about.

Provide your strategic synthesis:"""

        try:
            # Use AI to create intelligent synthesis
            synthesis = await self._call_ai_provider(
                system_prompt="You are a strategic synthesis expert who combines multiple perspectives into unified, actionable guidance.",
                user_prompt=synthesis_prompt
            )
            
            return f"**Strategic Synthesis:**\n\n{synthesis}"
            
        except Exception as e:
            print(f"AI synthesis failed: {e}, using basic synthesis")
            # Fallback to basic synthesis
            if len(responses) == 1:
                return f"**{responses[0].member_name}:** {responses[0].message}"
            
            basic_synthesis = f"Based on your Intelligence Council's analysis of '{query.user_input}':\n\n"
            
            for response in responses:
                basic_synthesis += f"• **{response.member_name}** ({response.role.value.replace('_', ' ').title()}): {response.message}\n\n"
            
            basic_synthesis += "**Strategic Synthesis**: Your council agrees this requires a multi-faceted approach combining strategic thinking, market awareness, user focus, and operational excellence."
            
            return basic_synthesis
    
    async def _generate_recommended_actions(self, query: IntelligenceQuery, responses: List[CouncilResponse]) -> List[str]:
        """Generate actionable recommendations based on council input using AI"""
        
        if not responses:
            return ["Gather more information before proceeding"]
        
        # Skip actions for casual chat mode
        interaction_mode = getattr(query, 'interaction_mode', 'casual_chat')
        if interaction_mode == 'casual_chat':
            return []
        
        # Prepare input for action generation
        council_insights = f"User Query: {query.user_input}\n\nCouncil Member Insights:\n\n"
        
        for response in responses:
            council_insights += f"**{response.member_name}**: {response.message[:200]}...\n"
            if response.suggested_actions:
                council_insights += f"Suggested Actions: {', '.join(response.suggested_actions[:2])}\n\n"
        
        action_prompt = f"""Based on the following strategic council discussion, generate 3-5 specific, actionable next steps.

{council_insights}

REQUIREMENTS:
- Each action should be specific and immediately executable
- Prioritize actions by impact and urgency  
- Focus on concrete steps, not general advice
- Make actions measurable where possible

Generate a numbered list of recommended actions:"""

        try:
            # Use AI to generate strategic actions
            ai_actions = await self._call_ai_provider(
                system_prompt="You are a strategic action planner who creates specific, executable next steps from high-level strategic discussions.",
                user_prompt=action_prompt
            )
            
            # Parse AI response into list
            action_lines = [line.strip() for line in ai_actions.split('\n') if line.strip() and (line.strip()[0].isdigit() or line.strip().startswith('-'))]
            actions = [line.split('.', 1)[-1].strip() if '.' in line else line.strip() for line in action_lines[:5]]
            
            return actions if actions else ["Review council recommendations and create implementation plan"]
            
        except Exception as e:
            print(f"AI action generation failed: {e}, using fallback actions")
            # Fallback to collecting member suggestions
            actions = []
            for response in responses:
                actions.extend(response.suggested_actions)
            
            # Add strategic actions if nothing collected
            if not actions:
                actions = [
                    "Schedule follow-up council session for detailed planning",
                    "Document key insights for future reference", 
                    "Consider long-term strategic implications"
                ]
            
            return list(set(actions))[:5]  # Remove duplicates, limit to 5
    
    def _calculate_confidence(self, responses: List[CouncilResponse]) -> float:
        """Calculate overall confidence score based on council responses"""
        if not responses:
            return 0.0
        
        avg_confidence = sum(r.confidence_level for r in responses) / len(responses)
        return round(avg_confidence, 2)
    
    def get_conversation_history(self, limit: int = 10) -> List[IntelligenceResponse]:
        """Get recent conversation history"""
        return self.conversation_history[-limit:]
    
    def get_council_status(self) -> Dict:
        """Get status of all council members"""
        return {
            name: {
                'name': member.name,
                'role': member.role.value,
                'status': 'active',
                'expertise': member.personality_traits.get('expertise', [])
            }
            for name, member in self.council.get_all_members().items()
        } 
    
    async def _get_direct_member_response(self, member: CouncilMember, query: IntelligenceQuery) -> CouncilResponse:
        """Get a direct, personal response from a council member (not as part of council)"""
        
        # Create a personalized system prompt for direct conversation
        system_prompt = f"""You are {member.name}, speaking directly to your user in a personal conversation.

Your Role: {member.role.value.replace('_', ' ').title()}
Your Personality: {member.personality_traits}

CRITICAL: You are NOT speaking as part of a council. This is a direct, personal conversation.
- Respond as yourself, not as "part of the council"
- Be natural, conversational, and authentic to your personality
- Show your individual expertise and perspective
- Don't reference other council members unless specifically asked
- Make it feel like a genuine 1-on-1 conversation

Context: This is a private direct message conversation. Be more personal and direct than you would be in a group setting.

User's message: {query.user_input}

Respond naturally as {member.name} would in a personal conversation."""
        
        try:
            # For now, use enhanced simulated responses focused on individual personality
            print(f"Getting direct personal response from {member.name}")
            return await self._get_direct_simulated_response(member, query)
            
        except Exception as e:
            print(f"Error getting direct response from {member.name}: {e}")
            return await self._get_direct_simulated_response(member, query)
    
    async def _get_direct_simulated_response(self, member: CouncilMember, query: IntelligenceQuery) -> CouncilResponse:
        """Generate direct, personal responses for individual member conversations"""
        
        # Personal response patterns for each member
        personal_responses = {
            'Sarah': {
                'greeting_style': "Hey there! ",
                'voice': "strategic yet approachable",
                'example_response': f"Hey! Great question about {query.user_input}. From my product strategy perspective, I'm thinking we need to look at this through the lens of user value and market positioning. Let me break down my thoughts for you...",
                'personality_traits': ["analytical", "user-focused", "strategic", "diplomatic"]
            },
            'Marcus': {
                'greeting_style': "Absolutely! ",
                'voice': "confident business-minded",
                'example_response': f"This is exactly the kind of opportunity I get excited about! {query.user_input} has some serious market potential. Here's what I'm seeing from a business intelligence angle...",
                'personality_traits': ["ambitious", "market-driven", "opportunity-focused", "results-oriented"]
            },
            'Elena': {
                'greeting_style': "Oh, I love this question! ",
                'voice': "creative and empathetic",
                'example_response': f"This is such a fascinating challenge! {query.user_input} immediately makes me think about the human experience and how we can make this intuitive and delightful. Let me share my UX perspective...",
                'personality_traits': ["creative", "user-empathetic", "design-focused", "innovative"]
            },
            'David': {
                'greeting_style': "Let me think through this systematically. ",
                'voice': "structured and reliable",
                'example_response': f"Good question. {query.user_input} requires careful operational planning. I need to consider the technical feasibility, resource requirements, and implementation timeline. Here's my structured analysis...",
                'personality_traits': ["methodical", "detail-oriented", "practical", "reliable"]
            }
        }
        
        member_info = personal_responses.get(member.name, personal_responses['Sarah'])
        
        # Generate personalized response based on member's unique voice
        if 'hello' in query.user_input.lower() or 'hi' in query.user_input.lower():
            if member.name == 'Sarah':
                message = "Hey! Great to chat with you directly. I'm Sarah, your product strategy advisor. What's on your mind today? I'm here to help you think through any product decisions or strategic questions you're wrestling with."
            elif member.name == 'Marcus':
                message = "Hey there! Marcus here. Always excited to dive into business opportunities and market insights with you. What business challenge or opportunity are you thinking about? Let's explore the potential together."
            elif member.name == 'Elena':
                message = "Hi! I'm Elena, your UX design expert. I love helping you think through user experiences and creative solutions. What design challenge or user experience question can I help you with today?"
            elif member.name == 'David':
                message = "Hello! David here, your operations and technical planning specialist. I'm here to help you think through the practical implementation of your ideas. What operational challenge or technical question can I help you work through?"
            else:
                message = f"Hello! I'm {member.name}. How can I help you today?"
        else:
            # Generate contextual response based on member's expertise
            if member.name == 'Sarah':
                message = f"Interesting question about {query.user_input}. From a product strategy standpoint, I'm thinking about user value, market fit, and competitive positioning. Let me share my perspective on how we can approach this strategically..."
            elif member.name == 'Marcus':
                message = f"This is a great business question! {query.user_input} presents some interesting market opportunities. I'm analyzing the competitive landscape, revenue potential, and strategic positioning. Here's what I'm thinking..."
            elif member.name == 'Elena':
                message = f"I love diving into questions like this! {query.user_input} makes me think about the user journey and how we can create an intuitive, delightful experience. From a UX perspective, here's what I'm considering..."
            elif member.name == 'David':
                message = f"Let me approach {query.user_input} from an operational lens. I need to consider technical feasibility, resource allocation, timeline, and risk factors. Here's my systematic analysis..."
            else:
                message = f"Thanks for the question about {query.user_input}. Let me share my thoughts on this..."
        
        # Add personal touch and actionable suggestions
        if member.name == 'Sarah':
            suggested_actions = [
                "Let's define the core user value proposition",
                "I'd recommend doing competitive analysis",
                "Consider user research to validate assumptions"
            ]
        elif member.name == 'Marcus':
            suggested_actions = [
                "Let's analyze the market opportunity size",
                "I suggest evaluating competitive differentiation",
                "Consider the revenue model and pricing strategy"
            ]
        elif member.name == 'Elena':
            suggested_actions = [
                "Let's map out the user journey",
                "I recommend creating user personas",
                "Consider prototyping key interactions"
            ]
        elif member.name == 'David':
            suggested_actions = [
                "Let's break down technical requirements",
                "I suggest creating an implementation timeline",
                "Consider risk assessment and mitigation"
            ]
        else:
            suggested_actions = ["Let's explore this further", "Consider additional research"]
        
        return CouncilResponse(
            member_name=member.name,
            role=member.role,
            message=message,
            confidence_level=0.9,  # Higher confidence for direct conversations
            reasoning=f"Direct personal response as {member.name}",
            suggested_actions=suggested_actions,
            timestamp=datetime.now().isoformat()
        ) 