"""
Intelligence Empire Backend - FastAPI Application
Your Personal AI Council API
"""

import os
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.core.intelligence.master_intelligence import MasterIntelligence, IntelligenceQuery
from app.core.agents.council_members import CouncilRole
from app.services.ollama_service import ollama_service

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

# Initialize Master Intelligence
master_intelligence = MasterIntelligence()

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
    channel_type: Optional[str] = 'general'  # 'general', 'dm', 'team'
    channel_id: Optional[str] = None
    direct_member: Optional[str] = None  # For DM conversations

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
async def query_council(request: dict):
    """Send a query to your AI Council"""
    try:
        # Create intelligence query with channel context
        query = IntelligenceQuery(
            user_input=request.get("message", ""),
            requested_members=request.get("requested_members"),
            context=request.get("context", {}),
            interaction_mode=request.get("interaction_mode", "casual_chat"),
            channel_type=request.get("channel_type", "general"),
            channel_id=request.get("channel_id"),
            direct_member=request.get("direct_member")
        )
        
        print(f"DEBUG: Processing query - channel_type: {query.channel_type}, direct_member: {query.direct_member}")
        
        # Process query through Master Intelligence
        response = await master_intelligence.process_query(query)
        
        # Handle different response types
        if hasattr(response, 'is_direct_response') and response.is_direct_response:
            # Individual member response
            response_data = {
                "query": request.get("message", ""),
                "council_responses": [{
                    "member_name": response.member_name,
                    "role": response.role,
                    "message": response.message,
                    "confidence_level": response.confidence_level,
                    "reasoning": response.reasoning,
                    "suggested_actions": response.suggested_actions,
                    "timestamp": response.timestamp
                }],
                "synthesis": response.message,  # For individual responses, synthesis is the message itself
                "recommended_actions": response.suggested_actions,
                "confidence_score": response.confidence_level,
                "processing_time": response.conversation_context.get("processing_time", 0),
                "timestamp": response.timestamp,
                "response_type": "individual",
                "direct_member": response.member_name
            }
        else:
            # Council response
            response_data = {
                "query": request.get("message", ""),
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
                "response_type": "council"
            }
        
        return CouncilQueryResponse(success=True, response=response_data)
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return CouncilQueryResponse(
            success=False,
            error=f"Error processing council query: {str(e)}"
        )

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
    """WebSocket endpoint for real-time council communication"""
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
                # Process council query
                query = IntelligenceQuery(
                    user_input=data.get("message", ""),
                    requested_members=data.get("requested_members"),
                    context=data.get("context", {})
                )
                
                # Send processing status
                await websocket.send_json({
                    "type": "processing",
                    "message": "Your council is analyzing your query...",
                    "timestamp": datetime.now().isoformat()
                })
                
                # Process query
                response = await master_intelligence.process_query(query)
                
                # Send response
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
                        "timestamp": response.timestamp
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
    print("✅ Intelligence Empire API is ready to serve!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 