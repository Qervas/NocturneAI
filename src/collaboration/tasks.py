"""
Task delegation and management system for agent collaboration.

This module enables agents to create, assign, track, and complete tasks
in a structured workflow, supporting dependencies and priorities.
"""

from enum import Enum, auto
from typing import Dict, Any, List, Optional, Set
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone, timedelta
import logging
import asyncio
import heapq
from ..core.agent import AgentRole

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """Status of a task in the workflow"""
    PENDING = auto()          # Task is created but not ready to start
    READY = auto()            # Task is ready to be assigned
    ASSIGNED = auto()         # Task is assigned to an agent
    IN_PROGRESS = auto()      # Task is being worked on
    BLOCKED = auto()          # Task is blocked by dependencies or resources
    COMPLETED = auto()        # Task is completed successfully
    FAILED = auto()           # Task failed to complete
    CANCELLED = auto()        # Task was cancelled

class TaskPriority(Enum):
    """Priority levels for tasks"""
    LOWEST = 1
    LOW = 2
    MEDIUM = 3
    HIGH = 4
    HIGHEST = 5
    CRITICAL = 6

class Task(BaseModel):
    """
    A task that can be assigned to and performed by an agent.
    
    Tasks can have dependencies, deadlines, and priorities to ensure
    proper sequencing and resource allocation.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    creator: str  # Agent that created the task
    assignee: Optional[str] = None  # Agent assigned to the task
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deadline: Optional[datetime] = None
    estimated_duration: Optional[timedelta] = None
    actual_duration: Optional[timedelta] = None
    dependencies: List[str] = Field(default_factory=list)  # IDs of tasks this depends on
    required_skills: List[str] = Field(default_factory=list)  # Skills needed for this task
    required_resources: List[str] = Field(default_factory=list)  # Resources needed
    result: Optional[Dict[str, Any]] = None  # Result data when completed
    error: Optional[str] = None  # Error message if failed
    metadata: Dict[str, Any] = Field(default_factory=dict)  # Additional metadata
    
    def update_status(self, status: TaskStatus) -> None:
        """Update the status and the updated_at timestamp"""
        self.status = status
        self.updated_at = datetime.now(timezone.utc)
        
        if status == TaskStatus.IN_PROGRESS and not self.metadata.get("started_at"):
            self.metadata["started_at"] = datetime.now(timezone.utc).isoformat()
            
        if status == TaskStatus.COMPLETED and not self.metadata.get("completed_at"):
            self.metadata["completed_at"] = datetime.now(timezone.utc).isoformat()
            # Calculate actual duration if possible
            if self.metadata.get("started_at"):
                started = datetime.fromisoformat(self.metadata["started_at"])
                completed = datetime.fromisoformat(self.metadata["completed_at"])
                self.actual_duration = completed - started
    
    def assign_to(self, agent_id: str) -> None:
        """Assign the task to an agent"""
        self.assignee = agent_id
        self.update_status(TaskStatus.ASSIGNED)
    
    def complete(self, result: Dict[str, Any]) -> None:
        """Mark the task as completed with results"""
        self.result = result
        self.update_status(TaskStatus.COMPLETED)
    
    def fail(self, error: str) -> None:
        """Mark the task as failed with error message"""
        self.error = error
        self.update_status(TaskStatus.FAILED)
    
    def is_overdue(self) -> bool:
        """Check if the task is overdue based on deadline"""
        if not self.deadline:
            return False
        
        return datetime.now(timezone.utc) > self.deadline
    
    def is_ready(self, completed_tasks: Set[str]) -> bool:
        """Check if the task is ready to be worked on (dependencies met)"""
        if self.status != TaskStatus.PENDING:
            return False
            
        # Check if all dependencies are completed
        return all(dep_id in completed_tasks for dep_id in self.dependencies)

class TaskRegistry:
    """
    Registry for managing tasks across agents.
    
    This class enables creating, tracking, assigning, and completing tasks
    with proper handling of dependencies and priorities.
    """
    
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.completed_tasks: Set[str] = set()
        self.agent_tasks: Dict[str, List[str]] = {}  # Agent ID -> Task IDs
        self.agent_capabilities: Dict[str, Set[str]] = {}  # Agent ID -> Skills
        self.agent_workloads: Dict[str, int] = {}  # Agent ID -> Current workload
        
        # Task queues
        self.ready_tasks: List[tuple] = []  # Priority queue (priority, created_at, task_id)
        
        # Event for task updates
        self.task_update_event = asyncio.Event()
    
    def register_agent(self, agent_id: str, capabilities: List[str] = None) -> None:
        """Register an agent with the task registry"""
        if agent_id in self.agent_capabilities:
            logger.warning(f"Agent {agent_id} already registered, updating capabilities")
        
        self.agent_capabilities[agent_id] = set(capabilities or [])
        self.agent_tasks[agent_id] = []
        self.agent_workloads[agent_id] = 0
        
        logger.info(f"Agent {agent_id} registered with task registry")
    
    def unregister_agent(self, agent_id: str) -> None:
        """Unregister an agent from the task registry"""
        if agent_id in self.agent_capabilities:
            del self.agent_capabilities[agent_id]
            
        if agent_id in self.agent_tasks:
            # Reassign tasks
            for task_id in self.agent_tasks[agent_id]:
                task = self.tasks.get(task_id)
                if task and task.status in [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]:
                    task.assignee = None
                    task.update_status(TaskStatus.READY)
                    self._add_to_ready_queue(task)
            
            del self.agent_tasks[agent_id]
            
        if agent_id in self.agent_workloads:
            del self.agent_workloads[agent_id]
            
        logger.info(f"Agent {agent_id} unregistered from task registry")
    
    def create_task(self, task: Task) -> str:
        """Create a new task in the registry"""
        # Store the task
        self.tasks[task.id] = task
        
        # If task has no dependencies or all dependencies are completed, mark as ready
        if self._check_dependencies_completed(task):
            task.update_status(TaskStatus.READY)
            self._add_to_ready_queue(task)
        
        # Update the task registry
        self.task_update_event.set()
        
        logger.info(f"Task '{task.title}' created with ID {task.id}")
        return task.id
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID"""
        return self.tasks.get(task_id)
    
    def get_tasks_by_status(self, status: TaskStatus) -> List[Task]:
        """Get all tasks with a specific status"""
        return [task for task in self.tasks.values() if task.status == status]
    
    def get_agent_tasks(self, agent_id: str) -> List[Task]:
        """Get all tasks assigned to a specific agent"""
        task_ids = self.agent_tasks.get(agent_id, [])
        return [self.tasks[task_id] for task_id in task_ids if task_id in self.tasks]
    
    def get_next_task(self, agent_id: str) -> Optional[Task]:
        """Get the next task for an agent based on priority and dependencies"""
        if not self.ready_tasks:
            return None
            
        # Find a task that matches the agent's capabilities
        agent_capabilities = self.agent_capabilities.get(agent_id, set())
        
        for i, (_, _, task_id) in enumerate(self.ready_tasks):
            task = self.tasks[task_id]
            
            # Check if the agent has the required skills
            if task.required_skills and not all(skill in agent_capabilities for skill in task.required_skills):
                continue
            
            # This task is suitable for the agent
            # Remove it from the ready queue
            task_info = self.ready_tasks.pop(i)
            heapq.heapify(self.ready_tasks)  # Re-heapify after removal
            
            return task
        
        return None
    
    def assign_task(self, task_id: str, agent_id: str) -> bool:
        """Assign a task to an agent"""
        if task_id not in self.tasks:
            logger.warning(f"Task {task_id} not found")
            return False
            
        if agent_id not in self.agent_capabilities:
            logger.warning(f"Agent {agent_id} not registered")
            return False
            
        task = self.tasks[task_id]
        
        if task.status != TaskStatus.READY:
            logger.warning(f"Task {task_id} is not ready for assignment (status: {task.status})")
            return False
        
        # Assign the task
        task.assign_to(agent_id)
        
        # Update agent workload
        self.agent_tasks[agent_id].append(task_id)
        self.agent_workloads[agent_id] += 1
        
        # Update the task registry
        self.task_update_event.set()
        
        logger.info(f"Task {task_id} assigned to agent {agent_id}")
        return True
    
    def start_task(self, task_id: str) -> bool:
        """Mark a task as in progress"""
        if task_id not in self.tasks:
            logger.warning(f"Task {task_id} not found")
            return False
            
        task = self.tasks[task_id]
        
        if task.status != TaskStatus.ASSIGNED:
            logger.warning(f"Task {task_id} is not assigned (status: {task.status})")
            return False
            
        task.update_status(TaskStatus.IN_PROGRESS)
        
        # Update the task registry
        self.task_update_event.set()
        
        logger.info(f"Task {task_id} marked as in progress")
        return True
    
    def complete_task(self, task_id: str, result: Dict[str, Any]) -> bool:
        """Mark a task as completed with results"""
        if task_id not in self.tasks:
            logger.warning(f"Task {task_id} not found")
            return False
            
        task = self.tasks[task_id]
        
        if task.status not in [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]:
            logger.warning(f"Task {task_id} is not assigned or in progress (status: {task.status})")
            return False
            
        # Complete the task
        task.complete(result)
        
        # Update completed tasks set
        self.completed_tasks.add(task_id)
        
        # Update agent workload
        if task.assignee:
            self.agent_workloads[task.assignee] = max(0, self.agent_workloads[task.assignee] - 1)
        
        # Check if any dependent tasks can now be marked as ready
        self._update_dependent_tasks(task_id)
        
        # Update the task registry
        self.task_update_event.set()
        
        logger.info(f"Task {task_id} marked as completed")
        return True
    
    def fail_task(self, task_id: str, error: str) -> bool:
        """Mark a task as failed with error message"""
        if task_id not in self.tasks:
            logger.warning(f"Task {task_id} not found")
            return False
            
        task = self.tasks[task_id]
        
        if task.status not in [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]:
            logger.warning(f"Task {task_id} is not assigned or in progress (status: {task.status})")
            return False
            
        # Fail the task
        task.fail(error)
        
        # Update agent workload
        if task.assignee:
            self.agent_workloads[task.assignee] = max(0, self.agent_workloads[task.assignee] - 1)
        
        # Update the task registry
        self.task_update_event.set()
        
        logger.info(f"Task {task_id} marked as failed: {error}")
        return True
    
    def cancel_task(self, task_id: str) -> bool:
        """Cancel a task"""
        if task_id not in self.tasks:
            logger.warning(f"Task {task_id} not found")
            return False
            
        task = self.tasks[task_id]
        
        # Update task status
        task.update_status(TaskStatus.CANCELLED)
        
        # Update agent workload if assigned
        if task.assignee:
            self.agent_workloads[task.assignee] = max(0, self.agent_workloads[task.assignee] - 1)
        
        # Update the task registry
        self.task_update_event.set()
        
        logger.info(f"Task {task_id} cancelled")
        return True
    
    async def wait_for_updates(self, timeout: Optional[float] = None) -> bool:
        """Wait for task registry updates"""
        try:
            if timeout:
                await asyncio.wait_for(self.task_update_event.wait(), timeout=timeout)
            else:
                await self.task_update_event.wait()
                
            # Reset the event
            self.task_update_event.clear()
            return True
        except asyncio.TimeoutError:
            return False
    
    def get_agent_with_lowest_workload(self, required_skills: Optional[List[str]] = None) -> Optional[str]:
        """Get the agent with the lowest workload that has the required skills"""
        if not self.agent_workloads:
            return None
            
        candidates = []
        
        for agent_id, workload in self.agent_workloads.items():
            # Skip agents that don't have the required skills
            if required_skills:
                agent_skills = self.agent_capabilities.get(agent_id, set())
                if not all(skill in agent_skills for skill in required_skills):
                    continue
            
            candidates.append((workload, agent_id))
        
        if not candidates:
            return None
            
        # Sort by workload and return the agent with the lowest
        candidates.sort()
        return candidates[0][1]
    
    def _check_dependencies_completed(self, task: Task) -> bool:
        """Check if all dependencies for a task are completed"""
        if not task.dependencies:
            return True
            
        return all(dep_id in self.completed_tasks for dep_id in task.dependencies)
    
    def _update_dependent_tasks(self, completed_task_id: str) -> None:
        """Update tasks that depend on a newly completed task"""
        # Find all tasks that depend on the completed task
        for task in self.tasks.values():
            if task.status == TaskStatus.PENDING and completed_task_id in task.dependencies:
                # Check if all dependencies are now completed
                if self._check_dependencies_completed(task):
                    task.update_status(TaskStatus.READY)
                    self._add_to_ready_queue(task)
                    logger.info(f"Task {task.id} is now ready (dependencies met)")
    
    def _add_to_ready_queue(self, task: Task) -> None:
        """Add a task to the ready queue with proper priority"""
        # Invert priority so that higher priority tasks are at the front
        # Use negative priority value for the heap (Python's heapq is a min-heap)
        priority_value = -task.priority.value
        
        # Use creation time as secondary sort key
        created_timestamp = task.created_at.timestamp()
        
        heapq.heappush(self.ready_tasks, (priority_value, created_timestamp, task.id))
    
    def get_task_plan(self, task_ids: List[str]) -> Dict[str, Any]:
        """
        Generate a plan for executing a set of tasks in the correct order.
        
        Returns a plan with tasks grouped by execution stage based on dependencies.
        """
        if not task_ids:
            return {"stages": []}
            
        # Validate tasks
        valid_task_ids = [tid for tid in task_ids if tid in self.tasks]
        
        # Build dependency graph
        dependency_graph = {}
        for task_id in valid_task_ids:
            task = self.tasks[task_id]
            dependency_graph[task_id] = [dep for dep in task.dependencies if dep in valid_task_ids]
        
        # Identify tasks with no dependencies
        no_deps = [tid for tid in valid_task_ids if not dependency_graph[tid]]
        
        # Group tasks by stages
        stages = []
        remaining = set(valid_task_ids)
        
        while no_deps:
            # Current stage is all tasks with no dependencies
            current_stage = no_deps
            stages.append(current_stage)
            
            # Remove current stage tasks from remaining
            remaining -= set(current_stage)
            
            # Find next set of tasks with no dependencies
            no_deps = []
            for task_id in remaining:
                deps = dependency_graph[task_id]
                if all(dep not in remaining for dep in deps):
                    no_deps.append(task_id)
        
        # If there are remaining tasks, there must be a cycle
        if remaining:
            logger.warning(f"Dependency cycle detected in tasks: {remaining}")
            # Add remaining tasks to the last stage
            stages.append(list(remaining))
        
        # Build the plan
        plan = {
            "stages": [
                {
                    "stage": i+1,
                    "tasks": [
                        {
                            "id": task_id,
                            "title": self.tasks[task_id].title,
                            "priority": self.tasks[task_id].priority.name,
                            "status": self.tasks[task_id].status.name
                        } 
                        for task_id in stage_tasks
                    ]
                }
                for i, stage_tasks in enumerate(stages)
            ]
        }
        
        return plan
