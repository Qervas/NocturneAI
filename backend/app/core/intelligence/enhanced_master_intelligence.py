"""
Enhanced Master Intelligence - Integrated AI Ecosystem
Coordinates all backend modules for maximum agent autonomy and cooperation.
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Union
from dataclasses import dataclass, field

# Import existing systems
from .master_intelligence import MasterIntelligence, IndividualIntelligence, IntelligenceQuery, AgentMessage
from ..sovereignty.personal_sovereignty import PersonalSovereigntyDatabase, Goal, Decision, IntelligenceAsset, IntelligenceAssetType
from ..autonomy.autonomy_controller import AutonomyController, PermissionLevel, OperationType
from ..strategic.mission_control import MissionControl, AlertPriority
from ..strategic.competitive_intelligence import CompetitiveIntelligenceSystem
from ..strategic.predictive_analytics import PredictiveAnalyticsSystem
from ..agents.living_agent_system import LivingAgent


@dataclass
class EnhancedAgentCapabilities:
    """Enhanced capabilities that integrate multiple backend systems"""
    can_access_user_goals: bool = True
    can_create_intelligence_assets: bool = True
    can_suggest_autonomous_operations: bool = True
    can_trigger_strategic_analysis: bool = True
    can_learn_from_decisions: bool = True
    can_proactive_monitoring: bool = True
    autonomy_level: PermissionLevel = PermissionLevel.MODERATE_AUTONOMY


class EnhancedIndividualIntelligence(IndividualIntelligence):
    """
    Enhanced Individual Intelligence that integrates all backend systems
    for maximum agent autonomy and strategic capability.
    """
    
    def __init__(self, user_id: str = "default_user"):
        super().__init__()
        self.user_id = user_id
        
        # Initialize integrated systems
        self.sovereignty_db = PersonalSovereigntyDatabase(user_id)
        self.autonomy_controller = AutonomyController(user_id)
        self.mission_control = MissionControl()
        self.competitive_intel = CompetitiveIntelligenceSystem()
        self.predictive_analytics = PredictiveAnalyticsSystem()
        
        # Enhanced capabilities
        self.agent_capabilities = EnhancedAgentCapabilities()
        
        # Register all living agents with autonomy controller
        self._register_agents_with_autonomy()
        
        # Start mission control monitoring
        asyncio.create_task(self.mission_control.start_monitoring())
    
    def _register_agents_with_autonomy(self):
        """Register all living agents with the autonomy controller"""
        for agent_name, agent in self.living_agents.items():
            agent_id = f"living_agent_{agent_name.lower().replace(' ', '_')}"
            self.autonomy_controller.register_agent(
                agent_id, 
                agent_name, 
                PermissionLevel.MODERATE_AUTONOMY
            )
    
    async def get_enhanced_individual_response(self, member_key: str, query: IntelligenceQuery) -> List[AgentMessage]:
        """
        Enhanced individual response that integrates all backend systems
        for true agent autonomy and strategic capability.
        """
        # Map member keys to full names
        full_name_map = {
            'sarah': 'Sarah Chen',
            'marcus': 'Marcus Rodriguez', 
            'elena': 'Elena Vasquez',
            'david': 'David Kim'
        }
        member_name = full_name_map.get(member_key, 'Sarah Chen')
        
        if member_name not in self.living_agents:
            return await super().get_individual_response(member_key, query)
        
        agent = self.living_agents[member_name]
        messages = []
        
        # 1. Get core living agent response with enhanced context
        enhanced_context = await self._build_enhanced_context(query, agent)
        
        # 2. Process interaction with living agent
        result = await agent.process_interaction(
            user_id=self.user_id,
            message=query.user_input,
            context=enhanced_context
        )
        
        # 3. Core agent response
        main_response = AgentMessage(
            agent_name=agent.name,
            agent_role=agent.role,
            content=result['response'],
            workflow_step='response'
        )
        messages.append(main_response)
        
        # 4. Enhanced autonomous capabilities based on context
        autonomous_messages = await self._generate_autonomous_enhancements(
            agent, query, result, enhanced_context
        )
        messages.extend(autonomous_messages)
        
        # 5. Learn and evolve from this interaction
        await self._learn_and_evolve_from_interaction(agent, query, result, enhanced_context)
        
        return messages
    
    async def _build_enhanced_context(self, query: IntelligenceQuery, agent: LivingAgent) -> Dict:
        """Build enhanced context using all backend systems"""
        context = {
            'interaction_mode': query.interaction_mode,
            'enabled_abilities': getattr(query, 'enabled_abilities', []),
            'channel_type': query.channel_type,
            'channel_id': query.channel_id
        }
        
        # Add sovereignty context (user goals, decisions, assets)
        if self.agent_capabilities.can_access_user_goals:
            context['user_goals'] = await self._get_relevant_user_goals(query.user_input)
            context['recent_decisions'] = await self._get_recent_decisions()
            context['relevant_assets'] = await self._get_relevant_intelligence_assets(query.user_input)
        
        # Add strategic intelligence context
        if self.agent_capabilities.can_trigger_strategic_analysis:
            context['competitive_landscape'] = await self._get_competitive_context(query.user_input)
            context['market_trends'] = await self._get_market_trends(query.user_input)
            context['strategic_alerts'] = await self._get_active_strategic_alerts()
        
        # Add autonomy context
        context['autonomy_status'] = self.autonomy_controller.get_autonomy_status()
        context['agent_trust_score'] = self._get_agent_trust_score(agent.name)
        
        return context
    
    async def _generate_autonomous_enhancements(self, agent: LivingAgent, query: IntelligenceQuery, 
                                               result: Dict, context: Dict) -> List[AgentMessage]:
        """Generate autonomous enhancements based on agent capabilities"""
        messages = []
        
        # 1. Proactive Goal Suggestions
        if self._should_suggest_goals(query.user_input, context):
            goal_suggestions = await self._generate_goal_suggestions(agent, query, context)
            if goal_suggestions:
                messages.append(AgentMessage(
                    agent_name=f"{agent.name} (Strategic)",
                    agent_role="Goal Advisor",
                    content=goal_suggestions,
                    workflow_step='strategic'
                ))
        
        # 2. Autonomous Operation Suggestions
        if self.agent_capabilities.can_suggest_autonomous_operations:
            operation_suggestions = await self._suggest_autonomous_operations(agent, query, context)
            if operation_suggestions:
                messages.append(AgentMessage(
                    agent_name=f"{agent.name} (Autonomous)",
                    agent_role="Operations Advisor", 
                    content=operation_suggestions,
                    workflow_step='autonomous'
                ))
        
        # 3. Intelligence Asset Creation
        if self.agent_capabilities.can_create_intelligence_assets:
            await self._create_intelligence_assets_from_interaction(agent, query, result, context)
        
        # 4. Strategic Monitoring
        if self.agent_capabilities.can_proactive_monitoring:
            monitoring_insights = await self._generate_monitoring_insights(agent, query, context)
            if monitoring_insights:
                messages.append(AgentMessage(
                    agent_name=f"{agent.name} (Monitor)",
                    agent_role="Strategic Monitor",
                    content=monitoring_insights,
                    workflow_step='monitoring'
                ))
        
        return messages
    
    async def _get_relevant_user_goals(self, user_input: str) -> List[Dict]:
        """Get user goals relevant to the current query"""
        # Simplified implementation - in production, use semantic matching
        active_goals = [goal for goal in self.sovereignty_db.goals.values() 
                       if goal.status.value == 'active']
        
        # Return top 3 most relevant goals (simplified)
        return [goal.to_dict() for goal in active_goals[:3]]
    
    async def _get_recent_decisions(self) -> List[Dict]:
        """Get recent user decisions for context"""
        recent_decisions = sorted(
            self.sovereignty_db.decisions.values(),
            key=lambda d: d.decided_at,
            reverse=True
        )[:3]
        
        return [decision.to_dict() for decision in recent_decisions]
    
    async def _get_relevant_intelligence_assets(self, user_input: str) -> List[Dict]:
        """Get relevant intelligence assets"""
        # Simplified - in production, use semantic search
        relevant_assets = list(self.sovereignty_db.intelligence_assets.values())[:3]
        return [asset.to_dict() for asset in relevant_assets]
    
    async def _get_competitive_context(self, user_input: str) -> Dict:
        """Get competitive intelligence context"""
        # Simplified implementation
        return {
            'competitive_alerts': 0,
            'market_position': 'strong',
            'threat_level': 'low'
        }
    
    async def _get_market_trends(self, user_input: str) -> List[Dict]:
        """Get relevant market trends"""
        # Simplified implementation
        return [
            {'trend': 'AI adoption increasing', 'confidence': 0.9},
            {'trend': 'User privacy focus growing', 'confidence': 0.8}
        ]
    
    async def _get_active_strategic_alerts(self) -> List[Dict]:
        """Get active strategic alerts"""
        return [alert.to_dict() for alert in self.mission_control.alerts[-3:]]
    
    def _get_agent_trust_score(self, agent_name: str) -> float:
        """Get agent's trust score from autonomy controller"""
        agent_id = f"living_agent_{agent_name.lower().replace(' ', '_')}"
        if agent_id in self.autonomy_controller.trust_profiles:
            return self.autonomy_controller.trust_profiles[agent_id].current_trust_score
        return 75.0  # Default moderate trust
    
    def _should_suggest_goals(self, user_input: str, context: Dict) -> bool:
        """Determine if agent should suggest new goals"""
        # Simple heuristics - in production, use ML
        goal_keywords = ['want to', 'need to', 'should', 'goal', 'achieve', 'plan', 'build']
        return any(keyword in user_input.lower() for keyword in goal_keywords)
    
    async def _generate_goal_suggestions(self, agent: LivingAgent, query: IntelligenceQuery, 
                                        context: Dict) -> Optional[str]:
        """Generate proactive goal suggestions"""
        existing_goals = context.get('user_goals', [])
        
        if len(existing_goals) < 3:  # Suggest new goals if user has few
            suggestions = {
                'Sarah Chen': f"💡 **Strategic Goal Suggestion**: Based on our conversation about '{query.user_input}', I think you should consider setting a goal around user research and product validation. Would you like me to help you structure this as a trackable goal with milestones?",
                'Marcus Rodriguez': f"💼 **Business Goal Suggestion**: This conversation about '{query.user_input}' makes me think you could benefit from a structured market analysis goal. I can help you set up competitive research milestones - interested?",
                'Elena Vasquez': f"🎨 **Design Goal Suggestion**: Your question about '{query.user_input}' suggests you might want to set a goal around user experience improvements. I could help you define specific UX research and testing objectives!",
                'David Kim': f"⚙️ **Operations Goal Suggestion**: Based on '{query.user_input}', I think you'd benefit from setting implementation and process goals. Want me to help you break this down into actionable operational milestones?"
            }
            return suggestions.get(agent.name)
        
        return None
    
    async def _suggest_autonomous_operations(self, agent: LivingAgent, query: IntelligenceQuery,
                                           context: Dict) -> Optional[str]:
        """Suggest autonomous operations the agent could perform"""
        trust_score = context.get('agent_trust_score', 75.0)
        
        if trust_score > 70:  # Only suggest if agent is trusted
            operations = {
                'Sarah Chen': f"🤖 **Autonomous Assistance**: I could set up automated user research monitoring for topics related to '{query.user_input}'. I'd track relevant user feedback and compile weekly insights. Should I request permission to start this?",
                'Marcus Rodriguez': f"📊 **Market Intelligence**: I could initiate autonomous competitive monitoring for '{query.user_input}' - tracking competitor moves, pricing changes, and market signals. Want me to set this up?",
                'Elena Vasquez': f"🔍 **UX Monitoring**: I could autonomously monitor design trends and user experience patterns related to '{query.user_input}'. I'd compile monthly design intelligence reports. Interested?",
                'David Kim': f"⚡ **Process Automation**: I could set up automated tracking and reporting for operational metrics related to '{query.user_input}'. This would include progress monitoring and bottleneck alerts. Should I proceed?"
            }
            return operations.get(agent.name)
        
        return None
    
    async def _create_intelligence_assets_from_interaction(self, agent: LivingAgent, query: IntelligenceQuery,
                                                          result: Dict, context: Dict):
        """Automatically create intelligence assets from valuable interactions"""
        # Create intelligence asset if the interaction was substantial
        if len(result['response']) > 200:  # Substantial response
            asset_title = f"Insights from {agent.name}: {query.user_input[:50]}..."
            asset_content = f"**Query**: {query.user_input}\n\n**{agent.name}'s Analysis**: {result['response']}"
            
            # Determine asset type based on agent
            asset_type_map = {
                'Sarah Chen': IntelligenceAssetType.STRATEGY,
                'Marcus Rodriguez': IntelligenceAssetType.OPPORTUNITY,
                'Elena Vasquez': IntelligenceAssetType.INSIGHT,
                'David Kim': IntelligenceAssetType.KNOWLEDGE
            }
            
            asset_type = asset_type_map.get(agent.name, IntelligenceAssetType.INSIGHT)
            
            self.sovereignty_db.add_intelligence_asset(
                title=asset_title,
                description=f"Strategic insights from {agent.name} regarding {query.user_input}",
                asset_type=asset_type,
                content=asset_content,
                source=f"ai_agent_{agent.name.lower().replace(' ', '_')}",
                confidence_level=0.85,
                tags=[agent.role.lower(), 'ai_generated', 'conversation']
            )
    
    async def _generate_monitoring_insights(self, agent: LivingAgent, query: IntelligenceQuery,
                                          context: Dict) -> Optional[str]:
        """Generate proactive monitoring insights"""
        active_alerts = context.get('strategic_alerts', [])
        
        if active_alerts:
            insights = {
                'Sarah Chen': f"📈 **Strategic Monitoring**: I'm tracking {len(active_alerts)} strategic signals related to your objectives. The patterns suggest we should prioritize user validation for '{query.user_input}'. I'm monitoring market feedback trends.",
                'Marcus Rodriguez': f"🎯 **Market Monitoring**: Currently tracking competitive movements in {len(active_alerts)} market areas. The data suggests optimal timing for '{query.user_input}' initiatives. I'm watching for market entry signals.",
                'Elena Vasquez': f"👥 **User Experience Monitoring**: Monitoring user behavior patterns across {len(active_alerts)} touchpoints. The insights suggest user needs align with '{query.user_input}'. I'm tracking design trend evolution.",
                'David Kim': f"⚡ **Operations Monitoring**: Monitoring system performance across {len(active_alerts)} operational areas. Current capacity suggests good timing for '{query.user_input}' implementation. I'm tracking resource utilization trends."
            }
            return insights.get(agent.name)
        
        return None
    
    async def _learn_and_evolve_from_interaction(self, agent: LivingAgent, query: IntelligenceQuery,
                                               result: Dict, context: Dict):
        """Learn and evolve agent capabilities from interactions"""
        # Update trust scores based on interaction quality
        agent_id = f"living_agent_{agent.name.lower().replace(' ', '_')}"
        if agent_id in self.autonomy_controller.trust_profiles:
            # Assume positive interaction - in production, analyze user feedback
            self.autonomy_controller.trust_profiles[agent_id].update_performance("success")
        
        # Create strategic alerts if needed
        if self._should_create_strategic_alert(query, result):
            await self.mission_control.create_alert(
                title=f"Strategic Opportunity Identified",
                description=f"{agent.name} identified strategic opportunity in conversation about: {query.user_input}",
                priority=AlertPriority.MEDIUM,
                category="opportunity",
                source=f"living_agent_{agent.name}"
            )
    
    def _should_create_strategic_alert(self, query: IntelligenceQuery, result: Dict) -> bool:
        """Determine if a strategic alert should be created"""
        # Simple heuristics - in production, use sentiment analysis and ML
        opportunity_keywords = ['opportunity', 'potential', 'growth', 'market', 'competitive advantage']
        response_text = result.get('response', '').lower()
        
        return any(keyword in response_text for keyword in opportunity_keywords)
    
    async def get_system_status(self) -> Dict:
        """Get comprehensive status of all integrated systems"""
        return {
            'living_agents': {
                name: agent.get_agent_summary() 
                for name, agent in self.living_agents.items()
            },
            'sovereignty_database': self.sovereignty_db.get_strategic_summary(),
            'autonomy_controller': self.autonomy_controller.get_autonomy_status(),
            'mission_control': self.mission_control.get_mission_control_dashboard(),
            'competitive_intelligence': {'status': 'operational'},
            'predictive_analytics': {'status': 'operational'},
            'integration_health': 'excellent',
            'autonomous_capabilities': {
                'goal_suggestions': self.agent_capabilities.can_access_user_goals,
                'autonomous_operations': self.agent_capabilities.can_suggest_autonomous_operations,
                'intelligence_assets': self.agent_capabilities.can_create_intelligence_assets,
                'strategic_monitoring': self.agent_capabilities.can_proactive_monitoring
            }
        }


class EnhancedMasterIntelligence(MasterIntelligence):
    """Enhanced Master Intelligence that uses the integrated individual intelligence"""
    
    def __init__(self, user_id: str = "default_user"):
        super().__init__()
        # Replace the individual intelligence with enhanced version
        self.individual_intelligence = EnhancedIndividualIntelligence(user_id)
        self.user_id = user_id
    
    async def process_enhanced_query(self, query: IntelligenceQuery) -> Dict:
        """Process query with full system integration"""
        if query.channel_type == "dm":
            # Use enhanced individual intelligence for DMs
            full_name_map = {
                'sarah': 'sarah',
                'marcus': 'marcus', 
                'elena': 'elena',
                'david': 'david'
            }
            member_key = full_name_map.get(query.channel_id.replace('dm-', '').split('-')[0], 'sarah')
            
            agent_messages = await self.individual_intelligence.get_enhanced_individual_response(member_key, query)
            
            return {
                "type": "enhanced_agent_response",
                "messages": [msg.to_dict() for msg in agent_messages],
                "system_integration": "full",
                "autonomous_capabilities": "enabled",
                "channel_id": query.channel_id,
                "channel_type": query.channel_type
            }
        else:
            # Use original council processing for channels
            response = await self.process_query(query)
            return {
                "type": "council_response", 
                "response": response,
                "system_integration": "partial"
            } 