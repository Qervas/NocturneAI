"""
Agent Network API Routes - Active Mode
Provides endpoints for agent conversation monitoring and proactive participation
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime

from ...core.agents.agent_network import agent_network, AgentMode, ProactiveResponse

router = APIRouter(prefix="/network", tags=["agent-network"])

class MessageUpdate(BaseModel):
    channel_id: str
    channel_type: str  # "channel" or "dm"
    message: Dict
    sender: str
    content: str
    timestamp: str

class AgentModeUpdate(BaseModel):
    agent_name: str
    mode: str  # "passive", "active", "autonomous"

class ProactiveResponseModel(BaseModel):
    agent_name: str
    agent_role: str
    response_type: str
    content: str
    relevance_score: int
    reasoning: str
    triggered_by: List[str]
    timestamp: str

@router.post("/conversation/update")
async def update_conversation(message_update: MessageUpdate):
    """Update conversation context and check for proactive responses"""
    try:
        # Format message for processing
        message = {
            'sender': message_update.sender,
            'content': message_update.content,
            'timestamp': message_update.timestamp,
            'id': f"msg_{datetime.now().timestamp()}"
        }
        
        # Update conversation in network monitor
        proactive_responses = await agent_network.update_conversation(
            message_update.channel_id,
            message_update.channel_type,
            message
        )
        
        # Ensure we have a list
        if proactive_responses is None:
            proactive_responses = []
        
        # Convert responses to API format
        response_data = []
        for response in proactive_responses:
            response_data.append({
                'agent_name': response.agent_name,
                'agent_role': response.agent_role,
                'response_type': response.response_type,
                'content': response.content,
                'relevance_score': response.relevance_score.value,
                'reasoning': response.reasoning,
                'triggered_by': response.triggered_by,
                'timestamp': response.timestamp.isoformat()
            })
        
        return {
            'success': True,
            'proactive_responses': response_data,
            'conversation_updated': True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update conversation: {str(e)}")

@router.get("/conversations/{channel_id}/responses")
async def get_proactive_responses(channel_id: str):
    """Get pending proactive responses for a channel"""
    try:
        responses = agent_network.get_pending_responses(channel_id)
        
        response_data = []
        for response in responses:
            response_data.append({
                'agent_name': response.agent_name,
                'agent_role': response.agent_role,
                'response_type': response.response_type,
                'content': response.content,
                'relevance_score': response.relevance_score.value,
                'reasoning': response.reasoning,
                'triggered_by': response.triggered_by,
                'timestamp': response.timestamp.isoformat()
            })
        
        return {
            'success': True,
            'responses': response_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get responses: {str(e)}")

@router.post("/agents/{agent_name}/mode")
async def set_agent_mode(agent_name: str, mode_update: AgentModeUpdate):
    """Set agent participation mode (passive/active/autonomous)"""
    try:
        # Validate mode
        valid_modes = ['passive', 'active', 'autonomous']
        if mode_update.mode not in valid_modes:
            raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {valid_modes}")
        
        # Convert string to enum
        mode_enum = AgentMode(mode_update.mode)
        
        # Update agent mode
        agent_network.set_agent_mode(agent_name, mode_enum)
        
        return {
            'success': True,
            'agent_name': agent_name,
            'new_mode': mode_update.mode,
            'message': f'{agent_name} mode updated to {mode_update.mode}'
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid agent name: {agent_name}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update agent mode: {str(e)}")

@router.get("/agents/modes")
async def get_agent_modes():
    """Get current modes for all agents"""
    try:
        status = agent_network.get_network_status()
        
        return {
            'success': True,
            'agent_modes': status['agent_modes'],
            'monitoring_enabled': status['monitoring_enabled'],
            'active_conversations': status['active_conversations'],
            'recent_participations': status['recent_participations']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get agent modes: {str(e)}")

@router.get("/status")
async def get_network_status():
    """Get agent network monitoring status"""
    try:
        status = agent_network.get_network_status()
        
        return {
            'success': True,
            'network_status': status,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get network status: {str(e)}")

@router.post("/monitoring/toggle")
async def toggle_monitoring(enabled: bool = True):
    """Enable or disable conversation monitoring"""
    try:
        agent_network.monitoring_enabled = enabled
        
        return {
            'success': True,
            'monitoring_enabled': enabled,
            'message': f"Conversation monitoring {'enabled' if enabled else 'disabled'}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle monitoring: {str(e)}")

@router.delete("/history")
async def clear_participation_history(older_than_hours: int = 24):
    """Clear old participation history"""
    try:
        agent_network.clear_participation_history(older_than_hours)
        
        return {
            'success': True,
            'message': f"Cleared participation history older than {older_than_hours} hours"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}") 