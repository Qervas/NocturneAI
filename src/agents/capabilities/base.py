"""
Base capability classes for NocturneAI agents.

This module defines the foundational capability classes that can be
attached to agents to provide modular functionality.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Type, Protocol, Callable, Set, Union
from abc import ABC, abstractmethod

from ..core.types import AgentCapability, MessageType, Message, ThoughtGraph

logger = logging.getLogger(__name__)


class Capability(ABC):
    """
    Abstract base class for all agent capabilities.
    
    All capability implementations should inherit from this class and
    implement the required methods.
    """
    
    # Class-level attribute to identify the capability type
    CAPABILITY: AgentCapability = None
    
    def __init__(self, **config):
        """
        Initialize the capability with configuration.
        
        Args:
            **config: Configuration parameters for the capability
        """
        self.config = config
        self.agent = None
        logger.debug(f"Initialized {self.__class__.__name__} capability")
    
    async def initialize(self, agent) -> None:
        """
        Initialize the capability with the agent.
        
        This method is called when the capability is added to an agent.
        
        Args:
            agent: The agent this capability is attached to
        """
        self.agent = agent
        logger.debug(f"Initialized {self.__class__.__name__} capability for agent {agent.name}")
    
    async def cleanup(self) -> None:
        """
        Clean up the capability.
        
        This method is called when the capability is removed from an agent
        or when the agent is being cleaned up.
        """
        logger.debug(f"Cleaned up {self.__class__.__name__} capability for agent {self.agent.name if self.agent else 'unknown'}")
        self.agent = None
    
    def get_message_handlers(self) -> Dict[MessageType, Callable]:
        """
        Get message handlers for this capability.
        
        This method should return a dictionary mapping message types to
        handler functions. The handler functions should have the signature:
        async def handler(message: Message) -> Optional[Message]
        
        Returns:
            Dictionary mapping message types to handler functions
        """
        return {}
    
    @classmethod
    def get_capability_type(cls) -> AgentCapability:
        """
        Get the capability type.
        
        Returns:
            The capability type
        """
        return cls.CAPABILITY


class ThinkingCapability(Capability):
    """
    Base class for thinking capabilities.
    
    Thinking capabilities enable agents to reason about information and
    make decisions through structured thought processes.
    """
    
    CAPABILITY = AgentCapability.THINKING
    
    @abstractmethod
    async def think(self, context: Any) -> ThoughtGraph:
        """
        Perform thinking based on the provided context.
        
        Args:
            context: The context to think about
            
        Returns:
            A thought graph representing the agent's reasoning
        """
        raise NotImplementedError()


class CommunicationCapability(Capability):
    """
    Base class for communication capabilities.
    
    Communication capabilities enable agents to send and receive messages
    using various protocols and formats.
    """
    
    CAPABILITY = AgentCapability.COMMUNICATION
    
    @abstractmethod
    async def send_message(self, message: Message) -> Message:
        """
        Send a message to another agent.
        
        Args:
            message: The message to send
            
        Returns:
            The sent message (possibly with additional metadata)
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def receive_message(self, message: Message) -> Optional[Message]:
        """
        Handle a received message.
        
        Args:
            message: The received message
            
        Returns:
            An optional response message
        """
        raise NotImplementedError()


class ToolUseCapability(Capability):
    """
    Base class for tool use capabilities.
    
    Tool use capabilities enable agents to use external tools to perform
    actions in the environment.
    """
    
    CAPABILITY = AgentCapability.TOOL_USE
    
    @abstractmethod
    async def use_tool(self, tool_name: str, **parameters) -> Any:
        """
        Use a tool with the given parameters.
        
        Args:
            tool_name: Name of the tool to use
            **parameters: Parameters for the tool
            
        Returns:
            Result of the tool execution
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def register_tool(self, tool_name: str, tool_function: Callable, description: str) -> bool:
        """
        Register a tool for use by the agent.
        
        Args:
            tool_name: Name of the tool
            tool_function: Function implementing the tool
            description: Description of the tool
            
        Returns:
            True if the tool was registered, False otherwise
        """
        raise NotImplementedError()
    
    @abstractmethod
    def list_tools(self) -> List[Dict[str, Any]]:
        """
        List all tools available to the agent.
        
        Returns:
            List of tool descriptions
        """
        raise NotImplementedError()


class MemoryCapability(Capability):
    """
    Base class for memory capabilities.
    
    Memory capabilities enable agents to store and retrieve information
    over time, maintaining state and knowledge.
    """
    
    CAPABILITY = AgentCapability.MEMORY
    
    @abstractmethod
    async def remember(self, key: str, value: Any = None) -> Any:
        """
        Store or retrieve a value from the agent's memory.
        
        Args:
            key: Key to store or retrieve
            value: Value to store (if None, retrieves the value)
            
        Returns:
            The stored or retrieved value
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def forget(self, key: str) -> bool:
        """
        Remove a value from the agent's memory.
        
        Args:
            key: Key to remove
            
        Returns:
            True if the value was removed, False otherwise
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def get_keys(self) -> List[str]:
        """
        Get all keys in the agent's memory.
        
        Returns:
            List of keys
        """
        raise NotImplementedError()


class ReflectionCapability(Capability):
    """
    Base class for reflection capabilities.
    
    Reflection capabilities enable agents to analyze their own performance,
    adapt their behavior, and learn from experience.
    """
    
    CAPABILITY = AgentCapability.REFLECTION
    
    @abstractmethod
    async def reflect(self) -> Dict[str, Any]:
        """
        Perform self-reflection to analyze the agent's performance and state.
        
        Returns:
            Dictionary with reflection results
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def adapt(self, feedback: Any) -> bool:
        """
        Adapt the agent's behavior based on feedback.
        
        Args:
            feedback: Feedback to adapt to
            
        Returns:
            True if adaptation was successful, False otherwise
        """
        raise NotImplementedError()


class PlanningCapability(Capability):
    """
    Base class for planning capabilities.
    
    Planning capabilities enable agents to create and execute plans to
    achieve goals, coordinating actions over time.
    """
    
    CAPABILITY = AgentCapability.PLANNING
    
    @abstractmethod
    async def create_plan(self, goal: Any, context: Any = None) -> Dict[str, Any]:
        """
        Create a plan to achieve a goal.
        
        Args:
            goal: The goal to achieve
            context: Additional context for planning
            
        Returns:
            Dictionary with the plan
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def execute_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a plan.
        
        Args:
            plan: The plan to execute
            
        Returns:
            Dictionary with execution results
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def update_plan(self, plan: Dict[str, Any], feedback: Any) -> Dict[str, Any]:
        """
        Update a plan based on feedback.
        
        Args:
            plan: The plan to update
            feedback: Feedback to incorporate
            
        Returns:
            Dictionary with the updated plan
        """
        raise NotImplementedError()


class CodeCapability(Capability):
    """
    Base class for code capabilities.
    
    Code capabilities enable agents to generate, understand, and manipulate
    code in various programming languages.
    """
    
    CAPABILITY = AgentCapability.CODE
    
    @abstractmethod
    async def generate_code(self, task_description: str, language: str, context: Any = None) -> Dict[str, Any]:
        """
        Generate code based on a task description.
        
        Args:
            task_description: Description of the task
            language: Programming language to use
            context: Additional context for code generation
            
        Returns:
            Dictionary with generated code and metadata
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def understand_code(self, code: str, language: str) -> Dict[str, Any]:
        """
        Analyze and understand code.
        
        Args:
            code: Code to analyze
            language: Programming language of the code
            
        Returns:
            Dictionary with analysis results
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def modify_code(self, code: str, modification: str, language: str) -> Dict[str, Any]:
        """
        Modify existing code based on a description.
        
        Args:
            code: Code to modify
            modification: Description of the modification
            language: Programming language of the code
            
        Returns:
            Dictionary with modified code and metadata
        """
        raise NotImplementedError()


class ResearchCapability(Capability):
    """
    Base class for research capabilities.
    
    Research capabilities enable agents to gather, synthesize, and analyze
    information from various sources.
    """
    
    CAPABILITY = AgentCapability.RESEARCH
    
    @abstractmethod
    async def search(self, query: str, sources: List[str] = None) -> Dict[str, Any]:
        """
        Search for information based on a query.
        
        Args:
            query: Search query
            sources: List of sources to search (if None, searches all available sources)
            
        Returns:
            Dictionary with search results
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def synthesize(self, information: List[Any]) -> Dict[str, Any]:
        """
        Synthesize information from multiple sources.
        
        Args:
            information: List of information items to synthesize
            
        Returns:
            Dictionary with synthesis results
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def verify(self, information: Any, sources: List[str] = None) -> Dict[str, bool]:
        """
        Verify information against sources.
        
        Args:
            information: Information to verify
            sources: List of sources to check against (if None, checks all available sources)
            
        Returns:
            Dictionary with verification results
        """
        raise NotImplementedError()


class ExpertiseCapability(Capability):
    """
    Base class for expertise capabilities.
    
    Expertise capabilities provide domain-specific knowledge and skills
    to agents, enabling them to perform specialized tasks.
    """
    
    CAPABILITY = AgentCapability.EXPERTISE
    
    def __init__(self, domain: str, **config):
        """
        Initialize the expertise capability.
        
        Args:
            domain: Domain of expertise
            **config: Additional configuration
        """
        super().__init__(**config)
        self.domain = domain
    
    @abstractmethod
    async def provide_expertise(self, query: str) -> Dict[str, Any]:
        """
        Provide domain-specific expertise on a query.
        
        Args:
            query: Query to provide expertise on
            
        Returns:
            Dictionary with expertise results
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def evaluate(self, content: Any) -> Dict[str, Any]:
        """
        Evaluate content using domain expertise.
        
        Args:
            content: Content to evaluate
            
        Returns:
            Dictionary with evaluation results
        """
        raise NotImplementedError()


class CollaborationCapability(Capability):
    """
    Base class for collaboration capabilities.
    
    Collaboration capabilities enable agents to work together,
    coordinate actions, and share information effectively.
    """
    
    CAPABILITY = AgentCapability.COLLABORATION
    
    def __init__(self, **config):
        """
        Initialize the collaboration capability.
        
        Args:
            **config: Configuration parameters for the capability
        """
        super().__init__(**config)
        self._message_handlers = {}
    
    def register_message_handler(self, message_type: MessageType, handler: Callable) -> None:
        """
        Register a handler for a specific message type.
        
        Args:
            message_type: Type of message to handle
            handler: Function to call when a message of this type is received
        """
        self._message_handlers[message_type] = handler
    
    def get_message_handlers(self) -> Dict[MessageType, Callable]:
        """
        Get message handlers for this capability.
        
        Returns:
            Dictionary mapping message types to handler functions
        """
        return self._message_handlers
    
    @abstractmethod
    async def share_information(self, information: Any, recipients: List[str] = None) -> Dict[str, Any]:
        """
        Share information with other agents.
        
        Args:
            information: Information to share
            recipients: List of agent IDs to share with (if None, shares with all connected agents)
            
        Returns:
            Dictionary with sharing results
        """
        raise NotImplementedError()
    
    @abstractmethod
    async def coordinate_action(self, action: str, participants: List[str] = None) -> Dict[str, Any]:
        """
        Coordinate an action with other agents.
        
        Args:
            action: Action to coordinate
            participants: List of agent IDs to coordinate with (if None, coordinates with all connected agents)
            
        Returns:
            Dictionary with coordination results
        """
        raise NotImplementedError()
