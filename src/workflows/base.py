"""
Base classes for the modular workflow system.

This module defines the core components for creating modular workflows
that can be composed and reused across different agent collaboration scenarios.
"""

from typing import Dict, List, Any, Optional, Callable, Awaitable, Union, Type
from enum import Enum, auto
from abc import ABC, abstractmethod
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class WorkflowStatus(Enum):
    """Status of a workflow execution"""
    PENDING = auto()
    RUNNING = auto()
    PAUSED = auto()
    COMPLETED = auto()
    FAILED = auto()
    CANCELLED = auto()

class WorkflowContext(BaseModel):
    """
    Context for workflow execution.
    
    The context stores all the data and state for a workflow execution,
    allowing steps to share information and track progress.
    """
    workflow_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_name: str
    status: WorkflowStatus = WorkflowStatus.PENDING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    current_step: Optional[str] = None
    step_history: List[str] = Field(default_factory=list)
    data: Dict[str, Any] = Field(default_factory=dict)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def start(self):
        """Mark the workflow as started"""
        self.status = WorkflowStatus.RUNNING
        self.start_time = datetime.now(timezone.utc)
    
    def complete(self):
        """Mark the workflow as completed"""
        self.status = WorkflowStatus.COMPLETED
        self.end_time = datetime.now(timezone.utc)
    
    def fail(self, error_message: str, error_details: Optional[Dict[str, Any]] = None):
        """Mark the workflow as failed"""
        self.status = WorkflowStatus.FAILED
        self.end_time = datetime.now(timezone.utc)
        
        error = {
            "message": error_message,
            "time": datetime.now(timezone.utc).isoformat(),
            "step": self.current_step,
            "details": error_details or {}
        }
        
        self.errors.append(error)
    
    def cancel(self):
        """Mark the workflow as cancelled"""
        self.status = WorkflowStatus.CANCELLED
        self.end_time = datetime.now(timezone.utc)
    
    def pause(self):
        """Mark the workflow as paused"""
        self.status = WorkflowStatus.PAUSED
    
    def resume(self):
        """Resume a paused workflow"""
        if self.status == WorkflowStatus.PAUSED:
            self.status = WorkflowStatus.RUNNING
    
    def set_current_step(self, step_name: str):
        """Set the current workflow step"""
        self.current_step = step_name
        self.step_history.append(step_name)
    
    def add_data(self, key: str, value: Any):
        """Add data to the workflow context"""
        self.data[key] = value
    
    def get_data(self, key: str, default: Any = None) -> Any:
        """Get data from the workflow context"""
        return self.data.get(key, default)
    
    def update_metadata(self, key: str, value: Any):
        """Update workflow metadata"""
        self.metadata[key] = value

class WorkflowStep(ABC):
    """
    Base class for a workflow step.
    
    A workflow step is a discrete unit of work that can be executed
    as part of a workflow. Steps can depend on other steps and can
    access the workflow context to share data.
    """
    
    def __init__(self, name: str, description: Optional[str] = None):
        self.name = name
        self.description = description or f"Step: {name}"
        self.dependencies: List[str] = []
    
    def add_dependency(self, step_name: str):
        """Add a dependency on another step"""
        if step_name not in self.dependencies:
            self.dependencies.append(step_name)
    
    def check_dependencies(self, context: WorkflowContext) -> bool:
        """Check if all dependencies have been executed"""
        for dep in self.dependencies:
            if dep not in context.step_history:
                return False
        return True
    
    @abstractmethod
    async def execute(self, context: WorkflowContext) -> bool:
        """
        Execute the workflow step.
        
        Returns True if the step was executed successfully, False otherwise.
        """
        pass
    
    def __str__(self) -> str:
        return f"{self.name}: {self.description}"

class LLMDrivenStep(WorkflowStep):
    """
    A workflow step that uses an LLM for decision making.
    
    This step delegates its core logic to an LLM, allowing for
    dynamic decision making during workflow execution.
    """
    
    def __init__(
        self, 
        name: str, 
        description: Optional[str] = None,
        llm_provider = None,
        system_prompt: Optional[str] = None,
        input_formatter: Optional[Callable[[WorkflowContext], str]] = None,
        output_parser: Optional[Callable[[str, WorkflowContext], Dict[str, Any]]] = None
    ):
        super().__init__(name, description)
        self.llm_provider = llm_provider
        self.system_prompt = system_prompt or f"You are assisting with the '{name}' step of a workflow."
        self.input_formatter = input_formatter or self._default_input_formatter
        self.output_parser = output_parser or self._default_output_parser
    
    async def execute(self, context: WorkflowContext) -> bool:
        """Execute the workflow step using an LLM for decision making"""
        try:
            if not self.check_dependencies(context):
                logger.warning(f"Step {self.name} dependencies not met")
                context.fail(f"Dependencies not met for step {self.name}")
                return False
            
            # Update the current step
            context.set_current_step(self.name)
            
            # Format the input for the LLM
            input_text = self.input_formatter(context)
            
            # Generate a response using the LLM
            if self.llm_provider:
                messages = [{"role": "user", "content": input_text}]
                response = await self.llm_provider.generate(
                    messages=messages,
                    system_prompt=self.system_prompt
                )
                
                # Parse the output
                result = self.output_parser(response.content, context)
                
                # Update the context with the result
                for key, value in result.items():
                    context.add_data(f"{self.name}.{key}", value)
                
                # Add the raw LLM response
                context.add_data(f"{self.name}.raw_response", response.content)
                
                return True
            else:
                logger.error(f"No LLM provider for step {self.name}")
                context.fail(f"No LLM provider for step {self.name}")
                return False
                
        except Exception as e:
            logger.error(f"Error in step {self.name}: {str(e)}", exc_info=True)
            context.fail(f"Error in step {self.name}: {str(e)}")
            return False
    
    def _default_input_formatter(self, context: WorkflowContext) -> str:
        """Default input formatter that includes workflow context data"""
        input_parts = [
            f"# Workflow Step: {self.name}",
            f"## Description: {self.description}",
            "## Current Workflow Context:",
            f"- Workflow ID: {context.workflow_id}",
            f"- Workflow Name: {context.workflow_name}",
            f"- Current Status: {context.status.name}",
            "## Previous Steps:",
            *[f"- {step}" for step in context.step_history[:-1]],  # Exclude current step
            "## Available Data:"
        ]
        
        # Add available data
        for key, value in context.data.items():
            if isinstance(value, (str, int, float, bool)) or value is None:
                input_parts.append(f"- {key}: {value}")
            else:
                input_parts.append(f"- {key}: (complex data)")
        
        # Add task description
        input_parts.extend([
            "## Task:",
            f"Please complete the '{self.name}' step of this workflow.",
            "Provide your analysis, decisions, or outputs based on the context above."
        ])
        
        return "\n".join(input_parts)
    
    def _default_output_parser(self, output: str, context: WorkflowContext) -> Dict[str, Any]:
        """Default output parser that returns the raw output"""
        return {"output": output}

class BaseWorkflow(ABC):
    """
    Base class for a workflow.
    
    A workflow is a collection of steps that are executed in a specific order.
    Workflows can be composed together to create more complex workflows.
    """
    
    def __init__(self, name: str, description: Optional[str] = None):
        self.name = name
        self.description = description or f"Workflow: {name}"
        self.steps: Dict[str, WorkflowStep] = {}
        self.entry_points: List[str] = []
        self.exit_points: List[str] = []
    
    def add_step(self, step: WorkflowStep, is_entry: bool = False, is_exit: bool = False) -> None:
        """Add a step to the workflow"""
        self.steps[step.name] = step
        
        if is_entry:
            self.entry_points.append(step.name)
            
        if is_exit:
            self.exit_points.append(step.name)
    
    def remove_step(self, step_name: str) -> None:
        """Remove a step from the workflow"""
        if step_name in self.steps:
            del self.steps[step_name]
            
        if step_name in self.entry_points:
            self.entry_points.remove(step_name)
            
        if step_name in self.exit_points:
            self.exit_points.remove(step_name)
    
    def get_step(self, step_name: str) -> Optional[WorkflowStep]:
        """Get a step by name"""
        return self.steps.get(step_name)
    
    def get_next_steps(self, context: WorkflowContext) -> List[str]:
        """
        Get the next steps that can be executed.
        
        By default, returns all steps that have their dependencies met
        and haven't been executed yet.
        """
        next_steps = []
        
        for step_name, step in self.steps.items():
            if step_name not in context.step_history and step.check_dependencies(context):
                next_steps.append(step_name)
                
        return next_steps
    
    async def execute_step(self, step_name: str, context: WorkflowContext) -> bool:
        """Execute a specific step"""
        step = self.get_step(step_name)
        if not step:
            logger.error(f"Step {step_name} not found in workflow {self.name}")
            context.fail(f"Step {step_name} not found")
            return False
            
        logger.info(f"Executing step {step_name} in workflow {self.name}")
        return await step.execute(context)
    
    async def execute(self, context: Optional[WorkflowContext] = None) -> WorkflowContext:
        """Execute the entire workflow"""
        # Create a new context if none provided
        if context is None:
            context = WorkflowContext(workflow_name=self.name)
            
        # Start the workflow
        context.start()
        logger.info(f"Starting workflow {self.name}")
        
        try:
            # Execute entry points first if they haven't been executed
            for entry_point in self.entry_points:
                if entry_point not in context.step_history:
                    success = await self.execute_step(entry_point, context)
                    if not success:
                        context.fail(f"Entry point {entry_point} failed")
                        return context
            
            # Execute remaining steps until all are executed or no more can be executed
            while context.status == WorkflowStatus.RUNNING:
                next_steps = self.get_next_steps(context)
                
                if not next_steps:
                    # Check if all exit points have been executed
                    all_exits_executed = all(exit_point in context.step_history for exit_point in self.exit_points)
                    
                    if all_exits_executed or not self.exit_points:
                        # All steps have been executed
                        context.complete()
                    else:
                        # Some exit points haven't been executed
                        context.fail("Not all exit points were executed")
                    
                    break
                
                # Execute the next step
                step_name = next_steps[0]
                success = await self.execute_step(step_name, context)
                
                if not success:
                    context.fail(f"Step {step_name} failed")
                    break
            
            return context
            
        except Exception as e:
            logger.error(f"Error in workflow {self.name}: {str(e)}", exc_info=True)
            context.fail(f"Error in workflow: {str(e)}")
            return context
    
    def create_subworkflow(self, name: str, steps: List[str]) -> 'BaseWorkflow':
        """Create a new workflow from a subset of steps in this workflow"""
        subworkflow = BaseWorkflow(name)
        
        # Add steps to the subworkflow
        for step_name in steps:
            step = self.get_step(step_name)
            if step:
                subworkflow.add_step(step)
        
        return subworkflow
    
    @abstractmethod
    def create_graph(self) -> Dict[str, Any]:
        """Create a graph representation of the workflow"""
        pass
