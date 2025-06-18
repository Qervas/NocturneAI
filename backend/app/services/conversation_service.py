"""
Conversation Service - Handles message persistence and history management
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import desc, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select

from app.models.database import AsyncSession
from app.models.conversation import Conversation, Message, CouncilResponse, IntelligenceSession

class ConversationService:
    """Service class for managing conversations and message persistence"""
    
    def __init__(self):
        pass
    
    async def get_or_create_conversation(
        self, 
        db: AsyncSession, 
        channel_id: str, 
        channel_type: str,
        title: Optional[str] = None
    ) -> Conversation:
        """Get existing conversation or create new one"""
        # Try to find existing conversation
        result = await db.execute(
            select(Conversation).where(
                and_(
                    Conversation.channel_id == channel_id,
                    Conversation.channel_type == channel_type
                )
            )
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            conversation = Conversation(
                channel_id=channel_id,
                channel_type=channel_type,
                title=title or f"{channel_type.title()} - {channel_id}"
            )
            db.add(conversation)
            await db.flush()  # Flush to get ID
        
        return conversation
    
    async def save_user_message(
        self,
        db: AsyncSession,
        conversation: Conversation,
        content: str,
        interaction_mode: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Message:
        """Save a user message to the database"""
        message = Message(
            conversation_id=conversation.id,
            content=content,
            message_type="user",
            interaction_mode=interaction_mode,
            message_metadata=metadata or {}
        )
        
        db.add(message)
        await db.flush()
        return message
    
    async def save_council_response(
        self,
        db: AsyncSession,
        conversation: Conversation,
        council_response_data: Dict,
        user_message: Message,
        synthesis: Optional[str] = None
    ) -> Message:
        """Save a council response with all member responses"""
        
        # Create main council message
        council_message = Message(
            conversation_id=conversation.id,
            content=synthesis or "Council Response",
            message_type="council",
            interaction_mode=user_message.interaction_mode,
            message_metadata={
                "response_type": council_response_data.get("response_type"),
                "confidence_score": council_response_data.get("confidence_score"),
                "processing_time": council_response_data.get("processing_time")
            }
        )
        
        db.add(council_message)
        await db.flush()
        
        # Save individual council member responses
        for member_response in council_response_data.get("council_responses", []):
            council_resp = CouncilResponse(
                message_id=council_message.id,
                member_name=member_response.get("member_name"),
                role=member_response.get("role"),
                response_content=member_response.get("message", ""),
                reasoning=member_response.get("reasoning"),
                suggested_actions=member_response.get("suggested_actions", []),
                confidence_level=member_response.get("confidence_level"),
                confidence_score=self._parse_confidence_score(member_response.get("confidence_level"))
            )
            db.add(council_resp)
        
        # Save intelligence session
        session = IntelligenceSession(
            conversation_id=conversation.id,
            user_query=user_message.content,
            synthesis=synthesis,
            recommended_actions=council_response_data.get("recommended_actions", []),
            response_type=council_response_data.get("response_type", "council"),
            processing_time=council_response_data.get("processing_time"),
            confidence_score=council_response_data.get("confidence_score"),
            interaction_mode=user_message.interaction_mode,
            requested_members=council_response_data.get("requested_members", [])
        )
        db.add(session)
        
        await db.flush()
        return council_message
    
    async def get_conversation_history(
        self,
        db: AsyncSession,
        channel_id: str,
        channel_type: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Get conversation history for a specific channel/DM"""
        
        # Get conversation
        conv_result = await db.execute(
            select(Conversation).where(
                and_(
                    Conversation.channel_id == channel_id,
                    Conversation.channel_type == channel_type
                )
            )
        )
        conversation = conv_result.scalar_one_or_none()
        
        if not conversation:
            return []
        
        # Get messages with council responses
        result = await db.execute(
            select(Message)
            .options(selectinload(Message.council_responses))
            .where(Message.conversation_id == conversation.id)
            .order_by(desc(Message.created_at))
            .limit(limit)
            .offset(offset)
        )
        
        messages = result.scalars().all()
        
        # Convert to response format
        history = []
        for message in reversed(messages):  # Reverse to get chronological order
            msg_data = {
                "id": message.id,
                "type": message.message_type,
                "content": message.content,
                "sender": message.sender,
                "timestamp": message.created_at.isoformat(),
                "interaction_mode": message.interaction_mode,
                "metadata": message.message_metadata or {},
                "is_deleted": message.is_deleted
            }
            
            # Add council responses if available
            if message.council_responses:
                msg_data["council_response"] = {
                    "council_responses": [
                        {
                            "member_name": cr.member_name,
                            "role": cr.role,
                            "message": cr.response_content,
                            "confidence_level": cr.confidence_level,
                            "reasoning": cr.reasoning,
                            "suggested_actions": cr.suggested_actions or [],
                            "timestamp": cr.created_at.isoformat()
                        }
                        for cr in message.council_responses
                    ]
                }
            
            history.append(msg_data)
        
        return history
    
    async def get_recent_context(
        self,
        db: AsyncSession,
        channel_id: str,
        channel_type: str,
        hours: int = 24,
        max_messages: int = 10
    ) -> List[Dict]:
        """Get recent conversation context for AI processing"""
        
        # Get conversation
        conv_result = await db.execute(
            select(Conversation).where(
                and_(
                    Conversation.channel_id == channel_id,
                    Conversation.channel_type == channel_type
                )
            )
        )
        conversation = conv_result.scalar_one_or_none()
        
        if not conversation:
            return []
        
        # Get recent messages
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        result = await db.execute(
            select(Message)
            .options(selectinload(Message.council_responses))
            .where(
                and_(
                    Message.conversation_id == conversation.id,
                    Message.created_at >= cutoff_time
                )
            )
            .order_by(desc(Message.created_at))
            .limit(max_messages)
        )
        
        messages = result.scalars().all()
        
        # Convert to context format
        context = []
        for message in reversed(messages):
            if message.message_type == "user":
                context.append({
                    "role": "user",
                    "content": message.content,
                    "timestamp": message.created_at.isoformat()
                })
            elif message.message_type == "council" and message.council_responses:
                # Summarize council response for context
                member_names = [cr.member_name for cr in message.council_responses]
                context.append({
                    "role": "assistant",
                    "content": f"Council members {', '.join(member_names)} provided strategic insights.",
                    "timestamp": message.created_at.isoformat()
                })
        
        return context
    
    async def search_conversations(
        self,
        db: AsyncSession,
        query: str,
        channel_id: Optional[str] = None,
        channel_type: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict]:
        """Search through conversation history"""
        
        # Build search conditions
        conditions = [Message.content.contains(query)]
        
        if channel_id and channel_type:
            # Add conversation filter
            conv_result = await db.execute(
                select(Conversation.id).where(
                    and_(
                        Conversation.channel_id == channel_id,
                        Conversation.channel_type == channel_type
                    )
                )
            )
            conv_id = conv_result.scalar_one_or_none()
            if conv_id:
                conditions.append(Message.conversation_id == conv_id)
        
        # Execute search
        result = await db.execute(
            select(Message)
            .options(selectinload(Message.conversation))
            .where(and_(*conditions))
            .order_by(desc(Message.created_at))
            .limit(limit)
        )
        
        messages = result.scalars().all()
        
        # Format results with all fields expected by frontend
        results = []
        for message in messages:
            # Create snippet by truncating content
            content = message.content or ""
            snippet = content[:150] + "..." if len(content) > 150 else content
            
            # Highlight search term in snippet (simple approach)
            if query.lower() in snippet.lower():
                query_start = snippet.lower().find(query.lower())
                query_end = query_start + len(query)
                highlighted_snippet = (
                    snippet[:query_start] + 
                    f"**{snippet[query_start:query_end]}**" + 
                    snippet[query_end:]
                )
                snippet = highlighted_snippet
            
            # Determine sender based on message type
            sender = ""
            if message.message_type == "user":
                sender = "You"
            elif message.message_type == "council":
                sender = "Council"
            elif message.sender:
                sender = message.sender
            
            # Get channel name
            channel_name = message.conversation.channel_id
            if message.conversation.channel_type == "dm":
                # For DMs, extract member name from channel_id like "dm-sarah" -> "Sarah"
                member_key = message.conversation.channel_id.replace("dm-", "")
                channel_name = member_key.title()  # Simple capitalization
            else:
                # For channels, use the channel_id as name
                channel_name = f"# {message.conversation.channel_id}"
            
            results.append({
                "id": message.id,
                "content": content,
                "snippet": snippet,
                "sender": sender,
                "timestamp": message.created_at.isoformat(),
                "channel_id": message.conversation.channel_id,
                "channel_type": message.conversation.channel_type,
                "channel_name": channel_name,
                "message_type": message.message_type
            })
        
        return results
    
    def _parse_confidence_score(self, confidence_level: Optional[str]) -> Optional[float]:
        """Convert confidence level string to numeric score"""
        if not confidence_level:
            return None
        
        confidence_map = {
            "high": 0.8,
            "medium": 0.6,
            "low": 0.4
        }
        
        return confidence_map.get(confidence_level.lower(), 0.5) 