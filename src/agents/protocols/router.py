"""
Message routing system for NocturneAI agents.

This module provides a message routing system for agent communication,
handling message delivery, queuing, and broadcasting.
"""

import asyncio
import logging
from enum import Enum
from typing import Dict, Any, List, Optional, Set, Callable, Union
import uuid
from datetime import datetime, timedelta

from .message import Message, MessageType, MessageProtocol

logger = logging.getLogger(__name__)


class DeliveryStatus(Enum):
    """Status of message delivery"""
    PENDING = "pending"        # Message is pending delivery
    DELIVERED = "delivered"    # Message was delivered successfully
    FAILED = "failed"          # Message delivery failed
    EXPIRED = "expired"        # Message expired before delivery
    CANCELLED = "cancelled"    # Message delivery was cancelled


class MessageQueue:
    """
    Queue for agent messages.
    
    This class provides a message queue for an agent, handling
    incoming and outgoing messages.
    """
    
    def __init__(self, agent_id: str, max_size: int = 1000):
        """
        Initialize the message queue.
        
        Args:
            agent_id: ID of the agent this queue belongs to
            max_size: Maximum queue size
        """
        self.agent_id = agent_id
        self.max_size = max_size
        self.incoming_queue = asyncio.Queue(maxsize=max_size)
        self.outgoing_queue = asyncio.Queue(maxsize=max_size)
        self.history: List[Message] = []
        self.max_history = 1000  # Maximum number of messages to keep in history
        
        self._listeners: Dict[str, Callable] = {}
        
        logger.debug(f"Initialized message queue for agent {agent_id}")
    
    async def enqueue_incoming(self, message: Message) -> bool:
        """
        Add a message to the incoming queue.
        
        Args:
            message: The message to add
            
        Returns:
            True if the message was added, False otherwise
        """
        if self.incoming_queue.full():
            logger.warning(f"Incoming queue full for agent {self.agent_id}, dropping message {message.id}")
            return False
        
        await self.incoming_queue.put(message)
        logger.debug(f"Enqueued incoming message {message.id} for agent {self.agent_id}")
        
        # Notify listeners
        await self._notify_listeners("incoming", message)
        
        return True
    
    async def enqueue_outgoing(self, message: Message) -> bool:
        """
        Add a message to the outgoing queue.
        
        Args:
            message: The message to add
            
        Returns:
            True if the message was added, False otherwise
        """
        if self.outgoing_queue.full():
            logger.warning(f"Outgoing queue full for agent {self.agent_id}, dropping message {message.id}")
            return False
        
        await self.outgoing_queue.put(message)
        logger.debug(f"Enqueued outgoing message {message.id} from agent {self.agent_id}")
        
        # Notify listeners
        await self._notify_listeners("outgoing", message)
        
        return True
    
    async def get_incoming(self, timeout: Optional[float] = None) -> Optional[Message]:
        """
        Get a message from the incoming queue.
        
        Args:
            timeout: Optional timeout in seconds
            
        Returns:
            The next message, or None if timeout
        """
        try:
            if timeout is None:
                message = await self.incoming_queue.get()
                self.incoming_queue.task_done()
                return message
            else:
                message = await asyncio.wait_for(self.incoming_queue.get(), timeout)
                self.incoming_queue.task_done()
                return message
        except asyncio.TimeoutError:
            return None
    
    async def get_outgoing(self, timeout: Optional[float] = None) -> Optional[Message]:
        """
        Get a message from the outgoing queue.
        
        Args:
            timeout: Optional timeout in seconds
            
        Returns:
            The next message, or None if timeout
        """
        try:
            if timeout is None:
                message = await self.outgoing_queue.get()
                self.outgoing_queue.task_done()
                return message
            else:
                message = await asyncio.wait_for(self.outgoing_queue.get(), timeout)
                self.outgoing_queue.task_done()
                return message
        except asyncio.TimeoutError:
            return None
    
    def add_to_history(self, message: Message) -> None:
        """
        Add a message to the history.
        
        Args:
            message: The message to add
        """
        self.history.append(message)
        
        # Trim history if needed
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
    
    def get_history(self, limit: Optional[int] = None) -> List[Message]:
        """
        Get message history.
        
        Args:
            limit: Optional limit on number of messages to return
            
        Returns:
            List of messages
        """
        if limit is None:
            return self.history
        return self.history[-limit:]
    
    def get_thread_history(self, thread_id: str, limit: Optional[int] = None) -> List[Message]:
        """
        Get message history for a thread.
        
        Args:
            thread_id: ID of the thread
            limit: Optional limit on number of messages to return
            
        Returns:
            List of messages in the thread
        """
        thread_messages = [msg for msg in self.history if msg.thread_id == thread_id]
        
        if limit is None:
            return thread_messages
        return thread_messages[-limit:]
    
    def register_listener(self, listener_id: str, callback: Callable) -> None:
        """
        Register a listener for queue events.
        
        Args:
            listener_id: ID for the listener
            callback: Callback function
        """
        self._listeners[listener_id] = callback
        logger.debug(f"Registered listener {listener_id} for agent {self.agent_id}")
    
    def unregister_listener(self, listener_id: str) -> bool:
        """
        Unregister a listener.
        
        Args:
            listener_id: ID of the listener to unregister
            
        Returns:
            True if the listener was unregistered, False otherwise
        """
        if listener_id in self._listeners:
            del self._listeners[listener_id]
            logger.debug(f"Unregistered listener {listener_id} for agent {self.agent_id}")
            return True
        return False
    
    async def _notify_listeners(self, event_type: str, message: Message) -> None:
        """
        Notify listeners of an event.
        
        Args:
            event_type: Type of event
            message: The message involved
        """
        for listener_id, callback in self._listeners.items():
            try:
                await callback(event_type, message)
            except Exception as e:
                logger.error(f"Error notifying listener {listener_id}: {str(e)}", exc_info=True)


class MessageRouter:
    """
    Router for agent messages.
    
    This class handles message routing between agents, including
    direct messages, broadcasts, and subscriptions.
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one router exists"""
        if cls._instance is None:
            cls._instance = super(MessageRouter, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the message router"""
        # Skip initialization if already initialized (singleton pattern)
        if getattr(self, '_initialized', False):
            return
        
        self._queues: Dict[str, MessageQueue] = {}
        self._subscriptions: Dict[str, Set[str]] = {}  # Topic -> Set of agent IDs
        self._router_task = None
        self._running = False
        self._delivery_status: Dict[str, DeliveryStatus] = {}
        self._pending_messages: Dict[str, Message] = {}
        self._ttl: Dict[str, datetime] = {}  # Message ID -> Expiration time
        
        self._initialized = True
        logger.info("Message router initialized")
    
    async def start(self) -> None:
        """
        Start the message router.
        
        This method starts the router task that handles message routing.
        """
        if self._running:
            logger.warning("Message router is already running")
            return
        
        self._running = True
        self._router_task = asyncio.create_task(self._router_loop())
        logger.info("Started message router")
    
    async def stop(self) -> None:
        """
        Stop the message router.
        
        This method stops the router task.
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
    
    def register_agent(self, agent_id: str, max_queue_size: int = 1000) -> bool:
        """
        Register an agent with the router.
        
        Args:
            agent_id: ID of the agent to register
            max_queue_size: Maximum queue size for the agent
            
        Returns:
            True if the agent was registered, False otherwise
        """
        if agent_id in self._queues:
            logger.warning(f"Agent {agent_id} already registered with router")
            return False
        
        self._queues[agent_id] = MessageQueue(agent_id, max_queue_size)
        logger.info(f"Registered agent {agent_id} with router")
        return True
    
    def unregister_agent(self, agent_id: str) -> bool:
        """
        Unregister an agent from the router.
        
        Args:
            agent_id: ID of the agent to unregister
            
        Returns:
            True if the agent was unregistered, False otherwise
        """
        if agent_id not in self._queues:
            logger.warning(f"Agent {agent_id} not registered with router")
            return False
        
        # Unsubscribe from all topics
        for topic, subscribers in list(self._subscriptions.items()):
            if agent_id in subscribers:
                subscribers.remove(agent_id)
                if not subscribers:
                    del self._subscriptions[topic]
        
        # Remove queue
        del self._queues[agent_id]
        
        logger.info(f"Unregistered agent {agent_id} from router")
        return True
    
    def subscribe(self, agent_id: str, topic: str) -> bool:
        """
        Subscribe an agent to a topic.
        
        Args:
            agent_id: ID of the agent
            topic: Topic to subscribe to
            
        Returns:
            True if the agent was subscribed, False otherwise
        """
        if agent_id not in self._queues:
            logger.warning(f"Agent {agent_id} not registered with router")
            return False
        
        if topic not in self._subscriptions:
            self._subscriptions[topic] = set()
        
        self._subscriptions[topic].add(agent_id)
        logger.info(f"Agent {agent_id} subscribed to topic {topic}")
        return True
    
    def unsubscribe(self, agent_id: str, topic: str) -> bool:
        """
        Unsubscribe an agent from a topic.
        
        Args:
            agent_id: ID of the agent
            topic: Topic to unsubscribe from
            
        Returns:
            True if the agent was unsubscribed, False otherwise
        """
        if topic not in self._subscriptions:
            logger.warning(f"Topic {topic} does not exist")
            return False
        
        if agent_id not in self._subscriptions[topic]:
            logger.warning(f"Agent {agent_id} not subscribed to topic {topic}")
            return False
        
        self._subscriptions[topic].remove(agent_id)
        
        # Remove empty topics
        if not self._subscriptions[topic]:
            del self._subscriptions[topic]
        
        logger.info(f"Agent {agent_id} unsubscribed from topic {topic}")
        return True
    
    def get_subscribers(self, topic: str) -> Set[str]:
        """
        Get subscribers to a topic.
        
        Args:
            topic: Topic to get subscribers for
            
        Returns:
            Set of agent IDs subscribed to the topic
        """
        return self._subscriptions.get(topic, set())
    
    def get_topics(self) -> Set[str]:
        """
        Get all topics.
        
        Returns:
            Set of all topics
        """
        return set(self._subscriptions.keys())
    
    def get_agent_topics(self, agent_id: str) -> Set[str]:
        """
        Get topics an agent is subscribed to.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            Set of topics the agent is subscribed to
        """
        return {topic for topic, subscribers in self._subscriptions.items() if agent_id in subscribers}
    
    async def send_message(self, message: Message, ttl: Optional[float] = None) -> str:
        """
        Send a message to its recipient.
        
        Args:
            message: The message to send
            ttl: Time-to-live in seconds (if None, message never expires)
            
        Returns:
            Message ID
        """
        # Validate message
        if not MessageProtocol.validate_message(message):
            logger.error(f"Invalid message {message.id}")
            self._delivery_status[message.id] = DeliveryStatus.FAILED
            return message.id
        
        # Set TTL if provided
        if ttl is not None:
            self._ttl[message.id] = datetime.now() + timedelta(seconds=ttl)
        
        # Get sender queue
        sender_queue = self._queues.get(message.sender_id)
        if sender_queue:
            # Add to outgoing queue
            await sender_queue.enqueue_outgoing(message)
            sender_queue.add_to_history(message)
        
        # Store pending message
        self._pending_messages[message.id] = message
        self._delivery_status[message.id] = DeliveryStatus.PENDING
        
        # If the router is running, it will handle the message
        # Otherwise, enqueue directly
        if not self._running:
            await self._route_message(message)
        
        return message.id
    
    async def broadcast(
        self,
        sender_id: str,
        topic: str,
        content: Any,
        message_type: Union[MessageType, str] = MessageType.INFORMATION,
        metadata: Optional[Dict[str, Any]] = None,
        ttl: Optional[float] = None
    ) -> str:
        """
        Broadcast a message to a topic.
        
        Args:
            sender_id: ID of the sender
            topic: Topic to broadcast to
            content: Message content
            message_type: Type of message
            metadata: Additional metadata
            ttl: Time-to-live in seconds (if None, message never expires)
            
        Returns:
            Message ID
        """
        # Create metadata with topic
        msg_metadata = {"topic": topic}
        if metadata:
            msg_metadata.update(metadata)
        
        # Create message
        message = MessageProtocol.create_message(
            sender_id=sender_id,
            sender_type="agent",
            content=content,
            message_type=message_type,
            metadata=msg_metadata
        )
        
        # Set TTL if provided
        if ttl is not None:
            self._ttl[message.id] = datetime.now() + timedelta(seconds=ttl)
        
        # Get sender queue
        sender_queue = self._queues.get(sender_id)
        if sender_queue:
            # Add to outgoing queue
            await sender_queue.enqueue_outgoing(message)
            sender_queue.add_to_history(message)
        
        # Store pending message
        self._pending_messages[message.id] = message
        self._delivery_status[message.id] = DeliveryStatus.PENDING
        
        # Get subscribers
        subscribers = self.get_subscribers(topic)
        
        # If no subscribers, mark as delivered
        if not subscribers:
            self._delivery_status[message.id] = DeliveryStatus.DELIVERED
            del self._pending_messages[message.id]
            return message.id
        
        # If the router is running, it will handle the message
        # Otherwise, broadcast directly
        if not self._running:
            for agent_id in subscribers:
                # Skip sender
                if agent_id == sender_id:
                    continue
                
                # Get agent queue
                agent_queue = self._queues.get(agent_id)
                if not agent_queue:
                    continue
                
                # Enqueue message
                await agent_queue.enqueue_incoming(message)
                agent_queue.add_to_history(message)
            
            # Mark as delivered
            self._delivery_status[message.id] = DeliveryStatus.DELIVERED
            del self._pending_messages[message.id]
        
        return message.id
    
    async def get_messages(self, agent_id: str, timeout: Optional[float] = None) -> List[Message]:
        """
        Get messages for an agent.
        
        Args:
            agent_id: ID of the agent
            timeout: Optional timeout in seconds
            
        Returns:
            List of messages
        """
        if agent_id not in self._queues:
            logger.warning(f"Agent {agent_id} not registered with router")
            return []
        
        queue = self._queues[agent_id]
        messages = []
        
        # Get messages until queue is empty or timeout
        try:
            while True:
                message = await queue.get_incoming(timeout)
                if message is None:
                    break
                messages.append(message)
                
                # If timeout is specified, set it to 0 for subsequent calls
                # to check if there are more messages without waiting
                if timeout is not None:
                    timeout = 0
        except asyncio.TimeoutError:
            pass
        
        return messages
    
    def get_delivery_status(self, message_id: str) -> Optional[DeliveryStatus]:
        """
        Get the delivery status of a message.
        
        Args:
            message_id: ID of the message
            
        Returns:
            Delivery status, or None if not found
        """
        return self._delivery_status.get(message_id)
    
    def cancel_message(self, message_id: str) -> bool:
        """
        Cancel a pending message.
        
        Args:
            message_id: ID of the message to cancel
            
        Returns:
            True if the message was cancelled, False otherwise
        """
        if message_id not in self._pending_messages:
            logger.warning(f"Message {message_id} not found")
            return False
        
        if self._delivery_status.get(message_id) != DeliveryStatus.PENDING:
            logger.warning(f"Message {message_id} is not pending")
            return False
        
        # Remove message
        del self._pending_messages[message_id]
        self._delivery_status[message_id] = DeliveryStatus.CANCELLED
        
        # Remove TTL
        if message_id in self._ttl:
            del self._ttl[message_id]
        
        logger.info(f"Cancelled message {message_id}")
        return True
    
    async def _route_message(self, message: Message) -> bool:
        """
        Route a message to its recipient.
        
        Args:
            message: The message to route
            
        Returns:
            True if the message was routed, False otherwise
        """
        # Check if message has expired
        if message.id in self._ttl and datetime.now() > self._ttl[message.id]:
            logger.warning(f"Message {message.id} expired")
            self._delivery_status[message.id] = DeliveryStatus.EXPIRED
            if message.id in self._pending_messages:
                del self._pending_messages[message.id]
            if message.id in self._ttl:
                del self._ttl[message.id]
            return False
        
        # Handle broadcast message
        if MessageProtocol.is_broadcast(message):
            # Get topic from metadata
            topic = message.metadata.get("topic")
            if not topic:
                logger.warning(f"Broadcast message {message.id} has no topic")
                self._delivery_status[message.id] = DeliveryStatus.FAILED
                if message.id in self._pending_messages:
                    del self._pending_messages[message.id]
                return False
            
            # Get subscribers
            subscribers = self.get_subscribers(topic)
            
            # Deliver to subscribers
            for agent_id in subscribers:
                # Skip sender
                if agent_id == message.sender_id:
                    continue
                
                # Get agent queue
                agent_queue = self._queues.get(agent_id)
                if not agent_queue:
                    continue
                
                # Enqueue message
                await agent_queue.enqueue_incoming(message)
                agent_queue.add_to_history(message)
            
            # Mark as delivered
            self._delivery_status[message.id] = DeliveryStatus.DELIVERED
            if message.id in self._pending_messages:
                del self._pending_messages[message.id]
            if message.id in self._ttl:
                del self._ttl[message.id]
            
            return True
        
        # Handle direct message
        receiver_id = message.receiver_id
        if not receiver_id:
            logger.warning(f"Message {message.id} has no receiver")
            self._delivery_status[message.id] = DeliveryStatus.FAILED
            if message.id in self._pending_messages:
                del self._pending_messages[message.id]
            return False
        
        # Get receiver queue
        receiver_queue = self._queues.get(receiver_id)
        if not receiver_queue:
            logger.warning(f"Receiver {receiver_id} not found for message {message.id}")
            self._delivery_status[message.id] = DeliveryStatus.FAILED
            if message.id in self._pending_messages:
                del self._pending_messages[message.id]
            return False
        
        # Enqueue message
        await receiver_queue.enqueue_incoming(message)
        receiver_queue.add_to_history(message)
        
        # Mark as delivered
        self._delivery_status[message.id] = DeliveryStatus.DELIVERED
        if message.id in self._pending_messages:
            del self._pending_messages[message.id]
        if message.id in self._ttl:
            del self._ttl[message.id]
        
        return True
    
    async def _router_loop(self) -> None:
        """Router loop that handles message routing"""
        try:
            while self._running:
                # Process pending messages
                for message_id, message in list(self._pending_messages.items()):
                    await self._route_message(message)
                
                # Process outgoing queues
                for agent_id, queue in self._queues.items():
                    # Get outgoing messages
                    while not queue.outgoing_queue.empty():
                        message = await queue.get_outgoing(timeout=0)
                        if message:
                            # Route the message
                            await self._route_message(message)
                
                # Wait a bit to avoid busy waiting
                await asyncio.sleep(0.01)
        except asyncio.CancelledError:
            logger.info("Router loop cancelled")
        except Exception as e:
            logger.error(f"Error in router loop: {str(e)}", exc_info=True)
    
    async def cleanup(self) -> None:
        """
        Clean up the router.
        
        This method stops the router and cleans up all resources.
        """
        # Stop the router
        await self.stop()
        
        # Clear all data
        self._queues.clear()
        self._subscriptions.clear()
        self._delivery_status.clear()
        self._pending_messages.clear()
        self._ttl.clear()
        
        logger.info("Message router cleaned up")
