"""
Message type definition for agent communication.

This module provides a standard message format for agent communication.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import uuid

from ..core.types import MessageType


class Message:
    """Standard message format for agent communication"""

    def __init__(
        self,
        content: Any,
        type: MessageType,
        sender_id: str,
        receiver_id: Optional[str] = None,
        ref_message_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a message.

        Args:
            content: Message content
            type: Message type
            sender_id: ID of the sender agent
            receiver_id: Optional ID of the receiving agent
            ref_message_id: Optional ID of a referenced message
            metadata: Optional additional metadata
        """
        self.id = str(uuid.uuid4())
        self.content = content
        self.type = type
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.ref_message_id = ref_message_id
        self.metadata = metadata or {}
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary"""
        result = {
            "id": self.id,
            "content": self.content,
            "type": self.type.value if self.type else None,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "ref_message_id": self.ref_message_id,
            "metadata": self.metadata,
            "timestamp": self.timestamp
        }
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Message":
        """Create message from dictionary"""
        msg = cls(
            content=data["content"],
            type=MessageType(data["type"]) if data.get("type") else None,
            sender_id=data["sender_id"],
            receiver_id=data.get("receiver_id"),
            ref_message_id=data.get("ref_message_id"),
            metadata=data.get("metadata", {})
        )
        msg.id = data.get("id", msg.id)
        msg.timestamp = data.get("timestamp", msg.timestamp)
        return msg