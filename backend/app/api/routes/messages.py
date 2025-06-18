from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, Any
import logging

from app.models.database import get_db
from app.models.conversation import Message

router = APIRouter()
logger = logging.getLogger(__name__)

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Delete a message by marking it as deleted
    """
    try:
        # Find the message using async session
        result = await db.execute(select(Message).filter(Message.id == message_id))
        message = result.scalar_one_or_none()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Mark as deleted instead of actually deleting
        message.content = "Message deleted"
        message.is_deleted = True
        
        await db.commit()
        
        logger.info(f"Message {message_id} marked as deleted")
        
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete message: {str(e)}"
        )

@router.patch("/messages/{message_id}")
async def update_message(
    message_id: str,
    content: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Update a message's content (for future edit functionality)
    """
    try:
        # Find the message using async session
        result = await db.execute(select(Message).filter(Message.id == message_id))
        message = result.scalar_one_or_none()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Update content
        message.content = content
        
        await db.commit()
        
        logger.info(f"Message {message_id} updated")
        
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update message: {str(e)}"
        ) 