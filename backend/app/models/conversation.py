"""
Database models for conversation and message persistence
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, DateTime, Text, JSON, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import uuid

from .database import Base

class Conversation(Base):
    """Conversation entity - represents a channel or DM conversation"""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    channel_id = Column(String, nullable=False, index=True)  # general, council, dm-sarah, etc.
    channel_type = Column(String, nullable=False, index=True)  # channel or dm
    title = Column(String, nullable=True)  # Optional conversation title
    context = Column(JSON, nullable=True)  # Conversation context/metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Conversation(id={self.id}, channel_id={self.channel_id}, type={self.channel_type})>"

class Message(Base):
    """Message entity - represents individual messages in conversations"""
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    
    # Message content
    content = Column(Text, nullable=False)
    message_type = Column(String, nullable=False)  # user, council, system
    sender = Column(String, nullable=True)  # For individual council member messages
    
    # Context and metadata
    interaction_mode = Column(String, nullable=True)  # casual_chat, strategic_brief, etc.
    message_metadata = Column(JSON, nullable=True)  # Additional message metadata
    
    # Message state
    is_deleted = Column(Boolean, default=False, nullable=False)  # Soft delete flag
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    council_responses = relationship("CouncilResponse", back_populates="message", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Message(id={self.id}, type={self.message_type}, content={self.content[:50]}...)>"

class CouncilResponse(Base):
    """Council response entity - represents AI council member responses"""
    __tablename__ = "council_responses"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String, ForeignKey("messages.id"), nullable=False, index=True)
    
    # Council member info
    member_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    
    # Response content
    response_content = Column(Text, nullable=False)
    reasoning = Column(Text, nullable=True)
    suggested_actions = Column(JSON, nullable=True)  # List of suggested actions
    
    # Confidence and quality metrics
    confidence_level = Column(String, nullable=True)  # high, medium, low
    confidence_score = Column(Float, nullable=True)  # 0.0 to 1.0
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    message = relationship("Message", back_populates="council_responses")
    
    def __repr__(self):
        return f"<CouncilResponse(id={self.id}, member={self.member_name}, confidence={self.confidence_level})>"

class IntelligenceSession(Base):
    """Intelligence session entity - tracks overall conversation flow and synthesis"""
    __tablename__ = "intelligence_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    
    # Query and response
    user_query = Column(Text, nullable=False)
    synthesis = Column(Text, nullable=True)  # Master Intelligence synthesis
    recommended_actions = Column(JSON, nullable=True)  # Recommended actions
    
    # Response metadata
    response_type = Column(String, nullable=False)  # individual, council
    processing_time = Column(Float, nullable=True)  # Processing time in seconds
    confidence_score = Column(Float, nullable=True)  # Overall confidence 0.0 to 1.0
    
    # Context
    interaction_mode = Column(String, nullable=True)
    requested_members = Column(JSON, nullable=True)  # List of requested council members
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    conversation = relationship("Conversation")
    
    def __repr__(self):
        return f"<IntelligenceSession(id={self.id}, query={self.user_query[:50]}...)>" 