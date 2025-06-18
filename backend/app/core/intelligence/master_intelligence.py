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
    channel_id: str = None
    channel_type: str = "channel"  # "channel" or "dm"


@dataclass
class IntelligenceResponse:
    query: IntelligenceQuery
    council_responses: List[CouncilResponse]
    synthesis: str
    recommended_actions: List[str]
    confidence_score: float
    processing_time: float
    timestamp: str
    response_type: str = "council"  # "council" or "individual"


class IndividualIntelligence:
    """
    Handles 1-on-1 conversations with individual council members.
    Different from council discussions - more personal, direct, and focused.
    """
    
    def __init__(self, council: AICouncil):
        self.council = council
    
    async def get_individual_response(self, member_key: str, query: IntelligenceQuery) -> CouncilResponse:
        """Get personal response from specific council member"""
        member = self.council.get_member(member_key)
        if not member:
            raise ValueError(f"Council member '{member_key}' not found")
        
        # Create personalized system prompt for individual conversation
        individual_prompt = self._create_individual_prompt(member, query)
        
        # Build user input with reply context if available
        user_input = query.user_input
        if query.context and query.context.get("is_reply") and query.context.get("reply_to"):
            reply_info = query.context["reply_to"]
            original_sender = reply_info.get("original_sender", "Unknown")
            original_content = reply_info.get("original_content", "")
            
            user_input = f"""REPLY CONTEXT:
You are responding to a message. The user is replying to this previous message:

From: {original_sender}
Message: "{original_content}"

USER'S REPLY: {query.user_input}

Please acknowledge the context and respond appropriately to their reply, taking into account what they're responding to."""
        
        try:
            # Try to use AI provider for authentic individual response
            response_text = await self._call_ai_provider_for_member(individual_prompt, user_input)
            
            # Generate member-specific actions for non-casual modes
            suggested_actions = []
            if query.interaction_mode != 'casual_chat':
                suggested_actions = self._generate_member_actions(member, query)
            
            return CouncilResponse(
                member_name=member.name,
                role=member.role,
                message=response_text,
                confidence_level=0.85,
                reasoning=f"AI-generated {query.interaction_mode} response based on {member.role.value} expertise",
                suggested_actions=suggested_actions,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            print(f"Error getting AI response from {member.name}: {e}, using simulated response")
            return await self._get_individual_simulated_response(member, query)
    
    def _create_individual_prompt(self, member: CouncilMember, query: IntelligenceQuery) -> str:
        """Create specialized prompt for 1-on-1 conversation"""
        interaction_mode = query.interaction_mode
        
        base_prompt = f"""You are {member.name}, having a direct 1-on-1 conversation with your strategic partner.

PERSONALITY & ROLE:
{member.get_system_prompt()}

CONVERSATION CONTEXT:
- This is a private DM conversation, not a council meeting
- Respond as yourself personally, not as part of a formal council
- Be conversational, direct, and authentic to your personality
- Share your genuine perspective and expertise
- Use first person ("I think...", "In my experience...")

INTERACTION MODE: {interaction_mode}
- casual_chat: Be natural, friendly, conversational
- strategic_brief: Provide structured analysis but keep it personal  
- quick_consult: Give focused, actionable advice
- brainstorm: Be creative and exploratory
- formal_analysis: Provide detailed professional analysis

RESPONSE GUIDELINES:
1. Respond as YOU personally, not representing the council
2. Use your natural speaking style and vocabulary
3. Share personal insights and experiences
4. Be helpful but maintain your distinct personality
5. Ask clarifying questions if needed
6. Keep responses focused and relevant to your expertise

Remember: This is a personal conversation between colleagues, not a formal presentation."""

        return base_prompt
    
    async def _get_individual_simulated_response(self, member: CouncilMember, query: IntelligenceQuery) -> CouncilResponse:
        """Generate enhanced individual response based on personality and context"""
        
        interaction_mode = query.interaction_mode
        user_input = query.user_input
        
        # Check if this is a reply to another message
        is_reply = False
        reply_context = ""
        if query.context and query.context.get("is_reply") and query.context.get("reply_to"):
            is_reply = True
            reply_info = query.context["reply_to"]
            original_sender = reply_info.get("original_sender", "Unknown")
            original_content = reply_info.get("original_content", "")[:100]  # Truncate for brevity
            reply_context = f" (replying to {original_sender}: '{original_content}...')"
        
        # Enhanced individual response patterns by member and mode with DISTINCTIVE formatting
        individual_responses = {
            'Sarah': {
                'casual_chat': f"Hey! 👋 Great to chat with you directly. About {user_input}{reply_context} - this really resonates with me from a product perspective. What's driving this question for you right now?",
                
                'strategic_brief': f"""**Strategic Product Analysis** 📋

Thanks for bringing this to me directly! Looking at **{user_input}** through my product lens:

**Strategic Considerations:**
• Market positioning and competitive advantage
• User value proposition alignment  
• Technical feasibility vs. business impact
• Resource allocation and timeline priorities

**My Take:** This needs a user-first approach with data-driven validation. Let me break down the key strategic elements we should explore...""",

                'quick_consult': f"""⚡ **Quick Product Consult**

**Question:** {user_input}

**My immediate take:** This needs a user-first approach. Here's what I'd prioritize:

1. **User research** - Validate the core need
2. **MVP scoping** - Define minimum viable features  
3. **Success metrics** - How do we measure impact?

**Bottom line:** Focus on user value first, features second.""",

                'brainstorm': f"""🧠 **Product Brainstorm Session**

Ooh, I love brainstorming about **{user_input}**! Let me think out loud here...

**Wild Ideas:**
• What if we approached this completely differently?
• Could we solve this with 80% less complexity?
• What would the "Tesla approach" look like here?

**Creative Angles:**
- User experience that feels magical
- Business model that scales effortlessly
- Technology that enables new possibilities

What's your favorite crazy idea so far?""",

                'formal_analysis': f"""📊 **Comprehensive Product Strategy Analysis**

**Subject:** {user_input}

**Executive Summary:**
I'm glad you came to me for a deep dive on this. Here's my comprehensive product strategy analysis...

**1. Market Analysis**
- Current landscape assessment
- Competitive positioning opportunities
- User segment identification

**2. Product Strategy**
- Value proposition framework
- Feature prioritization matrix
- Go-to-market considerations

**3. Implementation Roadmap**
- Phase 1: Foundation and validation
- Phase 2: Core feature development
- Phase 3: Scale and optimization

**4. Risk Assessment & Mitigation**
- Technical risks and solutions
- Market risks and contingencies
- Resource risks and alternatives

**Recommendation:** [Detailed strategic guidance follows...]"""
            },
            'Marcus': {
                'casual_chat': f"Hey there! 😊 Always excited to talk business with you. {user_input} has me thinking about some serious market opportunities. What's your take on the competitive landscape here?",
                
                'strategic_brief': f"""**Business Development Strategy** 💼

Great question to bring to me! **{user_input}** from a business development angle shows some really interesting potential.

**Market Opportunity Assessment:**
• Total addressable market (TAM) analysis
• Competitive landscape mapping
• Revenue model optimization
• Partnership and channel strategies

**Business Insights:** I see significant monetization potential here if we position this correctly in the market...""",

                'quick_consult': f"""💼 **Business Quick-Hit**

**Opportunity:** {user_input}

**My gut says:** There's money to be made here! Quick thoughts:

• **Revenue potential:** High/Medium/Low and why
• **Time to market:** Critical success factor
• **Competitive moat:** How we defend our position

**Action:** Let's validate the business case and move fast on market entry.""",

                'brainstorm': f"""🚀 **Business Ideation**

This is exciting! **{user_input}** could be huge if we play it right.

**Crazy Business Ideas:**
- What if we made this a platform instead of a product?
- Could we create a marketplace around this?
- What about a subscription model with network effects?

**Market Disruption Angles:**
- Undercut incumbents by 10x cost reduction
- Create entirely new value chain
- Turn competitors into customers

Let me throw some wild revenue models at you...""",

                'formal_analysis': f"""📈 **Comprehensive Business Analysis**

**Business Case:** {user_input}

**I. Market Assessment**
- Industry analysis and growth projections
- Competitive landscape and positioning
- Customer segments and buying behaviors

**II. Revenue Model Analysis**
- Multiple revenue stream evaluation
- Pricing strategy and optimization
- Customer lifetime value projections

**III. Go-to-Market Strategy**
- Channel partner identification
- Sales and marketing approach
- Customer acquisition cost analysis

**IV. Financial Projections**
- 3-year revenue and growth model
- Investment requirements and ROI
- Break-even analysis and milestones

**V. Strategic Recommendations**
[Comprehensive business strategy follows...]"""
            },
            'Elena': {
                'casual_chat': f"Hi! 🎨 So good to have some focused time to chat. {user_input} immediately makes me think about the user experience. How do you envision people actually interacting with this?",
                
                'strategic_brief': f"""**User Experience Strategy** 🎨

I love that you brought this UX question directly to me! **{user_input}** needs a design-first approach.

**UX Strategic Framework:**
• User journey mapping and pain point analysis
• Interface design principles and accessibility
• Interaction patterns and usability testing
• Visual hierarchy and information architecture

**Design Vision:** We need to prioritize user delight and intuitive interactions that feel effortless...""",

                'quick_consult': f"""🎨 **UX Quick Consult**

**Design Challenge:** {user_input}

**My immediate instinct:** We need to prioritize user delight. Here's how I'd approach it:

• **User research:** Who are we designing for?
• **Core interactions:** What's the main user flow?
• **Accessibility:** How do we make this inclusive?

**Design principle:** Simple is sophisticated. Less is more.""",

                'brainstorm': f"""✨ **Design Ideation Session**

This is so inspiring! **{user_input}** could be an amazing user experience.

**Creative UX Concepts:**
- What if the interface adapted to user behavior?
- Could we make this feel like a conversation?
- What about gestural or voice interactions?

**Design Innovation Ideas:**
- Micro-animations that guide users
- Progressive disclosure of complexity
- Personalization that feels magical

Let me sketch out some concepts in words...""",

                'formal_analysis': f"""🎯 **Comprehensive UX Analysis**

**Design Challenge:** {user_input}

**I. User Research & Analysis**
- User persona development and journey mapping
- Usability testing and behavioral insights
- Accessibility requirements and compliance

**II. Design Strategy**
- Information architecture and navigation
- Visual design system and brand alignment
- Interaction design patterns and micro-interactions

**III. Implementation Framework**
- Design system documentation
- Component library and style guides
- Responsive design and cross-platform considerations

**IV. Validation & Iteration**
- User testing methodology and metrics
- A/B testing framework for optimization
- Continuous improvement and feedback loops

**V. Design Recommendations**
[Detailed UX strategy and implementation plan follows...]"""
            },
            'David': {
                'casual_chat': f"Hey! 👨‍💻 Good to have some direct time to discuss this. {user_input} sounds like it needs some solid operational thinking. What's your current timeline looking like?",
                
                'strategic_brief': f"""**Operations & Implementation Strategy** ⚙️

Smart to loop me in on the operations side! **{user_input}** will need careful implementation planning.

**Operational Framework:**
• Technical architecture and infrastructure requirements
• Project timeline and milestone planning
• Resource allocation and team coordination
• Risk management and contingency planning

**Implementation Approach:** I recommend a phased rollout with careful monitoring and iterative improvements...""",

                'quick_consult': f"""⚙️ **Operations Quick Assessment**

**Implementation Challenge:** {user_input}

**My quick operational take:**

• **Timeline:** Realistic vs. aggressive scheduling
• **Resources:** Team capacity and skill requirements
• **Dependencies:** What needs to happen first?

**Execution priority:** Focus on deliverable milestones and risk mitigation.""",

                'brainstorm': f"""🔧 **Implementation Brainstorm**

Interesting challenge! **{user_input}** could be implemented in several ways.

**Creative Implementation Ideas:**
- What if we automated 80% of this process?
- Could we use existing infrastructure cleverly?
- What about a microservices approach?

**Operational Innovation:**
- Continuous deployment and monitoring
- Self-healing and auto-scaling systems
- Zero-downtime updates and rollbacks

Let me explore some technical options...""",

                'formal_analysis': f"""🏗️ **Comprehensive Operations Analysis**

**Implementation Project:** {user_input}

**I. Technical Architecture**
- System design and infrastructure requirements
- Scalability and performance considerations
- Security and compliance frameworks

**II. Project Management**
- Work breakdown structure and timeline
- Resource planning and team coordination
- Risk assessment and mitigation strategies

**III. Quality Assurance**
- Testing frameworks and automation
- Monitoring and alerting systems
- Performance metrics and optimization

**IV. Deployment Strategy**
- Environment management and CI/CD
- Rollout phases and rollback procedures
- Post-deployment monitoring and support

**V. Operational Recommendations**
[Detailed implementation plan and technical specifications follow...]"""
            }
        }
        
        response_text = individual_responses.get(member.name, {}).get(
            interaction_mode, 
            f"[{member.name}] Thanks for the direct question about {user_input}. Let me think about this from my perspective..."
        )
        
        # Generate member-specific actions for non-casual modes with distinctive formatting
        suggested_actions = []
        if interaction_mode == 'strategic_brief':
            if member.name == 'Sarah':
                suggested_actions = [
                    "📊 Define user personas and use cases",
                    "📋 Create product requirements document", 
                    "🔍 Plan user research and validation study"
                ]
            elif member.name == 'Marcus':
                suggested_actions = [
                    "📈 Conduct comprehensive competitive analysis",
                    "🎯 Identify optimal market entry strategy",
                    "🤝 Explore strategic partnership opportunities"
                ]
            elif member.name == 'Elena':
                suggested_actions = [
                    "🗺️ Create detailed user journey maps",
                    "🎨 Design initial wireframes and prototypes",
                    "🧪 Plan comprehensive usability testing"
                ]
            elif member.name == 'David':
                suggested_actions = [
                    "🏗️ Define detailed technical requirements",
                    "📅 Create comprehensive implementation timeline",
                    "⚖️ Assess resource and infrastructure requirements"
                ]
        elif interaction_mode == 'quick_consult':
            if member.name == 'Sarah':
                suggested_actions = [
                    "✅ Quick user validation survey",
                    "🎯 Define MVP scope and features"
                ]
            elif member.name == 'Marcus':
                suggested_actions = [
                    "💰 Validate revenue opportunity",
                    "⚡ Fast-track market entry"
                ]
            elif member.name == 'Elena':
                suggested_actions = [
                    "✏️ Sketch core user flows",
                    "🧪 Rapid prototype testing"
                ]
            elif member.name == 'David':
                suggested_actions = [
                    "⏱️ Create sprint planning",
                    "🔧 Set up development environment"
                ]
        elif interaction_mode == 'formal_analysis':
            if member.name == 'Sarah':
                suggested_actions = [
                    "📊 Complete comprehensive market research",
                    "📖 Develop full product strategy document",
                    "🔄 Establish product feedback loops",
                    "📈 Define success metrics and KPIs"
                ]
            elif member.name == 'Marcus':
                suggested_actions = [
                    "💼 Develop complete business plan",
                    "🤝 Establish key partnership agreements",
                    "💰 Secure funding and investment",
                    "📊 Create financial projections and models"
                ]
            elif member.name == 'Elena':
                suggested_actions = [
                    "🎨 Create comprehensive design system",
                    "🧪 Conduct extensive user research",
                    "📱 Design multi-platform experiences",
                    "♿ Ensure accessibility compliance"
                ]
            elif member.name == 'David':
                suggested_actions = [
                    "🏗️ Architect scalable technical solution",
                    "📋 Create detailed project roadmap",
                    "🛠️ Establish development and deployment pipeline",
                    "📊 Implement monitoring and analytics"
                ]
        # brainstorm mode gets no formal actions - it's for creativity
        
        return CouncilResponse(
            member_name=member.name,
            role=member.role,
            message=response_text,
            confidence_level=0.8 if interaction_mode in ['strategic_brief', 'formal_analysis'] else 0.7,
            reasoning=f"Personal {interaction_mode} response based on {member.role.value} expertise",
            suggested_actions=suggested_actions,
            timestamp=datetime.now().isoformat()
        )
    
    async def _call_ai_provider_for_member(self, system_prompt: str, user_input: str) -> str:
        """Call AI provider specifically for individual member responses"""
        # Try Ollama first
        try:
            if await ollama_service.is_available():
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ]
                response = await ollama_service.chat_completion(
                    messages=messages,
                    max_tokens=300,
                    temperature=0.8  # Slightly higher for more personality
                )
                if response and len(response.strip()) > 10:
                    return response
        except Exception as e:
            print(f"Ollama failed for individual response: {e}")
        
        # Fallback to master intelligence AI provider
        return await self._call_ai_provider(system_prompt, user_input)
    
    def _generate_member_actions(self, member: CouncilMember, query: IntelligenceQuery) -> List[str]:
        """Generate member-specific actions based on their expertise"""
        action_templates = {
            'Sarah': [
                "Define user personas and use cases",
                "Create product requirements document", 
                "Plan user research and validation",
                "Analyze competitive product features"
            ],
            'Marcus': [
                "Conduct competitive market analysis",
                "Identify market entry strategy",
                "Explore partnership opportunities",
                "Assess market size and revenue potential"
            ],
            'Elena': [
                "Create user journey maps",
                "Design initial wireframes and mockups",
                "Plan usability testing sessions",
                "Develop design system components"
            ],
            'David': [
                "Define technical requirements and architecture",
                "Create implementation timeline and milestones",
                "Assess resource and infrastructure requirements",
                "Plan development sprints and deliverables"
            ]
        }
        
        member_actions = action_templates.get(member.name, [
            "Analyze from domain expertise perspective",
            "Research industry best practices",
            "Develop strategic recommendations"
        ])
        
        return member_actions[:3]  # Return top 3 actions


class MasterIntelligence:
    """
    Your Personal Chief of Staff - Coordinates all AI Council members
    and provides strategic synthesis of their expertise.
    Enhanced with Individual Intelligence for personal conversations.
    """
    
    def __init__(self):
        self.council = AICouncil()
        self.individual_intelligence = IndividualIntelligence(self.council)
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
        Enhanced intelligence processing pipeline that routes between:
        1. Individual conversations (DMs)
        2. Council discussions (channels)
        """
        start_time = datetime.now()
        
        # Route to appropriate intelligence type
        if query.channel_type == "dm" and query.requested_members and len(query.requested_members) == 1:
            # Individual conversation
            response = await self._process_individual_query(query)
        else:
            # Council discussion
            response = await self._process_council_query(query)
        
        # Store in conversation history
        self.conversation_history.append(response)
        
        return response
    
    async def _process_individual_query(self, query: IntelligenceQuery) -> IntelligenceResponse:
        """Process individual DM conversation"""
        start_time = datetime.now()
        member_key = query.requested_members[0]
        
        print(f"Processing individual query with {member_key}")
        
        # Get individual response
        individual_response = await self.individual_intelligence.get_individual_response(member_key, query)
        
        # For individual conversations, the synthesis IS the member's response
        synthesis = individual_response.message
        
        # Actions only if not casual chat
        actions = individual_response.suggested_actions if query.interaction_mode != 'casual_chat' else []
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return IntelligenceResponse(
            query=query,
            council_responses=[individual_response],
            synthesis=synthesis,
            recommended_actions=actions,
            confidence_score=individual_response.confidence_level,
            processing_time=processing_time,
            timestamp=datetime.now().isoformat(),
            response_type="individual"
        )
    
    async def _process_council_query(self, query: IntelligenceQuery) -> IntelligenceResponse:
        """Process council discussion (original logic)"""
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
        
        return IntelligenceResponse(
            query=query,
            council_responses=council_responses,
            synthesis=synthesis,
            recommended_actions=actions,
            confidence_score=self._calculate_confidence(council_responses),
            processing_time=processing_time,
            timestamp=datetime.now().isoformat(),
            response_type="council"
        )
    
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
            # Create specialized prompt for this member and context
            system_prompt = f"""You are {member.name}, {member.role.value.replace('_', ' ').title()} expert in an AI Council.

{member.get_system_prompt()}

INTERACTION MODE: {query.interaction_mode}
- casual_chat: Be conversational and friendly
- strategic_brief: Provide structured professional analysis
- quick_consult: Give focused, actionable advice
- brainstorm: Be creative and exploratory  
- formal_analysis: Provide detailed assessment

Respond as yourself with your expertise, personality, and perspective. Be helpful, insightful, and true to your role."""

            # Build user prompt with reply context if available
            user_prompt = query.user_input
            
            # Add reply context if this is a reply to another message
            if query.context and query.context.get("is_reply") and query.context.get("reply_to"):
                reply_info = query.context["reply_to"]
                original_sender = reply_info.get("original_sender", "Unknown")
                original_content = reply_info.get("original_content", "")
                
                user_prompt = f"""REPLY CONTEXT:
You are responding to a message. The user is replying to this previous message:

From: {original_sender}
Message: "{original_content}"

USER'S REPLY: {query.user_input}

Please acknowledge the context and respond appropriately to their reply, taking into account what they're responding to."""

            # Use AI to generate response
            response_text = await self._call_ai_provider(system_prompt, user_prompt)
            
            # Generate suggested actions based on response
            suggested_actions = self._extract_actions_from_response(response_text)
            
            return CouncilResponse(
                member_name=member.name,
                role=member.role,
                message=response_text,
                confidence_level=0.8,
                reasoning=f"AI-generated {member.role.value} expertise response",
                suggested_actions=suggested_actions,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            print(f"AI response failed for {member.name}: {e}, using simulated response")
            return await self._get_simulated_response(member, query)
    
    async def _call_ai_provider(self, system_prompt: str, user_prompt: str) -> str:
        """Call AI provider based on preference order: Ollama -> OpenAI -> Anthropic"""
        
        # Try Ollama first (local, private, fast)
        try:
            if await ollama_service.is_available():
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
                response = await ollama_service.chat_completion(
                    messages=messages,
                    max_tokens=400,
                    temperature=0.7
                )
                if response and len(response.strip()) > 10:  # Valid response check
                    return response
                else:
                    print("Ollama returned empty/invalid response, trying fallback...")
            else:
                print("Ollama not available, trying API providers...")
        except Exception as e:
            print(f"Ollama failed: {e}, falling back to API providers...")
        
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
                print(f"Anthropic failed: {e}, using simulated response...")
        
        # Ultimate fallback - enhanced simulated response
        return f"Based on my analysis: {user_prompt[:50]}... requires strategic consideration of multiple factors. I recommend a systematic approach to evaluate options and implement solutions."

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
        # NOTE: This should no longer be called for DMs due to routing changes
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