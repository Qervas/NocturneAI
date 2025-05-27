"""
Collaborative Agent implementation that leverages the collaboration infrastructure.

This agent extends the intelligent agent with collaboration capabilities
including message passing, knowledge sharing, task delegation, and conflict resolution.
"""

from typing import Dict, Any, List, Optional, Union
from ..core.agent import AgentRole, AgentResponse
from ..core.tools import ToolRegistry
from ..core.memory import MemoryStore
from ..core.llm import BaseLLMProvider
from .intelligent_agent import IntelligentAgent
from ..collaboration.protocol import AgentMessage, MessageType, MessageStatus, CommunicationProtocol
from ..collaboration.knowledge import Entity, EntityType, Relationship, RelationshipType, KnowledgeGraph
from ..collaboration.tasks import Task, TaskStatus, TaskPriority, TaskRegistry
from ..collaboration.conflict import Conflict, ConflictType, ResolutionStrategy, ConflictResolver
import logging
import json
import asyncio
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class CollaborativeAgent(IntelligentAgent):
    """
    Agent with collaboration capabilities for multi-agent systems.
    
    This agent can communicate with other agents, share knowledge,
    delegate and accept tasks, and participate in conflict resolution.
    """
    
    def __init__(
        self,
        role: AgentRole,
        name: str,
        llm_provider: Optional[BaseLLMProvider] = None,
        llm_provider_config: Optional[Dict[str, Any]] = None,
        tool_registry: Optional[ToolRegistry] = None,
        memory_store: Optional[MemoryStore] = None,
        comm_protocol: Optional[CommunicationProtocol] = None,
        knowledge_graph: Optional[KnowledgeGraph] = None,
        task_registry: Optional[TaskRegistry] = None,
        conflict_resolver: Optional[ConflictResolver] = None,
        system_prompt: Optional[str] = None,
        expertise_domains: Optional[Dict[str, float]] = None
    ):
        super().__init__(
            role=role,
            name=name,
            llm_provider=llm_provider,
            llm_provider_config=llm_provider_config,
            tool_registry=tool_registry,
            memory_store=memory_store,
            system_prompt=system_prompt
        )
        
        # Communication protocol
        self.comm_protocol = comm_protocol
        if self.comm_protocol:
            self.comm_protocol.register_agent(self.name, {"role": self.role.value})
        
        # Knowledge graph
        self.knowledge_graph = knowledge_graph
        
        # Task registry
        self.task_registry = task_registry
        if self.task_registry:
            capabilities = list(expertise_domains.keys()) if expertise_domains else []
            self.task_registry.register_agent(self.name, capabilities)
        
        # Conflict resolver
        self.conflict_resolver = conflict_resolver
        
        # Expertise domains for this agent (domain -> expertise level)
        self.expertise_domains = expertise_domains or {}
        if self.conflict_resolver and self.expertise_domains:
            for domain, level in self.expertise_domains.items():
                self.conflict_resolver.set_expertise(domain, self.name, level)
        
        # Message queue for handling messages asynchronously
        self.message_queue = asyncio.Queue()
        
        # Task queue for handling tasks asynchronously
        self.task_queue = asyncio.Queue()
        
        # Running flag
        self.running = False
        
        # Message and task handlers
        self.message_handlers = {
            MessageType.QUERY: self._handle_query,
            MessageType.REQUEST: self._handle_request,
            MessageType.INFORM: self._handle_inform,
            MessageType.PROPOSE: self._handle_propose
        }
    
    async def start(self) -> None:
        """Start the agent's message and task handling loops"""
        if self.running:
            logger.warning(f"Agent {self.name} is already running")
            return
            
        self.running = True
        
        # Start message handling loop
        asyncio.create_task(self._message_loop())
        
        # Start task handling loop
        asyncio.create_task(self._task_loop())
        
        logger.info(f"Agent {self.name} started")
    
    async def stop(self) -> None:
        """Stop the agent's message and task handling loops"""
        self.running = False
        
        # Unregister from collaboration systems
        if self.comm_protocol:
            self.comm_protocol.unregister_agent(self.name)
            
        if self.task_registry:
            self.task_registry.unregister_agent(self.name)
            
        logger.info(f"Agent {self.name} stopped")
    
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Process the input using the LLM and collaboration capabilities"""
        try:
            # Check for collaboration-specific inputs
            if "message" in input_data:
                # Handle incoming message
                message = input_data["message"]
                return await self._process_message(message)
            elif "task" in input_data:
                # Handle assigned task
                task = input_data["task"]
                return await self._process_task(task)
                
            # Standard input processing via parent class
            return await super().process(input_data)
            
        except Exception as e:
            logger.error(f"Error in collaborative agent: {str(e)}", exc_info=True)
            return AgentResponse(
                content=f"Error processing input: {str(e)}",
                metadata={"error": True, "error_message": str(e)}
            )
    
    async def send_message(self, 
                        recipient: str, 
                        content: Dict[str, Any], 
                        message_type: MessageType = MessageType.INFORM,
                        correlation_id: Optional[str] = None,
                        priority: int = 3) -> Optional[str]:
        """Send a message to another agent"""
        if not self.comm_protocol:
            logger.warning(f"Agent {self.name} has no communication protocol")
            return None
            
        message = AgentMessage(
            type=message_type,
            sender=self.name,
            recipient=recipient,
            content=content,
            correlation_id=correlation_id,
            priority=priority
        )
        
        success = await self.comm_protocol.send_message(message)
        if success:
            logger.info(f"Agent {self.name} sent message to {recipient}")
            return message.id
        else:
            logger.warning(f"Agent {self.name} failed to send message to {recipient}")
            return None
    
    async def send_query(self, 
                       recipient: str, 
                       query: str,
                       context: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Send a query to another agent"""
        content = {
            "query": query,
            "context": context or {}
        }
        
        return await self.send_message(
            recipient=recipient,
            content=content,
            message_type=MessageType.QUERY
        )
    
    async def send_request(self,
                         recipient: str,
                         action: str,
                         parameters: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Send an action request to another agent"""
        content = {
            "action": action,
            "parameters": parameters or {}
        }
        
        return await self.send_message(
            recipient=recipient,
            content=content,
            message_type=MessageType.REQUEST
        )
    
    async def broadcast_info(self, 
                          info: Dict[str, Any], 
                          topic: Optional[str] = None) -> Optional[str]:
        """Broadcast information to all agents"""
        content = {
            "info": info,
            "topic": topic
        }
        
        return await self.send_message(
            recipient="all",
            content=content,
            message_type=MessageType.INFORM
        )
    
    async def create_task(self, 
                        title: str,
                        description: str,
                        assignee: Optional[str] = None,
                        priority: TaskPriority = TaskPriority.MEDIUM,
                        dependencies: List[str] = None) -> Optional[str]:
        """Create a new task in the task registry"""
        if not self.task_registry:
            logger.warning(f"Agent {self.name} has no task registry")
            return None
            
        task = Task(
            title=title,
            description=description,
            creator=self.name,
            assignee=assignee,
            priority=priority,
            dependencies=dependencies or []
        )
        
        task_id = self.task_registry.create_task(task)
        
        # If assignee is specified, assign the task
        if assignee and task_id:
            self.task_registry.assign_task(task_id, assignee)
            
            # Notify the assignee
            if self.comm_protocol:
                await self.send_message(
                    recipient=assignee,
                    content={
                        "action": "task_assigned",
                        "task_id": task_id,
                        "task": task.dict()
                    },
                    message_type=MessageType.INFORM
                )
        
        return task_id
    
    async def add_knowledge(self, 
                          entity_name: str,
                          entity_type: EntityType,
                          properties: Dict[str, Any],
                          confidence: float = 1.0) -> Optional[str]:
        """Add knowledge to the shared knowledge graph"""
        if not self.knowledge_graph:
            logger.warning(f"Agent {self.name} has no knowledge graph")
            return None
            
        entity = Entity(
            name=entity_name,
            type=entity_type,
            properties=properties,
            confidence=confidence,
            source=self.name
        )
        
        entity_id = self.knowledge_graph.add_entity(entity)
        return entity_id
    
    async def add_relationship(self,
                             source_name: str,
                             target_name: str,
                             relationship_type: RelationshipType,
                             properties: Optional[Dict[str, Any]] = None,
                             bidirectional: bool = False) -> Optional[str]:
        """Add a relationship to the shared knowledge graph"""
        if not self.knowledge_graph:
            logger.warning(f"Agent {self.name} has no knowledge graph")
            return None
            
        # Get the entities
        source_entity = self.knowledge_graph.get_entity_by_name(source_name)
        if not source_entity:
            logger.warning(f"Source entity {source_name} not found")
            return None
            
        target_entity = self.knowledge_graph.get_entity_by_name(target_name)
        if not target_entity:
            logger.warning(f"Target entity {target_name} not found")
            return None
            
        # Create the relationship
        relationship = Relationship(
            source_id=source_entity.id,
            target_id=target_entity.id,
            type=relationship_type,
            properties=properties or {},
            bidirectional=bidirectional,
            source_agent=self.name
        )
        
        relationship_id = self.knowledge_graph.add_relationship(relationship)
        return relationship_id
    
    async def raise_conflict(self,
                           description: str,
                           conflict_type: ConflictType,
                           resolution_strategy: ResolutionStrategy,
                           options: Dict[str, Dict[str, Any]],
                           participants: List[str],
                           domain: Optional[str] = None) -> Optional[str]:
        """Raise a conflict for resolution"""
        if not self.conflict_resolver:
            logger.warning(f"Agent {self.name} has no conflict resolver")
            return None
            
        conflict = Conflict(
            type=conflict_type,
            description=description,
            resolution_strategy=resolution_strategy,
            participants=participants,
            context={"domain": domain} if domain else {}
        )
        
        # Add options
        for option_id, option_data in options.items():
            conflict.add_option(self.name, option_data)
            
        conflict_id = self.conflict_resolver.create_conflict(conflict)
        
        # Notify participants if communication protocol is available
        if self.comm_protocol:
            for participant in participants:
                if participant != self.name:
                    await self.send_message(
                        recipient=participant,
                        content={
                            "action": "conflict_raised",
                            "conflict_id": conflict_id,
                            "conflict": conflict.dict()
                        },
                        message_type=MessageType.INFORM
                    )
        
        return conflict_id
    
    async def vote_on_conflict(self, conflict_id: str, option_id: str) -> bool:
        """Vote on a conflict option"""
        if not self.conflict_resolver:
            logger.warning(f"Agent {self.name} has no conflict resolver")
            return False
            
        return self.conflict_resolver.vote(conflict_id, self.name, option_id)
    
    async def _message_loop(self) -> None:
        """Background loop for processing incoming messages"""
        while self.running:
            try:
                if not self.comm_protocol:
                    await asyncio.sleep(1)
                    continue
                    
                # Try to receive a message
                message = await self.comm_protocol.receive_message(self.name, timeout=1.0)
                if message:
                    # Put the message in the queue for processing
                    await self.message_queue.put(message)
                    
            except Exception as e:
                logger.error(f"Error in message loop: {str(e)}", exc_info=True)
                await asyncio.sleep(1)
    
    async def _task_loop(self) -> None:
        """Background loop for processing assigned tasks"""
        while self.running:
            try:
                if not self.task_registry:
                    await asyncio.sleep(1)
                    continue
                    
                # Check for task updates
                updated = await self.task_registry.wait_for_updates(timeout=1.0)
                if updated:
                    # Check for tasks assigned to this agent
                    tasks = self.task_registry.get_agent_tasks(self.name)
                    for task in tasks:
                        if task.status == TaskStatus.ASSIGNED:
                            # Put the task in the queue for processing
                            await self.task_queue.put(task)
                            
                            # Mark the task as in progress
                            self.task_registry.start_task(task.id)
                    
            except Exception as e:
                logger.error(f"Error in task loop: {str(e)}", exc_info=True)
                await asyncio.sleep(1)
    
    async def _process_message(self, message: AgentMessage) -> AgentResponse:
        """Process an incoming message"""
        logger.info(f"Agent {self.name} processing message from {message.sender}")
        
        # Use the appropriate handler for the message type
        handler = self.message_handlers.get(message.type)
        if handler:
            response = await handler(message)
        else:
            response = AgentResponse(
                content=f"Received message of type {message.type.name} from {message.sender}",
                metadata={"message_id": message.id}
            )
            
        # Update message status
        message.status = MessageStatus.PROCESSED
        
        return response
    
    async def _process_task(self, task: Task) -> AgentResponse:
        """Process an assigned task"""
        logger.info(f"Agent {self.name} processing task: {task.title}")
        
        # For now, we'll use the LLM to process the task
        input_data = {
            "content": f"Complete the following task: {task.title}\n\nDescription: {task.description}",
            "task_id": task.id,
            "task_context": task.metadata
        }
        
        response = await super().process(input_data)
        
        # Mark the task as completed
        if self.task_registry:
            self.task_registry.complete_task(
                task.id, 
                {"result": response.content, "metadata": response.metadata}
            )
            
        return response
    
    async def _handle_query(self, message: AgentMessage) -> AgentResponse:
        """Handle a query message"""
        query = message.content.get("query", "")
        context = message.content.get("context", {})
        
        # Process the query using the LLM
        input_data = {
            "content": query,
            "context": context,
            "sender": message.sender
        }
        
        response = await super().process(input_data)
        
        # Send a response message
        if self.comm_protocol:
            reply = message.create_reply(
                content={"answer": response.content, "metadata": response.metadata},
                message_type=MessageType.RESPONSE
            )
            await self.comm_protocol.send_message(reply)
            
        return response
    
    async def _handle_request(self, message: AgentMessage) -> AgentResponse:
        """Handle a request message"""
        action = message.content.get("action", "")
        parameters = message.content.get("parameters", {})
        
        # Process the request using the LLM
        input_data = {
            "content": f"Perform the action: {action}",
            "parameters": parameters,
            "sender": message.sender
        }
        
        response = await super().process(input_data)
        
        # Send a response message
        if self.comm_protocol:
            reply = message.create_reply(
                content={"result": response.content, "metadata": response.metadata},
                message_type=MessageType.RESPONSE
            )
            await self.comm_protocol.send_message(reply)
            
        return response
    
    async def _handle_inform(self, message: AgentMessage) -> AgentResponse:
        """Handle an inform message"""
        # Check if this is a special action
        if "action" in message.content:
            action = message.content["action"]
            
            # Task assignment
            if action == "task_assigned" and "task_id" in message.content:
                task_id = message.content["task_id"]
                if self.task_registry:
                    task = self.task_registry.get_task(task_id)
                    if task:
                        await self.task_queue.put(task)
                        return AgentResponse(
                            content=f"Received task assignment: {task.title}",
                            metadata={"task_id": task_id}
                        )
            
            # Conflict raised
            elif action == "conflict_raised" and "conflict_id" in message.content:
                conflict_id = message.content["conflict_id"]
                if self.conflict_resolver:
                    conflict = self.conflict_resolver.get_conflict(conflict_id)
                    if conflict:
                        # Let the LLM decide which option to vote for
                        input_data = {
                            "content": f"Please vote on the following conflict:\n{conflict.description}",
                            "conflict": conflict.dict(),
                            "options": conflict.options
                        }
                        
                        response = await super().process(input_data)
                        
                        # Try to extract the chosen option from the response
                        option_id = None
                        for opt_id in conflict.options.keys():
                            if opt_id in response.content:
                                option_id = opt_id
                                break
                                
                        if option_id:
                            self.conflict_resolver.vote(conflict_id, self.name, option_id)
                            return AgentResponse(
                                content=f"Voted for option {option_id} in conflict {conflict_id}",
                                metadata={"conflict_id": conflict_id, "option_id": option_id}
                            )
                        
                        return AgentResponse(
                            content=f"Received conflict but couldn't determine which option to vote for",
                            metadata={"conflict_id": conflict_id}
                        )
        
        # Regular inform message
        topic = message.content.get("topic", "General Information")
        info = message.content.get("info", {})
        
        # Process the information using the LLM
        input_data = {
            "content": f"New information on topic: {topic}",
            "info": info,
            "sender": message.sender
        }
        
        response = await super().process(input_data)
        
        return AgentResponse(
            content=f"Acknowledged information from {message.sender} on topic: {topic}",
            metadata={"message_id": message.id}
        )
    
    async def _handle_propose(self, message: AgentMessage) -> AgentResponse:
        """Handle a proposal message"""
        proposal = message.content.get("proposal", {})
        
        # Process the proposal using the LLM
        input_data = {
            "content": f"Consider the following proposal from {message.sender}",
            "proposal": proposal,
            "sender": message.sender
        }
        
        response = await super().process(input_data)
        
        # Determine whether to accept or reject
        accept = "accept" in response.content.lower()
        
        # Send a response message
        if self.comm_protocol:
            reply_type = MessageType.ACCEPT if accept else MessageType.REJECT
            reason = response.content
            
            reply = message.create_reply(
                content={"reason": reason, "metadata": response.metadata},
                message_type=reply_type
            )
            await self.comm_protocol.send_message(reply)
            
        return AgentResponse(
            content=f"{'Accepted' if accept else 'Rejected'} proposal from {message.sender}",
            metadata={"message_id": message.id, "accepted": accept}
        )
