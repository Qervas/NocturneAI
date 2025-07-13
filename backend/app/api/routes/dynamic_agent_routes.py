"""
Dynamic Agent API Routes
Comprehensive API for managing dynamic agents
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from ...core.intelligence.master_intelligence import master_intelligence
from ...models.agent_profile import AGENT_TEMPLATES, PersonalityTrait, SkillCategory, CommunicationStyle, DecisionMakingStyle, WorkStyle, AutonomyLevel


router = APIRouter()


# Request Models
class AgentCreateRequest(BaseModel):
    name: str = Field(..., description="Agent name")
    role: str = Field(..., description="Agent role")
    description: str = Field(..., description="Agent description")
    avatar_emoji: str = Field(default="🤖", description="Agent avatar emoji")
    color_theme: str = Field(default="blue", description="Agent color theme")
    primary_traits: List[str] = Field(default_factory=list, description="Primary personality traits")
    skill_categories: List[str] = Field(default_factory=list, description="Skill categories")
    expertise_areas: List[str] = Field(default_factory=list, description="Expertise areas")
    experience_level: float = Field(default=0.5, description="Experience level (0-1)")
    communication_style: str = Field(default="casual", description="Communication style")
    decision_making_style: str = Field(default="data_driven", description="Decision making style")
    work_style: str = Field(default="structured", description="Work style")
    autonomy_level: str = Field(default="proactive", description="Autonomy level")
    custom_attributes: Dict[str, Any] = Field(default_factory=dict, description="Custom attributes")


class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    avatar_emoji: Optional[str] = None
    color_theme: Optional[str] = None
    primary_traits: Optional[List[str]] = None
    skill_categories: Optional[List[str]] = None
    expertise_areas: Optional[List[str]] = None
    experience_level: Optional[float] = None
    communication_style: Optional[str] = None
    decision_making_style: Optional[str] = None
    work_style: Optional[str] = None
    autonomy_level: Optional[str] = None
    custom_attributes: Optional[Dict[str, Any]] = None


class AgentInteractionRequest(BaseModel):
    message: str = Field(..., description="Message to send to agent")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Interaction context")


class AgentToAgentInteractionRequest(BaseModel):
    sender_id: str = Field(..., description="Sender agent ID")
    recipient_id: str = Field(..., description="Recipient agent ID")
    message: str = Field(..., description="Message to send")


class TemplateCreateRequest(BaseModel):
    template_name: str = Field(..., description="Template name")
    name: str = Field(..., description="Agent name")
    role: str = Field(..., description="Agent role")


# Agent Management Routes
@router.get("/agents", response_model=Dict)
async def get_all_agents():
    """Get all agents"""
    try:
        agents = master_intelligence.get_all_agents()
        return {
            "success": True,
            "agents": [agent.to_dict() for agent in agents.values()],
            "count": len(agents)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}", response_model=Dict)
async def get_agent(agent_id: str):
    """Get specific agent"""
    try:
        agent = master_intelligence.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return {
            "success": True,
            "agent": agent.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agents", response_model=Dict)
async def create_agent(request: AgentCreateRequest):
    """Create a new agent"""
    try:
        # Convert request to profile data
        profile_data = {
            "name": request.name,
            "role": request.role,
            "description": request.description,
            "avatar_emoji": request.avatar_emoji,
            "color_theme": request.color_theme,
            "primary_traits": request.primary_traits,
            "skill_categories": request.skill_categories,
            "expertise_areas": request.expertise_areas,
            "experience_level": request.experience_level,
            "communication_style": request.communication_style,
            "decision_making_style": request.decision_making_style,
            "work_style": request.work_style,
            "autonomy_level": request.autonomy_level,
            "custom_attributes": request.custom_attributes
        }
        
        result = await master_intelligence.create_agent(profile_data)
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/agents/{agent_id}", response_model=Dict)
async def update_agent(agent_id: str, request: AgentUpdateRequest):
    """Update an existing agent"""
    try:
        # Convert request to updates dict (only include non-None values)
        updates = {k: v for k, v in request.dict().items() if v is not None}
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        result = await master_intelligence.update_agent(agent_id, updates)
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/agents/{agent_id}", response_model=Dict)
async def delete_agent(agent_id: str):
    """Delete an agent"""
    try:
        result = await master_intelligence.delete_agent(agent_id)
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=404, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Agent Interaction Routes
@router.post("/agents/{agent_id}/interact", response_model=Dict)
async def interact_with_agent(agent_id: str, request: AgentInteractionRequest):
    """Interact with a specific agent"""
    try:
        agent = master_intelligence.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        response = await agent.process_message(
            request.message,
            sender_id="user",
            context=request.context
        )
        
        return {
            "success": True,
            "response": response,
            "agent_name": agent.profile.name,
            "agent_role": agent.profile.role,
            "agent_state": agent.current_state,
            "timestamp": agent.current_state["last_interaction"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agents/interact/multi", response_model=Dict)
async def multi_agent_interaction(request: AgentInteractionRequest):
    """Get responses from multiple agents (council mode)"""
    try:
        result = await master_intelligence.get_council_response(request.message, "user")
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agents/interact/agent-to-agent", response_model=Dict)
async def agent_to_agent_interaction(request: AgentToAgentInteractionRequest):
    """Facilitate interaction between two agents"""
    try:
        result = await master_intelligence.facilitate_agent_interaction(
            request.sender_id,
            request.recipient_id,
            request.message
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Template Routes
@router.get("/templates", response_model=Dict)
async def get_agent_templates():
    """Get all available agent templates"""
    try:
        templates = master_intelligence.get_agent_templates()
        return {
            "success": True,
            "templates": templates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/templates/{template_name}/create", response_model=Dict)
async def create_agent_from_template(template_name: str, request: TemplateCreateRequest):
    """Create an agent from a template"""
    try:
        result = await master_intelligence.create_agent_from_template(
            template_name,
            request.name,
            request.role
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Configuration Routes
@router.get("/config/traits", response_model=Dict)
async def get_personality_traits():
    """Get available personality traits"""
    try:
        return {
            "success": True,
            "traits": [{"value": trait.value, "name": trait.value.replace("_", " ").title()} for trait in PersonalityTrait]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/skills", response_model=Dict)
async def get_skill_categories():
    """Get available skill categories"""
    try:
        return {
            "success": True,
            "skills": [{"value": skill.value, "name": skill.value.replace("_", " ").title()} for skill in SkillCategory]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/communication-styles", response_model=Dict)
async def get_communication_styles():
    """Get available communication styles"""
    try:
        return {
            "success": True,
            "styles": [{"value": style.value, "name": style.value.replace("_", " ").title()} for style in CommunicationStyle]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/decision-styles", response_model=Dict)
async def get_decision_making_styles():
    """Get available decision making styles"""
    try:
        return {
            "success": True,
            "styles": [{"value": style.value, "name": style.value.replace("_", " ").title()} for style in DecisionMakingStyle]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/work-styles", response_model=Dict)
async def get_work_styles():
    """Get available work styles"""
    try:
        return {
            "success": True,
            "styles": [{"value": style.value, "name": style.value.replace("_", " ").title()} for style in WorkStyle]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/autonomy-levels", response_model=Dict)
async def get_autonomy_levels():
    """Get available autonomy levels"""
    try:
        return {
            "success": True,
            "levels": [{"value": level.value, "name": level.value.replace("_", " ").title()} for level in AutonomyLevel]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# System Routes
@router.get("/system/status", response_model=Dict)
async def get_system_status():
    """Get system status"""
    try:
        status = master_intelligence.get_council_status()
        return {
            "success": True,
            "status": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/system/autonomous-run", response_model=Dict)
async def trigger_autonomous_behaviors(background_tasks: BackgroundTasks):
    """Trigger autonomous behaviors for all agents"""
    try:
        background_tasks.add_task(master_intelligence.agent_system.run_autonomous_behaviors)
        return {
            "success": True,
            "message": "Autonomous behaviors triggered"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Analytics Routes
@router.get("/analytics/interactions", response_model=Dict)
async def get_interaction_analytics():
    """Get interaction analytics"""
    try:
        agents = master_intelligence.get_all_agents()
        
        total_interactions = sum(agent.current_state["interaction_count"] for agent in agents.values())
        
        agent_stats = []
        for agent in agents.values():
            agent_stats.append({
                "agent_id": agent.profile.agent_id,
                "name": agent.profile.name,
                "role": agent.profile.role,
                "interaction_count": agent.current_state["interaction_count"],
                "energy": agent.current_state["energy"],
                "confidence": agent.current_state["confidence"],
                "relationships": len(agent.relationships),
                "memories": {
                    "short_term": len(agent.memory.short_term_memory),
                    "long_term": len(agent.memory.long_term_memory),
                    "episodic": len(agent.memory.episodic_memory)
                }
            })
        
        return {
            "success": True,
            "analytics": {
                "total_interactions": total_interactions,
                "total_agents": len(agents),
                "agent_stats": agent_stats
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}/memories", response_model=Dict)
async def get_agent_memories(agent_id: str, memory_type: str = "all"):
    """Get agent memories"""
    try:
        agent = master_intelligence.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        memories = agent.memory.get_relevant_memories("", memory_type)
        
        return {
            "success": True,
            "memories": memories,
            "counts": {
                "short_term": len(agent.memory.short_term_memory),
                "long_term": len(agent.memory.long_term_memory),
                "episodic": len(agent.memory.episodic_memory)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}/relationships", response_model=Dict)
async def get_agent_relationships(agent_id: str):
    """Get agent relationships"""
    try:
        agent = master_intelligence.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        relationships = []
        for other_agent_id, strength in agent.relationships.items():
            other_agent = master_intelligence.get_agent(other_agent_id)
            if other_agent:
                relationships.append({
                    "agent_id": other_agent_id,
                    "name": other_agent.profile.name,
                    "role": other_agent.profile.role,
                    "relationship_strength": strength
                })
        
        return {
            "success": True,
            "relationships": relationships
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 