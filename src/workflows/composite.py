"""
Composite workflow implementation.

This module provides a way to compose multiple workflows together
to create more complex workflows.
"""

from typing import Dict, List, Any, Optional, Union
import logging
from .base import BaseWorkflow, WorkflowContext, WorkflowStatus

logger = logging.getLogger(__name__)

class CompositeWorkflow(BaseWorkflow):
    """
    A workflow composed of multiple sub-workflows.
    
    This allows for the composition of complex workflows from simpler ones,
    with each component workflow being treated as a black box.
    """
    
    def __init__(
        self, 
        name: str, 
        component_workflows: List[BaseWorkflow],
        description: Optional[str] = None,
        sequential: bool = True
    ):
        super().__init__(name, description)
        self.component_workflows = component_workflows
        self.sequential = sequential
        
        # Track which components have been executed
        self.component_statuses: Dict[str, bool] = {
            workflow.name: False for workflow in component_workflows
        }
        
        # Initialize with virtual steps that represent the components
        for i, workflow in enumerate(component_workflows):
            # Create a virtual step for this workflow
            step = CompositeWorkflowStep(
                name=f"{workflow.name}_composite_step",
                workflow=workflow
            )
            
            # Add the step
            is_entry = i == 0
            is_exit = i == len(component_workflows) - 1
            self.add_step(step, is_entry=is_entry, is_exit=is_exit)
            
            # Add dependencies
            if i > 0 and sequential:
                previous_workflow = component_workflows[i-1]
                step.add_dependency(f"{previous_workflow.name}_composite_step")
    
    async def execute(self, context: Optional[WorkflowContext] = None) -> WorkflowContext:
        """Execute the composite workflow"""
        # Create a new context if none provided
        if context is None:
            context = WorkflowContext(workflow_name=self.name)
            
        # Start the workflow
        context.start()
        logger.info(f"Starting composite workflow {self.name}")
        
        try:
            if self.sequential:
                # Execute components sequentially
                for workflow in self.component_workflows:
                    logger.info(f"Executing component workflow {workflow.name}")
                    
                    # Create a sub-context for this component
                    sub_context = WorkflowContext(
                        workflow_name=workflow.name,
                        metadata={"parent_workflow": self.name}
                    )
                    
                    # Copy relevant data from parent context
                    for key, value in context.data.items():
                        sub_context.data[key] = value
                    
                    # Execute the component
                    sub_context = await workflow.execute(sub_context)
                    
                    # Update the parent context with the sub-context data
                    for key, value in sub_context.data.items():
                        context.data[f"{workflow.name}.{key}"] = value
                    
                    # Check if the component succeeded
                    if sub_context.status != WorkflowStatus.COMPLETED:
                        logger.warning(f"Component workflow {workflow.name} failed or was cancelled")
                        context.fail(f"Component workflow {workflow.name} failed", {
                            "component_status": sub_context.status.name,
                            "component_errors": sub_context.errors
                        })
                        return context
                    
                    # Mark the component as executed
                    self.component_statuses[workflow.name] = True
                    
                    # Add the virtual step to the history
                    step_name = f"{workflow.name}_composite_step"
                    context.set_current_step(step_name)
                    
                # All components executed successfully
                context.complete()
                
            else:
                # Execute components in parallel using asyncio.gather
                logger.info(f"Executing {len(self.component_workflows)} workflows in parallel")
                
                async def execute_component(workflow):
                    logger.info(f"Executing component workflow {workflow.name}")
                    
                    # Create a sub-context for this component
                    sub_context = WorkflowContext(
                        workflow_name=workflow.name,
                        metadata={"parent_workflow": self.name}
                    )
                    
                    # Copy relevant data from parent context
                    for key, value in context.data.items():
                        sub_context.data[key] = value
                    
                    # Execute the component
                    return await workflow.execute(sub_context)
                
                # Run workflows in parallel
                execution_tasks = [execute_component(workflow) for workflow in self.component_workflows]
                sub_contexts = await asyncio.gather(*execution_tasks, return_exceptions=True)
                
                # Handle any exceptions
                for i, result in enumerate(sub_contexts):
                    if isinstance(result, Exception):
                        workflow_name = self.component_workflows[i].name
                        logger.error(f"Error executing workflow {workflow_name}: {str(result)}")
                        context.fail(f"Error in parallel workflow {workflow_name}: {str(result)}")
                        return context
                
                # All workflows executed without exceptions
                    
                # Check if all components succeeded
                all_succeeded = True
                for sub_context in sub_contexts:
                    if sub_context.status != WorkflowStatus.COMPLETED:
                        all_succeeded = False
                        break
                        
                # Update the parent context with all sub-context data
                for workflow, sub_context in zip(self.component_workflows, sub_contexts):
                    for key, value in sub_context.data.items():
                        context.data[f"{workflow.name}.{key}"] = value
                    
                    # Mark the component as executed
                    self.component_statuses[workflow.name] = True
                    
                    # Add the virtual step to the history
                    step_name = f"{workflow.name}_composite_step"
                    if step_name not in context.step_history:
                        context.step_history.append(step_name)
                
                # Set the final status
                if all_succeeded:
                    context.complete()
                else:
                    failed_components = [
                        sub_context.workflow_name
                        for sub_context in sub_contexts
                        if sub_context.status != WorkflowStatus.COMPLETED
                    ]
                    context.fail(f"Component workflows failed: {', '.join(failed_components)}")
            
            return context
            
        except Exception as e:
            logger.error(f"Error in composite workflow {self.name}: {str(e)}", exc_info=True)
            context.fail(f"Error in composite workflow: {str(e)}")
            return context
    
    def create_graph(self) -> Dict[str, Any]:
        """Create a graph representation of the workflow"""
        graph = {
            "name": self.name,
            "description": self.description,
            "type": "composite",
            "sequential": self.sequential,
            "components": [
                {
                    "name": workflow.name,
                    "description": workflow.description,
                    "graph": workflow.create_graph()
                }
                for workflow in self.component_workflows
            ]
        }
        
        return graph

class CompositeWorkflowStep(WorkflowStep):
    """
    A workflow step that represents an entire workflow.
    
    This is used to integrate workflows as steps in a composite workflow.
    """
    
    def __init__(self, name: str, workflow: BaseWorkflow):
        super().__init__(name, f"Execute workflow: {workflow.name}")
        self.workflow = workflow
    
    async def execute(self, context: WorkflowContext) -> bool:
        """Execute the workflow step"""
        try:
            if not self.check_dependencies(context):
                logger.warning(f"Step {self.name} dependencies not met")
                return False
            
            # Update the current step
            context.set_current_step(self.name)
            
            # Create a sub-context for this workflow
            sub_context = WorkflowContext(
                workflow_name=self.workflow.name,
                metadata={"parent_step": self.name, "parent_workflow": context.workflow_name}
            )
            
            # Copy relevant data from parent context
            for key, value in context.data.items():
                sub_context.data[key] = value
            
            # Execute the workflow
            sub_context = await self.workflow.execute(sub_context)
            
            # Update the parent context with the sub-context data
            for key, value in sub_context.data.items():
                context.data[f"{self.workflow.name}.{key}"] = value
            
            # Check if the workflow succeeded
            if sub_context.status != WorkflowStatus.COMPLETED:
                logger.warning(f"Workflow {self.workflow.name} failed or was cancelled")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error in workflow step {self.name}: {str(e)}", exc_info=True)
            return False
