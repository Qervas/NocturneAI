"""
Intelligence Empire Backend - FastAPI Application
Your Personal AI Council API
Enhanced with Message Persistence & History
"""

import os
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.core.intelligence.master_intelligence import MasterIntelligence, IntelligenceQuery
from app.core.agents.council_members import CouncilRole
from app.services.ollama_service import ollama_service
from app.services.conversation_service import ConversationService
from app.models.database import get_db, AsyncSession, AsyncSessionLocal
from app.core.database_init import init_database
from app.api.routes import messages

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Intelligence Empire API",
    description="Your Personal AI Council and Intelligence Empire Backend",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add CORS middleware for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Master Intelligence and Conversation Service
master_intelligence = MasterIntelligence()
conversation_service = ConversationService()

# Include API routes
app.include_router(messages.router, prefix="/api/v1", tags=["messages"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        # Temporarily disabled to avoid connection issues
        print(f"Broadcast message: {message}")
        return

manager = ConnectionManager()

# Pydantic models for API
class CouncilQueryRequest(BaseModel):
    message: str
    requested_members: Optional[List[str]] = None
    context: Optional[Dict] = None
    interaction_mode: Optional[str] = 'casual_chat'

class CouncilQueryResponse(BaseModel):
    success: bool
    response: Optional[Dict] = None
    error: Optional[str] = None

class CouncilStatusResponse(BaseModel):
    members: Dict
    total_members: int
    active_members: int

# API Routes

@app.get("/")
async def root():
    """Root endpoint - Intelligence Empire status"""
    return {
        "service": "Intelligence Empire API",
        "status": "active",
        "version": "1.0.0",
        "message": "Your Personal AI Council is ready to serve"
    }

@app.get("/api/v1/status")
async def get_status():
    """Get overall system status"""
    return {
        "status": "active",
        "master_intelligence": "online",
        "council_members": len(master_intelligence.council.get_all_members()),
        "conversation_history": len(master_intelligence.conversation_history),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/council/members", response_model=CouncilStatusResponse)
async def get_council_members():
    """Get information about all council members"""
    members = master_intelligence.get_council_status()
    return CouncilStatusResponse(
        members=members,
        total_members=len(members),
        active_members=len([m for m in members.values() if m['status'] == 'active'])
    )

@app.get("/api/v1/council/members/{member_name}")
async def get_council_member(member_name: str):
    """Get detailed information about a specific council member"""
    member = master_intelligence.council.get_member(member_name)
    if not member:
        raise HTTPException(status_code=404, detail=f"Council member '{member_name}' not found")
    
    return {
        "name": member.name,
        "role": member.role.value,
        "personality_traits": member.personality_traits,
        "status": "active"
    }

@app.post("/api/v1/council/query", response_model=CouncilQueryResponse)
async def query_council(request: dict, db: AsyncSession = Depends(get_db)):
    """Send a query to your AI Council with message persistence"""
    try:
        # Extract channel context from request
        channel_id = request.get("channel_id", "general")
        channel_type = "dm" if channel_id.startswith("dm-") else "channel"
        
        print(f"🔍 API Request: channel_id={channel_id}, channel_type={channel_type}")
        print(f"🔍 Requested members: {request.get('requested_members')}")
        
        # Get or create conversation
        conversation = await conversation_service.get_or_create_conversation(
            db, channel_id, channel_type
        )
        
        # Get recent conversation context for AI
        recent_context = await conversation_service.get_recent_context(
            db, channel_id, channel_type, hours=24, max_messages=5
        )
        
        # Save user message to database
        user_message = await conversation_service.save_user_message(
            db, conversation, request.get("message", ""),
            interaction_mode=request.get("interaction_mode", "casual_chat"),
            metadata=request.get("context", {})
        )
        
        # Build enhanced context including reply information
        enhanced_context = {
            **request.get("context", {}),
            "recent_messages": recent_context,
            "conversation_id": conversation.id
        }
        
        # Add reply context if this is a reply to another message
        if request.get("reply_context"):
            reply_ctx = request.get("reply_context")
            enhanced_context["reply_to"] = reply_ctx
            enhanced_context["is_reply"] = True
            print(f"🔄 REST API processing reply to message from {reply_ctx.get('original_sender')}: {reply_ctx.get('original_content')[:50]}...")
        
        # Create intelligence query with enhanced context
        query = IntelligenceQuery(
            user_input=request.get("message", ""),
            requested_members=request.get("requested_members"),
            context=enhanced_context,
            interaction_mode=request.get("interaction_mode", "casual_chat"),
            channel_id=channel_id,
            channel_type=channel_type
        )
        
        print(f"Processing query in {channel_type} '{channel_id}' with {len(recent_context)} context messages")
        
        # Process query through Master Intelligence
        response = await master_intelligence.process_query(query)
        
        print(f"🔍 Response type: {response.response_type}")
        print(f"🔍 Council responses: {len(response.council_responses)}")
        
        # Save council response to database
        council_message = await conversation_service.save_council_response(
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
                "response_type": response.response_type,
                "requested_members": request.get("requested_members", [])
            }, 
            user_message, 
            response.synthesis
        )
        
        # Commit the transaction
        await db.commit()
        
        print(f"🔍 Response saved to database for {channel_type} '{channel_id}'")
        
        # Convert response to JSON-serializable format with database IDs
        response_data = {
            "query": request.get("message", ""),
            "user_message_id": user_message.id,  # Include user message database ID
            "council_message_id": council_message.id,  # Include council message database ID
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
            "timestamp": response.timestamp,
            "response_type": response.response_type,
            "channel_id": channel_id,
            "channel_type": channel_type
        }
        
        return CouncilQueryResponse(success=True, response=response_data)
        
    except Exception as e:
        print(f"❌ Error in query_council: {str(e)}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        return CouncilQueryResponse(
            success=False,
            error=f"Error processing council query: {str(e)}"
        )

# Message Persistence & History API Endpoints

@app.get("/api/v1/conversations/{channel_type}/{channel_id}/history")
async def get_channel_history(
    channel_type: str,
    channel_id: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get conversation history for a specific channel or DM"""
    try:
        history = await conversation_service.get_conversation_history(
            db, channel_id, channel_type, limit, offset
        )
        
        return {
            "success": True,
            "channel_id": channel_id,
            "channel_type": channel_type,
            "messages": history,
            "total_messages": len(history),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        print(f"❌ Error getting conversation history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving history: {str(e)}")

@app.get("/api/v1/conversations/search")
async def search_conversations(
    q: str,
    channel_id: Optional[str] = None,
    channel_type: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Search through conversation history"""
    try:
        results = await conversation_service.search_conversations(
            db, q, channel_id, channel_type, limit
        )
        
        return {
            "success": True,
            "query": q,
            "results": results,
            "total_results": len(results)
        }
        
    except Exception as e:
        print(f"❌ Error searching conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching: {str(e)}")

@app.get("/api/v1/council/history")
async def get_conversation_history(limit: int = 10):
    """Get recent conversation history"""
    history = master_intelligence.get_conversation_history(limit)
    
    return {
        "history": [
            {
                "query": h.query.user_input,
                "synthesis": h.synthesis,
                "confidence_score": h.confidence_score,
                "timestamp": h.timestamp,
                "council_members": [cr.member_name for cr in h.council_responses]
            }
            for h in history
        ],
        "total_conversations": len(master_intelligence.conversation_history)
    }

# WebSocket endpoint for real-time communication
@app.websocket("/ws/council")
async def websocket_council(websocket: WebSocket):
    """WebSocket endpoint for real-time council communication with message persistence"""
    await manager.connect(websocket)
    
    # Send welcome message
    await websocket.send_json({
        "type": "connection",
        "message": "Connected to Intelligence Empire Council",
        "timestamp": datetime.now().isoformat()
    })
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            if data.get("type") == "query":
                # Extract channel context from WebSocket message
                channel_id = data.get("channel", "general")
                channel_type = "dm" if channel_id.startswith("dm-") else "channel"
                
                print(f"🔍 WebSocket Query: channel_id={channel_id}, channel_type={channel_type}")
                
                # Create database session for message persistence
                async with AsyncSessionLocal() as db:
                    try:
                        # Get or create conversation
                        conversation = await conversation_service.get_or_create_conversation(
                            db, channel_id, channel_type
                        )
                        
                        # Get recent conversation context for AI
                        recent_context = await conversation_service.get_recent_context(
                            db, channel_id, channel_type, hours=24, max_messages=5
                        )
                        
                        # Save user message to database
                        user_message = await conversation_service.save_user_message(
                            db, conversation, data.get("message", ""),
                            interaction_mode=data.get("interaction_mode", "casual_chat"),
                            metadata=data.get("context", {})
                        )
                        
                        # Build enhanced context including reply information
                        enhanced_context = {
                            **data.get("context", {}),
                            "recent_messages": recent_context,
                            "conversation_id": conversation.id
                        }
                        
                        # Add reply context if this is a reply to another message
                        if data.get("reply_context"):
                            reply_ctx = data.get("reply_context")
                            enhanced_context["reply_to"] = reply_ctx
                            enhanced_context["is_reply"] = True
                            print(f"🔄 Processing reply to message from {reply_ctx.get('original_sender')}: {reply_ctx.get('original_content')[:50]}...")
                        
                        # Create intelligence query with enhanced context
                        query = IntelligenceQuery(
                            user_input=data.get("message", ""),
                            requested_members=data.get("requested_members"),
                            context=enhanced_context,
                            interaction_mode=data.get("interaction_mode", "casual_chat"),
                            channel_id=channel_id,
                            channel_type=channel_type
                        )
                        
                        # Send processing status
                        await websocket.send_json({
                            "type": "processing",
                            "message": "Your council is analyzing your query...",
                            "timestamp": datetime.now().isoformat()
                        })
                        
                        # Process query
                        response = await master_intelligence.process_query(query)
                        
                        # Convert response to format for database storage
                        response_data = {
                            "query": data.get("message", ""),
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
                            "requested_members": data.get("requested_members", [])
                        }
                        
                        # Save council response to database
                        council_message = await conversation_service.save_council_response(
                            db, conversation, response_data, user_message, response.synthesis
                        )
                        
                        print(f"✅ WebSocket: Saved message and response to database for {channel_id}")
                        
                        # Send response with database IDs
                        await websocket.send_json({
                            "type": "response",
                            "data": {
                                **response_data,
                                "user_message_id": user_message.id,  # Include user message database ID
                                "council_message_id": council_message.id,  # Include council message database ID
                                "channel_id": channel_id,
                                "channel_type": channel_type,
                                "timestamp": response.timestamp
                            }
                        })
                        
                    except Exception as db_error:
                        print(f"❌ WebSocket database error: {str(db_error)}")
                        await db.rollback()
                        # Still send response even if database save fails
                        query = IntelligenceQuery(
                            user_input=data.get("message", ""),
                            requested_members=data.get("requested_members"),
                            context=data.get("context", {}),
                            interaction_mode=data.get("interaction_mode", "casual_chat"),
                            channel_id=channel_id,
                            channel_type=channel_type
                        )
                        response = await master_intelligence.process_query(query)
                        
                        await websocket.send_json({
                            "type": "response",
                            "data": {
                                "query": data.get("message"),
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
                                "timestamp": response.timestamp,
                                "response_type": response.response_type,
                                "channel_id": channel_id,
                                "channel_type": channel_type
                            }
                        })
            
            elif data.get("type") == "ping":
                # Respond to ping
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error", 
                "message": f"WebSocket error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            })
        except:
            # WebSocket is already closed, ignore send error
            print(f"WebSocket connection closed, couldn't send error: {str(e)}")
        finally:
            manager.disconnect(websocket)

# Health check endpoint
@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    # Check Ollama health
    ollama_health = await ollama_service.health_check()
    
    return {
        "status": "healthy",
        "service": "Intelligence Empire API",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "master_intelligence": "operational",
            "council_members": "active",
            "websocket": "available",
            "ollama": ollama_health
        }
    }

@app.get("/api/v1/ollama/status")
async def get_ollama_status():
    """Get detailed Ollama service status"""
    return await ollama_service.health_check()

@app.get("/api/v1/ollama/models")
async def get_ollama_models():
    """Get list of available Ollama models"""
    models = await ollama_service.list_models()
    return {
        "models": models,
        "configured_model": ollama_service.config.model,
        "host": ollama_service.config.host
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("🚀 Intelligence Empire API starting up...")
    
    # Initialize database
    try:
        await init_database()
        print("💾 Database initialized successfully")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    
    print("🧠 Master Intelligence initialized")
    
    # Check Ollama status
    ollama_health = await ollama_service.health_check()
    if ollama_health["service_available"]:
        print(f"🤖 Ollama service connected: {ollama_health['configured_model']}")
        if ollama_health["model_available"]:
            print(f"   ✅ Model '{ollama_health['configured_model']}' is ready!")
        else:
            print(f"   ⚠️  Model '{ollama_health['configured_model']}' not found")
            if ollama_health.get("available_models"):
                print(f"   📚 Available models: {', '.join(ollama_health['available_models'])}")
    else:
        print("❌ Ollama service not available - falling back to simulated responses")
    
    print("👥 AI Council members ready:")
    council_status = master_intelligence.get_council_status()
    for name, member in council_status.items():
        print(f"   • {member['name']} - {member['role'].replace('_', ' ').title()}")
    
    print("🌐 WebSocket connections ready")
    print("📚 Message persistence system online")
    print("✅ Intelligence Empire API is ready to serve!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 