"""
Core Agent implementation for NocturneAI.

This module defines the base Agent class which can be dynamically composed
with various capabilities at runtime.
"""

import asyncio
import logging
import uuid
from typing import Dict, Any, List, Optional, Union, Set, Type, Callable
from datetime import datetime

from .types import AgentRole, AgentCapability, Message, MessageType, ThoughtGraph, AgentState
from ...llm import BaseLLMProvider

logger = logging.getLogger(__name__)


class Agent:
    """
    Base Agent class for NocturneAI.
    
    The Agent class is designed to be modular and composable. Capabilities can be
    added or removed at runtime, enabling dynamic adaptation to different tasks.
    Each capability is implemented as a separate module that can be attached to
    the agent.
    """
    
    def __init__(
        self,
        name: str,
        role: AgentRole,
        llm_provider: BaseLLMProvider,
        capabilities: Optional[Set[AgentCapability]] = None,
        id: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize a new Agent.
        
        Args:
            name: Human-readable name for the agent
            role: The agent's primary role
            llm_provider: Provider for language model capabilities
            capabilities: Set of capabilities this agent possesses
            id: Unique ID for the agent (generated if not provided)
            config: Configuration parameters for the agent
        """
        self.id = id or str(uuid.uuid4())
        self.name = name
        self.role = role
        self.llm_provider = llm_provider
        self.capabilities = capabilities or set()
        self.config = config or {}
        
        # Initialize empty capability modules dict
        self._capability_modules: Dict[AgentCapability, Any] = {}
        
        # Initialize message handlers
        self._message_handlers: Dict[MessageType, List[Callable]] = {}
        
        # Initialize state
        self.state = AgentState(
            id=self.id,
            name=self.name,
            role=self.role,
            capabilities=self.capabilities
        )
        
        # Initialize thinking graph
        self.state.thinking = ThoughtGraph()
        
        logger.info(f"Agent '{name}' (ID: {self.id}) initialized with role {role.value}")
    
    async def add_capability(self, capability: AgentCapability, module: Any) -> bool:
        """
        Add a capability module to the agent.
        
        Args:
            capability: The capability to add
            module: The module implementing the capability
            
        Returns:
            True if capability was added, False otherwise
        """
        if capability in self._capability_modules:
            logger.warning(f"Capability {capability.value} already exists for agent {self.name}")
            return False
        
        # Register the capability
        self._capability_modules[capability] = module
        self.capabilities.add(capability)
        self.state.capabilities.add(capability)
        
        # Initialize the module with the agent
        if hasattr(module, 'initialize'):
            await module.initialize(self)
        
        # Register message handlers from the module
        if hasattr(module, 'get_message_handlers'):
            for message_type, handler in module.get_message_handlers().items():
                self.register_message_handler(message_type, handler)
        
        logger.info(f"Added capability {capability.value} to agent {self.name}")
        return True
    
    async def remove_capability(self, capability: AgentCapability) -> bool:
        """
        Remove a capability module from the agent.
        
        Args:
            capability: The capability to remove
            
        Returns:
            True if capability was removed, False otherwise
        """
        if capability not in self._capability_modules:
            logger.warning(f"Capability {capability.value} does not exist for agent {self.name}")
            return False
        
        # Get the module
        module = self._capability_modules[capability]
        
        # Clean up the module
        if hasattr(module, 'cleanup'):
            await module.cleanup()
        
        # Remove message handlers from the module
        if hasattr(module, 'get_message_handlers'):
            for message_type, handler in module.get_message_handlers().items():
                self.unregister_message_handler(message_type, handler)
        
        # Remove the capability
        del self._capability_modules[capability]
        self.capabilities.remove(capability)
        self.state.capabilities.remove(capability)
        
        logger.info(f"Removed capability {capability.value} from agent {self.name}")
        return True
    
    def has_capability(self, capability: AgentCapability) -> bool:
        """
        Check if the agent has a specific capability.
        
        Args:
            capability: The capability to check
            
        Returns:
            True if the agent has the capability, False otherwise
        """
        return capability in self.capabilities
    
    def get_capability_module(self, capability: AgentCapability) -> Optional[Any]:
        """
        Get the module for a specific capability.
        
        Args:
            capability: The capability to get
            
        Returns:
            The capability module, or None if the capability is not available
        """
        return self._capability_modules.get(capability)
    
    def register_message_handler(self, message_type: MessageType, handler: Callable) -> None:
        """
        Register a handler for a specific message type.
        
        Args:
            message_type: The type of message to handle
            handler: The handler function
        """
        if message_type not in self._message_handlers:
            self._message_handlers[message_type] = []
        
        self._message_handlers[message_type].append(handler)
        logger.debug(f"Registered handler for message type {message_type.value} in agent {self.name}")
    
    def unregister_message_handler(self, message_type: MessageType, handler: Callable) -> bool:
        """
        Unregister a handler for a specific message type.
        
        Args:
            message_type: The type of message to handle
            handler: The handler function
            
        Returns:
            True if the handler was unregistered, False otherwise
        """
        if message_type not in self._message_handlers:
            return False
        
        try:
            self._message_handlers[message_type].remove(handler)
            logger.debug(f"Unregistered handler for message type {message_type.value} in agent {self.name}")
            return True
        except ValueError:
            return False
    
    async def handle_message(self, message: Message) -> Optional[Message]:
        """
        Handle an incoming message.
        
        Args:
            message: The message to handle
            
        Returns:
            A response message, if any
        """
        logger.debug(f"Agent {self.name} received message: {message.message_type.value}")
        
        # Update the agent's state
        self.state.last_updated = datetime.now()
        
        # Get handlers for the message type
        handlers = self._message_handlers.get(message.message_type, [])
        
        # If no specific handlers, try to use the default handler
        if not handlers and MessageType.SYSTEM in self._message_handlers:
            handlers = self._message_handlers[MessageType.SYSTEM]
        
        # If still no handlers, log a warning
        if not handlers:
            logger.warning(f"No handlers for message type {message.message_type.value} in agent {self.name}")
            return None
        
        # Call all handlers and collect responses
        responses = []
        for handler in handlers:
            response = await handler(message)
            if response:
                responses.append(response)
        
        # Return the first response, if any
        return responses[0] if responses else None
    
    async def send_message(
        self,
        receiver_id: str,
        content: Any,
        message_type: MessageType = MessageType.INFO,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """
        Send a message to another agent.
        
        Args:
            receiver_id: ID of the receiving agent
            content: Message content
            message_type: Type of message
            metadata: Additional metadata for the message
            
        Returns:
            The sent message
        """
        # Check if the agent has the communication capability
        if not self.has_capability(AgentCapability.COMMUNICATION):
            logger.warning(f"Agent {self.name} tried to send a message without the COMMUNICATION capability")
            raise ValueError(f"Agent {self.name} does not have the COMMUNICATION capability")
        
        # Create the message
        message = Message(
            sender_id=self.id,
            sender_type=self.role.value,
            receiver_id=receiver_id,
            message_type=message_type,
            content=content,
            metadata=metadata or {}
        )
        
        # Use the communication module to send the message
        communication = self.get_capability_module(AgentCapability.COMMUNICATION)
        if communication and hasattr(communication, 'send_message'):
            return await communication.send_message(message)
        
        # If no communication module, log a warning
        logger.warning(f"Agent {self.name} has COMMUNICATION capability but no module")
        return message
    
    async def think(self, context: Any) -> ThoughtGraph:
        """
        Perform thinking based on the provided context.
        
        Args:
            context: The context to think about
            
        Returns:
            A thought graph representing the agent's reasoning
        """
        # Check if the agent has the thinking capability
        if not self.has_capability(AgentCapability.THINKING):
            logger.warning(f"Agent {self.name} tried to think without the THINKING capability")
            raise ValueError(f"Agent {self.name} does not have the THINKING capability")
        
        # Use the thinking module to perform reasoning
        thinking = self.get_capability_module(AgentCapability.THINKING)
        if thinking and hasattr(thinking, 'think'):
            graph = await thinking.think(context)
            self.state.thinking = graph
            return graph
        
        # If no thinking module, log a warning
        logger.warning(f"Agent {self.name} has THINKING capability but no module")
        return ThoughtGraph()
    
    async def use_tool(self, tool_name: str, **parameters) -> Any:
        """
        Use a tool with the given parameters.
        
        Args:
            tool_name: Name of the tool to use
            **parameters: Parameters for the tool
            
        Returns:
            Result of the tool execution
        """
        # Check if the agent has the tool use capability
        if not self.has_capability(AgentCapability.TOOL_USE):
            logger.warning(f"Agent {self.name} tried to use tool {tool_name} without the TOOL_USE capability")
            raise ValueError(f"Agent {self.name} does not have the TOOL_USE capability")
        
        # Use the tool use module to execute the tool
        tool_use = self.get_capability_module(AgentCapability.TOOL_USE)
        if tool_use and hasattr(tool_use, 'use_tool'):
            return await tool_use.use_tool(tool_name, **parameters)
        
        # If no tool use module, log a warning
        logger.warning(f"Agent {self.name} has TOOL_USE capability but no module")
        raise NotImplementedError(f"Tool use is not implemented for agent {self.name}")
    
    async def remember(self, key: str, value: Any = None) -> Any:
        """
        Store or retrieve a value from the agent's memory.
        
        Args:
            key: Key to store or retrieve
            value: Value to store (if None, retrieves the value)
            
        Returns:
            The stored or retrieved value
        """
        # Check if the agent has the memory capability
        if not self.has_capability(AgentCapability.MEMORY):
            logger.warning(f"Agent {self.name} tried to use memory without the MEMORY capability")
            raise ValueError(f"Agent {self.name} does not have the MEMORY capability")
        
        # Use the memory module
        memory = self.get_capability_module(AgentCapability.MEMORY)
        if not memory:
            logger.warning(f"Agent {self.name} has MEMORY capability but no module")
            
            # Fall back to working memory if no memory module
            if value is None:
                return self.state.working_memory.get(key)
            else:
                self.state.working_memory[key] = value
                return value
        
        # Store or retrieve value using the memory module
        if hasattr(memory, 'remember'):
            if value is None:
                return await memory.remember(key)
            else:
                return await memory.remember(key, value)
        
        # If no remember method, log a warning
        logger.warning(f"Memory module for agent {self.name} does not have remember method")
        raise NotImplementedError(f"Memory is not fully implemented for agent {self.name}")
    
    async def reflect(self) -> Dict[str, Any]:
        """
        Perform self-reflection to analyze the agent's performance and state.
        
        Returns:
            Dictionary with reflection results
        """
        # Check if the agent has the reflection capability
        if not self.has_capability(AgentCapability.REFLECTION):
            logger.warning(f"Agent {self.name} tried to reflect without the REFLECTION capability")
            raise ValueError(f"Agent {self.name} does not have the REFLECTION capability")
        
        # Use the reflection module
        reflection = self.get_capability_module(AgentCapability.REFLECTION)
        if reflection and hasattr(reflection, 'reflect'):
            return await reflection.reflect()
        
        # If no reflection module, log a warning
        logger.warning(f"Agent {self.name} has REFLECTION capability but no module")
        return {"status": "reflection not implemented"}
    
    def get_state(self) -> AgentState:
        """
        Get the current state of the agent.
        
        Returns:
            The agent's state
        """
        # Update the state before returning
        self.state.last_updated = datetime.now()
        self.state.capabilities = self.capabilities
        return self.state
    
    def update_state(self, **kwargs) -> None:
        """
        Update the agent's state with the provided values.
        
        Args:
            **kwargs: Values to update in the state
        """
        for key, value in kwargs.items():
            if hasattr(self.state, key):
                setattr(self.state, key, value)
        
        # Always update the last_updated timestamp
        self.state.last_updated = datetime.now()
    
    async def initialize(self) -> None:
        """
        Initialize the agent.
        
        This method should be called after all capabilities have been added.
        """
        logger.info(f"Initializing agent {self.name} with {len(self.capabilities)} capabilities")
        
        # Initialize all capability modules
        for capability, module in self._capability_modules.items():
            if hasattr(module, 'initialize'):
                await module.initialize(self)
    
    async def cleanup(self) -> None:
        """
        Clean up the agent.
        
        This method should be called before disposing of the agent.
        """
        logger.info(f"Cleaning up agent {self.name}")
        
        # Clean up all capability modules
        for capability, module in self._capability_modules.items():
            if hasattr(module, 'cleanup'):
                await module.cleanup()
        
        # Clear capability modules
        self._capability_modules.clear()
        
        # Update state
        self.state.active = False
        self.state.last_updated = datetime.now()
