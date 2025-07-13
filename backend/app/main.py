"""
Intelligence Empire API - Optimized and Streamlined
Single, efficient backend for the AI agent system.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime
from dotenv import load_dotenv

from app.core.intelligence.master_intelligence import MasterIntelligence
from app.core.agents.unified_ai_engine import QueryRequest
from app.services.ollama_service import ollama_service
from app.api.routes.dynamic_agent_routes import router as dynamic_agent_router

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Intelligence Empire API - Optimized",
    description="Streamlined AI Agent System with Unified Engine",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Master Intelligence (now optimized)
master_intelligence = MasterIntelligence()

# Include routers
app.include_router(dynamic_agent_router, prefix="/api/dynamic", tags=["Dynamic Agents"])


# === CORE API MODELS ===

class ChatRequest(BaseModel):
    message: str
    channel_type: str = "general"  # "general" or "dm"
    channel_id: Optional[str] = None
    direct_member: Optional[str] = None  # For DM conversations
    requested_members: Optional[List[str]] = None
    interaction_mode: str = "casual_chat"
    context: Optional[Dict] = None


class ChatResponse(BaseModel):
    success: bool
    response: Optional[Dict] = None
    error: Optional[str] = None


# === MAIN API ENDPOINTS ===

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Intelligence Empire API - Optimized",
        "status": "active",
        "version": "2.0.0",
        "message": "Your streamlined AI Council is ready"
    }


@app.get("/api/v1/status")
async def get_status():
    """Get system status"""
    system_status = master_intelligence.get_council_status()
    return {
        "status": "active",
        "system": "unified_ai_engine",
        "agents": system_status["total_agents"],
        "system_health": system_status["system_health"],
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/v1/council/members")
async def get_council_members():
    """Get all council members"""
    status = master_intelligence.get_council_status()
    agents = master_intelligence.get_all_agents()
    
    # Convert agents to the expected format
    members = {}
    for agent_id, agent in agents.items():
        members[agent_id] = {
            "name": agent.profile.name,
            "role": agent.profile.role,
            "avatar_emoji": agent.profile.avatar_emoji,
            "color_theme": agent.profile.color_theme,
            "is_active": agent.current_state["is_active"]
        }
    
    return {
        "success": True,
        "members": members,
        "total_members": status.get("total_agents", 0)
    }


@app.get("/api/v1/council/members/{member_name}")
async def get_council_member(member_name: str):
    """Get specific council member"""
    agent = master_intelligence.get_agent(member_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{member_name}' not found")
    
    return {
        "success": True,
        "agent": {
            "name": agent.profile.name,
            "role": agent.profile.role,
            "personality": ", ".join([trait.value for trait in agent.profile.primary_traits]),
            "expertise": agent.profile.expertise_areas,
            "state": {
                "mood": agent.current_state.get("mood", "focused"),
                "energy": agent.current_state["energy"],
                "confidence": agent.current_state["confidence"],
                "interaction_count": agent.current_state["interaction_count"]
            },
            "memory_count": len(agent.memory.short_term_memory) + len(agent.memory.long_term_memory),
            "relationships": len(agent.relationships)
        }
    }


@app.post("/api/v1/council/query", response_model=ChatResponse)
async def query_council(request: dict):
    """Main chat endpoint - handles both DM and council conversations"""
    try:
        # Create intelligence query
        query = QueryRequest(
            user_input=request.get("message", ""),
            channel_type=request.get("channel_type", "general"),
            channel_id=request.get("channel_id"),
            direct_member=request.get("direct_member"),
            requested_members=request.get("requested_members"),
            interaction_mode=request.get("interaction_mode", "casual_chat"),
            context=request.get("context", {})
        )
        
        # Process query using optimized engine
        response_data = await master_intelligence.process_query(
            query.user_input,
            user_id="user-1",
            context=query.context
        )
        
        return ChatResponse(success=True, response=response_data)
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return ChatResponse(
            success=False,
            error=f"Error processing query: {str(e)}"
        )


@app.get("/api/v1/council/history")
async def get_conversation_history(limit: int = 10):
    """Get conversation history"""
    history = master_intelligence.get_conversation_history(limit)
    return {
        "success": True,
        "history": history,
        "total_conversations": len(master_intelligence.conversation_history)
    }


# === SIMPLIFIED AGENT ENDPOINTS ===

@app.get("/api/agents/autonomous/status")
async def get_autonomous_status():
    """Get autonomous system status"""
    status = master_intelligence.get_council_status()
    return {
        "success": True,
        "status": {
            "system": "dynamic_agent_system",
            "total_agents": status.get("total_agents", 0),
            "active_agents": status.get("active_agents", 0),
            "autonomous_features": "enabled",
            "system_health": status.get("system_health", "unknown")
        },
        "message": "Autonomous system operational"
    }


@app.get("/api/living/status")
async def get_living_agent_status():
    """Get living agent system status"""
    return {
        "success": True,
        "system": "Unified AI Engine",
        "status": "operational",
        "capabilities": [
            "agent_conversations",
            "memory_management", 
            "relationship_tracking",
            "autonomous_responses",
            "council_coordination"
        ],
        "version": "2.0.0"
    }


# === HEALTH AND MONITORING ===

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    ollama_health = await ollama_service.health_check()
    
    return {
        "status": "healthy",
        "service": "Intelligence Empire API - Optimized",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "unified_ai_engine": "operational",
            "agents": "active",
            "ollama": ollama_health
        }
    }


@app.get("/api/v1/ollama/status")
async def get_ollama_status():
    """Get Ollama service status"""
    return await ollama_service.health_check()


@app.get("/api/v1/ollama/models")
async def get_ollama_models():
    """Get available Ollama models"""
    models = await ollama_service.list_models()
    return {
        "models": models,
        "configured_model": ollama_service.config.model,
        "host": ollama_service.config.host
    }


# === STARTUP EVENT ===

@app.on_event("startup")
async def startup_event():
    """Initialize the system on startup"""
    print("🚀 Intelligence Empire API (Optimized) starting up...")
    
    # Initialize master intelligence (now uses dynamic agent system)
    master_intelligence_status = master_intelligence.get_council_status()
    print("🧠 Dynamic Agent System initialized")
    
    # Test Ollama connection
    try:
        from app.services.ollama_service import ollama_service
        status = await ollama_service.health_check()
        if status["service_available"]:
            print(f"🤖 Ollama service connected: {status['configured_model']}")
            if not status["model_available"]:
                print(f"   ⚠️  Model '{status['configured_model']}' not found")
                if status.get("available_models"):
                    print(f"   📚 Available models: {', '.join(status['available_models'])}")
        else:
            print("❌ Ollama service not available - fallback responses enabled")
    except Exception as e:
        print(f"❌ Ollama service error: {e}")
        print("❌ Ollama service not available - fallback responses enabled")
    
    # Show agent status
    print("👥 Dynamic Agent System ready:")
    print(f"   • Total agents: {master_intelligence_status.get('total_agents', 0)}")
    print(f"   • Active agents: {master_intelligence_status.get('active_agents', 0)}")
    print(f"   • System health: {master_intelligence_status.get('system_health', 'unknown')}")
    
    print("✅ Intelligence Empire API (Optimized) is ready!")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 