"""
Intelligence Empire Backend - FastAPI Application
Your Personal AI Council API - Clean & Unified
"""

import os
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.core.intelligence.master_intelligence import MasterIntelligence
from app.services.ollama_service import ollama_service
from app.services.conversation_service import ConversationService
from app.models.database import get_db, AsyncSession
from app.core.database_init import init_database
from app.api.routes import messages

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Intelligence Empire API",
    description="Your Personal AI Council - Unified Chat API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
master_intelligence = MasterIntelligence()
conversation_service = ConversationService()

# Include unified API routes
app.include_router(messages.router, prefix="/api/v1", tags=["messages"])

# Import and include living agent routes for Phase 2
try:
    from app.api.routes.living_agent_routes import router as living_agent_router
    app.include_router(living_agent_router, prefix="/api/v2", tags=["living-agents"])
except ImportError:
    print("⚠️  Living agent routes not available yet - Phase 2 features disabled")

# Import and include strategic routes for Phase 3
try:
    from app.api.routes.strategic_routes import router as strategic_router
    app.include_router(strategic_router, prefix="/api/v3", tags=["strategic-intelligence"])
    print("✅ Phase 3 Strategic Intelligence routes loaded")
except ImportError as e:
    print(f"⚠️  Strategic routes not available yet - Phase 3 features disabled: {e}")

# Import and include enhanced routes for maximum autonomy
try:
    from app.api.routes.enhanced_routes import router as enhanced_router
    app.include_router(enhanced_router, prefix="/api/enhanced", tags=["enhanced-autonomy"])
    print("✅ Enhanced Autonomy routes loaded - Full backend cooperation enabled")
except ImportError as e:
    print(f"⚠️  Enhanced routes not available yet - Enhanced features disabled: {e}")

# Pydantic models
class AIQueryRequest(BaseModel):
    message: str
    requested_members: Optional[List[str]] = None
    interaction_mode: Optional[str] = 'auto_mode'  # Default to auto mode
    enabled_abilities: Optional[List[str]] = []
    channel_id: str
    channel_type: str
    user_message_id: Optional[str] = None

class AIQueryResponse(BaseModel):
    success: bool
    response: Optional[Dict] = None
    error: Optional[str] = None

# Core API Endpoints

@app.get("/")
async def root():
    """Root endpoint - Intelligence Empire status"""
    return {
        "service": "Intelligence Empire API",
        "status": "active",
        "version": "2.0.0",
        "message": "Your Personal AI Council - Clean & Unified"
    }

@app.get("/api/v1/status")
async def get_status():
    """Get system status"""
    return {
        "status": "active",
        "master_intelligence": "online",
        "council_members": len(master_intelligence.council.get_all_members()),
        "api_version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/council/members")
async def get_council_members():
    """Get council members information"""
    members = master_intelligence.get_council_status()
    return {
        "success": True,
        "members": members,
        "total_members": len(members),
        "active_members": len([m for m in members.values() if m.get('status') == 'active'])
    }

@app.post("/api/v1/council/query", response_model=AIQueryResponse)
async def query_council(request: AIQueryRequest, db: AsyncSession = Depends(get_db)):
    """
    Trigger AI response for a user message - NEW AGENT MESSAGE FORMAT
    Returns individual agent messages that look like user messages
    """
    try:
        # Get conversation context
        recent_context = await conversation_service.get_recent_context(
            db, request.channel_id, request.channel_type, hours=24, max_messages=5
        )
        
        # Create AI query
        from app.core.intelligence.master_intelligence import IntelligenceQuery
        query = IntelligenceQuery(
            user_input=request.message,
            requested_members=request.requested_members,
            context={"recent_messages": recent_context},
            interaction_mode=request.interaction_mode,
            enabled_abilities=request.enabled_abilities or [],
            channel_id=request.channel_id,
            channel_type=request.channel_type
        )
        
        # NEW: Generate agent messages instead of council response
        from app.core.intelligence.master_intelligence import IndividualIntelligence
        individual_intelligence = IndividualIntelligence()
        
        # For DMs, use individual intelligence
        if request.channel_type == 'dm':
            # Map DM channel ID to council member key
            dm_to_member_key_map = {
                'dm-sarah': 'sarah',
                'dm-sarah-chen': 'sarah',  # Handle both formats
                'dm-marcus': 'marcus', 
                'dm-marcus-rodriguez': 'marcus',  # Handle both formats
                'dm-elena': 'elena',
                'dm-elena-vasquez': 'elena',  # Handle both formats
                'dm-david': 'david',
                'dm-david-kim': 'david'  # Handle both formats
            }
            member_key = dm_to_member_key_map.get(request.channel_id, 'sarah')  # Default fallback
            agent_messages = await individual_intelligence.get_individual_response(member_key, query)
        else:
            # For channels, we still need to implement multi-agent workflows
            # For now, use single agent based on first requested member or default to Sarah
            if request.requested_members:
                member_key = request.requested_members[0]  # Use member_key instead of member_name
            else:
                member_key = "sarah"  # Default to product strategy lead
            agent_messages = await individual_intelligence.get_individual_response(member_key, query)
        
        # Save agent messages to database as separate messages
        conversation = await conversation_service.get_or_create_conversation(
            db, request.channel_id, request.channel_type
        )
        
        saved_messages = []
        for agent_msg in agent_messages:
            # Save each agent message as a separate database message
            saved_msg = await conversation_service.save_message(
                db, conversation, agent_msg.content, 
                message_type=agent_msg.type,
                agent_name=agent_msg.agent_name,
                agent_role=agent_msg.agent_role,
                workflow_step=agent_msg.workflow_step
            )
            saved_messages.append(saved_msg)
        
        return AIQueryResponse(
            success=True,
            response={
                "type": "agent_messages",
                "messages": [msg.to_dict() for msg in agent_messages],
                "channel_id": request.channel_id,
                "channel_type": request.channel_type,
                "interaction_mode": request.interaction_mode
            }
        )
        
    except Exception as e:
        print(f"❌ AI Query Error: {str(e)}")
        return AIQueryResponse(success=False, error=f"AI processing failed: {str(e)}")

@app.get("/api/v1/conversations/search")
async def search_conversations(
    q: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Global message search"""
    try:
        results = await conversation_service.search_conversations(
            db, q, limit=limit
        )
        
        return {
            "success": True,
            "query": q,
            "results": results,
            "total_results": len(results)
        }
        
    except Exception as e:
        print(f"❌ Search Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    ollama_available = await ollama_service.is_available()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "master_intelligence": "online",
            "database": "connected",
            "ollama": "available" if ollama_available else "unavailable"
        }
    }

@app.get("/api/v1/ollama/status")
async def get_ollama_status():
    """Get Ollama service status"""
    health_status = await ollama_service.health_check()
    return health_status

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("🚀 Intelligence Empire starting up...")
    await init_database()
    print("✅ Database initialized")
    print("✅ Intelligence Empire ready!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 