"""
Agent Registry for NocturneAI.

The registry maintains a collection of available agents and provides
methods for finding, registering, and communicating with agents.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Set, Type
from datetime import datetime

from .modular_agent import ModularAgent
from .types import AgentRole, Message, MessageType

logger = logging.getLogger(__name__)


class AgentRegistry:
    """
    Registry for managing agents in the NocturneAI system.
    
    The AgentRegistry maintains a collection of available agents and handles
    agent discovery, registration, and communication routing.
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one registry exists"""
        if cls._instance is None:
            cls._instance = super(AgentRegistry, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the agent registry"""
        # Skip initialization if already initialized (singleton pattern)
        if getattr(self, '_initialized', False):
            return
        
        self._agents: Dict[str, ModularAgent] = {}
        self._agent_roles: Dict[AgentRole, List[str]] = {role: [] for role in AgentRole}
        self._message_queue: asyncio.Queue = asyncio.Queue()
        self._router_task = None
        self._running = False
        
        self._initialized = True
        logger.info("Agent registry initialized")
    
    def register_agent(self, agent: ModularAgent) -> bool:
        """
        Register an agent with the registry.
        
        Args:
            agent: The agent to register
            
        Returns:
            True if the agent was registered, False otherwise
        """
        if agent.id in self._agents:
            logger.warning(f"Agent with ID {agent.id} already registered")
            return False
        
        self._agents[agent.id] = agent
        self._agent_roles[agent.role].append(agent.id)
        
        logger.info(f"Registered agent {agent.name} (ID: {agent.id}) with role {agent.role.value}")
        return True
    
    def unregister_agent(self, agent_id: str) -> bool:
        """
        Unregister an agent from the registry.
        
        Args:
            agent_id: ID of the agent to unregister
            
        Returns:
            True if the agent was unregistered, False otherwise
        """
        if agent_id not in self._agents:
            logger.warning(f"Agent with ID {agent_id} not found")
            return False
        
        agent = self._agents[agent_id]
        del self._agents[agent_id]
        
        # Remove from role lists
        if agent.role in self._agent_roles:
            try:
                self._agent_roles[agent.role].remove(agent_id)
            except ValueError:
                pass
        
        logger.info(f"Unregistered agent {agent.name} (ID: {agent_id})")
        return True
    
    def get_agent(self, agent_id: str) -> Optional[ModularAgent]:
        """
        Get an agent by ID.
        
        Args:
            agent_id: ID of the agent to get
            
        Returns:
            The agent, or None if not found
        """
        return self._agents.get(agent_id)
    
    def get_agents_by_role(self, role: AgentRole) -> List[ModularAgent]:
        """
        Get all agents with a specific role.
        
        Args:
            role: The role to filter by
            
        Returns:
            List of agents with the specified role
        """
        agent_ids = self._agent_roles.get(role, [])
        return [self._agents[agent_id] for agent_id in agent_ids if agent_id in self._agents]
    
    def get_all_agents(self) -> List[ModularAgent]:
        """
        Get all registered agents.
        
        Returns:
            List of all agents
        """
        return list(self._agents.values())
    
    def get_agent_count(self) -> int:
        """
        Get the number of registered agents.
        
        Returns:
            Number of agents
        """
        return len(self._agents)
    
    async def start_router(self) -> None:
        """
        Start the message routing task.
        
        This method starts an asyncio task that handles message routing between agents.
        """
        if self._running:
            logger.warning("Message router is already running")
            return
        
        self._running = True
        self._router_task = asyncio.create_task(self._message_router())
        logger.info("Started message router")
    
    async def stop_router(self) -> None:
        """
        Stop the message routing task.
        
        This method stops the message routing task.
        """
        if not self._running:
            logger.warning("Message router is not running")
            return
        
        self._running = False
        if self._router_task:
            self._router_task.cancel()
            try:
                await self._router_task
            except asyncio.CancelledError:
                pass
            self._router_task = None
        logger.info("Stopped message router")
    
    async def _message_router(self) -> None:
        """
        Message routing task.
        
        This task handles message routing between agents.
        """
        try:
            while self._running:
                # Get the next message from the queue
                message = await self._message_queue.get()
                
                # Get the recipient agent
                if not message.receiver_id:
                    logger.warning(f"Message has no receiver ID: {message.id}")
                    self._message_queue.task_done()
                    continue
                
                recipient = self.get_agent(message.receiver_id)
                if not recipient:
                    logger.warning(f"Recipient agent {message.receiver_id} not found for message {message.id}")
                    self._message_queue.task_done()
                    continue
                
                # Handle the message
                try:
                    await recipient.handle_message(message)
                except Exception as e:
                    logger.error(f"Error handling message {message.id}: {str(e)}", exc_info=True)
                
                # Mark the message as done
                self._message_queue.task_done()
        except asyncio.CancelledError:
            logger.info("Message router task cancelled")
        except Exception as e:
            logger.error(f"Error in message router: {str(e)}", exc_info=True)
    
    async def route_message(self, message: Message) -> None:
        """
        Route a message to its recipient.
        
        Args:
            message: The message to route
        """
        await self._message_queue.put(message)
    
    async def broadcast_message(
        self,
        sender_id: str,
        content: Any,
        message_type: MessageType = MessageType.INFO,
        role: Optional[AgentRole] = None
    ) -> int:
        """
        Broadcast a message to multiple agents.
        
        Args:
            sender_id: ID of the sending agent
            content: Message content
            message_type: Type of message
            role: Optional role filter (if provided, message is only sent to agents with this role)
            
        Returns:
            Number of agents the message was sent to
        """
        # Get the sender agent
        sender = self.get_agent(sender_id)
        if not sender:
            logger.warning(f"Sender agent {sender_id} not found")
            return 0
        
        # Get the recipients
        recipients = self.get_agents_by_role(role) if role else self.get_all_agents()
        
        # Filter out the sender
        recipients = [agent for agent in recipients if agent.id != sender_id]
        
        # Send the message to each recipient
        count = 0
        for recipient in recipients:
            try:
                await sender.send_message(
                    receiver_id=recipient.id,
                    content=content,
                    message_type=message_type
                )
                count += 1
            except Exception as e:
                logger.error(f"Error sending message to {recipient.id}: {str(e)}", exc_info=True)
        
        return count
    
    async def cleanup(self) -> None:
        """
        Clean up the registry.
        
        This method stops the message router and cleans up all registered agents.
        """
        # Stop the message router
        await self.stop_router()
        
        # Clean up all agents
        for agent_id, agent in list(self._agents.items()):
            try:
                await agent.cleanup()
            except Exception as e:
                logger.error(f"Error cleaning up agent {agent_id}: {str(e)}", exc_info=True)
            
            # Unregister the agent
            self.unregister_agent(agent_id)
        
        logger.info("Agent registry cleaned up")
