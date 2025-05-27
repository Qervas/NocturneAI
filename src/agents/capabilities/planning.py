"""
Planning capabilities for NocturneAI agents.

This module implements planning capabilities that enable agents to create
and execute structured plans to achieve goals.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Set, Union, Callable
from datetime import datetime
import json
import uuid

from ..core.types import AgentCapability, MessageType, Message
from .base import PlanningCapability

logger = logging.getLogger(__name__)


class PlanState:
    """States for plan execution"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PlanNode:
    """Node in a plan representing a step or subtask"""
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        parent_id: Optional[str] = None,
        dependencies: Optional[List[str]] = None,
        state: str = PlanState.NOT_STARTED,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = id
        self.name = name
        self.description = description
        self.parent_id = parent_id
        self.dependencies = dependencies or []
        self.state = state
        self.metadata = metadata or {}
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.result = None
        self.error = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'parent_id': self.parent_id,
            'dependencies': self.dependencies,
            'state': self.state,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'result': self.result,
            'error': self.error
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PlanNode':
        """Create from dictionary"""
        node = cls(
            id=data['id'],
            name=data['name'],
            description=data['description'],
            parent_id=data.get('parent_id'),
            dependencies=data.get('dependencies', []),
            state=data.get('state', PlanState.NOT_STARTED),
            metadata=data.get('metadata', {})
        )
        
        if 'created_at' in data:
            node.created_at = datetime.fromisoformat(data['created_at'])
        
        if 'updated_at' in data:
            node.updated_at = datetime.fromisoformat(data['updated_at'])
        
        node.result = data.get('result')
        node.error = data.get('error')
        
        return node


class Plan:
    """
    Plan representation for agent planning.
    
    A plan consists of a directed acyclic graph of steps (nodes)
    with dependencies between them.
    """
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        goal: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = id
        self.name = name
        self.description = description
        self.goal = goal
        self.metadata = metadata or {}
        self.nodes: Dict[str, PlanNode] = {}
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.state = PlanState.NOT_STARTED
    
    def add_node(self, node: PlanNode) -> None:
        """Add a node to the plan"""
        self.nodes[node.id] = node
        self.updated_at = datetime.now()
    
    def get_node(self, node_id: str) -> Optional[PlanNode]:
        """Get a node by ID"""
        return self.nodes.get(node_id)
    
    def get_root_nodes(self) -> List[PlanNode]:
        """Get root nodes (nodes with no dependencies)"""
        return [node for node in self.nodes.values() if not node.dependencies]
    
    def get_leaf_nodes(self) -> List[PlanNode]:
        """Get leaf nodes (nodes that no other nodes depend on)"""
        # Get IDs of all nodes that are dependencies of other nodes
        dependency_ids = set()
        for node in self.nodes.values():
            dependency_ids.update(node.dependencies)
        
        # Return nodes that are not dependencies of any other node
        return [node for node in self.nodes.values() if node.id not in dependency_ids]
    
    def get_ready_nodes(self) -> List[PlanNode]:
        """Get nodes that are ready to execute (all dependencies satisfied)"""
        ready_nodes = []
        
        for node in self.nodes.values():
            # Skip nodes that aren't in NOT_STARTED state
            if node.state != PlanState.NOT_STARTED:
                continue
            
            # Check if all dependencies are completed
            all_deps_completed = True
            for dep_id in node.dependencies:
                dep_node = self.nodes.get(dep_id)
                if not dep_node or dep_node.state != PlanState.COMPLETED:
                    all_deps_completed = False
                    break
            
            if all_deps_completed:
                ready_nodes.append(node)
        
        return ready_nodes
    
    def update_node(
        self,
        node_id: str,
        state: Optional[str] = None,
        result: Any = None,
        error: Optional[str] = None
    ) -> bool:
        """
        Update a node's state and results.
        
        Args:
            node_id: ID of the node to update
            state: New state for the node
            result: Result of node execution
            error: Error message if execution failed
            
        Returns:
            True if the node was updated, False otherwise
        """
        node = self.nodes.get(node_id)
        if not node:
            return False
        
        if state:
            node.state = state
        
        if result is not None:
            node.result = result
        
        if error is not None:
            node.error = error
        
        node.updated_at = datetime.now()
        self.updated_at = datetime.now()
        
        # Update plan state if needed
        self._update_plan_state()
        
        return True
    
    def _update_plan_state(self) -> None:
        """Update the plan state based on node states"""
        if not self.nodes:
            self.state = PlanState.NOT_STARTED
            return
        
        # Count node states
        state_counts = {
            PlanState.NOT_STARTED: 0,
            PlanState.IN_PROGRESS: 0,
            PlanState.WAITING: 0,
            PlanState.COMPLETED: 0,
            PlanState.FAILED: 0,
            PlanState.CANCELLED: 0
        }
        
        for node in self.nodes.values():
            if node.state in state_counts:
                state_counts[node.state] += 1
        
        # Determine plan state based on node states
        if state_counts[PlanState.FAILED] > 0:
            self.state = PlanState.FAILED
        elif state_counts[PlanState.CANCELLED] > 0:
            self.state = PlanState.CANCELLED
        elif state_counts[PlanState.COMPLETED] == len(self.nodes):
            self.state = PlanState.COMPLETED
        elif state_counts[PlanState.IN_PROGRESS] > 0 or state_counts[PlanState.WAITING] > 0:
            self.state = PlanState.IN_PROGRESS
        elif state_counts[PlanState.NOT_STARTED] == len(self.nodes):
            self.state = PlanState.NOT_STARTED
        else:
            self.state = PlanState.IN_PROGRESS
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'goal': self.goal,
            'metadata': self.metadata,
            'nodes': {node_id: node.to_dict() for node_id, node in self.nodes.items()},
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'state': self.state
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Plan':
        """Create from dictionary"""
        plan = cls(
            id=data['id'],
            name=data['name'],
            description=data['description'],
            goal=data['goal'],
            metadata=data.get('metadata', {})
        )
        
        if 'created_at' in data:
            plan.created_at = datetime.fromisoformat(data['created_at'])
        
        if 'updated_at' in data:
            plan.updated_at = datetime.fromisoformat(data['updated_at'])
        
        plan.state = data.get('state', PlanState.NOT_STARTED)
        
        # Add nodes
        for node_data in data.get('nodes', {}).values():
            plan.add_node(PlanNode.from_dict(node_data))
        
        return plan


class StructuredPlanning(PlanningCapability):
    """
    Structured planning capability for agents.
    
    This capability enables an agent to create and execute structured plans
    with hierarchical steps and dependencies.
    """
    
    CAPABILITY = AgentCapability.PLANNING
    
    def __init__(self, **config):
        """
        Initialize the structured planning capability.
        
        Args:
            **config: Configuration parameters
                storage_dir: Directory to store plan files (default: 'agent_plans')
                agent_id: ID of the agent (default: None, will be set during initialization)
                max_plans: Maximum number of plans to keep in memory (default: 10)
                persist_plans: Whether to persist plans to disk (default: True)
                max_concurrent_steps: Maximum number of plan steps to execute concurrently (default: 3)
        """
        super().__init__(**config)
        self.storage_dir = config.get('storage_dir', 'agent_plans')
        self.agent_id = config.get('agent_id')
        self.max_plans = config.get('max_plans', 10)
        self.persist_plans = config.get('persist_plans', True)
        self.max_concurrent_steps = config.get('max_concurrent_steps', 3)
        
        self.plans: Dict[str, Plan] = {}
        self.active_plan_id = None
        self.executing_tasks = {}
    
    async def initialize(self, agent) -> None:
        """Initialize the capability with the agent"""
        await super().initialize(agent)
        
        # Set agent ID if not provided
        if not self.agent_id:
            self.agent_id = agent.id
        
        # Create storage directory if it doesn't exist and persistence is enabled
        if self.persist_plans:
            os.makedirs(os.path.join(self.storage_dir, self.agent_id), exist_ok=True)
            
            # Load saved plans
            await self._load_plans()
    
    async def create_plan(self, goal: Any, context: Any = None) -> Dict[str, Any]:
        """
        Create a plan to achieve a goal.
        
        Args:
            goal: The goal to achieve
            context: Additional context for planning
            
        Returns:
            Dictionary with the plan
        """
        # Format goal and context for planning
        if isinstance(goal, dict):
            goal_str = json.dumps(goal, indent=2)
        else:
            goal_str = str(goal)
        
        if context:
            if isinstance(context, dict):
                context_str = json.dumps(context, indent=2)
            else:
                context_str = str(context)
        else:
            context_str = ""
        
        # Create planning prompt
        prompt = self._create_planning_prompt(goal_str, context_str)
        
        try:
            # Generate plan
            plan_text = await self.agent.llm_provider.generate(prompt)
            
            # Parse plan
            plan_data = self._parse_plan(plan_text, goal_str)
            
            # Create plan
            plan_id = str(uuid.uuid4())
            plan = Plan(
                id=plan_id,
                name=plan_data.get('name', f"Plan for {goal_str[:30]}..."),
                description=plan_data.get('description', ''),
                goal=goal_str,
                metadata={
                    'created_by': self.agent.id,
                    'created_at': datetime.now().isoformat(),
                    'context': context_str,
                    'raw_plan': plan_text
                }
            )
            
            # Add steps
            for step_data in plan_data.get('steps', []):
                step_id = str(uuid.uuid4())
                
                # Get dependencies
                dependencies = []
                for dep_name in step_data.get('depends_on', []):
                    # Find step by name
                    for node in plan.nodes.values():
                        if node.name == dep_name:
                            dependencies.append(node.id)
                            break
                
                # Create node
                node = PlanNode(
                    id=step_id,
                    name=step_data.get('name', f"Step {len(plan.nodes) + 1}"),
                    description=step_data.get('description', ''),
                    dependencies=dependencies,
                    metadata=step_data.get('metadata', {})
                )
                
                plan.add_node(node)
            
            # Save the plan
            self.plans[plan_id] = plan
            
            # Persist to disk if enabled
            if self.persist_plans:
                await self._save_plan(plan)
            
            # Trim plans if needed
            if len(self.plans) > self.max_plans:
                oldest_plan_id = min(self.plans.items(), key=lambda x: x[1].created_at)[0]
                del self.plans[oldest_plan_id]
            
            logger.info(f"Created plan {plan_id} with {len(plan.nodes)} steps")
            
            return {
                'plan_id': plan_id,
                'name': plan.name,
                'description': plan.description,
                'steps': len(plan.nodes),
                'state': plan.state
            }
            
        except Exception as e:
            logger.error(f"Error creating plan: {str(e)}", exc_info=True)
            return {
                'error': str(e),
                'status': 'failed'
            }
    
    async def execute_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a plan.
        
        Args:
            plan: Plan data or plan ID
            
        Returns:
            Dictionary with execution results
        """
        # Get plan
        if isinstance(plan, dict) and 'plan_id' in plan:
            plan_id = plan['plan_id']
        elif isinstance(plan, str):
            plan_id = plan
        else:
            return {'error': 'Invalid plan data', 'status': 'failed'}
        
        plan_obj = self.plans.get(plan_id)
        if not plan_obj:
            return {'error': f"Plan {plan_id} not found", 'status': 'failed'}
        
        # Check if plan is already completed
        if plan_obj.state == PlanState.COMPLETED:
            return {
                'plan_id': plan_id,
                'status': 'completed',
                'message': 'Plan already completed'
            }
        
        # Check if plan is already failed
        if plan_obj.state == PlanState.FAILED:
            return {
                'plan_id': plan_id,
                'status': 'failed',
                'message': 'Plan already failed'
            }
        
        # Set as active plan
        self.active_plan_id = plan_id
        
        # Start execution
        plan_obj.state = PlanState.IN_PROGRESS
        
        # Start execution task
        execution_task = asyncio.create_task(self._execute_plan_steps(plan_obj))
        self.executing_tasks[plan_id] = execution_task
        
        return {
            'plan_id': plan_id,
            'status': 'started',
            'message': f"Started executing plan with {len(plan_obj.nodes)} steps"
        }
    
    async def update_plan(self, plan: Dict[str, Any], feedback: Any) -> Dict[str, Any]:
        """
        Update a plan based on feedback.
        
        Args:
            plan: Plan data or plan ID
            feedback: Feedback to incorporate
            
        Returns:
            Dictionary with the updated plan
        """
        # Get plan
        if isinstance(plan, dict) and 'plan_id' in plan:
            plan_id = plan['plan_id']
        elif isinstance(plan, str):
            plan_id = plan
        else:
            return {'error': 'Invalid plan data', 'status': 'failed'}
        
        plan_obj = self.plans.get(plan_id)
        if not plan_obj:
            return {'error': f"Plan {plan_id} not found", 'status': 'failed'}
        
        # Format feedback
        if isinstance(feedback, dict):
            feedback_str = json.dumps(feedback, indent=2)
        else:
            feedback_str = str(feedback)
        
        # Create update prompt
        prompt = self._create_update_prompt(plan_obj, feedback_str)
        
        try:
            # Generate updates
            updates_text = await self.agent.llm_provider.generate(prompt)
            
            # Parse updates
            updates = self._parse_updates(updates_text)
            
            # Apply updates
            for update in updates.get('modify_steps', []):
                node_id = update.get('id')
                if not node_id:
                    # Try to find by name
                    name = update.get('name')
                    if name:
                        for node in plan_obj.nodes.values():
                            if node.name == name:
                                node_id = node.id
                                break
                
                if node_id and node_id in plan_obj.nodes:
                    node = plan_obj.nodes[node_id]
                    
                    # Update node fields
                    if 'name' in update:
                        node.name = update['name']
                    
                    if 'description' in update:
                        node.description = update['description']
                    
                    if 'state' in update:
                        node.state = update['state']
                    
                    node.updated_at = datetime.now()
            
            # Add new steps
            for step_data in updates.get('add_steps', []):
                step_id = str(uuid.uuid4())
                
                # Get dependencies
                dependencies = []
                for dep_name in step_data.get('depends_on', []):
                    # Find step by name
                    for node in plan_obj.nodes.values():
                        if node.name == dep_name:
                            dependencies.append(node.id)
                            break
                
                # Create node
                node = PlanNode(
                    id=step_id,
                    name=step_data.get('name', f"Step {len(plan_obj.nodes) + 1}"),
                    description=step_data.get('description', ''),
                    dependencies=dependencies,
                    metadata=step_data.get('metadata', {})
                )
                
                plan_obj.add_node(node)
            
            # Remove steps
            for step_data in updates.get('remove_steps', []):
                node_id = step_data.get('id')
                if not node_id:
                    # Try to find by name
                    name = step_data.get('name')
                    if name:
                        for node in plan_obj.nodes.values():
                            if node.name == name:
                                node_id = node.id
                                break
                
                if node_id and node_id in plan_obj.nodes:
                    # Remove the node
                    del plan_obj.nodes[node_id]
                    
                    # Update dependencies in other nodes
                    for node in plan_obj.nodes.values():
                        if node_id in node.dependencies:
                            node.dependencies.remove(node_id)
            
            # Update plan metadata
            plan_obj.updated_at = datetime.now()
            plan_obj.metadata['last_update'] = {
                'timestamp': datetime.now().isoformat(),
                'feedback': feedback_str,
                'updates': updates
            }
            
            # Update plan state
            plan_obj._update_plan_state()
            
            # Persist to disk if enabled
            if self.persist_plans:
                await self._save_plan(plan_obj)
            
            logger.info(f"Updated plan {plan_id} based on feedback")
            
            return {
                'plan_id': plan_id,
                'name': plan_obj.name,
                'description': plan_obj.description,
                'steps': len(plan_obj.nodes),
                'state': plan_obj.state,
                'updates': updates
            }
            
        except Exception as e:
            logger.error(f"Error updating plan: {str(e)}", exc_info=True)
            return {
                'error': str(e),
                'status': 'failed'
            }
    
    async def get_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a plan by ID.
        
        Args:
            plan_id: ID of the plan to get
            
        Returns:
            Plan data, or None if not found
        """
        plan = self.plans.get(plan_id)
        if not plan:
            return None
        
        return {
            'plan_id': plan.id,
            'name': plan.name,
            'description': plan.description,
            'goal': plan.goal,
            'state': plan.state,
            'steps': [{
                'id': node.id,
                'name': node.name,
                'description': node.description,
                'state': node.state,
                'dependencies': node.dependencies,
                'result': node.result
            } for node in plan.nodes.values()],
            'created_at': plan.created_at.isoformat(),
            'updated_at': plan.updated_at.isoformat(),
            'metadata': plan.metadata
        }
    
    async def get_all_plans(self) -> List[Dict[str, Any]]:
        """
        Get all plans.
        
        Returns:
            List of plan summaries
        """
        return [{
            'plan_id': plan.id,
            'name': plan.name,
            'description': plan.description,
            'state': plan.state,
            'steps': len(plan.nodes),
            'created_at': plan.created_at.isoformat(),
            'updated_at': plan.updated_at.isoformat()
        } for plan in self.plans.values()]
    
    async def cancel_plan(self, plan_id: str) -> Dict[str, Any]:
        """
        Cancel a plan execution.
        
        Args:
            plan_id: ID of the plan to cancel
            
        Returns:
            Status of the cancellation
        """
        # Check if plan exists
        if plan_id not in self.plans:
            return {'error': f"Plan {plan_id} not found", 'status': 'failed'}
        
        # Check if plan is executing
        if plan_id not in self.executing_tasks:
            return {
                'plan_id': plan_id,
                'status': 'not_executing',
                'message': 'Plan is not currently executing'
            }
        
        # Cancel execution task
        task = self.executing_tasks[plan_id]
        task.cancel()
        
        try:
            await task
        except asyncio.CancelledError:
            pass
        
        # Remove from executing tasks
        del self.executing_tasks[plan_id]
        
        # Update plan state
        self.plans[plan_id].state = PlanState.CANCELLED
        
        # If this was the active plan, clear it
        if self.active_plan_id == plan_id:
            self.active_plan_id = None
        
        logger.info(f"Cancelled execution of plan {plan_id}")
        
        return {
            'plan_id': plan_id,
            'status': 'cancelled',
            'message': 'Plan execution cancelled'
        }
    
    async def _execute_plan_steps(self, plan: Plan) -> None:
        """
        Execute steps in a plan.
        
        Args:
            plan: The plan to execute
        """
        try:
            # Execute until all nodes are completed or plan fails
            while plan.state == PlanState.IN_PROGRESS:
                # Get ready nodes
                ready_nodes = plan.get_ready_nodes()
                
                if not ready_nodes:
                    # Check if all nodes are complete
                    all_complete = all(node.state == PlanState.COMPLETED for node in plan.nodes.values())
                    if all_complete:
                        plan.state = PlanState.COMPLETED
                        logger.info(f"Plan {plan.id} completed successfully")
                        break
                    
                    # Check if any nodes failed
                    any_failed = any(node.state == PlanState.FAILED for node in plan.nodes.values())
                    if any_failed:
                        plan.state = PlanState.FAILED
                        logger.info(f"Plan {plan.id} failed due to step failures")
                        break
                    
                    # If no nodes are ready but not all are complete, wait a bit
                    await asyncio.sleep(0.5)
                    continue
                
                # Execute ready nodes (up to max_concurrent_steps)
                executing_tasks = []
                for node in ready_nodes[:self.max_concurrent_steps]:
                    # Mark as in progress
                    plan.update_node(node.id, state=PlanState.IN_PROGRESS)
                    
                    # Start execution
                    task = asyncio.create_task(self._execute_node(plan, node))
                    executing_tasks.append(task)
                
                # Wait for tasks to complete
                if executing_tasks:
                    await asyncio.gather(*executing_tasks)
                
                # Persist plan if enabled
                if self.persist_plans:
                    await self._save_plan(plan)
            
            # Clean up
            if plan.id in self.executing_tasks:
                del self.executing_tasks[plan.id]
            
            if self.active_plan_id == plan.id:
                self.active_plan_id = None
            
            # Persist final state if enabled
            if self.persist_plans:
                await self._save_plan(plan)
                
        except asyncio.CancelledError:
            logger.info(f"Execution of plan {plan.id} was cancelled")
            plan.state = PlanState.CANCELLED
            
            # Persist cancelled state if enabled
            if self.persist_plans:
                await self._save_plan(plan)
            
            raise
        except Exception as e:
            logger.error(f"Error executing plan {plan.id}: {str(e)}", exc_info=True)
            plan.state = PlanState.FAILED
            
            # Persist failed state if enabled
            if self.persist_plans:
                await self._save_plan(plan)
    
    async def _execute_node(self, plan: Plan, node: PlanNode) -> None:
        """
        Execute a single plan node.
        
        Args:
            plan: The plan containing the node
            node: The node to execute
        """
        try:
            # Get node details
            node_data = {
                'id': node.id,
                'name': node.name,
                'description': node.description,
                'plan_goal': plan.goal,
                'plan_context': plan.metadata.get('context', '')
            }
            
            # Get dependency results
            dependencies = {}
            for dep_id in node.dependencies:
                dep_node = plan.nodes.get(dep_id)
                if dep_node:
                    dependencies[dep_node.name] = {
                        'result': dep_node.result,
                        'description': dep_node.description
                    }
            
            node_data['dependencies'] = dependencies
            
            # Create execution prompt
            prompt = self._create_execution_prompt(node_data)
            
            # Execute step
            result_text = await self.agent.llm_provider.generate(prompt)
            
            # Parse result
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # Fallback: use text as result
                result = {
                    'result': result_text,
                    'status': 'completed',
                    'notes': 'Result was not in JSON format'
                }
            
            # Update node with result
            if result.get('status') == 'failed':
                plan.update_node(
                    node.id,
                    state=PlanState.FAILED,
                    result=result.get('result'),
                    error=result.get('error', 'Step execution failed')
                )
            else:
                plan.update_node(
                    node.id,
                    state=PlanState.COMPLETED,
                    result=result.get('result')
                )
            
            logger.info(f"Executed step {node.name} of plan {plan.id}")
            
        except Exception as e:
            logger.error(f"Error executing step {node.name} of plan {plan.id}: {str(e)}", exc_info=True)
            plan.update_node(
                node.id,
                state=PlanState.FAILED,
                error=str(e)
            )
    
    async def _save_plan(self, plan: Plan) -> bool:
        """
        Save a plan to disk.
        
        Args:
            plan: The plan to save
            
        Returns:
            True if the plan was saved successfully, False otherwise
        """
        if not self.persist_plans:
            return False
        
        try:
            # Convert to dictionary
            plan_dict = plan.to_dict()
            
            # Convert to JSON
            plan_json = json.dumps(plan_dict, indent=2)
            
            # Save to file
            path = os.path.join(self.storage_dir, self.agent_id, f"{plan.id}.json")
            
            async with aiofiles.open(path, 'w') as f:
                await f.write(plan_json)
            
            logger.debug(f"Saved plan {plan.id} to disk")
            return True
            
        except Exception as e:
            logger.error(f"Error saving plan {plan.id}: {str(e)}", exc_info=True)
            return False
    
    async def _load_plans(self) -> int:
        """
        Load plans from disk.
        
        Returns:
            Number of plans loaded
        """
        if not self.persist_plans:
            return 0
        
        try:
            # Get plan files
            plan_dir = os.path.join(self.storage_dir, self.agent_id)
            if not os.path.exists(plan_dir):
                return 0
            
            plan_files = [f for f in os.listdir(plan_dir) if f.endswith('.json')]
            count = 0
            
            for file_name in plan_files:
                try:
                    # Load plan file
                    path = os.path.join(plan_dir, file_name)
                    
                    async with aiofiles.open(path, 'r') as f:
                        plan_json = await f.read()
                    
                    # Parse JSON
                    plan_dict = json.loads(plan_json)
                    
                    # Create plan object
                    plan = Plan.from_dict(plan_dict)
                    
                    # Add to plans
                    self.plans[plan.id] = plan
                    count += 1
                    
                except Exception as e:
                    logger.error(f"Error loading plan {file_name}: {str(e)}", exc_info=True)
            
            logger.info(f"Loaded {count} plans from disk")
            return count
            
        except Exception as e:
            logger.error(f"Error loading plans: {str(e)}", exc_info=True)
            return 0
    
    def _create_planning_prompt(self, goal: str, context: str) -> str:
        """
        Create a prompt for planning.
        
        Args:
            goal: The goal to plan for
            context: Additional context for planning
            
        Returns:
            Planning prompt
        """
        prompt = f"""You are {self.agent.name}, an AI agent with the role of {self.agent.role.value}.

I need you to create a detailed plan to achieve the following goal:

{goal}

"""
        
        if context:
            prompt += f"""Additional context:

{context}

"""
        
        prompt += """Create a step-by-step plan to achieve this goal. For each step, include:
1. A clear name/title for the step
2. A detailed description of what needs to be done
3. Any dependencies on other steps

Format your response as a JSON object with the following structure:
{
  "name": "Name of the plan",
  "description": "Overall description of the plan",
  "steps": [
    {
      "name": "Step 1",
      "description": "Detailed description of step 1",
      "depends_on": [] // Names of steps this step depends on
    },
    // more steps
  ]
}

Make sure your plan is comprehensive and includes all necessary steps to achieve the goal."""
        
        return prompt
    
    def _create_execution_prompt(self, node_data: Dict[str, Any]) -> str:
        """
        Create a prompt for executing a plan step.
        
        Args:
            node_data: Data about the node to execute
            
        Returns:
            Execution prompt
        """
        # Format dependencies
        dependencies_str = ""
        if node_data.get('dependencies'):
            dependencies_str = "\nResults from previous steps:\n"
            for dep_name, dep_data in node_data['dependencies'].items():
                dependencies_str += f"- {dep_name}: {dep_data.get('result')}\n"
        
        prompt = f"""You are {self.agent.name}, an AI agent with the role of {self.agent.role.value}.

You are executing a step in a plan to achieve the following goal:

{node_data.get('plan_goal', 'Goal not specified')}

The current step is: {node_data.get('name', 'Step name not specified')}

Step description: {node_data.get('description', 'No description provided')}
{dependencies_str}

Execute this step and provide the result. If execution requires any external actions, simulate the execution and provide the expected outcome.

Format your response as a JSON object with the following structure:
{
  "status": "completed", // or "failed" if the step couldn't be completed
  "result": "The result of executing this step",
  "error": "Error message if the step failed" // Only include if status is "failed"
}"""
        
        return prompt
    
    def _create_update_prompt(self, plan: Plan, feedback: str) -> str:
        """
        Create a prompt for updating a plan.
        
        Args:
            plan: The plan to update
            feedback: Feedback to incorporate
            
        Returns:
            Update prompt
        """
        # Format plan steps
        steps_str = ""
        for node in plan.nodes.values():
            deps = [plan.nodes[dep_id].name for dep_id in node.dependencies if dep_id in plan.nodes]
            deps_str = ", ".join(deps) if deps else "None"
            
            steps_str += f"- {node.name}\n"
            steps_str += f"  Description: {node.description}\n"
            steps_str += f"  State: {node.state}\n"
            steps_str += f"  Dependencies: {deps_str}\n"
            if node.result:
                steps_str += f"  Result: {node.result}\n"
            if node.error:
                steps_str += f"  Error: {node.error}\n"
            steps_str += "\n"
        
        prompt = f"""You are {self.agent.name}, an AI agent with the role of {self.agent.role.value}.

You need to update a plan based on new feedback. The current plan is:

Plan Name: {plan.name}
Description: {plan.description}
Goal: {plan.goal}
State: {plan.state}

Current Steps:
{steps_str}

New feedback to incorporate:
{feedback}

Based on this feedback, suggest changes to the plan. You can:
1. Modify existing steps
2. Add new steps
3. Remove steps

Format your response as a JSON object with the following structure:
{
  "modify_steps": [
    {
      "name": "Step to modify", // Name of the existing step
      "description": "Updated description" // Only include fields that should be changed
    }
  ],
  "add_steps": [
    {
      "name": "New step name",
      "description": "Description of the new step",
      "depends_on": ["Names of steps this depends on"]
    }
  ],
  "remove_steps": [
    {
      "name": "Step to remove" // Name of the step to remove
    }
  ]
}

Only include sections that have changes (e.g., if no steps need to be removed, don't include "remove_steps")."""
        
        return prompt
    
    def _parse_plan(self, plan_text: str, goal: str) -> Dict[str, Any]:
        """
        Parse plan from generated text.
        
        Args:
            plan_text: Generated plan text
            goal: Original goal
            
        Returns:
            Parsed plan data
        """
        # Try to extract JSON
        try:
            # Look for JSON object in text
            import re
            json_match = re.search(r'\{[\s\S]*\}', plan_text)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            else:
                # Fallback: assume the entire text is JSON
                return json.loads(plan_text)
        except json.JSONDecodeError:
            # Fallback: parse manually
            logger.warning(f"Failed to parse plan as JSON, using fallback parsing")
            
            # Default structure
            plan_data = {
                'name': f"Plan for {goal[:30]}...",
                'description': "Plan generated from non-JSON output",
                'steps': []
            }
            
            # Extract steps based on common patterns
            lines = plan_text.split('\n')
            current_step = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Look for step headers
                step_match = re.search(r'^(?:Step|\d+\.)[\s:]*(.*)', line, re.IGNORECASE)
                if step_match:
                    # Save previous step if exists
                    if current_step:
                        plan_data['steps'].append(current_step)
                    
                    # Start new step
                    current_step = {
                        'name': step_match.group(1).strip(),
                        'description': "",
                        'depends_on': []
                    }
                elif current_step:
                    # Add to current step description
                    if current_step['description']:
                        current_step['description'] += "\n"
                    current_step['description'] += line
                    
                    # Check for dependencies
                    if 'depend' in line.lower() or 'after' in line.lower() or 'requires' in line.lower():
                        # Try to extract step names from previous steps
                        for step in plan_data['steps']:
                            if step['name'].lower() in line.lower():
                                current_step['depends_on'].append(step['name'])
            
            # Add the last step
            if current_step:
                plan_data['steps'].append(current_step)
            
            return plan_data
    
    def _parse_updates(self, updates_text: str) -> Dict[str, Any]:
        """
        Parse updates from generated text.
        
        Args:
            updates_text: Generated updates text
            
        Returns:
            Parsed updates data
        """
        # Try to extract JSON
        try:
            # Look for JSON object in text
            import re
            json_match = re.search(r'\{[\s\S]*\}', updates_text)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            else:
                # Fallback: assume the entire text is JSON
                return json.loads(updates_text)
        except json.JSONDecodeError:
            # Fallback: empty updates
            logger.warning(f"Failed to parse updates as JSON, returning empty updates")
            return {
                'modify_steps': [],
                'add_steps': [],
                'remove_steps': []
            }
    
    async def cleanup(self) -> None:
        """
        Clean up the capability.
        
        This method stops any ongoing plan executions and cleans up resources.
        """
        # Cancel all executing tasks
        for plan_id, task in list(self.executing_tasks.items()):
            logger.info(f"Cancelling execution of plan {plan_id} during cleanup")
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self.executing_tasks.clear()
        self.active_plan_id = None
        
        # Clear plans
        self.plans.clear()
        
        await super().cleanup()