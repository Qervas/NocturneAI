"""
Conflict resolution mechanisms for agent collaboration.

This module provides strategies and algorithms for resolving conflicts
between agents, such as contradictory information or competing proposals.
"""

from enum import Enum, auto
from typing import Dict, Any, List, Optional, Set, Tuple, Callable
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone
import logging
import json
import asyncio
from .protocol import AgentMessage, MessageType

logger = logging.getLogger(__name__)

class ConflictType(Enum):
    """Types of conflicts that can occur between agents"""
    FACTUAL = auto()         # Conflict about facts or information
    GOAL = auto()            # Conflict about goals or objectives
    APPROACH = auto()        # Conflict about how to accomplish a task
    RESOURCE = auto()        # Conflict about resource allocation
    PRIORITY = auto()        # Conflict about priorities
    TEMPORAL = auto()        # Conflict about timing or scheduling
    OTHER = auto()           # Other types of conflicts

class ResolutionStrategy(Enum):
    """Strategies for resolving conflicts"""
    VOTING = auto()          # Majority vote decides
    AUTHORITY = auto()       # Designated authority decides
    CONSENSUS = auto()       # All agents must agree
    CONFIDENCE = auto()      # Highest confidence wins
    RECENCY = auto()         # Most recent information wins
    EXPERTISE = auto()       # Most qualified agent decides
    COMPROMISE = auto()      # Middle ground solution
    RANDOM = auto()          # Random selection (tie-breaker)

class Conflict(BaseModel):
    """
    A representation of a conflict between agents.
    
    Conflicts can arise from contradictory information, competing goals,
    or differing approaches to solving problems.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: ConflictType
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolution_strategy: ResolutionStrategy
    participants: List[str] = Field(default_factory=list)  # Agent IDs involved
    options: Dict[str, Dict[str, Any]] = Field(default_factory=dict)  # Option ID -> Option data
    votes: Dict[str, str] = Field(default_factory=dict)  # Agent ID -> Option ID
    resolved: bool = False
    resolution: Optional[Dict[str, Any]] = None
    resolution_time: Optional[datetime] = None
    context: Dict[str, Any] = Field(default_factory=dict)  # Additional context info
    
    def add_option(self, agent_id: str, option_data: Dict[str, Any]) -> str:
        """Add an option to the conflict"""
        option_id = str(uuid.uuid4())
        self.options[option_id] = {
            "agent_id": agent_id,
            "data": option_data,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Add the agent as a participant if not already
        if agent_id not in self.participants:
            self.participants.append(agent_id)
            
        return option_id
    
    def vote(self, agent_id: str, option_id: str) -> bool:
        """Register a vote for an option"""
        if option_id not in self.options:
            logger.warning(f"Option {option_id} not found in conflict {self.id}")
            return False
            
        # Record the vote
        self.votes[agent_id] = option_id
        
        # Add the agent as a participant if not already
        if agent_id not in self.participants:
            self.participants.append(agent_id)
            
        return True
    
    def get_vote_counts(self) -> Dict[str, int]:
        """Get the number of votes for each option"""
        counts = {option_id: 0 for option_id in self.options}
        for option_id in self.votes.values():
            counts[option_id] += 1
        return counts
    
    def resolve(self, resolution: Dict[str, Any]) -> None:
        """Mark the conflict as resolved with a resolution"""
        self.resolved = True
        self.resolution = resolution
        self.resolution_time = datetime.now(timezone.utc)

class ConflictResolver:
    """
    System for resolving conflicts between agents.
    
    This class provides mechanisms for identifying, tracking, and resolving
    conflicts using various strategies such as voting, authority-based
    decision making, or consensus building.
    """
    
    def __init__(self):
        self.conflicts: Dict[str, Conflict] = {}
        self.resolution_strategies: Dict[ResolutionStrategy, Callable] = {
            ResolutionStrategy.VOTING: self._resolve_by_voting,
            ResolutionStrategy.CONFIDENCE: self._resolve_by_confidence,
            ResolutionStrategy.RECENCY: self._resolve_by_recency,
            ResolutionStrategy.RANDOM: self._resolve_randomly
        }
        
        # Default authority agents by domain
        self.authorities: Dict[str, str] = {}
        
        # Default agent expertise levels by domain (0-1 scale)
        self.expertise: Dict[str, Dict[str, float]] = {}
    
    def create_conflict(self, conflict: Conflict) -> str:
        """Register a new conflict"""
        self.conflicts[conflict.id] = conflict
        logger.info(f"Created conflict {conflict.id} of type {conflict.type.name}")
        return conflict.id
    
    def get_conflict(self, conflict_id: str) -> Optional[Conflict]:
        """Get a conflict by ID"""
        return self.conflicts.get(conflict_id)
    
    def add_option(self, conflict_id: str, agent_id: str, option_data: Dict[str, Any]) -> Optional[str]:
        """Add an option to a conflict"""
        conflict = self.conflicts.get(conflict_id)
        if not conflict:
            logger.warning(f"Conflict {conflict_id} not found")
            return None
            
        option_id = conflict.add_option(agent_id, option_data)
        logger.info(f"Added option {option_id} to conflict {conflict_id} from agent {agent_id}")
        return option_id
    
    def vote(self, conflict_id: str, agent_id: str, option_id: str) -> bool:
        """Register a vote for an option in a conflict"""
        conflict = self.conflicts.get(conflict_id)
        if not conflict:
            logger.warning(f"Conflict {conflict_id} not found")
            return False
            
        success = conflict.vote(agent_id, option_id)
        if success:
            logger.info(f"Registered vote from agent {agent_id} for option {option_id} in conflict {conflict_id}")
        return success
    
    def try_resolve(self, conflict_id: str) -> Optional[Dict[str, Any]]:
        """Try to resolve a conflict based on its resolution strategy"""
        conflict = self.conflicts.get(conflict_id)
        if not conflict:
            logger.warning(f"Conflict {conflict_id} not found")
            return None
            
        if conflict.resolved:
            logger.info(f"Conflict {conflict_id} is already resolved")
            return conflict.resolution
            
        # Get the appropriate resolution strategy
        resolver = self.resolution_strategies.get(conflict.resolution_strategy)
        if not resolver:
            logger.warning(f"No resolver found for strategy {conflict.resolution_strategy.name}")
            return None
            
        # Try to resolve the conflict
        resolution = resolver(conflict)
        if resolution:
            conflict.resolve(resolution)
            logger.info(f"Resolved conflict {conflict_id} using strategy {conflict.resolution_strategy.name}")
        
        return resolution
    
    def set_authority(self, domain: str, agent_id: str) -> None:
        """Set an agent as the authority for a domain"""
        self.authorities[domain] = agent_id
        logger.info(f"Set agent {agent_id} as authority for domain {domain}")
    
    def set_expertise(self, domain: str, agent_id: str, level: float) -> None:
        """Set an agent's expertise level for a domain"""
        if domain not in self.expertise:
            self.expertise[domain] = {}
        self.expertise[domain][agent_id] = max(0.0, min(1.0, level))  # Clamp to 0-1
        logger.info(f"Set agent {agent_id} expertise for domain {domain} to {level}")
    
    def _resolve_by_voting(self, conflict: Conflict) -> Optional[Dict[str, Any]]:
        """Resolve a conflict by majority vote"""
        if not conflict.votes:
            logger.info(f"No votes for conflict {conflict.id}")
            return None
            
        vote_counts = conflict.get_vote_counts()
        if not vote_counts:
            return None
            
        # Find option with the most votes
        max_votes = 0
        top_options = []
        
        for option_id, count in vote_counts.items():
            if count > max_votes:
                max_votes = count
                top_options = [option_id]
            elif count == max_votes:
                top_options.append(option_id)
                
        # If there's a tie, try to break it
        if len(top_options) > 1:
            logger.info(f"Tie detected in voting for conflict {conflict.id}")
            # Use the option from the most expert agent if expertise is known
            if conflict.context.get("domain") in self.expertise:
                return self._resolve_by_expertise(conflict, top_options)
            
            # Fall back to random selection for ties
            return self._resolve_randomly(conflict, top_options)
        
        winning_option = top_options[0]
        option_data = conflict.options[winning_option]
        
        return {
            "resolution_type": "voting",
            "winning_option": winning_option,
            "vote_count": max_votes,
            "total_votes": len(conflict.votes),
            "resolved_data": option_data["data"]
        }
    
    def _resolve_by_confidence(self, conflict: Conflict) -> Optional[Dict[str, Any]]:
        """Resolve a conflict based on confidence levels"""
        if not conflict.options:
            return None
            
        max_confidence = -1
        top_option_id = None
        
        for option_id, option_data in conflict.options.items():
            confidence = option_data["data"].get("confidence", 0)
            if confidence > max_confidence:
                max_confidence = confidence
                top_option_id = option_id
                
        if top_option_id:
            option_data = conflict.options[top_option_id]
            return {
                "resolution_type": "confidence",
                "winning_option": top_option_id,
                "confidence": max_confidence,
                "resolved_data": option_data["data"]
            }
            
        return None
    
    def _resolve_by_recency(self, conflict: Conflict) -> Optional[Dict[str, Any]]:
        """Resolve a conflict by using the most recent information"""
        if not conflict.options:
            return None
            
        latest_time = None
        latest_option_id = None
        
        for option_id, option_data in conflict.options.items():
            created_at = datetime.fromisoformat(option_data["created_at"])
            if latest_time is None or created_at > latest_time:
                latest_time = created_at
                latest_option_id = option_id
                
        if latest_option_id:
            option_data = conflict.options[latest_option_id]
            return {
                "resolution_type": "recency",
                "winning_option": latest_option_id,
                "timestamp": option_data["created_at"],
                "resolved_data": option_data["data"]
            }
            
        return None
    
    def _resolve_by_expertise(self, conflict: Conflict, option_ids: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
        """Resolve a conflict based on agent expertise levels"""
        if not conflict.options:
            return None
            
        domain = conflict.context.get("domain")
        if not domain or domain not in self.expertise:
            logger.warning(f"No expertise information for domain {domain}")
            return None
            
        # Filter options if specific options are provided
        options_to_consider = {
            option_id: option_data 
            for option_id, option_data in conflict.options.items()
            if option_ids is None or option_id in option_ids
        }
        
        max_expertise = -1
        top_option_id = None
        
        for option_id, option_data in options_to_consider.items():
            agent_id = option_data["agent_id"]
            expertise = self.expertise[domain].get(agent_id, 0)
            
            if expertise > max_expertise:
                max_expertise = expertise
                top_option_id = option_id
                
        if top_option_id:
            option_data = conflict.options[top_option_id]
            return {
                "resolution_type": "expertise",
                "winning_option": top_option_id,
                "expertise_level": max_expertise,
                "domain": domain,
                "agent_id": option_data["agent_id"],
                "resolved_data": option_data["data"]
            }
            
        return None
    
    def _resolve_randomly(self, conflict: Conflict, option_ids: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
        """Resolve a conflict by random selection (for tie-breaking)"""
        import random
        
        if not conflict.options:
            return None
            
        # Filter options if specific options are provided
        options_to_consider = list(
            option_id for option_id in conflict.options.keys()
            if option_ids is None or option_id in option_ids
        )
        
        if not options_to_consider:
            return None
            
        # Random selection
        selected_option_id = random.choice(options_to_consider)
        option_data = conflict.options[selected_option_id]
        
        return {
            "resolution_type": "random",
            "winning_option": selected_option_id,
            "resolved_data": option_data["data"]
        }
    
    async def resolve_via_messages(self, conflict_id: str, comm_protocol, timeout: float = 30.0) -> Optional[Dict[str, Any]]:
        """
        Resolve a conflict by sending messages to participating agents.
        
        This method uses the communication protocol to send messages to all
        participants and collect their votes or options.
        """
        conflict = self.conflicts.get(conflict_id)
        if not conflict:
            logger.warning(f"Conflict {conflict_id} not found")
            return None
            
        if conflict.resolved:
            logger.info(f"Conflict {conflict_id} is already resolved")
            return conflict.resolution
            
        # Send a message to all participants
        conflict_message = AgentMessage(
            type=MessageType.INFORM,
            sender="conflict_resolver",
            recipient="all",
            content={
                "action": "resolve_conflict",
                "conflict_id": conflict_id,
                "conflict_type": conflict.type.name,
                "description": conflict.description,
                "resolution_strategy": conflict.resolution_strategy.name,
                "options": conflict.options,
                "deadline": (datetime.now(timezone.utc) + timezone.timedelta(seconds=timeout)).isoformat()
            }
        )
        
        await comm_protocol.send_message(conflict_message)
        
        # Wait for votes or options
        end_time = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < end_time:
            # Check if conflict can be resolved now
            resolution = self.try_resolve(conflict_id)
            if resolution:
                # Send resolution to all participants
                resolution_message = AgentMessage(
                    type=MessageType.INFORM,
                    sender="conflict_resolver",
                    recipient="all",
                    content={
                        "action": "conflict_resolved",
                        "conflict_id": conflict_id,
                        "resolution": resolution
                    }
                )
                await comm_protocol.send_message(resolution_message)
                return resolution
                
            # Wait a bit before checking again
            await asyncio.sleep(1.0)
            
        # Timeout reached, try to resolve anyway
        resolution = self.try_resolve(conflict_id)
        
        if resolution:
            # Send resolution to all participants
            resolution_message = AgentMessage(
                type=MessageType.INFORM,
                sender="conflict_resolver",
                recipient="all",
                content={
                    "action": "conflict_resolved",
                    "conflict_id": conflict_id,
                    "resolution": resolution
                }
            )
            await comm_protocol.send_message(resolution_message)
            
        return resolution
    
    def create_conflicting_data_resolution(
        self, 
        data_items: List[Dict[str, Any]], 
        agent_ids: List[str],
        confidence_key: Optional[str] = "confidence",
        domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a resolution for conflicting data items from different agents.
        
        This helper method creates a conflict and resolves it immediately
        based on confidence values, agent expertise, or voting.
        """
        if not data_items:
            return {}
            
        # Create a new conflict
        conflict = Conflict(
            type=ConflictType.FACTUAL,
            description="Conflicting data items",
            resolution_strategy=ResolutionStrategy.CONFIDENCE,
            context={"domain": domain} if domain else {}
        )
        
        # Add options
        for i, (data_item, agent_id) in enumerate(zip(data_items, agent_ids)):
            conflict.add_option(agent_id, data_item)
            
        # Create the conflict
        conflict_id = self.create_conflict(conflict)
        
        # Try to resolve immediately
        resolution = self.try_resolve(conflict_id)
        
        if resolution:
            return resolution.get("resolved_data", {})
        
        # If resolution failed, return the first data item as fallback
        return data_items[0]
