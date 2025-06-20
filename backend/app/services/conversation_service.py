"""
Clean Conversation Service - Unified Database Operations
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message, CouncilResponse, IntelligenceSession

class ConversationService:
    """Clean conversation service with unified database operations"""

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
            # Create conversation with proper context
            conversation_title = title
            if not conversation_title:
                if channel_type == "dm":
                    # For DMs, create friendly title
                    member_name = channel_id.replace("dm-", "").replace("-", " ").title()
                    conversation_title = f"DM with {member_name}"
                else:
                    conversation_title = f"# {channel_id}"
            
            conversation = Conversation(
                channel_id=channel_id,
                channel_type=channel_type,
                title=conversation_title,
                context={}  # Initialize with empty dict, not None
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
        # Ensure metadata is properly serializable
        safe_metadata = {}
        if metadata:
            safe_metadata = dict(metadata)  # Make a copy to avoid mutation
        
        message = Message(
            conversation_id=conversation.id,
            content=content,
            message_type="user",
            sender="You",
            interaction_mode=interaction_mode or "casual",
            message_metadata=safe_metadata,
            is_deleted=False
        )
        
        db.add(message)
        await db.flush()
        return message

    async def save_message(
        self,
        db: AsyncSession,
        conversation: Conversation,
        content: str,
        message_type: str = "user",
        sender: Optional[str] = None,
        agent_name: Optional[str] = None,
        agent_role: Optional[str] = None,
        workflow_step: Optional[str] = None,
        interaction_mode: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Message:
        """Save any type of message to the database - unified method"""
        
        # Ensure metadata is properly serializable
        safe_metadata = {}
        if metadata:
            safe_metadata = dict(metadata)  # Make a copy to avoid mutation
        
        # Add agent-specific metadata if provided
        if agent_name:
            safe_metadata["agent_name"] = agent_name
        if agent_role:
            safe_metadata["agent_role"] = agent_role
        if workflow_step:
            safe_metadata["workflow_step"] = workflow_step
        
        # Determine sender
        final_sender = sender
        if not final_sender:
            if message_type == "agent":
                final_sender = agent_name or "AI Agent"
            elif message_type == "synthesis":
                final_sender = "🧠 Master Intelligence"
            elif message_type == "actions":
                final_sender = "🎯 Action Items"
            else:
                final_sender = "You"
        
        message = Message(
            conversation_id=conversation.id,
            content=content,
            message_type=message_type,
            sender=final_sender,
            interaction_mode=interaction_mode or "casual",
            message_metadata=safe_metadata,
            is_deleted=False
        )
        
        db.add(message)
        await db.flush()
        return message

    async def save_council_response(
        self,
        db: AsyncSession,
        conversation: Conversation,
        council_response_data: Dict,
        user_message: Optional[Message],
        synthesis: Optional[str] = None
    ) -> Message:
        """Save a council response with all member responses"""
        
        # Create main council message
        council_message = Message(
            conversation_id=conversation.id,
            content=synthesis or "Council Response",
            message_type="council",
            interaction_mode=user_message.interaction_mode if user_message else "casual",
            message_metadata={
                "response_type": council_response_data.get("response_type", "council"),
                "confidence_score": council_response_data.get("confidence_score"),
                "processing_time": council_response_data.get("processing_time")
            },
            is_deleted=False
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
        
        # Save intelligence session for analytics
        if user_message:
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
        """Get conversation history for a channel/DM"""
        
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
            .where(
                and_(
                    Message.conversation_id == conversation.id,
                    Message.is_deleted == False  # Only non-deleted messages
                )
            )
            .order_by(desc(Message.created_at))
            .limit(limit)
            .offset(offset)
        )
        
        messages = result.scalars().all()
        
        # Convert to response format
        history = []
        for message in reversed(messages):  # Reverse for chronological order
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
            
            # Add agent-specific fields if this is an agent message
            metadata = message.message_metadata or {}
            if message.message_type in ["agent", "synthesis", "actions"]:
                msg_data["agent_name"] = metadata.get("agent_name")
                msg_data["agent_role"] = metadata.get("agent_role")
                msg_data["workflow_step"] = metadata.get("workflow_step")
            
            # Add council responses if available (legacy format)
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
                    Message.created_at >= cutoff_time,
                    Message.is_deleted == False  # Only non-deleted messages
                )
            )
            .order_by(desc(Message.created_at))
            .limit(max_messages)
        )
        
        messages = result.scalars().all()
        
        # Convert to context format for AI
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
        """Search through conversation history globally"""
        
        # Build search conditions (case-insensitive LIKE for SQLite)
        conditions = [
            func.lower(Message.content).like(f"%{query.lower()}%"),
            Message.is_deleted == False  # Only search non-deleted messages
        ]
        
        # Optional channel filter
        if channel_id and channel_type:
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
        
        # Format search results
        results = []
        for message in messages:
            # Create snippet with highlighting
            content = message.content or ""
            snippet = content[:150] + "..." if len(content) > 150 else content
            
            # Highlight search term (simple approach)
            if query.lower() in snippet.lower():
                query_start = snippet.lower().find(query.lower())
                query_end = query_start + len(query)
                snippet = (
                    snippet[:query_start] + 
                    f"**{snippet[query_start:query_end]}**" + 
                    snippet[query_end:]
                )
            
            # Determine sender
            sender = "You" if message.message_type == "user" else "Council"
            if message.sender:
                sender = message.sender
            
            # Create channel name
            channel_name = message.conversation.channel_id
            if message.conversation.channel_type == "dm":
                member_key = message.conversation.channel_id.replace("dm-", "")
                channel_name = member_key.title()
            else:
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

    def _parse_confidence_score(self, confidence_level) -> Optional[float]:
        """Convert confidence level string to numeric score"""
        if not confidence_level:
            return None
        
        # If it's already a number, return it
        if isinstance(confidence_level, (int, float)):
            return float(confidence_level)
        
        # If it's a string, map to numeric value
        if isinstance(confidence_level, str):
            confidence_map = {
                "high": 0.8,
                "medium": 0.6,
                "low": 0.4
            }
            return confidence_map.get(confidence_level.lower(), 0.5)
        
        return 0.5 