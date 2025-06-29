"""
Autonomous Agent System API Routes - Step 3 Implementation
API endpoints for autonomous decision-making, learning, and goal management
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid

from ...core.agents.autonomous_agent_system import (
    get_autonomous_system, 
    AutonomousDecisionType, 
    LearningType, 
    AgentGoalStatus
)
from ...core.agents.agent_network import agent_network
from ...core.agents.agent_collaboration import agent_collaboration

router = APIRouter(prefix="/autonomous", tags=["autonomous"])

# Initialize system dependencies
def get_systems():
    return get_autonomous_system(agent_network, agent_collaboration)

@router.get("/status")
async def get_autonomous_system_status():
    """Get overall autonomous system status"""
    try:
        auto_system = get_systems()
        status = auto_system.get_system_status()
        
        return {
            "success": True,
            "status": status,
            "message": "Autonomous system operational with full capabilities",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"System status check failed: {str(e)}")

@router.get("/agent/{agent_name}/status")
async def get_agent_autonomous_status(agent_name: str):
    """Get comprehensive autonomous status for a specific agent"""
    try:
        auto_system = get_systems()
        status = auto_system.get_agent_status(agent_name)
        
        return {
            "success": True,
            "agent_status": status,
            "message": f"{agent_name} autonomous capabilities fully operational",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent status check failed: {str(e)}")

@router.post("/agent/{agent_name}/decision")
async def trigger_autonomous_decision(agent_name: str, context_data: Dict[str, Any]):
    """Trigger an autonomous decision for a specific agent"""
    try:
        auto_system = get_systems()
        
        # Extract context and trigger information
        context = context_data.get("context", {})
        trigger_event = context_data.get("trigger_event", None)
        
        # Enhance context with agent-specific information
        enhanced_context = {
            "agent_name": agent_name,
            "user_input": context.get("message", ""),
            "conversation_context": context.get("conversation_context", {}),
            "current_tasks": context.get("current_tasks", []),
            "recent_interactions": context.get("recent_interactions", []),
            **context
        }
        
        # Make autonomous decision
        decision = await auto_system.make_autonomous_decision(
            agent_name, enhanced_context, trigger_event
        )
        
        if decision:
            return {
                "success": True,
                "decision_made": True,
                "decision": {
                    "id": decision.id,
                    "type": decision.decision_type.value,
                    "description": decision.description,
                    "reasoning": decision.reasoning,
                    "confidence_score": decision.confidence_score,
                    "potential_impact": decision.potential_impact,
                    "approval_required": decision.approval_required,
                    "auto_execute": decision.auto_execute,
                    "estimated_duration": decision.estimated_duration,
                    "success_criteria": decision.success_criteria,
                    "status": decision.status
                },
                "message": f"{agent_name} made autonomous decision: {decision.description}",
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "success": True,
                "decision_made": False,
                "message": f"{agent_name} determined no autonomous action needed at this time",
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Autonomous decision failed: {str(e)}")

@router.post("/decision/{decision_id}/execute")
async def execute_autonomous_decision(decision_id: str):
    """Execute an approved autonomous decision"""
    try:
        auto_system = get_systems()
        
        # Execute the decision
        result = await auto_system.execute_autonomous_decision(decision_id)
        
        return {
            "success": result["success"],
            "execution_result": result,
            "message": "Decision executed successfully" if result["success"] else f"Execution failed: {result.get('error', 'Unknown error')}",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decision execution failed: {str(e)}")

@router.get("/decisions")
async def get_autonomous_decisions(
    agent_name: Optional[str] = Query(None, description="Filter by agent name"),
    status: Optional[str] = Query(None, description="Filter by decision status"),
    limit: int = Query(10, description="Maximum number of decisions to return")
):
    """Get autonomous decisions with optional filtering"""
    try:
        auto_system = get_systems()
        
        # Get all decisions
        all_decisions = list(auto_system.autonomous_decisions.values())
        
        # Apply filters
        filtered_decisions = all_decisions
        
        if agent_name:
            filtered_decisions = [d for d in filtered_decisions if d.agent_name == agent_name]
        
        if status:
            filtered_decisions = [d for d in filtered_decisions if d.status == status]
        
        # Sort by creation date (newest first) and limit
        filtered_decisions.sort(key=lambda x: x.created_at, reverse=True)
        filtered_decisions = filtered_decisions[:limit]
        
        # Format for response
        decisions_data = []
        for decision in filtered_decisions:
            decisions_data.append({
                "id": decision.id,
                "agent_name": decision.agent_name,
                "decision_type": decision.decision_type.value,
                "description": decision.description,
                "reasoning": decision.reasoning,
                "confidence_score": decision.confidence_score,
                "potential_impact": decision.potential_impact,
                "status": decision.status,
                "approval_required": decision.approval_required,
                "auto_execute": decision.auto_execute,
                "estimated_duration": decision.estimated_duration,
                "created_at": decision.created_at.isoformat(),
                "success_criteria": decision.success_criteria
            })
        
        return {
            "success": True,
            "decisions": decisions_data,
            "total_found": len(decisions_data),
            "filters_applied": {
                "agent_name": agent_name,
                "status": status,
                "limit": limit
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve decisions: {str(e)}")

@router.post("/agent/{agent_name}/learn")
async def record_learning_interaction(agent_name: str, interaction_data: Dict[str, Any]):
    """Record an interaction for agent learning"""
    try:
        auto_system = get_systems()
        
        # Extract interaction context and outcome
        context = interaction_data.get("context", {})
        outcome = interaction_data.get("outcome", {})
        
        # Enhance context with metadata
        enhanced_context = {
            "interaction_type": context.get("type", "conversation"),
            "user_input": context.get("user_input", ""),
            "agent_response": context.get("agent_response", ""),
            "collaboration_involved": context.get("collaboration_involved", False),
            "decision_made": context.get("decision_made", False),
            "timestamp": datetime.now().isoformat(),
            **context
        }
        
        # Enhance outcome with success metrics
        enhanced_outcome = {
            "success": outcome.get("success", True),
            "user_satisfaction": outcome.get("user_satisfaction", 0.8),
            "user_feedback": outcome.get("user_feedback", ""),
            "effectiveness_score": outcome.get("effectiveness_score", 0.7),
            "completion_time": outcome.get("completion_time", 0),
            **outcome
        }
        
        # Process learning
        await auto_system.learn_from_interaction(agent_name, enhanced_context, enhanced_outcome)
        
        return {
            "success": True,
            "learning_processed": True,
            "agent_name": agent_name,
            "message": f"{agent_name} processed interaction for learning optimization",
            "context_analyzed": list(enhanced_context.keys()),
            "outcome_factors": list(enhanced_outcome.keys()),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Learning interaction failed: {str(e)}")

@router.get("/agent/{agent_name}/insights")
async def get_learning_insights(agent_name: str, limit: int = Query(5, description="Maximum insights to return")):
    """Get learning insights for a specific agent"""
    try:
        auto_system = get_systems()
        
        # Get agent's learning insights
        agent_insights = [
            insight for insight in auto_system.learning_insights.values() 
            if insight.agent_name == agent_name
        ]
        
        # Sort by creation date (newest first) and limit
        agent_insights.sort(key=lambda x: x.created_at, reverse=True)
        agent_insights = agent_insights[:limit]
        
        # Format for response
        insights_data = []
        for insight in agent_insights:
            insights_data.append({
                "id": insight.id,
                "learning_type": insight.learning_type.value,
                "pattern_identified": insight.pattern_identified,
                "insight_description": insight.insight_description,
                "confidence_level": insight.confidence_level,
                "application_suggestions": insight.application_suggestions,
                "applied": insight.applied,
                "created_at": insight.created_at.isoformat()
            })
        
        return {
            "success": True,
            "agent_name": agent_name,
            "insights": insights_data,
            "total_insights": len(insights_data),
            "learning_active": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve insights: {str(e)}")

@router.post("/agent/{agent_name}/goal")
async def create_agent_goal(agent_name: str, goal_data: Dict[str, Any]):
    """Create a new autonomous goal for an agent"""
    try:
        auto_system = get_systems()
        
        # Extract goal parameters
        title = goal_data.get("title", "")
        description = goal_data.get("description", "")
        goal_type = goal_data.get("goal_type", "research")
        priority = goal_data.get("priority", 5)
        target_days = goal_data.get("target_days", 7)
        
        if not title or not description:
            raise HTTPException(status_code=400, detail="Title and description are required")
        
        # Create the goal
        goal = await auto_system.create_agent_goal(
            agent_name, title, description, goal_type, priority, target_days
        )
        
        return {
            "success": True,
            "goal_created": True,
            "goal": {
                "id": goal.id,
                "title": goal.title,
                "description": goal.description,
                "goal_type": goal.goal_type,
                "priority": goal.priority,
                "status": goal.status.value,
                "target_completion": goal.target_completion.isoformat(),
                "progress": goal.progress,
                "milestones": goal.milestones,
                "success_metrics": goal.success_metrics,
                "created_at": goal.created_at.isoformat()
            },
            "message": f"Autonomous goal '{title}' created for {agent_name}",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Goal creation failed: {str(e)}")

@router.get("/agent/{agent_name}/goals")
async def get_agent_goals(
    agent_name: str,
    status: Optional[str] = Query(None, description="Filter by goal status"),
    limit: int = Query(10, description="Maximum goals to return")
):
    """Get autonomous goals for a specific agent"""
    try:
        auto_system = get_systems()
        
        # Get agent's goals
        agent_goals = auto_system.agent_goals.get(agent_name, [])
        
        # Apply status filter if provided
        if status:
            try:
                status_enum = AgentGoalStatus(status)
                agent_goals = [goal for goal in agent_goals if goal.status == status_enum]
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        # Sort by priority (highest first) then by creation date
        agent_goals.sort(key=lambda x: (x.priority, x.created_at), reverse=True)
        agent_goals = agent_goals[:limit]
        
        # Format for response
        goals_data = []
        for goal in agent_goals:
            goals_data.append({
                "id": goal.id,
                "title": goal.title,
                "description": goal.description,
                "goal_type": goal.goal_type,
                "priority": goal.priority,
                "status": goal.status.value,
                "target_completion": goal.target_completion.isoformat(),
                "progress": goal.progress,
                "milestones": goal.milestones,
                "success_metrics": goal.success_metrics,
                "created_at": goal.created_at.isoformat(),
                "last_updated": goal.last_updated.isoformat()
            })
        
        return {
            "success": True,
            "agent_name": agent_name,
            "goals": goals_data,
            "total_goals": len(goals_data),
            "filters_applied": {
                "status": status,
                "limit": limit
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve goals: {str(e)}")

@router.put("/goal/{goal_id}/progress")
async def update_goal_progress(goal_id: str, progress_data: Dict[str, Any]):
    """Update progress on an autonomous goal"""
    try:
        auto_system = get_systems()
        
        # Find the goal
        target_goal = None
        target_agent = None
        
        for agent_name, goals in auto_system.agent_goals.items():
            for goal in goals:
                if goal.id == goal_id:
                    target_goal = goal
                    target_agent = agent_name
                    break
            if target_goal:
                break
        
        if not target_goal:
            raise HTTPException(status_code=404, detail=f"Goal {goal_id} not found")
        
        # Update progress
        new_progress = progress_data.get("progress", target_goal.progress)
        new_status = progress_data.get("status", target_goal.status.value)
        
        if not 0.0 <= new_progress <= 1.0:
            raise HTTPException(status_code=400, detail="Progress must be between 0.0 and 1.0")
        
        try:
            status_enum = AgentGoalStatus(new_status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
        
        target_goal.progress = new_progress
        target_goal.status = status_enum
        target_goal.last_updated = datetime.now()
        
        # Add milestone completion if provided
        if "milestone_completed" in progress_data:
            milestone_name = progress_data["milestone_completed"]
            print(f"🎯 {target_agent} completed milestone: {milestone_name} for goal '{target_goal.title}'")
        
        return {
            "success": True,
            "goal_updated": True,
            "goal": {
                "id": target_goal.id,
                "title": target_goal.title,
                "agent_name": target_agent,
                "progress": target_goal.progress,
                "status": target_goal.status.value,
                "last_updated": target_goal.last_updated.isoformat()
            },
            "message": f"Goal progress updated to {new_progress * 100:.1f}%",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Goal update failed: {str(e)}")

@router.get("/agent/{agent_name}/capabilities")
async def get_agent_capabilities(agent_name: str):
    """Get autonomous capabilities for a specific agent"""
    try:
        auto_system = get_systems()
        
        # Get agent capabilities
        capabilities = auto_system.agent_capabilities.get(agent_name, [])
        
        # Format for response
        capabilities_data = []
        for capability in capabilities:
            capabilities_data.append({
                "name": capability.name,
                "description": capability.description,
                "enabled": capability.enabled,
                "trust_threshold": capability.trust_threshold,
                "risk_level": capability.risk_level,
                "resource_cost": capability.resource_cost,
                "success_rate": capability.success_rate,
                "usage_count": capability.usage_count,
                "last_used": capability.last_used.isoformat() if capability.last_used else None
            })
        
        enabled_count = len([cap for cap in capabilities if cap.enabled])
        
        return {
            "success": True,
            "agent_name": agent_name,
            "capabilities": capabilities_data,
            "total_capabilities": len(capabilities_data),
            "enabled_capabilities": enabled_count,
            "capability_coverage": {
                "low_risk": len([cap for cap in capabilities if cap.risk_level == "low"]),
                "medium_risk": len([cap for cap in capabilities if cap.risk_level == "medium"]),
                "high_risk": len([cap for cap in capabilities if cap.risk_level == "high"])
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve capabilities: {str(e)}")

@router.post("/simulate")
async def simulate_autonomous_operations():
    """Simulate autonomous agent operations for testing"""
    try:
        auto_system = get_systems()
        
        agents = ['Sarah Chen', 'Marcus Rodriguez', 'Elena Vasquez', 'David Kim']
        simulation_results = []
        
        for agent_name in agents:
            # Simulate autonomous decision
            context = {
                "simulation": True,
                "user_input": f"Test autonomous capabilities for {agent_name}",
                "conversation_context": {"topic": "autonomous testing", "priority": "high"},
                "trigger_event": {"type": "capability_test", "urgency": "medium"}
            }
            
            decision = await auto_system.make_autonomous_decision(agent_name, context)
            
            decision_result = None
            if decision and decision.auto_execute:
                # Execute the decision
                execution_result = await auto_system.execute_autonomous_decision(decision.id)
                decision_result = execution_result
            
            # Simulate learning interaction
            learning_context = {
                "type": "simulation",
                "user_input": f"Autonomous test for {agent_name}",
                "collaboration_involved": True,
                "decision_made": decision is not None
            }
            
            learning_outcome = {
                "success": True,
                "user_satisfaction": 0.85,
                "effectiveness_score": 0.8,
                "user_feedback": "Autonomous behavior working well"
            }
            
            await auto_system.learn_from_interaction(agent_name, learning_context, learning_outcome)
            
            # Create a test goal
            goal = await auto_system.create_agent_goal(
                agent_name,
                f"Autonomous Test Goal for {agent_name}",
                f"Test autonomous goal management and tracking for {agent_name}",
                "research",
                priority=6,
                target_days=3
            )
            
            simulation_results.append({
                "agent_name": agent_name,
                "decision_made": decision is not None,
                "decision_executed": decision_result is not None if decision else False,
                "learning_processed": True,
                "goal_created": goal is not None,
                "decision_details": {
                    "id": decision.id,
                    "type": decision.decision_type.value,
                    "description": decision.description,
                    "confidence": decision.confidence_score,
                    "auto_execute": decision.auto_execute
                } if decision else None,
                "execution_result": decision_result if decision_result else None,
                "goal_details": {
                    "id": goal.id,
                    "title": goal.title,
                    "status": goal.status.value,
                    "priority": goal.priority
                } if goal else None
            })
        
        return {
            "success": True,
            "simulation_completed": True,
            "agents_tested": len(agents),
            "results": simulation_results,
            "summary": {
                "decisions_made": len([r for r in simulation_results if r["decision_made"]]),
                "decisions_executed": len([r for r in simulation_results if r["decision_executed"]]),
                "goals_created": len([r for r in simulation_results if r["goal_created"]]),
                "learning_sessions": len(simulation_results)
            },
            "message": "Autonomous system simulation completed successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.get("/analytics")
async def get_autonomous_analytics():
    """Get autonomous system analytics and performance metrics"""
    try:
        auto_system = get_systems()
        
        # Collect analytics data
        total_decisions = len(auto_system.autonomous_decisions)
        total_insights = len(auto_system.learning_insights)
        total_goals = sum(len(goals) for goals in auto_system.agent_goals.values())
        
        # Decision analytics
        decision_types = {}
        decision_statuses = {}
        agent_decision_counts = {}
        
        for decision in auto_system.autonomous_decisions.values():
            # Count by type
            decision_type = decision.decision_type.value
            decision_types[decision_type] = decision_types.get(decision_type, 0) + 1
            
            # Count by status
            status = decision.status
            decision_statuses[status] = decision_statuses.get(status, 0) + 1
            
            # Count by agent
            agent = decision.agent_name
            agent_decision_counts[agent] = agent_decision_counts.get(agent, 0) + 1
        
        # Learning analytics
        learning_types = {}
        agent_insight_counts = {}
        
        for insight in auto_system.learning_insights.values():
            # Count by learning type
            learning_type = insight.learning_type.value
            learning_types[learning_type] = learning_types.get(learning_type, 0) + 1
            
            # Count by agent
            agent = insight.agent_name
            agent_insight_counts[agent] = agent_insight_counts.get(agent, 0) + 1
        
        # Goal analytics
        goal_statuses = {}
        goal_types = {}
        agent_goal_counts = {}
        
        for agent_name, goals in auto_system.agent_goals.items():
            agent_goal_counts[agent_name] = len(goals)
            
            for goal in goals:
                # Count by status
                status = goal.status.value
                goal_statuses[status] = goal_statuses.get(status, 0) + 1
                
                # Count by type
                goal_type = goal.goal_type
                goal_types[goal_type] = goal_types.get(goal_type, 0) + 1
        
        # Capability analytics
        capability_summary = {}
        for agent_name, capabilities in auto_system.agent_capabilities.items():
            enabled_count = len([cap for cap in capabilities if cap.enabled])
            total_count = len(capabilities)
            avg_success_rate = sum(cap.success_rate for cap in capabilities) / total_count if total_count > 0 else 0
            
            capability_summary[agent_name] = {
                "total_capabilities": total_count,
                "enabled_capabilities": enabled_count,
                "average_success_rate": avg_success_rate,
                "enablement_rate": enabled_count / total_count if total_count > 0 else 0
            }
        
        return {
            "success": True,
            "analytics": {
                "overview": {
                    "total_decisions": total_decisions,
                    "total_insights": total_insights,
                    "total_goals": total_goals,
                    "active_agents": len(auto_system.agent_capabilities),
                    "system_uptime": "operational"
                },
                "decisions": {
                    "by_type": decision_types,
                    "by_status": decision_statuses,
                    "by_agent": agent_decision_counts
                },
                "learning": {
                    "by_type": learning_types,
                    "by_agent": agent_insight_counts
                },
                "goals": {
                    "by_status": goal_statuses,
                    "by_type": goal_types,
                    "by_agent": agent_goal_counts
                },
                "capabilities": capability_summary
            },
            "insights": {
                "most_active_agent": max(agent_decision_counts.items(), key=lambda x: x[1])[0] if agent_decision_counts else None,
                "most_common_decision_type": max(decision_types.items(), key=lambda x: x[1])[0] if decision_types else None,
                "most_common_learning_type": max(learning_types.items(), key=lambda x: x[1])[0] if learning_types else None,
                "overall_autonomy_level": "advanced",
                "system_health": "excellent"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics retrieval failed: {str(e)}")