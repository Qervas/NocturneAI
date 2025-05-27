"""
Communication capabilities for NocturneAI agents.

This module provides capabilities for agent communication.
"""

import asyncio
import logging
from typing import Dict, Any, List, Callable, Awaitable, Optional, Union
from datetime import datetime
import uuid

from ..core.types import AgentCapability, MessageType, Message
from .base import CommunicationCapability

logger = logging.getLogger(__name__)


class BasicCommunication(CommunicationCapability):
    """
    Basic communication capability for agents.
    
    Enables agents to send and receive messages.
    """
    
    CAPABILITY = AgentCapability.COMMUNICATION
    
    def __init__(self, **config):
        """
        Initialize the basic communication capability.
        
        Args:
            **config: Configuration options
        """
        super().__init__(**config)
        self.message_history: List[Message] = []
        self.max_history = config.get('max_history', 100)
        self.message_handlers = {}
        self.agent = None
    
    async def initialize(self, agent):
        """
        Initialize the capability with the agent.
        
        Args:
            agent: The agent to initialize with
        """
        await super().initialize(agent)
        self.agent = agent
        
        # Register message handlers
        self.register_message_handler(MessageType.INFO, self._handle_info)
        self.register_message_handler(MessageType.QUESTION, self._handle_question)
        self.register_message_handler(MessageType.RESPONSE, self._handle_response)
        self.register_message_handler(MessageType.ERROR, self._handle_error)
        
        logger.info(f"BasicCommunication capability initialized for agent {agent.name}")
    
    def register_message_handler(self, message_type: MessageType, handler: Callable[[Message], Awaitable[Optional[Message]]]):
        """
        Register a handler for a specific message type.
        
        Args:
            message_type: Type of message to handle
            handler: Handler function
        """
        if message_type not in self.message_handlers:
            self.message_handlers[message_type] = []
        
        self.message_handlers[message_type].append(handler)
        logger.debug(f"Registered handler for message type {message_type}")
    
    async def send_message(self, message: Message) -> Message:
        """
        Send a message to another agent.
        
        Args:
            message: Message to send
            
        Returns:
            The sent message with updated metadata
        """
        # Ensure message has an ID
        if not message.id:
            message.id = str(uuid.uuid4())
        
        # Log sending
        logger.debug(f"Sending message {message.id} to {message.receiver_id} of type {message.type.value}")
        
        # Add to history
        self._add_to_history(message)
        
        # In a real implementation, this would use the agent registry to route the message
        # to the correct agent
        
        return message
    
    async def receive_message(self, message: Message) -> Optional[Message]:
        """
        Receive a message from another agent.
        
        Args:
            message: Message to receive
            
        Returns:
            Optional response message
        """
        # Add to history
        self._add_to_history(message)
        
        # Log receipt
        logger.debug(f"Received message {message.id} from {message.sender_id} of type {message.type.value}")
        
        handlers = self.message_handlers.get(message.type, [])
        
        if not handlers:
            logger.warning(f"No handlers for message type: {message.type}")
            return None
        
        for handler in handlers:
            try:
                response = await handler(message)
                if response:
                    return response
            except Exception as e:
                logger.error(f"Error handling message {message.id}: {str(e)}")
        
        return None
    
    async def _handle_info(self, message: Message) -> Optional[Message]:
        """Handle info messages."""
        logger.info(f"Info message from {message.sender_id}: {message.content}")
        return None
    
    async def _handle_question(self, message: Message) -> Optional[Message]:
        """Handle question messages."""
        logger.info(f"Question from {message.sender_id}: {message.content}")
        
        # In a real implementation, this would process the question and generate an answer
        
        # For the example, we'll just acknowledge the question
        response = Message(
            type=MessageType.ANSWER,
            sender_id=self.agent.id if self.agent else "unknown",
            receiver_id=message.sender_id,
            content="Question acknowledged",
            ref_message_id=message.id
        )
        
        return response
    
    async def _handle_response(self, message: Message) -> Optional[Message]:
        """Handle response messages."""
        logger.info(f"Response from {message.sender_id}: {message.content}")
        return None
    
    async def _handle_error(self, message: Message) -> Optional[Message]:
        """Handle error messages."""
        logger.warning(f"Error message from {message.sender_id}: {message.content}")
        return None
    
    def _add_to_history(self, message: Message) -> None:
        """
        Add a message to the history, respecting max history size.
        
        Args:
            message: Message to add
        """
        self.message_history.append(message)
        if len(self.message_history) > self.max_history:
            self.message_history = self.message_history[-self.max_history:]
    
    def get_message_history(self) -> List[Message]:
        """
        Get the message history.
        
        Returns:
            List of messages in history
        """
        return self.message_history.copy()
    
    async def cleanup(self) -> None:
        """Clean up resources used by this capability."""
        logger.info(f"Cleaning up BasicCommunication capability for agent {self.agent.name if self.agent else 'unknown'}")
        # Nothing specific to clean up