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


@dataclass
class IntelligenceResponse:
    query: IntelligenceQuery
    council_responses: List[CouncilResponse]
    synthesis: str
    recommended_actions: List[str]
    confidence_score: float
    processing_time: float
    timestamp: str


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
    
    async def process_query(self, query: IntelligenceQuery) -> IntelligenceResponse:
        """
        Main intelligence processing pipeline:
        1. Analyze user intent
        2. Route to appropriate council members
        3. Synthesize responses
        4. Provide strategic recommendations
        """
        start_time = datetime.now()
        
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
        
        # If specific members requested, use those
        if query.requested_members:
            return query.requested_members
        
        # Simple keyword-based routing for Day 1
        # In the future, this will use AI to analyze intent
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
            # Create prompt with member's personality
            system_prompt = member.get_system_prompt()
            user_prompt = f"The user asks: {query.user_input}"
            
            # Try AI providers in order of preference
            response = await self._call_ai_provider(system_prompt, user_prompt)
            
            return CouncilResponse(
                member_name=member.name,
                role=member.role,
                message=response,
                confidence_level=0.85,
                reasoning=f"Generated using {self.primary_model} from {member.role.value} perspective",
                suggested_actions=self._extract_actions_from_response(response),
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            print(f"Error getting AI response from {member.name}: {e}")
            return await self._get_simulated_response(member, query)
    
    async def _call_ai_provider(self, system_prompt: str, user_prompt: str) -> str:
        """Call AI provider based on preference order"""
        
        # Try Ollama first (primary choice for local control)
        if self.primary_model == "ollama":
            try:
                if await self.ollama_service.is_available():
                    messages = [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                    return await self.ollama_service.chat_completion(
                        messages=messages,
                        max_tokens=400,
                        temperature=0.7
                    )
            except Exception as e:
                print(f"Ollama failed: {e}, falling back to OpenAI...")
        
        # Fallback to OpenAI
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
        
        # Personality-based simulated responses for Day 1 testing
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
        
        # Prepare council input for synthesis
        council_input = f"User Query: {query.user_input}\n\nCouncil Member Responses:\n\n"
        
        for response in responses:
            council_input += f"**{response.member_name}** ({response.role.value.replace('_', ' ').title()}):\n{response.message}\n\n"
        
        # Create synthesis prompt for AI
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
            basic_synthesis = f"Based on your Intelligence Council's analysis of '{query.user_input}':\n\n"
            
            for response in responses:
                basic_synthesis += f"• **{response.member_name}** ({response.role.value.replace('_', ' ').title()}): {response.message}\n\n"
            
            basic_synthesis += "**Strategic Synthesis**: Your council agrees this requires a multi-faceted approach combining strategic thinking, market awareness, user focus, and operational excellence."
            
            return basic_synthesis
    
    async def _generate_recommended_actions(self, query: IntelligenceQuery, responses: List[CouncilResponse]) -> List[str]:
        """Generate actionable recommendations based on council input using AI"""
        
        if not responses:
            return ["Gather more information before proceeding"]
        
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