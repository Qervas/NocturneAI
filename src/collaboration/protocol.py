"""
Communication protocol for agent-to-agent interactions.

This module defines the message structures and protocols for how agents
communicate with each other in a standardized way.
"""

from enum import Enum, auto
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone
import asyncio
import logging
from ..core.agent import AgentRole

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Types of messages that can be exchanged between agents"""
    QUERY = auto()           # Request for information
    RESPONSE = auto()         # Response to a query
    INFORM = auto()           # Providing information proactively
    REQUEST = auto()          # Request for action
    ACKNOWLEDGE = auto()      # Acknowledge receipt
    PROPOSE = auto()          # Propose a solution or action
    ACCEPT = auto()           # Accept a proposal
    REJECT = auto()           # Reject a proposal
    ERROR = auto()            # Error message
    BROADCAST = auto()        # Message to all agents

class MessageStatus(Enum):
    """Status of a message in the communication flow"""
    PENDING = auto()          # Message is waiting to be processed
    DELIVERED = auto()        # Message has been delivered to recipient
    PROCESSED = auto()        # Message has been processed
    FAILED = auto()           # Message delivery or processing failed
    REPLIED = auto()          # Message has been replied to

class AgentMessage(BaseModel):
    """
    A standardized message format for agent-to-agent communication.
    
    This structure enables organized, trackable communication between agents
    with appropriate metadata for routing and priority handling.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: MessageType
    sender: str  # Agent name/identifier
    recipient: str  # Agent name/identifier or "all" for broadcast
    content: Dict[str, Any]  # The actual message content
    context: Dict[str, Any] = Field(default_factory=dict)  # Additional context info
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = None  # For linking related messages
    reply_to: Optional[str] = None  # ID of message this is replying to
    priority: int = 1  # 1-5, with 5 being highest priority
    status: MessageStatus = MessageStatus.PENDING
    ttl: int = 3600  # Time-to-live in seconds
    
    def create_reply(self, content: Dict[str, Any], 
                    message_type: MessageType = MessageType.RESPONSE) -> 'AgentMessage':
        """Create a reply to this message"""
        return AgentMessage(
            type=message_type,
            sender=self.recipient,
            recipient=self.sender,
            content=content,
            correlation_id=self.correlation_id or self.id,
            reply_to=self.id,
            priority=self.priority
        )
    
    def is_expired(self) -> bool:
        """Check if the message has expired based on TTL"""
        if self.ttl <= 0:
            return False  # No expiration
        
        now = datetime.now(timezone.utc)
        elapsed = (now - self.timestamp).total_seconds()
        return elapsed > self.ttl

class CommunicationProtocol:
    """
    Protocol for agent-to-agent communication.
    
    This class handles message routing, delivery, and tracking between agents.
    It can be used to send directed messages or broadcasts to groups of agents.
    """
    
    def __init__(self):
        # Message queues for each agent
        self.queues: Dict[str, asyncio.Queue] = {}
        
        # Message history for tracking and reference
        self.message_history: List[AgentMessage] = []
        
        # Maximum history size
        self.max_history_size: int = 1000
        
        # Registered agents
        self.registered_agents: Dict[str, Dict[str, Any]] = {}
    
    def register_agent(self, agent_id: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Register an agent with the communication protocol"""
        if agent_id in self.registered_agents:
            logger.warning(f"Agent {agent_id} already registered, updating metadata")
        
        self.registered_agents[agent_id] = metadata or {}
        
        if agent_id not in self.queues:
            self.queues[agent_id] = asyncio.Queue()
            
        logger.info(f"Agent {agent_id} registered with communication protocol")
    
    def unregister_agent(self, agent_id: str) -> None:
        """Unregister an agent from the communication protocol"""
        if agent_id in self.registered_agents:
            del self.registered_agents[agent_id]
            
        if agent_id in self.queues:
            del self.queues[agent_id]
            
        logger.info(f"Agent {agent_id} unregistered from communication protocol")
    
    async def send_message(self, message: AgentMessage) -> bool:
        """Send a message to the specified recipient"""
        if message.recipient != "all" and message.recipient not in self.registered_agents:
            logger.warning(f"Recipient {message.recipient} not registered")
            message.status = MessageStatus.FAILED
            self._add_to_history(message)
            return False
        
        if message.is_expired():
            logger.warning(f"Message {message.id} from {message.sender} to {message.recipient} has expired")
            message.status = MessageStatus.FAILED
            self._add_to_history(message)
            return False
            
        # For broadcast messages
        if message.recipient == "all":
            delivered = await self._broadcast_message(message)
            return delivered
        
        # For direct messages
        try:
            await self.queues[message.recipient].put(message)
            message.status = MessageStatus.DELIVERED
            self._add_to_history(message)
            logger.debug(f"Message {message.id} from {message.sender} delivered to {message.recipient}")
            return True
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}", exc_info=True)
            message.status = MessageStatus.FAILED
            self._add_to_history(message)
            return False
    
    async def receive_message(self, agent_id: str, timeout: float = None) -> Optional[AgentMessage]:
        """Receive a message for the specified agent"""
        if agent_id not in self.registered_agents:
            logger.warning(f"Agent {agent_id} not registered")
            return None
        
        try:
            if timeout:
                message = await asyncio.wait_for(self.queues[agent_id].get(), timeout=timeout)
            else:
                message = await self.queues[agent_id].get()
                
            logger.debug(f"Agent {agent_id} received message {message.id} from {message.sender}")
            return message
        except asyncio.TimeoutError:
            return None
        except Exception as e:
            logger.error(f"Error receiving message: {str(e)}", exc_info=True)
            return None
    
    async def _broadcast_message(self, message: AgentMessage) -> bool:
        """Broadcast a message to all registered agents"""
        success = True
        
        for agent_id in self.registered_agents:
            # Don't send to the sender
            if agent_id == message.sender:
                continue
                
            try:
                # Create a copy of the message for each recipient
                broadcast_copy = AgentMessage(
                    type=message.type,
                    sender=message.sender,
                    recipient=agent_id,
                    content=message.content,
                    context=message.context,
                    correlation_id=message.correlation_id,
                    priority=message.priority,
                    ttl=message.ttl
                )
                
                await self.queues[agent_id].put(broadcast_copy)
                broadcast_copy.status = MessageStatus.DELIVERED
                self._add_to_history(broadcast_copy)
                logger.debug(f"Broadcast message {message.id} from {message.sender} delivered to {agent_id}")
            except Exception as e:
                logger.error(f"Error broadcasting to {agent_id}: {str(e)}", exc_info=True)
                success = False
        
        message.status = MessageStatus.DELIVERED if success else MessageStatus.FAILED
        self._add_to_history(message)
        return success
    
    def _add_to_history(self, message: AgentMessage) -> None:
        """Add a message to the history and maintain history size"""
        self.message_history.append(message)
        
        # Trim history if it gets too large
        if len(self.message_history) > self.max_history_size:
            excess = len(self.message_history) - self.max_history_size
            self.message_history = self.message_history[excess:]
    
    def get_messages_by_correlation(self, correlation_id: str) -> List[AgentMessage]:
        """Get all messages with the specified correlation ID"""
        return [m for m in self.message_history if m.correlation_id == correlation_id]
    
    def get_message_by_id(self, message_id: str) -> Optional[AgentMessage]:
        """Get a message by its ID"""
        for message in self.message_history:
            if message.id == message_id:
                return message
        return None
    
    def get_messages_between(self, agent1: str, agent2: str) -> List[AgentMessage]:
        """Get all messages exchanged between two agents"""
        return [
            m for m in self.message_history 
            if (m.sender == agent1 and m.recipient == agent2) or 
               (m.sender == agent2 and m.recipient == agent1)
        ]
