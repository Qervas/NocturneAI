"""
Collaboration capabilities for NocturneAI agents.

This module provides capabilities for agent collaboration, including team coordination
and consensus building.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
import json
from datetime import datetime
import uuid
import random

from ..core.types import AgentCapability, Message, MessageType
from .base import CollaborationCapability

logger = logging.getLogger(__name__)


class TeamCoordination(CollaborationCapability):
    """
    Team coordination capability for agents.
    
    This capability enables agents to form teams, coordinate tasks, share context,
    and track progress.
    """
    
    CAPABILITY = AgentCapability.COLLABORATION
    
    def __init__(self, team_name: str = "default_team", max_team_size: int = 5, **config):
        """
        Initialize the team coordination capability.
        
        Args:
            team_name: Name of the team
            max_team_size: Maximum number of agents in the team
            **config: Additional configuration
        """
        super().__init__(**config)
        self.team_name = team_name
        self.max_team_size = max_team_size
        self.team_data = None
        self.tasks = {}
        self.agent_registry = None
    
    async def initialize(self, agent):
        """Initialize the capability with the agent."""
        await super().initialize(agent)
        logger.info(f"Initialized team coordination for agent {agent.name}, team: {self.team_name}")
        
        # Get the agent registry from the agent
        if hasattr(agent, 'agent_registry') and agent.agent_registry:
            self.agent_registry = agent.agent_registry
        else:
            logger.warning("Agent registry not available for team coordination")
            self.agent_registry = None
    
    async def form_team(self, objective: str, candidate_agents: List[str] = None) -> Dict[str, Any]:
        """
        Form a team to accomplish an objective.

        Args:
            objective: The team's objective
            candidate_agents: List of agent IDs to include in the team

        Returns:
            Dictionary with team information
        """
        logger.info(f"Forming team for objective: {objective}")
        
        team_members = []
        if candidate_agents:
            # Add candidate agents to the team
            for agent_id in candidate_agents:
                agent = self.agent_registry.get_agent(agent_id)
                if agent:
                    team_members.append({
                        "id": agent.id,
                        "name": agent.name,
                        "role": agent.role
                    })
        
        # Create the team
        self.team_data = {
            "id": str(uuid.uuid4()),
            "name": self.team_name,
            "objective": objective,
            "members": team_members,
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        logger.info(f"Team formed with {len(team_members)} members")
        return self.team_data
        
    async def coordinate_action(self, action_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Coordinate an action across team members.
        
        Args:
            action_type: Type of action to coordinate
            parameters: Action parameters
            
        Returns:
            Dictionary with coordination results
        """
        logger.info(f"Coordinating action: {action_type}")
        
        if not self.team_data:
            logger.warning("Cannot coordinate action: No team formed")
            return {"success": False, "error": "No team formed"}
        
        # Placeholder logic for coordinating different action types
        if action_type == "parallel_task":
            return await self._coordinate_parallel_task(parameters)
        elif action_type == "sequential_task":
            return await self._coordinate_sequential_task(parameters)
        else:
            return {"success": True, "action_type": action_type, "status": "coordinated"}
    
    async def _coordinate_parallel_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate parallel execution of tasks"""
        # Implementation would coordinate parallel execution
        return {"success": True, "execution_type": "parallel", "status": "coordinated"}
    
    async def _coordinate_sequential_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate sequential execution of tasks"""
        # Implementation would coordinate sequential execution
        return {"success": True, "execution_type": "sequential", "status": "coordinated"}
    
    async def share_information(self, information: Dict[str, Any], recipients: List[str] = None) -> Dict[str, Any]:
        """
        Share information with team members.
        
        Args:
            information: Information to share
            recipients: List of agent IDs to share with (None for all team members)
            
        Returns:
            Dictionary with sharing results
        """
        logger.info("Sharing information with team members")
        
        if not self.team_data:
            logger.warning("Cannot share information: No team formed")
            return {"success": False, "error": "No team formed"}
        
        # Get the list of recipients
        if recipients is None:
            recipients = [member["id"] for member in self.team_data["members"]]
        
        shared_with = []
        for recipient_id in recipients:
            # In a real implementation, this would use the communication capability
            # to send the information to the recipient
            agent = self.agent_registry.get_agent(recipient_id)
            if agent:
                shared_with.append({
                    "id": agent.id,
                    "name": agent.name
                })
        
        return {
            "success": True, 
            "shared_with": shared_with,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _select_team_members(self, objective: str, candidate_agents: List[str]) -> List[str]:
        """
        Select appropriate team members based on objective.
        
        Args:
            objective: Team objective
            candidate_agents: List of candidate agent IDs
            
        Returns:
            List of selected agent IDs
        """
        # In a real implementation, this would use agent capabilities and roles
        # to select appropriate team members for the objective
        
        # For the example, we'll just select random agents up to the max team size
        selected = candidate_agents[:self.max_team_size]
        random.shuffle(selected)
        return selected
    
    async def assign_tasks(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Assign tasks to team members.
        
        Args:
            tasks: List of tasks to assign
            
        Returns:
            Dictionary with assignment results
        """
        logger.info(f"Assigning {len(tasks)} tasks to team members")
        
        if not self.team_data:
            logger.warning("Cannot assign tasks: No team formed")
            return {"success": False, "error": "No team formed"}
        
        assignments = []
        for task in tasks:
            # Generate a task ID if not provided
            task_id = task.get("id", str(uuid.uuid4()))
            
            # Get the assigned agent
            agent_id = task.get("assigned_to")
            if not agent_id:
                # Assign to a random team member if not specified
                available_members = [member["id"] for member in self.team_data["members"]]
                if available_members:
                    agent_id = random.choice(available_members)
            
            # Create the assignment
            assignment = {
                "task_id": task_id,
                "agent_id": agent_id,
                "task": task,
                "status": "assigned",
                "assigned_at": datetime.now().isoformat()
            }
            
            # Store the assignment
            self.tasks[task_id] = assignment
            assignments.append(assignment)
        
        return {
            "success": True,
            "assignments": assignments,
            "timestamp": datetime.now().isoformat(),
            "total_assigned": len(assignments)
        }
    
    async def track_progress(self, task_id: str = None) -> Dict[str, Any]:
        """
        Track progress of tasks.
        
        Args:
            task_id: Specific task ID to track (None for all tasks)
            
        Returns:
            Dictionary with progress information
        """
        logger.info(f"Tracking progress for task: {task_id if task_id else 'all tasks'}")
        
        if not self.team_data:
            logger.warning("Cannot track progress: No team formed")
            return {"success": False, "error": "No team formed"}
        
        if task_id:
            # Track specific task
            task = self.tasks.get(task_id)
            if not task:
                return {"success": False, "error": f"Task {task_id} not found"}
            
            return {
                "success": True,
                "task": task,
                "timestamp": datetime.now().isoformat()
            }
        else:
            # Track all tasks
            task_statuses = {}
            for task_id, task in self.tasks.items():
                task_statuses[task_id] = {
                    "status": task["status"],
                    "assigned_to": task["agent_id"],
                    "last_update": task.get("last_update", task["assigned_at"])
                }
            
            return {
                "success": True,
                "tasks": task_statuses,
                "timestamp": datetime.now().isoformat(),
                "total_tasks": len(task_statuses)
            }
    
    async def update_task_status(self, task_id: str, status: str, progress: float = None, notes: str = None) -> Dict[str, Any]:
        """
        Update the status of a task.
        
        Args:
            task_id: ID of the task to update
            status: New status of the task
            progress: Optional progress percentage (0.0-1.0)
            notes: Optional notes about the update
            
        Returns:
            Dictionary with update results
        """
        logger.info(f"Updating status of task {task_id} to {status}")
        
        if not self.team_data:
            logger.warning("Cannot update task: No team formed")
            return {"success": False, "error": "No team formed"}
        
        task = self.tasks.get(task_id)
        if not task:
            return {"success": False, "error": f"Task {task_id} not found"}
        
        # Update the task
        task["status"] = status
        if progress is not None:
            task["progress"] = max(0.0, min(1.0, progress))  # Ensure between 0 and 1
        if notes:
            task["notes"] = notes
        task["last_update"] = datetime.now().isoformat()
        
        return {
            "success": True,
            "task_id": task_id,
            "status": status,
            "last_update": task["last_update"]
        }
    
    async def cleanup(self) -> None:
        """Clean up the capability"""
        logger.info(f"Cleaning up team coordination for team {self.team_name}")
        # Nothing specific to clean up


class ConsensusBuilding(CollaborationCapability):
    """
    Capability for building consensus among team members.
    
    This capability enables agents to make decisions as a group, vote on proposals,
    and resolve conflicts.
    """
    
    CAPABILITY = AgentCapability.COLLABORATION
    
    def __init__(self, team_name: str = "default_team", decision_threshold: float = 0.5, **config):
        """
        Initialize the consensus building capability.
        
        Args:
            team_name: Name of the team
            decision_threshold: Threshold for decision approval (0.0-1.0)
            **config: Additional configuration
        """
        super().__init__(**config)
        self.team_name = team_name
        self.decision_threshold = max(0.0, min(1.0, decision_threshold))  # Ensure between 0 and 1
        self.decisions = {}
        self.votes = {}
    
    async def initialize(self, agent):
        """Initialize the capability with the agent."""
        await super().initialize(agent)
        logger.info(f"Initialized consensus building for agent {agent.name}")
        
        # Register with the agent registry
        if hasattr(agent, 'agent_registry') and agent.agent_registry:
            self.agent_registry = agent.agent_registry
        else:
            logger.warning("Agent registry not available for consensus building")
            self.agent_registry = None
    
    async def coordinate_action(self, action_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Coordinate an action across team members.
        
        Args:
            action_type: Type of action to coordinate
            parameters: Action parameters
            
        Returns:
            Dictionary with coordination results
        """
        logger.info(f"Coordinating action: {action_type}")
        
        # For ConsensusBuilding, coordinating an action typically means
        # initiating a decision process about the action
        if action_type == "initiate_decision":
            decision_id = str(uuid.uuid4())
            self.decisions[decision_id] = {
                "id": decision_id,
                "type": parameters.get("decision_type", "unknown"),
                "description": parameters.get("description", ""),
                "options": parameters.get("options", []),
                "status": "pending",
                "created_at": datetime.now().isoformat()
            }
            return {"success": True, "decision_id": decision_id}
        
        return {"success": True, "action_type": action_type, "status": "coordinated"}
    
    async def share_information(self, information: Dict[str, Any], recipients: List[str] = None) -> Dict[str, Any]:
        """
        Share information with team members.
        
        Args:
            information: Information to share
            recipients: List of agent IDs to share with (None for all team members)
            
        Returns:
            Dictionary with sharing results
        """
        logger.info("Sharing information with team members")
        
        # In a real implementation, this would use the communication capability
        # to broadcast information to all relevant team members
        
        # For now, we'll just log the information sharing intent
        return {
            "success": True,
            "information_type": information.get("type", "general"),
            "timestamp": datetime.now().isoformat()
        }
        
    async def propose_decision(self, title: str, description: str, options: List[str], team_members: List[str] = None) -> Dict[str, Any]:
        """
        Propose a decision to be made by the team.
        
        Args:
            title: Decision title
            description: Decision description
            options: Available options for the decision
            team_members: List of team members to include in the decision
            
        Returns:
            Dictionary with decision information
        """
        logger.info(f"Proposing decision: {title}")
        
        # Create a new decision
        decision_id = str(uuid.uuid4())
        decision = {
            "id": decision_id,
            "title": title,
            "description": description,
            "options": options,
            "proposed_by": self.agent.id if hasattr(self, 'agent') and self.agent else "unknown",
            "team_members": team_members or [],
            "status": "proposed",
            "votes": {},
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Store the decision
        self.decisions[decision_id] = decision
        
        # In a real implementation, this would notify team members about the decision
        
        return {
            "success": True,
            "decision_id": decision_id,
            "decision": decision
        }
    
    async def cast_vote(self, decision_id: str, option: str, confidence: float = 1.0) -> Dict[str, Any]:
        """
        Cast a vote for a decision option.
        
        Args:
            decision_id: ID of the decision
            option: Option to vote for
            confidence: Confidence in the vote (0.0-1.0)
            
        Returns:
            Dictionary with vote information
        """
        logger.info(f"Casting vote for decision {decision_id}: {option}")
        
        # Check if the decision exists
        decision = self.decisions.get(decision_id)
        if not decision:
            return {"success": False, "error": f"Decision {decision_id} not found"}
        
        # Check if the option is valid
        if option not in decision["options"]:
            return {"success": False, "error": f"Invalid option: {option}"}
        
        # Ensure confidence is between 0 and 1
        confidence = max(0.0, min(1.0, confidence))
        
        # Cast the vote
        voter_id = self.agent.id if hasattr(self, 'agent') and self.agent else "unknown"
        decision["votes"][voter_id] = {
            "option": option,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat()
        }
        
        # Update the decision
        decision["updated_at"] = datetime.now().isoformat()
        
        # Check if the decision is ready to be resolved
        if len(decision["votes"]) >= len(decision["team_members"]):
            # All team members have voted
            decision["status"] = "ready"
        
        return {
            "success": True,
            "decision_id": decision_id,
            "vote": {
                "voter": voter_id,
                "option": option,
                "confidence": confidence
            }
        }
    
    async def get_decision_status(self, decision_id: str) -> Dict[str, Any]:
        """
        Get the status of a decision.
        
        Args:
            decision_id: ID of the decision
            
        Returns:
            Dictionary with decision status
        """
        logger.info(f"Getting status of decision {decision_id}")
        
        # Check if the decision exists
        decision = self.decisions.get(decision_id)
        if not decision:
            return {"success": False, "error": f"Decision {decision_id} not found"}
        
        # Count votes
        vote_counts = {}
        for option in decision["options"]:
            vote_counts[option] = 0
        
        total_confidence = 0.0
        for voter, vote in decision["votes"].items():
            vote_counts[vote["option"]] += vote["confidence"]
            total_confidence += vote["confidence"]
        
        # Calculate percentages
        percentages = {}
        if total_confidence > 0:
            for option, count in vote_counts.items():
                percentages[option] = count / total_confidence
        
        return {
            "success": True,
            "decision_id": decision_id,
            "title": decision["title"],
            "status": decision["status"],
            "votes": len(decision["votes"]),
            "vote_counts": vote_counts,
            "percentages": percentages,
            "updated_at": decision["updated_at"]
        }
    
    async def resolve_decision(self, decision_id: str) -> Dict[str, Any]:
        """
        Resolve a decision based on votes.
        
        Args:
            decision_id: ID of the decision
            
        Returns:
            Dictionary with resolution results
        """
        logger.info(f"Resolving decision {decision_id}")
        
        # Check if the decision exists
        decision = self.decisions.get(decision_id)
        if not decision:
            return {"success": False, "error": f"Decision {decision_id} not found"}
        
        # Count votes
        vote_counts = {}
        for option in decision["options"]:
            vote_counts[option] = 0
        
        total_confidence = 0.0
        for voter, vote in decision["votes"].items():
            vote_counts[vote["option"]] += vote["confidence"]
            total_confidence += vote["confidence"]
        
        # Calculate percentages
        percentages = {}
        if total_confidence > 0:
            for option, count in vote_counts.items():
                percentages[option] = count / total_confidence
        
        # Determine the winning option
        winning_option = None
        winning_percentage = 0.0
        for option, percentage in percentages.items():
            if percentage > winning_percentage:
                winning_option = option
                winning_percentage = percentage
        
        # Check if the winning option meets the threshold
        decision_made = winning_percentage >= self.decision_threshold
        
        # Update the decision
        decision["status"] = "resolved" if decision_made else "unresolved"
        decision["resolved_at"] = datetime.now().isoformat()
        decision["resolution"] = {
            "winning_option": winning_option,
            "winning_percentage": winning_percentage,
            "decision_made": decision_made,
            "vote_counts": vote_counts,
            "percentages": percentages
        }
        
        return {
            "success": True,
            "decision_id": decision_id,
            "resolution": decision["resolution"],
            "resolved_at": decision["resolved_at"]
        }
    
    async def get_consensus(self, decision_id: str) -> str:
        """
        Get the consensus description for a decision.
        
        Args:
            decision_id: ID of the decision
            
        Returns:
            Consensus description
        """
        logger.info(f"Getting consensus for decision {decision_id}")
        
        # Check if the decision exists
        decision = self.decisions.get(decision_id)
        if not decision:
            return "Decision not found"
        
        # Check if the decision has been resolved
        if decision.get("status") != "resolved":
            # Try to resolve the decision
            resolution = await self.resolve_decision(decision_id)
            if not resolution["success"] or not resolution["resolution"]["decision_made"]:
                return "No consensus reached yet"
        
        # Get the resolution
        resolution = decision.get("resolution", {})
        winning_option = resolution.get("winning_option")
        winning_percentage = resolution.get("winning_percentage", 0.0)
        
        # Format the consensus description
        if winning_option and winning_percentage >= self.decision_threshold:
            return f"Consensus reached: {winning_option} with {winning_percentage:.1%} agreement"
        else:
            # Fallback
            return "Decision deferred pending further discussion."
    
    async def cleanup(self) -> None:
        """Clean up the capability"""
        # Nothing specific to clean up