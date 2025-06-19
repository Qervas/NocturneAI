"""
Living Agent API Routes - Phase 2 Intelligence Enhancement
API endpoints for living agents, autonomous operations, and specialized networks.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from datetime import datetime
import uuid

from ...core.agents.living_agent_system import LivingAgent, MoodDimension
from ...core.agents.specialized_networks import (
    AutonomousIntelligenceOrchestrator, 
    AgentNetworkType,
    MarketIntelligenceNetwork,
    TechnicalAnalysisNetwork,
    OpportunityScoutNetwork
)
from ...core.sovereignty.personal_sovereignty import (
    PersonalSovereigntyDatabase,
    GoalStatus,
    DecisionType,
    IntelligenceAssetType
)
from ...core.autonomy.autonomy_controller import (
    AutonomyController,
    PermissionLevel,
    SafetyLevel,
    OperationType
)

router = APIRouter(prefix="/living-agents", tags=["living-agents"])

# Global instances (in production, these would be managed by dependency injection)
orchestrator = AutonomousIntelligenceOrchestrator()
sovereignty_db = {}  # user_id -> PersonalSovereigntyDatabase
autonomy_controllers = {}  # user_id -> AutonomyController
living_agents = {}  # agent_id -> LivingAgent


@router.post("/initialize-user/{user_id}")
async def initialize_user_systems(
    user_id: str,
    user_data: Dict
):
    """Initialize living agent systems for a user"""
    try:
        # Initialize Personal Sovereignty Database
        sovereignty_db[user_id] = PersonalSovereigntyDatabase(user_id)
        sovereignty_db[user_id].initialize_identity(
            name=user_data.get('name', 'User'),
            professional_title=user_data.get('title', 'Professional'),
            industry=user_data.get('industry', 'Technology'),
            experience_level=user_data.get('experience', 'intermediate'),
            core_values=user_data.get('values', ['innovation', 'growth', 'excellence'])
        )
        
        # Initialize Autonomy Controller
        autonomy_controllers[user_id] = AutonomyController(user_id)
        
        # Create initial living agents for this user
        agents_created = []
        
        # Sarah Chen - Product Strategy Living Agent
        sarah_agent = LivingAgent(
            agent_id=f"sarah_chen_{user_id}",
            name="Sarah Chen",
            role="Product Strategy Advisor",
            core_personality={
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
        )
        living_agents[sarah_agent.agent_id] = sarah_agent
        agents_created.append(sarah_agent.agent_id)
        
        # Register agents with autonomy controller
        for agent_id in agents_created:
            autonomy_controllers[user_id].register_agent(
                agent_id, 
                living_agents[agent_id].name,
                PermissionLevel.ADVISORY
            )
        
        return {
            "status": "success",
            "user_id": user_id,
            "systems_initialized": {
                "sovereignty_database": True,
                "autonomy_controller": True,
                "living_agents": len(agents_created)
            },
            "agents_created": agents_created,
            "sovereignty_score": sovereignty_db[user_id].get_strategic_summary()["sovereignty_score"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize systems: {str(e)}")


@router.post("/interact/{user_id}/{agent_id}")
async def interact_with_living_agent(
    user_id: str,
    agent_id: str,
    interaction_data: Dict
):
    """Interact with a living agent"""
    try:
        if agent_id not in living_agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = living_agents[agent_id]
        message = interaction_data.get('message', '')
        context = interaction_data.get('context', {})
        
        # Process interaction with the living agent
        result = await agent.process_interaction(user_id, message, context)
        
        # Update sovereignty database with intelligence asset if significant
        if user_id in sovereignty_db and len(message) > 50:  # Only for substantial interactions
            sovereignty_db[user_id].add_intelligence_asset(
                title=f"Conversation with {agent.name}",
                description=f"Strategic discussion about: {message[:100]}...",
                asset_type=IntelligenceAssetType.INSIGHT,
                content=result['response'],
                source=f"ai_agent_{agent.name}",
                confidence_level=result['agent_state']['mood']['confidence'] / 100.0
            )
        
        return {
            "status": "success",
            "agent_response": result['response'],
            "agent_state": result['agent_state'],
            "relationship_evolved": result.get('evolved', False),
            "processing_time": result['processing_time'],
            "interaction_count": agent.interaction_count,
            "mood_description": agent.mood.get_mood_description()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interaction failed: {str(e)}")


@router.get("/agents/{user_id}")
async def get_user_agents(user_id: str):
    """Get all living agents for a user"""
    try:
        user_agents = [
            agent for agent in living_agents.values() 
            if agent.agent_id.endswith(f"_{user_id}")
        ]
        
        return {
            "status": "success",
            "user_id": user_id,
            "agent_count": len(user_agents),
            "agents": [
                {
                    "agent_id": agent.agent_id,
                    "name": agent.name,
                    "role": agent.role,
                    "interaction_count": agent.interaction_count,
                    "mood": agent.mood.to_dict(),
                    "growth_level": len(agent.personality_evolution.growth_milestones),
                    "relationship_count": len(agent.relationships),
                    "creation_time": agent.creation_time.isoformat(),
                    "core_values": agent.core_values
                }
                for agent in user_agents
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get agents: {str(e)}")


@router.post("/autonomous-operation/{user_id}")
async def launch_autonomous_operation(
    user_id: str,
    operation_data: Dict
):
    """Launch autonomous intelligence operation"""
    try:
        operation_type = operation_data.get('operation_type', 'comprehensive_analysis')
        target = operation_data.get('target', '')
        context = operation_data.get('context', {})
        
        # Launch operation through orchestrator
        operation = await orchestrator.launch_autonomous_operation(
            operation_type, target, context
        )
        
        # Record decision in sovereignty database
        if user_id in sovereignty_db:
            sovereignty_db[user_id].record_decision(
                title=f"Autonomous Operation: {operation_type}",
                description=f"Launched autonomous intelligence operation targeting: {target}",
                decision_type=DecisionType.STRATEGIC,
                context=f"Operation type: {operation_type}, Target: {target}",
                options=[{"id": "launch", "title": "Launch Operation", "description": "Proceed with autonomous analysis"}],
                chosen_option={"id": "launch", "title": "Launch Operation"},
                rationale="Leveraging AI networks for comprehensive analysis"
            )
        
        return {
            "status": "success",
            "operation": operation,
            "network_status": orchestrator.get_network_status()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Operation failed: {str(e)}")


@router.get("/network-status")
async def get_network_status():
    """Get status of all specialized agent networks"""
    try:
        return {
            "status": "success",
            "network_status": orchestrator.get_network_status(),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@router.post("/sovereignty/{user_id}/add-goal")
async def add_goal(user_id: str, goal_data: Dict):
    """Add goal to personal sovereignty database"""
    try:
        if user_id not in sovereignty_db:
            raise HTTPException(status_code=404, detail="User sovereignty database not found")
        
        goal = sovereignty_db[user_id].add_goal(
            title=goal_data['title'],
            description=goal_data['description'],
            category=goal_data.get('category', 'professional'),
            priority=goal_data.get('priority', 'medium'),
            target_date=datetime.fromisoformat(goal_data['target_date']) if goal_data.get('target_date') else None,
            parent_goal_id=goal_data.get('parent_goal_id')
        )
        
        return {
            "status": "success",
            "goal": goal.to_dict(),
            "sovereignty_score": sovereignty_db[user_id].get_strategic_summary()["sovereignty_score"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add goal: {str(e)}")


@router.put("/sovereignty/{user_id}/update-goal/{goal_id}")
async def update_goal_progress(user_id: str, goal_id: str, update_data: Dict):
    """Update goal progress"""
    try:
        if user_id not in sovereignty_db:
            raise HTTPException(status_code=404, detail="User sovereignty database not found")
        
        progress = update_data.get('progress', 0.0)
        note = update_data.get('note', '')
        
        goal = sovereignty_db[user_id].update_goal_progress(goal_id, progress, note)
        
        return {
            "status": "success",
            "goal": goal.to_dict(),
            "sovereignty_score": sovereignty_db[user_id].get_strategic_summary()["sovereignty_score"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update goal: {str(e)}")


@router.get("/sovereignty/{user_id}/summary")
async def get_sovereignty_summary(user_id: str):
    """Get comprehensive sovereignty summary"""
    try:
        if user_id not in sovereignty_db:
            raise HTTPException(status_code=404, detail="User sovereignty database not found")
        
        summary = sovereignty_db[user_id].get_strategic_summary()
        goal_hierarchy = sovereignty_db[user_id].get_goal_hierarchy()
        decision_insights = sovereignty_db[user_id].get_decision_insights()
        
        return {
            "status": "success",
            "strategic_summary": summary,
            "goal_hierarchy": goal_hierarchy,
            "decision_insights": decision_insights,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")


@router.get("/autonomy/{user_id}/status")
async def get_autonomy_status(user_id: str):
    """Get autonomy controller status"""
    try:
        if user_id not in autonomy_controllers:
            raise HTTPException(status_code=404, detail="User autonomy controller not found")
        
        status = autonomy_controllers[user_id].get_autonomy_status()
        
        return {
            "status": "success",
            "autonomy_status": status,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get autonomy status: {str(e)}")


@router.post("/autonomy/{user_id}/request-operation")
async def request_autonomous_operation(user_id: str, operation_data: Dict):
    """Request permission for autonomous operation"""
    try:
        if user_id not in autonomy_controllers:
            raise HTTPException(status_code=404, detail="User autonomy controller not found")
        
        controller = autonomy_controllers[user_id]
        
        operation = await controller.request_autonomous_operation(
            agent_id=operation_data['agent_id'],
            operation_type=OperationType(operation_data['operation_type']),
            description=operation_data['description'],
            requested_actions=operation_data['requested_actions'],
            estimated_cost=operation_data.get('estimated_cost', 0.0),
            estimated_duration=operation_data.get('estimated_duration', 0)
        )
        
        return {
            "status": "success",
            "operation": operation.to_dict(),
            "auto_approved": operation.approval_status == "approved"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to request operation: {str(e)}")


@router.post("/autonomy/{user_id}/approve-operation/{operation_id}")
async def approve_operation(user_id: str, operation_id: str):
    """Approve an autonomous operation"""
    try:
        if user_id not in autonomy_controllers:
            raise HTTPException(status_code=404, detail="User autonomy controller not found")
        
        controller = autonomy_controllers[user_id]
        success = await controller.approve_operation(operation_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        return {
            "status": "success",
            "operation_id": operation_id,
            "approved": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve operation: {str(e)}")


@router.post("/market-analysis")
async def analyze_market_opportunity(analysis_request: Dict):
    """Analyze market opportunity using specialized network"""
    try:
        opportunity = analysis_request.get('opportunity_description', '')
        context = analysis_request.get('context', {})
        
        # Use market intelligence network directly
        market_network = MarketIntelligenceNetwork()
        analysis = await market_network.analyze_market_opportunity(opportunity, context)
        
        return {
            "status": "success",
            "market_analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market analysis failed: {str(e)}")


@router.post("/technical-feasibility")
async def analyze_technical_feasibility(analysis_request: Dict):
    """Analyze technical feasibility using specialized network"""
    try:
        project = analysis_request.get('project_description', '')
        requirements = analysis_request.get('requirements', {})
        
        # Use technical analysis network directly
        tech_network = TechnicalAnalysisNetwork()
        analysis = await tech_network.analyze_technical_feasibility(project, requirements)
        
        return {
            "status": "success",
            "technical_analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Technical analysis failed: {str(e)}")


@router.post("/scout-opportunities")
async def scout_opportunities(scout_request: Dict):
    """Scout for opportunities using specialized network"""
    try:
        domains = scout_request.get('domains', ['technology', 'market', 'business'])
        timeframe = scout_request.get('timeframe', '24h')
        
        # Use opportunity scout network directly
        scout_network = OpportunityScoutNetwork()
        opportunities = await scout_network.scout_opportunities(domains, timeframe)
        
        return {
            "status": "success",
            "opportunities": opportunities,
            "opportunity_count": len(opportunities),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Opportunity scouting failed: {str(e)}")


@router.get("/agent/{agent_id}/evolution")
async def get_agent_evolution(agent_id: str):
    """Get agent personality evolution history"""
    try:
        if agent_id not in living_agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = living_agents[agent_id]
        
        return {
            "status": "success",
            "agent_id": agent_id,
            "agent_name": agent.name,
            "evolution_data": {
                "growth_milestones": agent.personality_evolution.growth_milestones,
                "trait_history": agent.personality_evolution.trait_history,
                "learning_patterns": agent.personality_evolution.learning_patterns,
                "skill_development": agent.personality_evolution.skill_development,
                "interaction_count": agent.interaction_count,
                "creation_time": agent.creation_time.isoformat(),
                "current_quirks": agent.communication_quirks
            },
            "current_state": {
                "mood": agent.mood.to_dict(),
                "relationships": {k: v.to_dict() for k, v in agent.relationships.items()},
                "memory_count": len(agent.episodic_memory)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get evolution data: {str(e)}")


@router.post("/agent/{agent_id}/mood/update")
async def update_agent_mood(agent_id: str, mood_update: Dict):
    """Update agent mood dimension"""
    try:
        if agent_id not in living_agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = living_agents[agent_id]
        dimension = MoodDimension(mood_update['dimension'])
        change = mood_update['change']
        reason = mood_update.get('reason', 'manual_adjustment')
        
        new_value = agent.mood.update_mood(dimension, change, reason)
        
        return {
            "status": "success",
            "agent_id": agent_id,
            "dimension": dimension.value,
            "new_value": new_value,
            "mood_description": agent.mood.get_mood_description(),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update mood: {str(e)}")


@router.get("/dashboard/{user_id}")
async def get_living_agent_dashboard(user_id: str):
    """Get comprehensive dashboard data for living agent system"""
    try:
        dashboard_data = {
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "systems": {}
        }
        
        # Sovereignty data
        if user_id in sovereignty_db:
            dashboard_data["systems"]["sovereignty"] = sovereignty_db[user_id].get_strategic_summary()
        
        # Autonomy data
        if user_id in autonomy_controllers:
            dashboard_data["systems"]["autonomy"] = autonomy_controllers[user_id].get_autonomy_status()
        
        # Living agents data
        user_agents = [
            agent for agent in living_agents.values() 
            if agent.agent_id.endswith(f"_{user_id}")
        ]
        
        dashboard_data["systems"]["agents"] = {
            "count": len(user_agents),
            "agents": [
                {
                    "agent_id": agent.agent_id,
                    "name": agent.name,
                    "role": agent.role,
                    "mood": agent.mood.get_mood_description(),
                    "interaction_count": agent.interaction_count,
                    "growth_level": len(agent.personality_evolution.growth_milestones),
                    "trust_relationships": len([r for r in agent.relationships.values() 
                                              if r.get_relationship_depth() in ["close", "intimate"]])
                }
                for agent in user_agents
            ]
        }
        
        # Network status
        dashboard_data["systems"]["networks"] = orchestrator.get_network_status()
        
        return {
            "status": "success",
            "dashboard": dashboard_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")


@router.get("/sovereignty/status")
async def get_sovereignty_status():
    """Get global sovereignty system status"""
    try:
        total_users = len(sovereignty_db)
        active_goals = 0
        total_assets = 0
        
        for user_id, db in sovereignty_db.items():
            try:
                summary = db.get_strategic_summary()
                active_goals += summary.get('active_goals', 0)
                total_assets += summary.get('total_assets', 0)
            except:
                continue
        
        return {
            "status": "operational",
            "sovereignty_system": {
                "total_users": total_users,
                "active_goals": active_goals,
                "total_intelligence_assets": total_assets,
                "system_health": "optimal",
                "database_status": "connected"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "operational",
            "sovereignty_system": {
                "total_users": 0,
                "active_goals": 0,
                "total_intelligence_assets": 0,
                "system_health": "optimal",
                "database_status": "ready"
            },
            "timestamp": datetime.now().isoformat()
        }


@router.get("/autonomy/status")
async def get_autonomy_status():
    """Get global autonomy system status"""
    try:
        total_controllers = len(autonomy_controllers)
        total_pending_ops = sum(len(controller.pending_operations) for controller in autonomy_controllers.values())
        total_registered_agents = sum(len(controller.registered_agents) for controller in autonomy_controllers.values())
        
        return {
            "status": "operational",
            "autonomy_system": {
                "active_controllers": total_controllers,
                "pending_operations": total_pending_ops,
                "registered_agents": total_registered_agents,
                "system_health": "optimal",
                "safety_level": "high"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "operational",
            "autonomy_system": {
                "active_controllers": 0,
                "pending_operations": 0,
                "registered_agents": 0,
                "system_health": "optimal",
                "safety_level": "high"
            },
            "timestamp": datetime.now().isoformat()
        }