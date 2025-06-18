from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging
import uuid
from datetime import datetime

from app.models.database import get_db
from app.models.conversation import Message, Conversation
from app.services.conversation_service import ConversationService

router = APIRouter()
logger = logging.getLogger(__name__)
conversation_service = ConversationService()

# Request/Response Models
class CreateMessageRequest(BaseModel):
    content: str
    message_type: str = "user"  # user, council, system
    interaction_mode: Optional[str] = "casual"
    metadata: Optional[Dict] = None

class MessageResponse(BaseModel):
    success: bool
    message: Optional[Dict] = None
    error: Optional[str] = None

@router.post("/messages/{channel_type}/{channel_id}")
async def create_message(
    channel_type: str,
    channel_id: str,
    request: CreateMessageRequest,
    db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    """
    Create a new message (Chat platform POST /channels/{id}/messages)
    """
    try:
        # Get or create conversation
        conversation = await conversation_service.get_or_create_conversation(
            db, channel_id, channel_type
        )
        
        # Create message
        message_id = str(uuid.uuid4())
        new_message = Message(
            id=message_id,
            conversation_id=conversation.id,
            content=request.content,
            message_type=request.message_type,
            sender="You" if request.message_type == "user" else None,
            interaction_mode=request.interaction_mode,
            message_metadata=request.metadata,
            is_deleted=False,
            created_at=datetime.utcnow()
        )
        
        db.add(new_message)
        await db.commit()
        await db.refresh(new_message)
        
        logger.info(f"✅ Created message {message_id} in {channel_type}:{channel_id}")
        
        return MessageResponse(
            success=True,
            message={
                "id": new_message.id,
                "content": new_message.content,
                "type": new_message.message_type,
                "sender": new_message.sender,
                "timestamp": new_message.created_at.isoformat(),
                "channel_id": channel_id,
                "channel_type": channel_type
            }
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Error creating message: {str(e)}")
        return MessageResponse(success=False, error=f"Failed to create message: {str(e)}")

@router.get("/messages/{message_id}")
async def get_message(
    message_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get a specific message by ID
    """
    try:
        result = await db.execute(select(Message).filter(Message.id == message_id))
        message = result.scalar_one_or_none()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
            
        if message.is_deleted:
            raise HTTPException(status_code=404, detail="Message deleted")
        
        return {
            "success": True,
            "message": {
                "id": message.id,
                "content": message.content,
                "type": message.message_type,
                "sender": message.sender,
                "timestamp": message.created_at.isoformat(),
                "is_deleted": message.is_deleted
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting message {message_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get message: {str(e)}")

@router.patch("/messages/{message_id}")
async def update_message(
    message_id: str,
    content: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Update a message's content (Chat platform PATCH)
    """
    try:
        result = await db.execute(select(Message).filter(Message.id == message_id))
        message = result.scalar_one_or_none()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Update content
        message.content = content
        await db.commit()
        
        logger.info(f"✅ Updated message {message_id}")
        
        return {
            "success": True,
            "message": "Message updated successfully",
            "message_id": message_id,
            "content": content
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating message {message_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update message: {str(e)}")

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Delete a message by marking it as deleted (Chat platform soft delete)
    """
    try:
        result = await db.execute(select(Message).filter(Message.id == message_id))
        message = result.scalar_one_or_none()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Soft delete
        message.content = "Message deleted"
        message.is_deleted = True
        await db.commit()
        
        logger.info(f"✅ Deleted message {message_id}")
        
        return {
            "success": True,
            "message": "Message deleted successfully",
            "message_id": message_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting message {message_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")

@router.get("/channels/{channel_type}/{channel_id}/messages")
async def get_channel_messages(
    channel_type: str,
    channel_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    after: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get messages from a channel (Chat platform GET /channels/{id}/messages)
    """
    try:
        history = await conversation_service.get_conversation_history(
            db, channel_id, channel_type, limit, 0
        )
        
        return {
            "success": True,
            "channel_id": channel_id,
            "channel_type": channel_type,
            "messages": history,
            "total": len(history)
        }
        
    except Exception as e:
        logger.error(f"Error getting channel messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}") 