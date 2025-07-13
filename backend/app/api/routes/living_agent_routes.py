"""
Living Agent API Routes - RESTful endpoints for Living Agent System
Provides complete CRUD operations and interaction capabilities.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import logging

from app.models.database import get_db
from app.services.living_agent_service import LivingAgentService

router = APIRouter(prefix="/living", tags=["living-agents"])
logger = logging.getLogger(__name__)

# Initialize service
living_service = LivingAgentService()

# ===== REQUEST/RESPONSE MODELS =====

class CreateAgentRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Agent name")
    role: str = Field(..., min_length=1, max_length=100, description="Agent role/specialization")
    personality_traits: Dict[str, Any] = Field(..., description="Core personality configuration")
    user_id: str = Field(..., description="Owner user ID")

class AgentInteractionRequest(BaseModel):
    user_input: str = Field(..., min_length=1, description="User message to the agent")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Interaction context")

class CreateRelationshipRequest(BaseModel):
    entity_id: str = Field(..., description="Target entity ID (user or agent)")
    entity_type: str = Field(..., pattern="^(user|agent)$", description="Entity type")
    entity_name: Optional[str] = Field(default=None, description="Friendly name")

class AgentResponse(BaseModel):
    success: bool
    agent_id: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    message: str

class InteractionResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    agent_state: Optional[Dict] = None
    processing_time: Optional[float] = None
    interaction_count: Optional[int] = None
    message: Optional[str] = None

# ===== AGENT LIFECYCLE ENDPOINTS =====

@router.post("/agents", response_model=AgentResponse)
async def create_agent(
    request: CreateAgentRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new living agent"""
    try:
        result = await living_service.initialize_agent(
            db=db,
            user_id=request.user_id,
            name=request.name,
            role=request.role,
            personality_traits=request.personality_traits
        )
        
        if result["success"]:
            return AgentResponse(
                success=True,
                agent_id=result["agent_id"],
                name=result["name"],
                role=result["role"],
                message=result["message"]
            )
        else:
            raise HTTPException(status_code=400, detail=result["message"])
        
    except Exception as e:
        logger.error(f"❌ Failed to create agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")

@router.get("/agents/{agent_id}")
async def get_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get agent details by ID"""
    try:
        agent = await living_service.get_agent(db, agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
        
        return {
            "success": True,
            "agent": agent
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve agent: {str(e)}")

@router.get("/users/{user_id}/agents")
async def get_user_agents(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all agents for a specific user"""
    try:
        agents = await living_service.get_user_agents(db, user_id)
        
        return {
            "success": True,
            "user_id": user_id,
            "agents": agents,
            "total_count": len(agents)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get agents for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user agents: {str(e)}")

@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete an agent and all related data"""
    try:
        result = await living_service.delete_agent(db, agent_id)
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete agent: {str(e)}")

# ===== INTERACTION ENDPOINTS =====

@router.post("/agents/{agent_id}/interact", response_model=InteractionResponse)
async def interact_with_agent(
    agent_id: str,
    request: AgentInteractionRequest,
    user_id: str = Query(..., description="User ID for the interaction"),
    db: AsyncSession = Depends(get_db)
):
    """Process an interaction with a living agent"""
    try:
        logger.info(f"🔍 ROUTE: Received interaction request for agent {agent_id}")
        logger.info(f"🔍 ROUTE: User ID: {user_id}, Input: {request.user_input}")
        
        result = await living_service.interact_with_agent(
            db=db,
            agent_id=agent_id,
            user_id=user_id,
            user_input=request.user_input,
            context=request.context
        )
        
        logger.info(f"🔍 ROUTE: Service returned: {result}")
        
        if result["success"]:
            return InteractionResponse(
                success=True,
                response=result["response"],
                agent_state=result["agent_state"],
                processing_time=result["processing_time"],
                interaction_count=result["interaction_count"]
            )
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to process interaction with agent {agent_id}: {str(e)}")
        import traceback
        logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to process interaction: {str(e)}")

# ===== RELATIONSHIP ENDPOINTS =====

@router.post("/agents/{agent_id}/relationships")
async def create_relationship(
    agent_id: str,
    request: CreateRelationshipRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a relationship between agent and user/other agent"""
    try:
        result = await living_service.create_relationship(
            db=db,
            agent_id=agent_id,
            entity_id=request.entity_id,
            entity_type=request.entity_type,
            entity_name=request.entity_name
        )
        
        if result["success"]:
            return {
                "success": True,
                "relationship_id": result["relationship_id"],
                "message": result["message"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create relationship for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create relationship: {str(e)}")

@router.get("/agents/{agent_id}/relationships")
async def get_agent_relationships(
    agent_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all relationships for an agent"""
    try:
        relationships = await living_service.get_agent_relationships(db, agent_id)
        
        return {
            "success": True,
            "agent_id": agent_id,
            "relationships": relationships,
            "total_count": len(relationships)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get relationships for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve relationships: {str(e)}")

# ===== MEMORY ENDPOINTS =====

@router.get("/agents/{agent_id}/memories")
async def get_agent_memories(
    agent_id: str,
    memory_type: Optional[str] = Query(default=None, description="Filter by memory type"),
    limit: int = Query(default=50, ge=1, le=200, description="Maximum number of memories"),
    db: AsyncSession = Depends(get_db)
):
    """Get agent memories with optional filtering"""
    try:
        memories = await living_service.get_agent_memories(
            db=db,
            agent_id=agent_id,
            memory_type=memory_type,
            limit=limit
        )
        
        return {
            "success": True,
            "agent_id": agent_id,
            "memories": memories,
            "total_count": len(memories),
            "filters": {
                "memory_type": memory_type,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get memories for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve memories: {str(e)}")

@router.get("/agents/{agent_id}/memories/search")
async def search_agent_memories(
    agent_id: str,
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(default=20, ge=1, le=100, description="Maximum number of results"),
    db: AsyncSession = Depends(get_db)
):
    """Search agent memories by content"""
    try:
        memories = await living_service.search_agent_memories(
            db=db,
            agent_id=agent_id,
            search_term=q,
            limit=limit
        )
        
        return {
            "success": True,
            "agent_id": agent_id,
            "search_query": q,
            "memories": memories,
            "total_count": len(memories)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to search memories for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search memories: {str(e)}")

# ===== GROWTH & ANALYTICS ENDPOINTS =====

@router.get("/agents/{agent_id}/milestones")
async def get_agent_milestones(
    agent_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get agent growth milestones"""
    try:
        milestones = await living_service.get_agent_milestones(db, agent_id)
        
        return {
            "success": True,
            "agent_id": agent_id,
            "milestones": milestones,
            "total_count": len(milestones)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get milestones for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve milestones: {str(e)}")

@router.get("/agents/{agent_id}/analytics")
async def get_agent_analytics(
    agent_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive agent analytics"""
    try:
        analytics = await living_service.get_agent_analytics(db, agent_id)
        
        if not analytics:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
        
        return {
            "success": True,
            "analytics": analytics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get analytics for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analytics: {str(e)}")

# ===== SYSTEM ENDPOINTS =====

@router.get("/status")
async def get_living_agent_status():
    """Get Living Agent system status"""
    try:
        return {
            "success": True,
            "system": "Living Agent System",
            "status": "operational",
            "capabilities": [
                "agent_creation",
                "personality_evolution", 
                "memory_management",
                "relationship_tracking",
                "interaction_processing",
                "growth_analytics"
            ],
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get system status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get system status: {str(e)}")

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check with database connectivity"""
    try:
        # Test database connection
        from app.models.living_agents import LivingAgent
        from sqlalchemy import select
        
        result = await db.execute(select(LivingAgent).limit(1))
        
        return {
            "success": True,
            "status": "healthy",
            "database": "connected",
            "timestamp": "2025-06-20T12:45:00Z"
        }
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

# ===== BATCH OPERATIONS =====

@router.get("/users/{user_id}/analytics")
async def get_user_agent_analytics(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get analytics for all user agents"""
    try:
        agents = await living_service.get_user_agents(db, user_id)
        
        analytics_list = []
        for agent in agents:
            agent_analytics = await living_service.get_agent_analytics(db, agent["agent_id"])
            if agent_analytics:
                analytics_list.append(agent_analytics)
        
        # Aggregate stats
        total_interactions = sum(a.get("interaction_count", 0) for a in analytics_list)
        total_relationships = sum(a.get("relationship_stats", {}).get("total_relationships", 0) for a in analytics_list)
        total_memories = sum(a.get("memory_stats", {}).get("total_memories", 0) for a in analytics_list)
        
        return {
            "success": True,
            "user_id": user_id,
            "agent_count": len(agents),
            "individual_analytics": analytics_list,
            "aggregate_stats": {
                "total_interactions": total_interactions,
                "total_relationships": total_relationships,
                "total_memories": total_memories,
                "average_interactions_per_agent": total_interactions / len(agents) if agents else 0
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get user analytics for {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user analytics: {str(e)}")

@router.get("/agents/search")
async def search_agents(
    q: str = Query(..., min_length=1, description="Search query"),
    user_id: Optional[str] = Query(default=None, description="Filter by user ID"),
    limit: int = Query(default=20, ge=1, le=100, description="Maximum number of results"),
    db: AsyncSession = Depends(get_db)
):
    """Search agents by name or role"""
    try:
        # This would need to be implemented in the service layer
        # For now, return a placeholder
        return {
            "success": True,
            "search_query": q,
            "user_filter": user_id,
            "agents": [],
            "total_count": 0,
            "message": "Search functionality to be implemented"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to search agents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search agents: {str(e)}")