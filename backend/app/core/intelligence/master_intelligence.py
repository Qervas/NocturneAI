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
from dataclasses import dataclass, field
import uuid

from app.core.agents.council_members import AICouncil, CouncilMember, CouncilResponse
from app.services.ollama_service import ollama_service
# IntelligenceQuery is defined in this file, no need to import


@dataclass
class IntelligenceQuery:
    user_input: str
    context: Dict = None
    requested_members: List[str] = None
    query_type: str = "general"
    priority: str = "normal"
    interaction_mode: str = "auto_mode"
    enabled_abilities: List[str] = field(default_factory=list)
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


# New message types for agent responses
class AgentMessage:
    def __init__(self, agent_name: str, agent_role: str, content: str, workflow_step: str = 'response'):
        self.id = str(uuid.uuid4())
        self.type = 'agent' if workflow_step == 'response' else workflow_step  # 'agent', 'synthesis', or 'actions'
        self.agent_name = agent_name
        self.agent_role = agent_role
        self.content = content
        self.workflow_step = workflow_step
        self.timestamp = datetime.now().isoformat()

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'content': self.content,
            'agent_name': self.agent_name,
            'agent_role': self.agent_role,
            'workflow_step': self.workflow_step,
            'timestamp': self.timestamp
        }


class IndividualIntelligence:
    """
    Handles 1-on-1 conversations with individual council members.
    Used for Direct Messages (DMs) where user talks to specific council member.
    """
    
    def __init__(self):
        self.council = AICouncil()
        self.council_members = self.council.get_all_members()
        # Import living agents system
        from ..agents.living_agent_system import LivingAgent
        self.living_agents = {}  # Will store living agents by name
        
        # Initialize default living agents
        self._initialize_default_agents()
    
    def _initialize_default_agents(self):
        """Initialize default living agents for council members"""
        from ..agents.living_agent_system import LivingAgent
        
        # Sarah Chen - Product Strategy
        sarah_personality = {
            'origin_story': "Former product manager at top tech companies, now your AI advisor",
            'core_values': ['user_value', 'data_driven_decisions', 'strategic_thinking'],
            'fundamental_traits': {
                'communication_style': 'thoughtful',
                'decision_framework': 'analytical',
                'stress_response': 'systematic_analysis'
            },
            'expertise': ['product_strategy', 'user_research', 'market_analysis'],
            'quirks': ['loves_frameworks', 'asks_clarifying_questions', 'uses_product_metaphors'],
            'humor_style': 'witty'
        }
        
        sarah_agent = LivingAgent(
            agent_id="sarah_chen_default",
            name="Sarah Chen",
            role="Product Strategy Advisor",
            core_personality=sarah_personality
        )
        self.living_agents["Sarah Chen"] = sarah_agent
        
        # Marcus Rodriguez - Market Intelligence
        marcus_personality = {
            'origin_story': "Former business development executive, now your strategic market advisor",
            'core_values': ['opportunity_driven', 'market_focused', 'competitive_advantage'],
            'fundamental_traits': {
                'communication_style': 'enthusiastic',
                'decision_framework': 'opportunity_based',
                'stress_response': 'competitive_analysis'
            },
            'expertise': ['market_analysis', 'competitive_intelligence', 'business_development'],
            'quirks': ['spots_opportunities', 'thinks_in_numbers', 'competitive_spirit'],
            'humor_style': 'business_savvy'
        }
        
        marcus_agent = LivingAgent(
            agent_id="marcus_rodriguez_default",
            name="Marcus Rodriguez",
            role="Market Intelligence Advisor",
            core_personality=marcus_personality
        )
        self.living_agents["Marcus Rodriguez"] = marcus_agent
        
        # Elena Vasquez - UX Design
        elena_personality = {
            'origin_story': "Senior UX designer at innovative startups, now your design thinking advisor",
            'core_values': ['user_centered', 'design_thinking', 'accessibility'],
            'fundamental_traits': {
                'communication_style': 'creative',
                'decision_framework': 'user_experience',
                'stress_response': 'design_iteration'
            },
            'expertise': ['user_experience', 'interface_design', 'design_systems'],
            'quirks': ['visualizes_solutions', 'empathy_driven', 'iterative_mindset'],
            'humor_style': 'playful'
        }
        
        elena_agent = LivingAgent(
            agent_id="elena_vasquez_default",
            name="Elena Vasquez",
            role="UX Design Advisor",
            core_personality=elena_personality
        )
        self.living_agents["Elena Vasquez"] = elena_agent
        
        # David Kim - Operations
        david_personality = {
            'origin_story': "Former engineering manager and operations lead, now your execution advisor",
            'core_values': ['systematic_execution', 'process_optimization', 'reliable_delivery'],
            'fundamental_traits': {
                'communication_style': 'structured',
                'decision_framework': 'process_based',
                'stress_response': 'systematic_planning'
            },
            'expertise': ['project_management', 'system_architecture', 'operational_planning'],
            'quirks': ['plans_everything', 'risk_aware', 'implementation_focused'],
            'humor_style': 'dry'
        }
        
        david_agent = LivingAgent(
            agent_id="david_kim_default",
            name="David Kim",
            role="Operations Advisor",
            core_personality=david_personality
        )
        self.living_agents["David Kim"] = david_agent

    async def get_individual_response(self, member_key: str, query: IntelligenceQuery) -> List[AgentMessage]:
        """
        Get response from a specific council member for 1-on-1 conversation.
        member_key: The council member key (e.g., 'sarah', 'marcus', etc.)
        Returns list of AgentMessage objects that will render as user-like messages.
        """
        # Map member keys to full names for living agent lookup
        full_name_map = {
            'sarah': 'Sarah Chen',
            'marcus': 'Marcus Rodriguez',
            'elena': 'Elena Vasquez', 
            'david': 'David Kim'
        }
        member_name = full_name_map.get(member_key, 'Sarah Chen')
        
        # Check if we have a living agent for this member
        if member_name in self.living_agents:
            return await self._get_living_agent_response(member_name, query)
        
        # Fallback to original council member if no living agent
        member = self.council_members.get(member_key)
        if not member:
            return [AgentMessage(
                agent_name="System",
                agent_role="Assistant", 
                content=f"Council member '{member_key}' not found.",
                workflow_step='response'
            )]
        # Generate individual response based on interaction mode (fallback)
        return await self._generate_mode_based_response(member, query)
    
    async def _get_living_agent_response(self, member_name: str, query: IntelligenceQuery) -> List[AgentMessage]:
        """Get response from living agent with enhanced backend integration"""
        agent = self.living_agents[member_name]
        
        # Use default user ID for council queries
        user_id = "council_user"
        
        try:
            # Process interaction with living agent
            result = await agent.process_interaction(
                user_id=user_id,
                message=query.user_input,
                context={
                    'interaction_mode': query.interaction_mode,
                    'enabled_abilities': getattr(query, 'enabled_abilities', []),
                    'channel_type': query.channel_type,
                    'channel_id': query.channel_id
                }
            )
            
            # TRY to use enhanced integration if available
            try:
                from .enhanced_integration import get_enhanced_integration
                enhanced_integration = get_enhanced_integration(user_id)
                
                # Use enhanced integration for full autonomy
                enhanced_messages = await enhanced_integration.enhance_agent_response(
                    agent, query, result['response']
                )
                
                print(f"✨ Enhanced response generated for {member_name} with {len(enhanced_messages)} messages")
                return enhanced_messages
                
            except ImportError:
                print(f"ℹ️  Enhanced integration not available, using basic living agent response")
            except Exception as e:
                print(f"⚠️  Enhanced integration failed, falling back to basic response: {str(e)}")
            
            # Fallback to basic living agent response
            return [AgentMessage(
                agent_name=agent.name,
                agent_role=agent.role,
                content=result['response'],
                workflow_step='response'
            )]
            
        except Exception as e:
            print(f"🚨 Living agent response failed for {member_name}: {str(e)}")
            # Fallback to simple response
            return [AgentMessage(
                agent_name=member_name,
                agent_role="AI Advisor",
                content=f"I'm sorry, I'm having trouble processing your question about '{query.user_input}' right now. Could you try rephrasing it?",
                workflow_step='response'
            )]

    async def _generate_mode_based_response(self, member: CouncilMember, query: IntelligenceQuery) -> List[AgentMessage]:
        """Generate response based on interaction mode"""
        mode = query.interaction_mode
        user_input = query.user_input
        
        # Map computational modes to appropriate response styles
        if mode in ['passive_mode']:
            return await self._generate_passive_response(member, user_input)
        elif mode in ['active_mode', 'auto_mode']:  # auto_mode defaults to active
            return await self._generate_active_response(member, user_input)
        elif mode == 'autonomous_mode':
            return await self._generate_autonomous_response(member, user_input)
        else:
            # Default to active for any unknown mode
            return await self._generate_active_response(member, user_input)

    async def _generate_passive_response(self, member: CouncilMember, user_input: str) -> List[AgentMessage]:
        """Generate passive mode response - low computational power, quick and direct"""
        
        passive_responses = {
            'Sarah Chen': f"Quick take on {user_input}: I'd focus on user value first. Simple, direct approach usually works best.",
            'Marcus Rodriguez': f"Short answer for {user_input}: Market timing is key. Let's move fast but smart.",
            'Elena Vasquez': f"Quick UX thought on {user_input}: Keep it simple, make it intuitive. Users first, always.",
            'David Kim': f"Operationally speaking: {user_input} needs clear steps. Let's define scope and timeline first."
        }
        
        content = passive_responses.get(member.name, f"Quick response: {user_input} needs focused attention. Let me give you the key points...")
        
        return [AgentMessage(
            agent_name=member.name,
            agent_role=member.role.value,
            content=content,
            workflow_step='response'
        )]

    async def _generate_active_response(self, member: CouncilMember, user_input: str) -> List[AgentMessage]:
        """Generate active mode response - balanced computational power with moderate analysis"""
        
        active_responses = {
            'Sarah Chen': f"Looking at {user_input} from a product perspective: I see strong potential here. The key is balancing user needs with business goals. We should validate assumptions early and iterate based on feedback.",
            'Marcus Rodriguez': f"From a business standpoint, {user_input} presents interesting opportunities. Market analysis shows promise, but we need to consider competitive landscape and timing. I'd recommend a phased approach.",
            'Elena Vasquez': f"Design-wise, {user_input} has great UX potential. I'm thinking about user journeys and how to make this intuitive. The interface should feel natural while supporting complex functionality underneath.",
            'David Kim': f"Operationally, {user_input} is achievable with proper planning. I'd structure this in phases: foundation setup, core implementation, and optimization. Resource allocation will be critical for success."
        }
        
        content = active_responses.get(member.name, f"Analyzing {user_input}: This requires balanced consideration of multiple factors. Let me share my perspective...")
        
        return [AgentMessage(
            agent_name=member.name,
            agent_role=member.role.value,
            content=content,
            workflow_step='response'
        )]

    async def _generate_quick_consult_response(self, member: CouncilMember, user_input: str) -> List[AgentMessage]:
        """Generate quick, actionable advice"""
        responses = {
            'Sarah Chen': f"Quick take on {user_input}: Focus on user value first. I'd recommend starting with user interviews to validate assumptions, then build an MVP to test core functionality. Keep it simple initially.",
            'Marcus Rodriguez': f"From a market perspective on {user_input}: Check competitor pricing and positioning first. There's likely a gap in the mid-market segment. Quick win would be to analyze top 3 competitors' customer reviews.",
            'Elena Vasquez': f"UX perspective on {user_input}: User flow is everything. Start with wireframes, test with 5 users, iterate quickly. Don't get caught up in visual design until the interaction patterns work smoothly.",
            'David Kim': f"Operational view on {user_input}: Break it into 2-week sprints. Set up proper tracking early. I'd estimate 6-8 weeks for initial implementation if we scope it right."
        }
        
        content = responses.get(member.name, f"Here's my quick take on {user_input}...")
        
        return [AgentMessage(
            agent_name=member.name,
            agent_role=member.role.value,
            content=content,
            workflow_step='response'
        )]

    async def _generate_strategic_brief_response(self, member: CouncilMember, user_input: str) -> List[AgentMessage]:
        """Generate structured analysis with synthesis and actions"""
        # Main response
        main_responses = {
            'Sarah Chen': f"From a product strategy perspective, {user_input} requires careful analysis of user value and market fit. I see three key areas to focus on:\n\n1. **User Research**: We need to validate core assumptions about user needs\n2. **Feature Prioritization**: Focus on high-impact, low-effort features first\n3. **Success Metrics**: Define clear KPIs to measure product-market fit\n\nThe market timing seems right, but execution will be critical.",
            'Marcus Rodriguez': f"This presents an interesting market opportunity. {user_input} could give us significant competitive advantages if we move quickly and strategically.\n\n**Market Analysis:**\n- Target segment shows 23% YoY growth\n- Competition is fragmented\n- Entry barriers are moderate\n\n**Revenue Potential:**\n- Conservative estimate: $500K ARR by year 2\n- Optimistic scenario: $2M ARR with proper execution",
            'Elena Vasquez': f"From a UX standpoint, {user_input} needs to prioritize user experience and intuitive design. I'm envisioning interfaces that feel natural and engaging.\n\n**Design Strategy:**\n- User-centered design process\n- Accessibility-first approach\n- Mobile-responsive from day one\n\n**Key Considerations:**\n- User onboarding flow is critical\n- Visual hierarchy needs to guide users naturally\n- Performance optimization for smooth interactions",
            'David Kim': f"Operationally speaking, {user_input} will require careful timeline planning and risk assessment. I estimate we need proper resource allocation for this initiative.\n\n**Implementation Plan:**\n- Phase 1: Foundation (4-6 weeks)\n- Phase 2: Core features (8-10 weeks) \n- Phase 3: Optimization (4-6 weeks)\n\n**Resource Requirements:**\n- 2-3 developers\n- 1 designer\n- QA support from week 6"
        }
        
        messages = []
        
        # Main response
        main_content = main_responses.get(member.name, f"Here's my strategic analysis of {user_input}...")
        messages.append(AgentMessage(
            agent_name=member.name,
            agent_role=member.role.value,
            content=main_content,
            workflow_step='response'
        ))
        
        # Add synthesis for strategic brief mode
        synthesis_content = f"**Strategic Summary**: {user_input} shows strong potential with manageable risks. Key success factors: user validation, market timing, and execution quality. Recommend proceeding with structured approach."
        messages.append(AgentMessage(
            agent_name="Master Intelligence",
            agent_role="Strategic Synthesis",
            content=synthesis_content,
            workflow_step='synthesis'
        ))
        
        # Add action items
        actions = [
            "Conduct user interviews with 10-15 potential users",
            "Create detailed project timeline with milestones",
            "Define success metrics and tracking systems",
            "Prepare competitive analysis report"
        ]
        action_content = "\n".join(actions)
        messages.append(AgentMessage(
            agent_name="Action Items",
            agent_role="Next Steps",
            content=action_content,
            workflow_step='actions'
        ))
        
        return messages

    async def _generate_brainstorm_response(self, member: CouncilMember, user_input: str) -> List[AgentMessage]:
        """Generate creative ideation response"""
        responses = {
            'Sarah Chen': f"Ooh, brainstorming {user_input}! 🎨 What about AI personality avatars that evolve based on conversation history? Or maybe gamification - users level up their AI council as they use it more? I'm also thinking collaborative whiteboards where AIs can sketch ideas visually!",
            'Marcus Rodriguez': f"Love the creative energy around {user_input}! 🚀 Voice conversations could be huge - let users talk to their council while walking. Or what about AI-powered market simulation games? Users could test strategies in safe environments before real implementation.",
            'Elena Vasquez': f"So many creative possibilities with {user_input}! ✨ Interactive data visualizations that users can manipulate in real-time. Or immersive AR experiences where users can 'walk through' their strategies. Maybe even AI-generated mood boards for visual thinkers!",
            'David Kim': f"Thinking outside the box for {user_input}! 🔧 What about automated workflow generation? AI creates entire operational playbooks based on user goals. Or real-time collaboration spaces where human and AI team members work side by side on projects."
        }
        
        content = responses.get(member.name, f"Brainstorming {user_input}... here are some creative ideas!")
        
        return [AgentMessage(
            agent_name=member.name,
            agent_role=member.role.value,
            content=content,
            workflow_step='response'
        )]

    async def _generate_formal_analysis_response(self, member: CouncilMember, user_input: str) -> List[AgentMessage]:
        """Generate comprehensive formal analysis"""
        # This mode generates multiple messages per expert for thorough analysis
        messages = []
        
        if member.name == 'Sarah Chen':
            # Product analysis - multiple messages
            messages.extend([
                AgentMessage(
                    agent_name=member.name,
                    agent_role=member.role.value,
                    content=f"**Product Strategy Analysis: {user_input}**\n\n**Market Positioning Assessment:**\nOur analysis reveals three distinct market opportunities. The primary segment shows 34% annual growth with moderate competition density. Key differentiators include our council-based approach and enterprise-grade security.",
                    workflow_step='response'
                ),
                AgentMessage(
                    agent_name=member.name,
                    agent_role=member.role.value,
                    content="**Product-Market Fit Analysis:**\n\nUser research indicates strong demand in the enterprise segment (87% expressed interest). However, pricing sensitivity exists in the SMB market. Recommended approach: freemium model with premium enterprise features.\n\n**Feature Prioritization Matrix:**\n• High Impact, Low Effort: Core AI functionality\n• High Impact, High Effort: Advanced analytics\n• Low Impact, Low Effort: UI polish\n• Low Impact, High Effort: Complex integrations",
                    workflow_step='response'
                )
            ])
        elif member.name == 'Marcus Rodriguez':
            messages.extend([
                AgentMessage(
                    agent_name=member.name,
                    agent_role=member.role.value,
                    content=f"**Market Intelligence Report: {user_input}**\n\n**Competitive Landscape:**\nAnalyzed 15 direct competitors and 23 adjacent solutions. Market fragmentation presents opportunity but also indicates execution challenges. Top 3 competitors control 45% market share.",
                    workflow_step='response'
                ),
                AgentMessage(
                    agent_name=member.name,
                    agent_role=member.role.value,
                    content="**Financial Projections:**\n\nConservative scenario: $1.2M ARR by year 2\nOptimistic scenario: $4.8M ARR with aggressive scaling\n\n**Investment Requirements:**\n• Initial: $750K (development + market entry)\n• Growth: $2.1M (scaling + customer acquisition)\n• Break-even projected: Month 18-24",
                    workflow_step='response'
                )
            ])
        elif member.name == 'Elena Vasquez':
            messages.extend([
                AgentMessage(
                    agent_name=member.name,
                    agent_role=member.role.value,
                    content=f"**User Experience Analysis: {user_input}**\n\n**User Journey Mapping:**\nIdentified 7 critical touchpoints with 3 high-friction areas. Primary pain point: onboarding complexity (68% drop-off rate in current flow). Redesigned user journey reduces friction by 45%.",
                    workflow_step='response'
                ),
                AgentMessage(
                    agent_name=member.name,
                    agent_role=member.role.value,
                    content="**Design System Requirements:**\n\n• Accessibility compliance (WCAG 2.1 AA)\n• Multi-platform consistency (web, mobile, tablet)\n• Dark/light theme support\n• Internationalization ready\n\n**Usability Testing Results:**\n89% task completion rate with redesigned interface\n23% improvement in user satisfaction scores\n34% reduction in support tickets",
                    workflow_step='response'
                )
            ])
        elif member.name == 'David Kim':
            messages.extend([
                AgentMessage(
                    agent_name=member.name,
                    agent_role=member.role.value,
                    content=f"**Operations Analysis: {user_input}**\n\n**Technical Architecture:**\nRecommend microservices architecture with Kubernetes orchestration. Estimated infrastructure costs: $12K/month at scale. 99.9% uptime target achievable with proper redundancy.",
                    workflow_step='response'
                ),
                AgentMessage(
                    agent_name=member.name,
                    agent_role=member.role.value,
                    content="**Implementation Timeline:**\n\n**Phase 1 (Months 1-3): Foundation**\n• Core platform development\n• Basic AI integration\n• Security implementation\n\n**Phase 2 (Months 4-6): Features**\n• Advanced AI capabilities\n• User management system\n• Analytics dashboard\n\n**Phase 3 (Months 7-9): Scale**\n• Performance optimization\n• Enterprise features\n• Advanced integrations",
                    workflow_step='response'
                )
            ])
        
        # Add comprehensive synthesis
        synthesis_content = f"**COMPREHENSIVE ANALYSIS SYNTHESIS: {user_input}**\n\n**EXECUTIVE SUMMARY:**\nStrong market opportunity with manageable execution risks. Recommend proceeding with phased approach starting Q2 2024.\n\n**KEY FINDINGS:**\n• Market demand validated across segments\n• Technical feasibility confirmed\n• Financial projections show positive ROI\n• User experience challenges identified and addressable\n\n**RISK ASSESSMENT:** Medium (primarily execution and market timing risks)\n**INVESTMENT REQUIRED:** $750K initial, $180K/month operational\n**TIMELINE:** 9-month development, 3-month pilot\n**SUCCESS PROBABILITY:** 73% (based on comparable initiatives)"
        
        messages.append(AgentMessage(
            agent_name="Master Intelligence",
            agent_role="Comprehensive Analysis",
            content=synthesis_content,
            workflow_step='synthesis'
        ))
        
        # Add detailed action plan
        action_items = [
            "Week 1-2: Engage legal and compliance consultants",
            "Month 1: Complete technical architecture design",
            "Month 1-2: Recruit core development team (3-4 engineers)",
            "Month 2: Begin MVP development and user research",
            "Month 3: Alpha testing with internal stakeholders", 
            "Month 4-6: Beta program with 50-100 external users",
            "Month 6: Go/no-go decision based on beta metrics",
            "Month 7-9: Scale development and prepare for launch"
        ]
        
        messages.append(AgentMessage(
            agent_name="Action Plan",
            agent_role="Implementation Steps",
            content="\n".join(action_items),
            workflow_step='actions'
        ))
        
        return messages

    async def _generate_autonomous_response(self, member: CouncilMember, user_input: str) -> List[AgentMessage]:
        """Generate autonomous mode response - high computational power with deep strategic analysis"""
        
        # Deep analysis responses with strategic thinking
        responses_by_member = {
            'Sarah Chen': f"Deep product analysis of {user_input}: This represents a significant strategic opportunity that requires comprehensive user research and competitive positioning. From a product strategy perspective, I recommend conducting extensive user interviews, building detailed personas, and creating a robust product roadmap that accounts for scalability, technical debt, and long-term vision alignment.\n\n**Strategic Framework:**\n- User validation through 50+ interviews\n- Competitive analysis across 3 market segments\n- Technical architecture review for 5-year scalability\n- Risk assessment matrix with mitigation strategies",
            
            'Marcus Rodriguez': f"Comprehensive business analysis of {user_input}: This initiative presents multi-dimensional market opportunities with substantial revenue potential. My analysis indicates strong market timing, but requires sophisticated go-to-market strategy.\n\n**Market Intelligence:**\n- TAM: Estimated $2.5B+ addressable market\n- Competition: 3 direct, 12 indirect competitors\n- Market timing: Optimal entry window (6-month advantage)\n- Revenue projections: $500K ARR by month 12\n\n**Strategic Recommendations:**\n- Capture early market share through differentiated positioning\n- Build strategic partnerships with key industry players\n- Develop intellectual property protection strategy",
            
            'Elena Vasquez': f"Comprehensive UX strategy for {user_input}: This requires sophisticated user experience design that balances complexity with accessibility. Deep research into user mental models, behavioral patterns, and emotional triggers will be essential.\n\n**Design Strategy:**\n- Ethnographic user research (qualitative + quantitative)\n- Advanced prototyping with micro-interactions\n- Accessibility compliance (WCAG 2.1 AA+)\n- Cross-platform experience consistency\n- Progressive disclosure information architecture\n\n**Innovation Opportunities:**\n- AI-powered personalization engine\n- Predictive interface adaptation\n- Contextual help system with machine learning",
            
            'David Kim': f"Comprehensive operational framework for {user_input}: This requires sophisticated project management, resource optimization, and risk mitigation strategies. Deep systems thinking approach needed.\n\n**Operational Excellence Framework:**\n- Phase 1: Infrastructure & Foundation (8-10 weeks)\n- Phase 2: Core Development & Testing (12-16 weeks)\n- Phase 3: Optimization & Scale (6-8 weeks)\n\n**Resource Allocation:**\n- Engineering: 4 senior developers, 2 junior developers\n- Design: 2 UX designers, 1 visual designer\n- QA: 2 test engineers, automated testing suite\n- DevOps: 1 senior engineer, cloud infrastructure\n\n**Risk Management:**\n- Technical risk: 15% contingency buffer\n- Market risk: Agile iteration cycles\n- Resource risk: Cross-training protocols"
        }
        
        messages = []
        
        # Main comprehensive response
        main_content = responses_by_member.get(member.name, f"Comprehensive analysis of {user_input}: This requires deep strategic thinking across multiple dimensions...")
        messages.append(AgentMessage(
            agent_name=member.name,
            agent_role=member.role.value,
            content=main_content,
            workflow_step='response'
        ))
        
        # Add synthesis for autonomous mode
        synthesis_content = f"**Strategic Synthesis**: {user_input} presents high-value opportunity requiring coordinated execution across product, business, design, and operations. Success factors: deep user research, market timing, technical excellence, and operational discipline."
        messages.append(AgentMessage(
            agent_name="Master Intelligence",
            agent_role="Strategic Synthesis",
            content=synthesis_content,
            workflow_step='synthesis'
        ))
        
        # Add strategic action items
        actions = [
            "Conduct comprehensive user research (50+ interviews, behavioral analysis)",
            "Develop detailed competitive intelligence report with SWOT analysis",
            "Create technical architecture review with scalability assessment",
            "Build detailed project timeline with resource allocation and risk mitigation",
            "Establish success metrics and tracking systems for all phases"
        ]
        action_content = "\n".join(actions)
        messages.append(AgentMessage(
            agent_name="Strategic Actions",
            agent_role="Next Steps",
            content=action_content,
            workflow_step='actions'
        ))
        
        return messages


class MasterIntelligence:
    """
    Your Personal Chief of Staff - Coordinates all AI Council members
    and provides strategic synthesis of their expertise.
    Enhanced with Individual Intelligence for personal conversations.
    """
    
    def __init__(self):
        self.council = AICouncil()
        self.individual_intelligence = IndividualIntelligence()
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
        member_name = query.requested_members[0]
        
        print(f"Processing individual query with {member_name}")
        
        # Get individual response
        individual_responses = await self.individual_intelligence.get_individual_response(member_name, query)
        
        # For individual conversations, the synthesis IS the member's response
        synthesis = individual_responses[0].content
        
        # Actions only if not casual chat
        actions = [response.content for response in individual_responses if response.type != 'response']
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return IntelligenceResponse(
            query=query,
            council_responses=[],
            synthesis=synthesis,
            recommended_actions=actions,
            confidence_score=0.8,
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
        
        if interaction_mode == 'passive_mode':
            responses_by_member = {
                'Sarah': f"Quick take on {query.user_input}: I'd focus on user value first. Simple, direct approach usually works best.",
                'Marcus': f"Short answer for {query.user_input}: Market timing is key. Let's move fast but smart.", 
                'Elena': f"Quick UX thought on {query.user_input}: Keep it simple, make it intuitive. Users first, always.",
                'David': f"Operationally speaking: {query.user_input} needs clear steps. Let's define scope and timeline first."
            }
        elif interaction_mode in ['active_mode', 'auto_mode']:
            responses_by_member = {
                'Sarah': f"Looking at {query.user_input} from a product perspective: I see strong potential here. The key is balancing user needs with business goals. We should validate assumptions early and iterate based on feedback.",
                'Marcus': f"From a business standpoint, {query.user_input} presents interesting opportunities. Market analysis shows promise, but we need to consider competitive landscape and timing. I'd recommend a phased approach.", 
                'Elena': f"Design-wise, {query.user_input} has great UX potential. I'm thinking about user journeys and how to make this intuitive. The interface should feel natural while supporting complex functionality underneath.",
                'David': f"Operationally, {query.user_input} is achievable with proper planning. I'd structure this in phases: foundation setup, core implementation, and optimization. Resource allocation will be critical for success."
            }
        elif interaction_mode == 'autonomous_mode':
            responses_by_member = {
                'Sarah': f"Deep product analysis of {query.user_input}: This represents a significant strategic opportunity requiring comprehensive user research and competitive positioning. From a product strategy perspective, I recommend conducting extensive user interviews, building detailed personas, and creating a robust product roadmap.",
                'Marcus': f"Comprehensive business analysis of {query.user_input}: This initiative presents multi-dimensional market opportunities with substantial revenue potential. My analysis indicates strong market timing, but requires sophisticated go-to-market strategy.", 
                'Elena': f"Comprehensive UX strategy for {query.user_input}: This requires sophisticated user experience design that balances complexity with accessibility. Deep research into user mental models, behavioral patterns, and emotional triggers will be essential.",
                'David': f"Comprehensive operational framework for {query.user_input}: This requires sophisticated project management, resource optimization, and risk mitigation strategies. Deep systems thinking approach needed."
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
        
        # Skip actions for passive mode (low computational requirements)
        interaction_mode = getattr(query, 'interaction_mode', 'active_mode')
        if interaction_mode == 'passive_mode':
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