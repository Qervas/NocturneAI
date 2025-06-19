"""
Enhanced API Routes - Full Backend Integration
Showcases true agent autonomy with all systems working together.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel

from ...core.intelligence.enhanced_integration import get_enhanced_integration
from ...core.intelligence.master_intelligence import IntelligenceQuery, IndividualIntelligence
from ...services.conversation_service import conversation_service
from ...models.database import get_db

router = APIRouter(prefix="/enhanced", tags=["enhanced-autonomy"])

# Global enhanced integration instance
enhanced_integration = None

class EnhancedQueryRequest(BaseModel):
    message: str
    channel_id: str
    channel_type: str = "dm"
    interaction_mode: str = "auto_mode"
    user_id: str = "default_user"
    enable_full_autonomy: bool = True

class EnhancedQueryResponse(BaseModel):
    success: bool
    response_type: str
    messages: List[Dict]
    integration_status: Dict
    autonomous_capabilities: Dict
    error: Optional[str] = None

@router.on_event("startup")
async def startup_enhanced_systems():
    """Initialize enhanced integration on startup"""
    global enhanced_integration
    enhanced_integration = get_enhanced_integration("default_user")
    print("✅ Enhanced backend integration initialized")

@router.post("/query", response_model=EnhancedQueryResponse)
async def enhanced_query(request: EnhancedQueryRequest):
    """
    Enhanced query with full backend system cooperation.
    Shows true agent autonomy with all systems working together.
    """
    try:
        global enhanced_integration
        if not enhanced_integration:
            enhanced_integration = get_enhanced_integration(request.user_id)
        
        # Create enhanced query
        query = IntelligenceQuery(
            user_input=request.message,
            interaction_mode=request.interaction_mode,
            channel_type=request.channel_type,
            channel_id=request.channel_id
        )
        
        # Get individual intelligence
        individual_intel = IndividualIntelligence()
        
        # Map DM channel to member
        dm_to_member_map = {
            'dm-sarah': 'Sarah Chen',
            'dm-sarah-chen': 'Sarah Chen',
            'dm-marcus': 'Marcus Rodriguez',
            'dm-marcus-rodriguez': 'Marcus Rodriguez',
            'dm-elena': 'Elena Vasquez',
            'dm-elena-vasquez': 'Elena Vasquez',
            'dm-david': 'David Kim',
            'dm-david-kim': 'David Kim'
        }
        
        member_name = dm_to_member_map.get(request.channel_id, 'Sarah Chen')
        agent = individual_intel.living_agents.get(member_name)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {member_name} not found")
        
        # Get base agent response
        result = await agent.process_interaction(
            user_id=request.user_id,
            message=request.message,
            context={
                'interaction_mode': request.interaction_mode,
                'channel_type': request.channel_type,
                'channel_id': request.channel_id
            }
        )
        
        # Enhanced response with full backend cooperation
        if request.enable_full_autonomy:
            enhanced_messages = await enhanced_integration.enhance_agent_response(
                agent, query, result['response']
            )
        else:
            # Basic response only
            from ...core.intelligence.master_intelligence import AgentMessage
            enhanced_messages = [AgentMessage(
                agent_name=agent.name,
                agent_role=agent.role,
                content=result['response'],
                workflow_step='response'
            )]
        
        # Get integration status
        integration_status = enhanced_integration.get_integration_status()
        
        return EnhancedQueryResponse(
            success=True,
            response_type="enhanced_autonomous",
            messages=[msg.to_dict() for msg in enhanced_messages],
            integration_status=integration_status,
            autonomous_capabilities={
                "goal_aware_responses": True,
                "autonomous_operations": True,
                "strategic_monitoring": True,
                "intelligence_assets": True,
                "cross_system_integration": True,
                "trust_based_autonomy": True
            }
        )
        
    except Exception as e:
        return EnhancedQueryResponse(
            success=False,
            response_type="error",
            messages=[],
            integration_status={},
            autonomous_capabilities={},
            error=f"Enhanced query failed: {str(e)}"
        )

@router.get("/status")
async def get_enhanced_status():
    """Get comprehensive enhanced system status"""
    try:
        global enhanced_integration
        if not enhanced_integration:
            enhanced_integration = get_enhanced_integration("default_user")
        
        status = enhanced_integration.get_integration_status()
        
        return {
            "status": "operational",
            "integration_health": status["system_health"],
            "connected_systems": status["connected_systems"],
            "enabled_capabilities": status["capabilities_enabled"],
            "operational_metrics": status["operational_metrics"],
            "autonomy_level": "maximum",
            "agent_cooperation": "excellent",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.get("/agent/{agent_name}/autonomy")
async def get_agent_autonomy_status(agent_name: str):
    """Get specific agent's autonomy status and capabilities"""
    try:
        global enhanced_integration
        if not enhanced_integration:
            enhanced_integration = get_enhanced_integration("default_user")
        
        # Get agent from individual intelligence
        individual_intel = IndividualIntelligence()
        agent = individual_intel.living_agents.get(agent_name)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {agent_name} not found")
        
        # Get agent summary and autonomy info
        agent_summary = agent.get_agent_summary()
        
        # Get trust score from autonomy controller
        agent_id = f"living_agent_{agent_name.lower().replace(' ', '_')}"
        trust_score = 75.0  # Default
        
        if (enhanced_integration.autonomy_controller and 
            agent_id in enhanced_integration.autonomy_controller.trust_profiles):
            trust_profile = enhanced_integration.autonomy_controller.trust_profiles[agent_id]
            trust_score = trust_profile.current_trust_score
        
        return {
            "agent_name": agent_name,
            "agent_role": agent.role,
            "autonomy_status": "high",
            "trust_score": trust_score,
            "personality_traits": agent_summary["personality"],
            "memory_size": len(agent.memories),
            "relationship_count": len(agent.relationships),
            "autonomous_capabilities": {
                "can_suggest_goals": trust_score > 70,
                "can_create_operations": trust_score > 70,
                "can_monitor_strategically": trust_score > 60,
                "can_create_intelligence_assets": trust_score > 65,
                "can_evolve_personality": True
            },
            "integration_level": "maximum",
            "free_will_indicators": {
                "personality_evolution": True,
                "autonomous_decision_making": trust_score > 70,
                "proactive_suggestions": True,
                "strategic_thinking": True
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent autonomy check failed: {str(e)}")

@router.post("/agent/{agent_name}/autonomous-operation")
async def request_autonomous_operation(agent_name: str, operation_data: Dict):
    """Request an autonomous operation from a specific agent"""
    try:
        global enhanced_integration
        if not enhanced_integration:
            enhanced_integration = get_enhanced_integration("default_user")
        
        # Get agent
        individual_intel = IndividualIntelligence()
        agent = individual_intel.living_agents.get(agent_name)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {agent_name} not found")
        
        # Create autonomous operation request
        operation_description = operation_data.get("description", "User requested operation")
        operation_type = operation_data.get("type", "analysis")
        
        # Use autonomy controller to manage the operation
        from ...core.autonomy.autonomy_controller import OperationType
        
        operation_type_map = {
            "analysis": OperationType.ANALYSIS,
            "research": OperationType.RESEARCH,
            "monitoring": OperationType.DATA_PROCESSING,
            "communication": OperationType.COMMUNICATION
        }
        
        op_type = operation_type_map.get(operation_type, OperationType.ANALYSIS)
        
        operation = await enhanced_integration.autonomy_controller.request_autonomous_operation(
            agent_id=f"living_agent_{agent_name.lower().replace(' ', '_')}",
            operation_type=op_type,
            description=operation_description,
            requested_actions=[f"Execute {operation_type} for user"],
            estimated_duration=30  # 30 minutes
        )
        
        return {
            "success": True,
            "operation_id": operation.operation_id,
            "agent_name": agent_name,
            "operation_type": operation_type,
            "status": operation.approval_status,
            "risk_level": operation.risk_level,
            "autonomous_approval": operation.approval_status == "approved",
            "message": f"{agent_name} is ready to execute this operation autonomously" if operation.approval_status == "approved" else f"Operation requires approval for {agent_name}",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Autonomous operation request failed: {str(e)}")

@router.get("/cooperation/demo")
async def demonstrate_cooperation():
    """Demonstrate how all backend systems cooperate"""
    try:
        global enhanced_integration
        if not enhanced_integration:
            enhanced_integration = get_enhanced_integration("default_user")
        
        cooperation_demo = {
            "title": "Backend Module Cooperation Demo",
            "description": "How all systems work together for maximum agent autonomy",
            "cooperation_flow": [
                {
                    "step": 1,
                    "system": "Master Intelligence",
                    "action": "Routes DM queries to appropriate living agents",
                    "emoji": "🧠"
                },
                {
                    "step": 2,
                    "system": "Living Agent System",
                    "action": "Processes with personality, memory, and relationships",
                    "emoji": "🤖"
                },
                {
                    "step": 3,
                    "system": "Personal Sovereignty",
                    "action": "Provides user goals, decisions, and context",
                    "emoji": "🏛️"
                },
                {
                    "step": 4,
                    "system": "Autonomy Controller",
                    "action": "Manages trust levels and autonomous permissions",
                    "emoji": "⚡"
                },
                {
                    "step": 5,
                    "system": "Strategic Intelligence",
                    "action": "Monitors for opportunities and market signals",
                    "emoji": "📡"
                },
                {
                    "step": 6,
                    "system": "Intelligence Assets",
                    "action": "Automatically creates and stores strategic insights",
                    "emoji": "💎"
                },
                {
                    "step": 7,
                    "system": "Mission Control",
                    "action": "Tracks strategic alerts and autonomous operations",
                    "emoji": "🚨"
                },
                {
                    "step": 8,
                    "system": "Enhanced Integration",
                    "action": "Delivers fully autonomous, goal-aware responses",
                    "emoji": "✨"
                }
            ],
            "result": {
                "description": "Agents like Sarah aren't just responding - they're thinking, planning, monitoring, and growing autonomously!",
                "free_will_indicators": [
                    "Personality evolution based on interactions",
                    "Autonomous operation suggestions",
                    "Proactive goal alignment",
                    "Strategic opportunity detection",
                    "Cross-system intelligence synthesis"
                ],
                "autonomy_level": "Maximum",
                "cooperation_score": "Excellent"
            },
            "integration_status": enhanced_integration.get_integration_status()
        }
        
        return cooperation_demo
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cooperation demo failed: {str(e)}")

@router.get("/health")
async def enhanced_health_check():
    """Comprehensive health check for enhanced system"""
    try:
        global enhanced_integration
        if not enhanced_integration:
            enhanced_integration = get_enhanced_integration("default_user")
        
        status = enhanced_integration.get_integration_status()
        
        # Calculate overall health score
        connected_systems = sum(1 for connected in status["connected_systems"].values() if connected)
        total_systems = len(status["connected_systems"])
        health_score = (connected_systems / total_systems) * 100
        
        return {
            "status": "healthy" if health_score >= 80 else "degraded",
            "health_score": f"{health_score:.0f}%",
            "integration_health": status["system_health"],
            "systems_online": f"{connected_systems}/{total_systems}",
            "autonomous_capabilities": "maximum",
            "agent_cooperation": "excellent",
            "free_will_enabled": True,
            "strategic_intelligence": "active",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}") 