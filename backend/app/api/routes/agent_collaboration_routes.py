"""
Agent Collaboration API Routes - Step 2 Implementation
Provides endpoints for agent-to-agent communication and collaborative workflows
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime

from ...core.agents.agent_collaboration import agent_collaboration, CollaborationType

router = APIRouter(prefix="/collaboration", tags=["agent-collaboration"])

class CollaborationRequest(BaseModel):
    initiator_agent: str
    collaboration_type: str  # "discussion", "workflow", "brainstorm", "consensus", "peer_review"
    topic: str
    target_agents: Optional[List[str]] = None
    user_context: Optional[Dict] = None

class AgentResponseRequest(BaseModel):
    collaboration_id: str
    responding_agent: str
    response_content: str
    message_type: str = "contribution"
    references: Optional[List[str]] = None

@router.post("/initiate")
async def initiate_collaboration(request: CollaborationRequest):
    """Initiate a new collaboration session between agents"""
    try:
        # Validate collaboration type
        valid_types = ['discussion', 'workflow', 'brainstorm', 'consensus', 'peer_review']
        if request.collaboration_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid collaboration type. Must be one of: {valid_types}")
        
        # Convert string to enum
        collab_type = CollaborationType(request.collaboration_type)
        
        # Initiate collaboration
        session = await agent_collaboration.initiate_collaboration(
            initiator_agent=request.initiator_agent,
            collaboration_type=collab_type,
            topic=request.topic,
            target_agents=request.target_agents,
            user_context=request.user_context
        )
        
        # Return session details with initial messages
        initial_messages = []
        for message in session.messages:
            initial_messages.append({
                'id': message.id,
                'sender_agent': message.sender_agent,
                'sender_role': message.sender_role,
                'target_agent': message.target_agent,
                'content': message.content,
                'message_type': message.message_type,
                'timestamp': message.timestamp.isoformat(),
                'references': message.references
            })
        
        return {
            'success': True,
            'collaboration': {
                'id': session.id,
                'type': session.collaboration_type.value,
                'topic': session.topic,
                'participating_agents': list(session.participating_agents),
                'initiator_agent': session.initiator_agent,
                'status': session.status,
                'created_at': session.created_at.isoformat()
            },
            'initial_messages': initial_messages
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate collaboration: {str(e)}")

@router.post("/respond")
async def agent_respond(request: AgentResponseRequest):
    """Process an agent's response in a collaboration"""
    try:
        response_message = await agent_collaboration.process_agent_response(
            collaboration_id=request.collaboration_id,
            responding_agent=request.responding_agent,
            response_content=request.response_content,
            message_type=request.message_type,
            references=request.references
        )
        
        if not response_message:
            raise HTTPException(status_code=404, detail="Collaboration not found or agent not participating")
        
        # Get updated collaboration status
        collaboration_status = agent_collaboration.get_collaboration_status(request.collaboration_id)
        
        return {
            'success': True,
            'message': {
                'id': response_message.id,
                'sender_agent': response_message.sender_agent,
                'sender_role': response_message.sender_role,
                'target_agent': response_message.target_agent,
                'content': response_message.content,
                'message_type': response_message.message_type,
                'timestamp': response_message.timestamp.isoformat(),
                'references': response_message.references
            },
            'collaboration_status': collaboration_status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process agent response: {str(e)}")

@router.get("/collaborations/{collaboration_id}")
async def get_collaboration(collaboration_id: str):
    """Get details of a specific collaboration session"""
    try:
        status = agent_collaboration.get_collaboration_status(collaboration_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Collaboration not found")
        
        # Get messages if collaboration exists
        if collaboration_id in agent_collaboration.active_collaborations:
            session = agent_collaboration.active_collaborations[collaboration_id]
            messages = []
            for message in session.messages:
                messages.append({
                    'id': message.id,
                    'sender_agent': message.sender_agent,
                    'sender_role': message.sender_role,
                    'target_agent': message.target_agent,
                    'content': message.content,
                    'message_type': message.message_type,
                    'timestamp': message.timestamp.isoformat(),
                    'references': message.references,
                    'metadata': message.metadata
                })
            
            return {
                'success': True,
                'collaboration': status,
                'messages': messages
            }
        else:
            return {
                'success': True,
                'collaboration': status,
                'messages': []
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get collaboration: {str(e)}")

@router.get("/collaborations")
async def get_all_collaborations():
    """Get all active collaborations"""
    try:
        collaborations = agent_collaboration.get_all_active_collaborations()
        
        return {
            'success': True,
            'active_collaborations': collaborations,
            'total_count': len(collaborations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get collaborations: {str(e)}")

@router.post("/collaborations/{collaboration_id}/complete")
async def complete_collaboration(collaboration_id: str):
    """Mark a collaboration as completed"""
    try:
        summary = await agent_collaboration.complete_collaboration(collaboration_id)
        
        if not summary:
            raise HTTPException(status_code=404, detail="Collaboration not found")
        
        return {
            'success': True,
            'summary': summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete collaboration: {str(e)}")

@router.get("/agents/{agent_name}/relationships")
async def get_agent_relationships(agent_name: str):
    """Get collaboration relationships for a specific agent"""
    try:
        if agent_name not in agent_collaboration.agent_relationships:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        relationships = agent_collaboration.agent_relationships[agent_name]
        
        return {
            'success': True,
            'agent': agent_name,
            'relationships': relationships,
            'strongest_collaborators': sorted(
                relationships.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:3]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get agent relationships: {str(e)}")

@router.get("/stats")
async def get_collaboration_stats():
    """Get collaboration system statistics"""
    try:
        active_count = len(agent_collaboration.active_collaborations)
        total_history = len(agent_collaboration.collaboration_history)
        
        # Calculate average collaboration duration
        if agent_collaboration.collaboration_history:
            total_duration = sum(
                (session.last_activity - session.created_at).total_seconds() / 60
                for session in agent_collaboration.collaboration_history
            )
            avg_duration = total_duration / len(agent_collaboration.collaboration_history)
        else:
            avg_duration = 0
        
        # Get collaboration types distribution
        type_distribution = {}
        for session in agent_collaboration.collaboration_history:
            collab_type = session.collaboration_type.value
            type_distribution[collab_type] = type_distribution.get(collab_type, 0) + 1
        
        return {
            'success': True,
            'stats': {
                'active_collaborations': active_count,
                'completed_collaborations': total_history,
                'average_duration_minutes': round(avg_duration, 2),
                'collaboration_type_distribution': type_distribution,
                'total_agents': len(agent_collaboration.agent_relationships)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get collaboration stats: {str(e)}")

class SimulationRequest(BaseModel):
    topic: str = "product strategy discussion"
    collaboration_type: str = "discussion"
    agents: List[str] = ['Sarah Chen', 'Marcus Rodriguez']

@router.post("/test/simulate")
async def simulate_collaboration(request: SimulationRequest):
    """Simulate a collaboration for testing purposes"""
    try:
        # Initiate collaboration
        collab_type = CollaborationType(request.collaboration_type)
        session = await agent_collaboration.initiate_collaboration(
            initiator_agent=request.agents[0],
            collaboration_type=collab_type,
            topic=request.topic,
            target_agents=request.agents[1:] if len(request.agents) > 1 else None
        )
        
        # Simulate a few responses
        simulated_responses = []
        
        if len(request.agents) > 1:
            # First response from second agent
            response1 = await agent_collaboration.process_agent_response(
                collaboration_id=session.id,
                responding_agent=request.agents[1],
                response_content=f"Great topic! I have some thoughts on {request.topic} from my perspective.",
                message_type="contribution"
            )
            if response1:
                simulated_responses.append(response1)
        
        if len(request.agents) > 2:
            # Response from third agent
            response2 = await agent_collaboration.process_agent_response(
                collaboration_id=session.id,
                responding_agent=request.agents[2],
                response_content=f"I'd like to add to what we're discussing about {request.topic}.",
                message_type="contribution"
            )
            if response2:
                simulated_responses.append(response2)
        
        return {
            'success': True,
            'simulation': {
                'collaboration_id': session.id,
                'topic': request.topic,
                'participating_agents': list(session.participating_agents),
                'messages_generated': len(session.messages),
                'simulated_responses': len(simulated_responses)
            },
            'collaboration_status': agent_collaboration.get_collaboration_status(session.id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to simulate collaboration: {str(e)}") 