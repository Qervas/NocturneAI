"""
Message protocol definitions for NocturneAI agents.

This module defines the standardized message formats and protocols
for agent communication.
"""

import json
from enum import Enum, auto
from typing import Dict, Any, List, Optional, Union, Set
from datetime import datetime
import uuid
from pydantic import BaseModel, Field

class MessageType(str, Enum):
    """Types of messages that can be exchanged between agents"""
    # Standard message types
    PROMPT = "prompt"            # Initial prompt or instruction
    RESPONSE = "response"        # Response to a prompt or query
    QUESTION = "question"        # Question requiring a response
    ANSWER = "answer"            # Answer to a question
    
    # Task and workflow related
    COMMAND = "command"          # Command to perform an action
    RESULT = "result"            # Result of a command or action
    PLAN = "plan"                # A plan or sequence of steps
    STATUS = "status"            # Status update on task progress
    
    # Cognitive process related
    THINKING = "thinking"        # Reasoning or deliberation
    REFLECTION = "reflection"    # Self-reflection or analysis
    CRITIQUE = "critique"        # Critical feedback or evaluation
    
    # Knowledge and information related
    INFORMATION = "information"  # General information sharing
    FACT = "fact"                # Factual statement
    OPINION = "opinion"          # Opinion or subjective view
    
    # Meta-communication
    SYSTEM = "system"            # System-level message
    ERROR = "error"              # Error or exception
    WARNING = "warning"          # Warning message
    DEBUG = "debug"              # Debug information
    
    # Collaboration related
    REQUEST = "request"          # Request for assistance
    OFFER = "offer"              # Offer of assistance
    FEEDBACK = "feedback"        # Feedback on performance
    
    # Custom and extended
    CUSTOM = "custom"            # Custom message type
    BINARY = "binary"            # Binary data
    JSON = "json"                # JSON structured data
    GRAPH = "graph"              # Graph structured data


class MessageSchema(BaseModel):
    """Schema definition for a message"""
    id: str = Field(description="Unique message identifier")
    type: MessageType = Field(description="Type of message")
    sender: Dict[str, Any] = Field(description="Information about the sender")
    receiver: Optional[Dict[str, Any]] = Field(description="Information about the receiver")
    content: Any = Field(description="Message content")
    timestamp: datetime = Field(description="Message creation timestamp")
    parent_id: Optional[str] = Field(description="ID of parent message in a conversation")
    thread_id: Optional[str] = Field(description="ID of conversation thread")
    metadata: Dict[str, Any] = Field(description="Additional metadata")


class Message(BaseModel):
    """
    Standard message format for agent communication.
    
    This class represents a standardized message format that can be used
    for communication between agents in the NocturneAI system.
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Union[MessageType, str] = Field(...)
    sender_id: str = Field(...)
    sender_type: str = Field(...)
    receiver_id: Optional[str] = None
    receiver_type: Optional[str] = None
    content: Any = Field(...)
    timestamp: datetime = Field(default_factory=datetime.now)
    parent_id: Optional[str] = None
    thread_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary"""
        result = self.dict()
        # Convert enum values to strings
        if isinstance(result["type"], MessageType):
            result["type"] = result["type"].value
        # Convert datetime to ISO format string
        if isinstance(result["timestamp"], datetime):
            result["timestamp"] = result["timestamp"].isoformat()
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Message":
        """Create message from dictionary"""
        # Convert string message type to enum if possible
        if "type" in data and isinstance(data["type"], str):
            try:
                data["type"] = MessageType(data["type"])
            except ValueError:
                # Keep as string if not a known enum value
                pass
        # Convert ISO string to datetime
        if "timestamp" in data and isinstance(data["timestamp"], str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)
    
    def to_json(self) -> str:
        """Convert message to JSON string"""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_json(cls, json_str: str) -> "Message":
        """Create message from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    def create_response(
        self, 
        content: Any, 
        message_type: Union[MessageType, str] = MessageType.RESPONSE
    ) -> "Message":
        """
        Create a response to this message.
        
        Args:
            content: Content of the response
            message_type: Type of the response message
            
        Returns:
            A new message as a response to this one
        """
        return Message(
            type=message_type,
            sender_id=self.receiver_id,
            sender_type=self.receiver_type,
            receiver_id=self.sender_id,
            receiver_type=self.sender_type,
            content=content,
            parent_id=self.id,
            thread_id=self.thread_id or self.id
        )


class MessageProtocol:
    """
    Protocol for handling agent messages.
    
    This class defines the standard protocol for message handling,
    including serialization, validation, and routing.
    """
    
    @staticmethod
    def validate_message(message: Message) -> bool:
        """
        Validate a message.
        
        Args:
            message: The message to validate
            
        Returns:
            True if the message is valid, False otherwise
        """
        # Check required fields
        if not message.sender_id or not message.type:
            return False
        
        # For non-broadcast messages, check receiver
        if message.receiver_id is not None and not message.receiver_id:
            return False
        
        return True
    
    @staticmethod
    def create_message(
        sender_id: str,
        sender_type: str,
        content: Any,
        message_type: Union[MessageType, str] = MessageType.INFORMATION,
        receiver_id: Optional[str] = None,
        receiver_type: Optional[str] = None,
        parent_id: Optional[str] = None,
        thread_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """
        Create a new message.
        
        Args:
            sender_id: ID of the sender
            sender_type: Type of the sender
            content: Message content
            message_type: Type of message
            receiver_id: ID of the receiver (if any)
            receiver_type: Type of the receiver (if any)
            parent_id: ID of parent message (if any)
            thread_id: ID of conversation thread (if any)
            metadata: Additional metadata
            
        Returns:
            A new message
        """
        return Message(
            type=message_type,
            sender_id=sender_id,
            sender_type=sender_type,
            receiver_id=receiver_id,
            receiver_type=receiver_type,
            content=content,
            parent_id=parent_id,
            thread_id=thread_id,
            metadata=metadata or {}
        )
    
    @staticmethod
    def create_system_message(
        content: Any,
        receiver_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """
        Create a system message.
        
        Args:
            content: Message content
            receiver_id: ID of the receiver (if any)
            metadata: Additional metadata
            
        Returns:
            A new system message
        """
        return Message(
            type=MessageType.SYSTEM,
            sender_id="system",
            sender_type="system",
            receiver_id=receiver_id,
            content=content,
            metadata=metadata or {}
        )
    
    @staticmethod
    def create_error_message(
        content: Any,
        receiver_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """
        Create an error message.
        
        Args:
            content: Error content
            receiver_id: ID of the receiver (if any)
            metadata: Additional metadata
            
        Returns:
            A new error message
        """
        return Message(
            type=MessageType.ERROR,
            sender_id="system",
            sender_type="system",
            receiver_id=receiver_id,
            content=content,
            metadata=metadata or {}
        )
    
    @staticmethod
    def is_broadcast(message: Message) -> bool:
        """
        Check if a message is a broadcast message.
        
        Args:
            message: The message to check
            
        Returns:
            True if the message is a broadcast message, False otherwise
        """
        return message.receiver_id is None
    
    @staticmethod
    def serialize(message: Message) -> str:
        """
        Serialize a message to a string.
        
        Args:
            message: The message to serialize
            
        Returns:
            Serialized message string
        """
        return message.to_json()
    
    @staticmethod
    def deserialize(message_str: str) -> Message:
        """
        Deserialize a message from a string.
        
        Args:
            message_str: Serialized message string
            
        Returns:
            Deserialized message
        """
        return Message.from_json(message_str)
