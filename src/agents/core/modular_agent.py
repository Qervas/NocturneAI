"""
Modular Agent Implementation.

This module provides a highly modular agent architecture that can dynamically
compose capabilities and generate workflows during task planning.
"""

from typing import Dict, List, Set, Any, Optional, Type, Union
import logging
import asyncio
import inspect
import uuid
from datetime import datetime

from ...llm import BaseLLMProvider
from .types import AgentRole, AgentCapability
from ..capabilities.base import Capability
from ..capabilities.communication import BasicCommunication

logger = logging.getLogger(__name__)

class ModularAgent:
    """
    A modular agent that can dynamically compose capabilities.
    
    This agent architecture focuses on being a single autonomous entity
    that can dynamically add and use capabilities based on the task at hand.
    Workflows are generated at runtime during task planning rather than
    being hardcoded.
    """
    
    def __init__(
        self,
        agent_id: Optional[str] = None,
        name: str = "ModularAgent",
        description: str = "A modular agent with dynamic capabilities",
        role: AgentRole = AgentRole.ASSISTANT,
        llm_provider: Optional[BaseLLMProvider] = None,
        capabilities: Optional[List[Capability]] = None,
        config: Dict[str, Any] = None
    ):
        # Agent identity
        self.agent_id = agent_id or str(uuid.uuid4())
        self.name = name
        self.description = description
        self.role = role
        
        # Core components
        self.llm_provider = llm_provider
        self.capabilities: Dict[str, Capability] = {}
        self.capability_types: Set[AgentCapability] = set()
        self.config = config or {}
        
        # State
        self.context: Dict[str, Any] = {}
        self.active: bool = False
        self.created_at = datetime.now()
        
        # Add default communication capability
        self._add_default_capabilities()
        
        # Add additional capabilities if provided
        if capabilities:
            for capability in capabilities:
                self.add_capability(capability)
    
    def _add_default_capabilities(self) -> None:
        """Add default capabilities that all agents should have"""
        # All agents should be able to communicate
        comm = BasicCommunication(agent_id=self.agent_id)
        self.add_capability(comm)
    
    def add_capability(self, capability: Capability) -> None:
        """
        Add a capability to the agent.
        
        Args:
            capability: The capability to add
        """
        capability_name = capability.__class__.__name__
        
        # Check if this capability is already added
        if capability_name in self.capabilities:
            logger.warning(f"Capability {capability_name} already exists, replacing")
        
        # Add the capability
        self.capabilities[capability_name] = capability
        
        # Add the capability type to our set of capabilities
        if hasattr(capability, 'CAPABILITY') and capability.CAPABILITY:
            self.capability_types.add(capability.CAPABILITY)
            
        logger.debug(f"Added capability {capability_name} to agent {self.name}")
    
    def remove_capability(self, capability_name: str) -> None:
        """
        Remove a capability from the agent.
        
        Args:
            capability_name: Name of the capability to remove
        """
        if capability_name not in self.capabilities:
            logger.warning(f"Capability {capability_name} not found, cannot remove")
            return
            
        # Clean up the capability
        capability = self.capabilities[capability_name]
        
        # Remove from the agent
        del self.capabilities[capability_name]
        
        # Update capability types
        self.capability_types = set()
        for cap in self.capabilities.values():
            if hasattr(cap, 'CAPABILITY') and cap.CAPABILITY:
                self.capability_types.add(cap.CAPABILITY)
                
        logger.debug(f"Removed capability {capability_name} from agent {self.name}")
    
    def has_capability(self, capability_name: str) -> bool:
        """
        Check if the agent has a specific capability.
        
        Args:
            capability_name: Name of the capability to check
            
        Returns:
            True if the agent has the capability, False otherwise
        """
        return capability_name in self.capabilities
    
    def get_capability(self, capability_name: str) -> Optional[AgentCapability]:
        """
        Get a capability by name.
        
        Args:
            capability_name: Name of the capability to get
            
        Returns:
            The capability if found, None otherwise
        """
        return self.capabilities.get(capability_name)
    
    async def initialize(self) -> None:
        """
        Initialize the agent and all its capabilities.
        
        This method should be called before using the agent.
        """
        logger.info(f"Initializing agent {self.name}")
        
        # Initialize all capabilities
        for capability_name, capability in self.capabilities.items():
            try:
                await capability.initialize(self)
                logger.debug(f"Initialized capability {capability_name}")
            except Exception as e:
                logger.error(f"Failed to initialize capability {capability_name}: {e}")
                raise
        
        self.active = True
        logger.info(f"Agent {self.name} initialized")
    
    async def process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a task using the agent's capabilities.
        
        This is the main entry point for giving the agent work to do.
        The agent will use its capabilities to plan and execute the task.
        
        Args:
            task: The task to process
            
        Returns:
            The result of processing the task
        """
        if not self.active:
            await self.initialize()
        
        task_id = task.get('id', str(uuid.uuid4()))
        task_type = task.get('type', 'generic')
        task_description = task.get('description', '')
        
        logger.info(f"Processing task {task_id}: {task_description}")
        
        # Use planning capability if available to generate a workflow
        if self.has_capability('PlanningCapability'):
            planning = self.get_capability('PlanningCapability')
            
            # Generate a plan for the task
            plan = await planning.create_plan(
                goal=task_description,
                context=task.get('context', {})
            )
            
            # Execute the plan
            result = await planning.execute_plan(plan['id'])
            return result
        else:
            # If no planning capability, use the agent's LLM to process directly
            if not self.llm_provider:
                raise ValueError("Agent has no LLM provider and no planning capability")
            
            # Direct LLM processing
            messages = [
                {"role": "system", "content": f"You are {self.name}, {self.description}. Process the following task."},
                {"role": "user", "content": task_description}
            ]
            
            response = await self.llm_provider.generate(messages)
            return {
                "task_id": task_id,
                "result": response.content,
                "status": "completed"
            }
    
    async def receive_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Receive and process a message from another agent or system.
        
        Args:
            message: The message to process
            
        Returns:
            An optional response message
        """
        # Check if we have a communication capability
        if not self.has_capability('BasicCommunication'):
            logger.warning(f"Agent {self.name} cannot receive messages (no communication capability)")
            return None
        
        # Use the communication capability to process the message
        comm = self.get_capability('BasicCommunication')
        return await comm.receive_message(message)
    
    async def cleanup(self) -> None:
        """
        Clean up the agent and all its capabilities.
        
        This method should be called when the agent is no longer needed.
        """
        logger.info(f"Cleaning up agent {self.name}")
        
        # Clean up all capabilities
        for capability_name, capability in list(self.capabilities.items()):
            try:
                await capability.cleanup()
                logger.debug(f"Cleaned up capability {capability_name}")
            except Exception as e:
                logger.error(f"Failed to clean up capability {capability_name}: {e}")
        
        self.active = False
        logger.info(f"Agent {self.name} cleaned up")
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the agent to a dictionary representation.
        
        Returns:
            A dictionary representation of the agent
        """
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "description": self.description,
            "role": self.role,
            "capabilities": list(self.capabilities.keys()),
            "capability_types": [cap.value for cap in self.capability_types],
            "active": self.active,
            "created_at": self.created_at.isoformat(),
            "config": self.config
        }
    
    @classmethod
    async def create(
        cls,
        name: str,
        description: str,
        capability_types: List[Type[Capability]],
        role: AgentRole = AgentRole.ASSISTANT,
        llm_provider: Optional[BaseLLMProvider] = None,
        config: Dict[str, Any] = None
    ) -> 'ModularAgent':
        """
        Create and initialize a new modular agent with the specified capabilities.
        
        Args:
            name: Name of the agent
            description: Description of the agent
            capability_types: List of capability types to add
            role: Role of the agent
            llm_provider: Optional LLM provider
            config: Optional configuration
            
        Returns:
            An initialized ModularAgent
        """
        # Create the agent
        agent = cls(
            name=name,
            description=description,
            role=role,
            llm_provider=llm_provider,
            config=config
        )
        
        # Add the capabilities
        for capability_type in capability_types:
            # Get the constructor signature
            signature = inspect.signature(capability_type.__init__)
            
            # Check if it accepts agent_id
            if 'agent_id' in signature.parameters:
                capability = capability_type(agent_id=agent.agent_id)
            else:
                capability = capability_type()
                
            agent.add_capability(capability)
        
        # Initialize the agent
        await agent.initialize()
        
        return agent
        
    # For backward compatibility with BaseAgent interface
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process input data using the agent's capabilities.
        
        This provides compatibility with the old BaseAgent interface.
        
        Args:
            input_data: The input data to process
            
        Returns:
            The result of processing the input data
        """
        # Convert input_data to a task
        task = {
            'id': str(uuid.uuid4()),
            'type': input_data.get('type', 'generic'),
            'description': input_data.get('description', str(input_data)),
            'context': input_data
        }
        
        # Process the task
        result = await self.process_task(task)
        
        # Convert result to old format
        return {
            "content": result.get('result', ''),
            "metadata": result.get('metadata', {}),
            "next_agent": input_data.get('next_agent', None)
        }
