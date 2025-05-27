"""
Dynamic Workflow Capability for NocturneAI agents.

This module implements a capability that allows agents to dynamically generate
and execute workflows based on task requirements, removing the need for
hardcoded workflow structures.
"""

import asyncio
import logging
import os
from typing import Dict, List, Any, Optional, Set, Union
from datetime import datetime
import json
import uuid

from .planning import PlanningCapability
from ..core.types import AgentCapability, MessageType, Message
from .base import Capability

logger = logging.getLogger(__name__)


class DynamicWorkflowCapability(Capability):
    """
    A capability that enables agents to dynamically create and execute workflows.
    
    This capability bridges the gap between agent capabilities and workflows,
    allowing workflows to be generated during task planning rather than
    being hardcoded in advance.
    """
    
    # Specify capability type
    CAPABILITY = AgentCapability.PLANNING
    
    def __init__(self, agent_id: Optional[str] = None, **config):
        super().__init__(**config)
        self.agent_id = agent_id
        self.workflows: Dict[str, Dict[str, Any]] = {}
        self.active_workflow_id: Optional[str] = None
        self.executing_workflows: Dict[str, asyncio.Task] = {}
    
    async def initialize(self, agent) -> None:
        """Initialize the capability"""
        await super().initialize(agent)
        
        # Make sure the agent has a planning capability
        if not self.agent.has_capability('PlanningCapability'):
            logger.warning("DynamicWorkflowCapability requires PlanningCapability")
        
        logger.debug(f"DynamicWorkflowCapability initialized for agent {self.agent.name}")
    
    async def generate_workflow(self, 
                              goal: str, 
                              context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate a dynamic workflow for a specific goal.
        
        Instead of using predefined workflow structures, this method uses the
        agent's planning capability and LLM to generate a workflow tailored
        to the specific task requirements.
        
        Args:
            goal: The goal or objective to create a workflow for
            context: Additional context or constraints for the workflow
            
        Returns:
            A workflow definition that can be executed
        """
        if not self.agent:
            raise ValueError("No agent attached to capability")
            
        # Use planning capability to break down the goal
        planning = self.agent.get_capability('PlanningCapability')
        if not planning:
            raise ValueError("Agent does not have PlanningCapability")
        
        # First, create a plan for the goal
        plan = await planning.create_plan(goal, context or {})
        
        # Transform the plan into a dynamic workflow
        workflow_id = str(uuid.uuid4())
        workflow = {
            'id': workflow_id,
            'name': f"workflow_{plan['name']}",
            'description': plan['description'],
            'created_at': datetime.now().isoformat(),
            'status': 'created',
            'goal': goal,
            'steps': [],
            'context': context or {}
        }
        
        # Convert plan steps to workflow steps
        for step in plan['steps']:
            workflow_step = {
                'id': step['id'],
                'name': step['name'],
                'description': step['description'],
                'dependencies': step['dependencies'] if 'dependencies' in step else [],
                'agent_requirements': self._derive_agent_requirements(step),
                'status': 'pending',
                'assignee': None
            }
            workflow['steps'].append(workflow_step)
        
        # Store the workflow
        self.workflows[workflow_id] = workflow
        
        logger.info(f"Generated workflow {workflow_id} for goal: {goal}")
        return workflow
    
    def _derive_agent_requirements(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """
        Derive agent requirements from a plan step.
        
        This analyzes the step description to determine what capabilities 
        an agent would need to execute this step.
        
        Args:
            step: The plan step to analyze
            
        Returns:
            A dictionary of agent requirements
        """
        # This is a simplified implementation
        # In a real system, this would use NLP to analyze the step
        # and determine capability requirements
        requirements = {
            'capabilities': [],
            'expertise_level': 'general'
        }
        
        # Check for keywords in the description
        description = step['description'].lower()
        
        # Check for research-related keywords
        if any(kw in description for kw in ['research', 'find', 'search', 'gather']):
            requirements['capabilities'].append('ResearchCapability')
        
        # Check for planning-related keywords
        if any(kw in description for kw in ['plan', 'design', 'organize', 'structure']):
            requirements['capabilities'].append('PlanningCapability')
        
        # Check for collaboration-related keywords
        if any(kw in description for kw in ['collaborate', 'team', 'coordinate', 'consensus', 'agree']):
            requirements['capabilities'].append('TeamCoordination')
            requirements['capabilities'].append('ConsensusBuilding')
        
        # Check for tool-related keywords
        if any(kw in description for kw in ['tool', 'api', 'system', 'interface']):
            requirements['capabilities'].append('ToolUseCapability')
        
        # Expertise level
        if 'expert' in description or 'specialized' in description or 'advanced' in description:
            requirements['expertise_level'] = 'expert'
        
        return requirements
    
    async def execute_workflow(self, 
                             workflow_id: str,
                             agent_network: Optional[Any] = None) -> Dict[str, Any]:
        """
        Execute a generated workflow.
        
        This method orchestrates the execution of workflow steps, potentially
        delegating to other agents in the network if they have the required capabilities.
        
        Args:
            workflow_id: The ID of the workflow to execute
            agent_network: Optional agent network for delegation
            
        Returns:
            The results of the workflow execution
        """
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        workflow = self.workflows[workflow_id]
        
        # Mark workflow as running
        workflow['status'] = 'running'
        self.active_workflow_id = workflow_id
        
        # Create a task for execution
        task = asyncio.create_task(self._execute_workflow_steps(workflow, agent_network))
        self.executing_workflows[workflow_id] = task
        
        # Wait for the workflow to complete or fail
        try:
            result = await task
            workflow['status'] = 'completed'
            workflow['completed_at'] = datetime.now().isoformat()
            workflow['result'] = result
            logger.info(f"Workflow {workflow_id} completed successfully")
        except Exception as e:
            workflow['status'] = 'failed'
            workflow['error'] = str(e)
            logger.error(f"Workflow {workflow_id} failed: {str(e)}", exc_info=True)
            raise
        finally:
            # Clean up
            if workflow_id in self.executing_workflows:
                del self.executing_workflows[workflow_id]
            if self.active_workflow_id == workflow_id:
                self.active_workflow_id = None
        
        return workflow
    
    async def _execute_workflow_steps(self, 
                                    workflow: Dict[str, Any],
                                    agent_network: Optional[Any] = None) -> Dict[str, Any]:
        """
        Execute the steps of a workflow in the proper order.
        
        Args:
            workflow: The workflow to execute
            agent_network: Optional agent network for delegation
            
        Returns:
            The combined results from all workflow steps
        """
        results = {}
        pending_steps = {step['id']: step for step in workflow['steps']}
        completed_steps = set()
        
        while pending_steps:
            # Find steps that can be executed (dependencies satisfied)
            executable_steps = []
            
            for step_id, step in pending_steps.items():
                dependencies_met = all(dep in completed_steps for dep in step['dependencies'])
                if dependencies_met:
                    executable_steps.append(step)
            
            if not executable_steps:
                # If no steps can be executed but there are still pending steps,
                # we have a dependency cycle
                raise ValueError(f"Dependency cycle detected in workflow {workflow['id']}")
            
            # Execute steps in parallel where possible
            execution_tasks = []
            
            for step in executable_steps:
                # Determine if we should execute the step or delegate
                if self._can_execute_step(step) or not agent_network:
                    # Execute the step ourselves
                    task = asyncio.create_task(self._execute_step(step, workflow['context'], results))
                    execution_tasks.append((step['id'], task))
                else:
                    # Delegate to another agent in the network
                    task = asyncio.create_task(
                        self._delegate_step(step, workflow['context'], results, agent_network)
                    )
                    execution_tasks.append((step['id'], task))
            
            # Wait for all tasks to complete
            for step_id, task in execution_tasks:
                try:
                    step_result = await task
                    results[step_id] = step_result
                    completed_steps.add(step_id)
                    del pending_steps[step_id]
                    
                    # Update step status
                    for step in workflow['steps']:
                        if step['id'] == step_id:
                            step['status'] = 'completed'
                            step['completed_at'] = datetime.now().isoformat()
                            break
                except Exception as e:
                    # Update step status
                    for step in workflow['steps']:
                        if step['id'] == step_id:
                            step['status'] = 'failed'
                            step['error'] = str(e)
                            break
                    
                    # Re-raise the exception to abort the workflow
                    raise
        
        return results
    
    def _can_execute_step(self, step: Dict[str, Any]) -> bool:
        """
        Determine if the current agent can execute a given step.
        
        Args:
            step: The step to check
            
        Returns:
            True if the agent can execute the step, False otherwise
        """
        if not self.agent:
            return False
        
        # Check if the agent has all required capabilities
        requirements = step.get('agent_requirements', {})
        required_capabilities = requirements.get('capabilities', [])
        
        for capability in required_capabilities:
            if not self.agent.has_capability(capability):
                return False
        
        return True
    
    async def _execute_step(self, 
                           step: Dict[str, Any], 
                           context: Dict[str, Any],
                           previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a workflow step using the agent's capabilities.
        
        Args:
            step: The step to execute
            context: The workflow context
            previous_results: Results from previously executed steps
            
        Returns:
            The result of the step execution
        """
        if not self.agent:
            raise ValueError("No agent attached to capability")
        
        # Mark the step as in progress
        step['status'] = 'in_progress'
        step['started_at'] = datetime.now().isoformat()
        
        # Combine context and previous results
        step_context = {
            **context,
            'previous_results': previous_results,
            'step_id': step['id'],
            'step_name': step['name'],
            'step_description': step['description']
        }
        
        # Create a task object
        task = {
            'id': step['id'],
            'type': 'workflow_step',
            'description': step['description'],
            'context': step_context
        }
        
        # Let the agent process the task
        result = await self.agent.process_task(task)
        
        # Update step status
        step['status'] = 'completed'
        step['completed_at'] = datetime.now().isoformat()
        
        return result
    
    async def _delegate_step(self, 
                            step: Dict[str, Any], 
                            context: Dict[str, Any],
                            previous_results: Dict[str, Any],
                            agent_network: Any) -> Dict[str, Any]:
        """
        Delegate a workflow step to another agent in the network.
        
        Args:
            step: The step to delegate
            context: The workflow context
            previous_results: Results from previously executed steps
            agent_network: The agent network for delegation
            
        Returns:
            The result of the step execution by the delegated agent
        """
        if not self.agent:
            raise ValueError("No agent attached to capability")
        
        # Find a suitable agent in the network
        requirements = step.get('agent_requirements', {})
        suitable_agent = await agent_network.find_agent_for_task(requirements)
        
        if not suitable_agent:
            raise ValueError(f"No suitable agent found for step {step['id']}")
        
        # Mark the step as delegated
        step['status'] = 'delegated'
        step['assignee'] = suitable_agent.agent_id
        step['delegated_at'] = datetime.now().isoformat()
        
        # Combine context and previous results
        step_context = {
            **context,
            'previous_results': previous_results,
            'step_id': step['id'],
            'step_name': step['name'],
            'step_description': step['description'],
            'delegated_by': self.agent_id
        }
        
        # Create a task object
        task = {
            'id': step['id'],
            'type': 'delegated_workflow_step',
            'description': step['description'],
            'context': step_context
        }
        
        # Create a message for the agent
        message = {
            'type': MessageType.TASK,
            'sender_id': self.agent_id,
            'receiver_id': suitable_agent.agent_id,
            'content': {
                'task': task
            }
        }
        
        # Send the message and wait for a response
        response = await agent_network.send_message(message)
        
        if not response:
            raise ValueError(f"No response received for delegated step {step['id']}")
        
        # Update step status
        step['status'] = 'completed'
        step['completed_at'] = datetime.now().isoformat()
        
        return response.get('content', {}).get('result', {})
    
    async def cancel_workflow(self, workflow_id: str) -> bool:
        """
        Cancel a running workflow.
        
        Args:
            workflow_id: The ID of the workflow to cancel
            
        Returns:
            True if cancelled successfully, False otherwise
        """
        if workflow_id not in self.workflows:
            logger.warning(f"Workflow {workflow_id} not found, cannot cancel")
            return False
        
        workflow = self.workflows[workflow_id]
        
        if workflow['status'] not in ['running', 'created']:
            logger.warning(f"Workflow {workflow_id} is not running, cannot cancel")
            return False
        
        # Cancel the execution task if it exists
        if workflow_id in self.executing_workflows:
            task = self.executing_workflows[workflow_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self.executing_workflows[workflow_id]
        
        # Update workflow status
        workflow['status'] = 'cancelled'
        workflow['cancelled_at'] = datetime.now().isoformat()
        
        if self.active_workflow_id == workflow_id:
            self.active_workflow_id = None
        
        logger.info(f"Workflow {workflow_id} cancelled")
        return True
    
    async def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get the current status of a workflow.
        
        Args:
            workflow_id: The ID of the workflow
            
        Returns:
            The workflow status
        """
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        return self.workflows[workflow_id]
    
    async def cleanup(self) -> None:
        """
        Clean up the capability.
        
        This method cancels any running workflows and cleans up resources.
        """
        # Cancel all executing workflows
        for workflow_id, task in list(self.executing_workflows.items()):
            logger.info(f"Cancelling workflow {workflow_id} during cleanup")
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self.executing_workflows.clear()
        self.active_workflow_id = None
        
        await super().cleanup()
