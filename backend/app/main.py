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

from app.core.intelligence.master_intelligence import MasterIntelligence, IntelligenceQuery
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

# Pydantic models
class AIQueryRequest(BaseModel):
    message: str
    requested_members: Optional[List[str]] = None
    interaction_mode: Optional[str] = 'casual'
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
    Trigger AI response for a user message (simplified & clean)
    Used by frontend after message is already saved via /messages API
    """
    try:
        # Get conversation context
        recent_context = await conversation_service.get_recent_context(
            db, request.channel_id, request.channel_type, hours=24, max_messages=5
        )
        
        # Create AI query
        query = IntelligenceQuery(
            user_input=request.message,
            requested_members=request.requested_members,
            context={"recent_messages": recent_context},
            interaction_mode=request.interaction_mode,
            channel_id=request.channel_id,
            channel_type=request.channel_type
        )
        
        # Process through AI
        response = await master_intelligence.process_query(query)
        
        # Save AI response to database
        if request.user_message_id:
            conversation = await conversation_service.get_or_create_conversation(
                db, request.channel_id, request.channel_type
            )
            
            await conversation_service.save_council_response(
                db, conversation, {
                    "council_responses": [
                        {
                            "member_name": cr.member_name,
                            "role": cr.role.value,
                            "message": cr.message,
                            "confidence_level": cr.confidence_level,
                            "reasoning": cr.reasoning,
                            "suggested_actions": cr.suggested_actions,
                            "timestamp": cr.timestamp
                        }
                        for cr in response.council_responses
                    ],
                    "synthesis": response.synthesis,
                    "recommended_actions": response.recommended_actions,
                    "confidence_score": response.confidence_score,
                    "processing_time": response.processing_time,
                    "response_type": response.response_type
                }, None, response.synthesis
            )
        
        return AIQueryResponse(
            success=True,
            response={
                "council_responses": [
                    {
                        "member_name": cr.member_name,
                        "role": cr.role.value,
                        "message": cr.message,
                        "confidence_level": cr.confidence_level,
                        "reasoning": cr.reasoning,
                        "suggested_actions": cr.suggested_actions,
                        "timestamp": cr.timestamp
                    }
                    for cr in response.council_responses
                ],
                "synthesis": response.synthesis,
                "recommended_actions": response.recommended_actions,
                "confidence_score": response.confidence_score,
                "processing_time": response.processing_time,
                "response_type": response.response_type,
                "channel_id": request.channel_id,
                "channel_type": request.channel_type
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
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "master_intelligence": "online",
            "database": "connected",
            "ollama": "available" if ollama_service.is_available() else "unavailable"
        }
    }

@app.get("/api/v1/ollama/status")
async def get_ollama_status():
    """Get Ollama service status"""
    return {"available": ollama_service.is_available()}

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