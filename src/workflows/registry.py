"""
Registry for managing workflows.

This module provides a central registry for storing, retrieving,
and managing workflows throughout the system.
"""

from typing import Dict, List, Any, Optional, Type, Union
import logging
from .base import BaseWorkflow

logger = logging.getLogger(__name__)

class WorkflowRegistry:
    """
    Registry for managing workflows.
    
    The registry provides a central location for registering, retrieving,
    and managing workflows throughout the system.
    """
    
    def __init__(self):
        self.workflows: Dict[str, BaseWorkflow] = {}
        self.categories: Dict[str, List[str]] = {}
    
    def register(self, workflow: BaseWorkflow, categories: Optional[List[str]] = None) -> None:
        """Register a workflow with the registry"""
        if workflow.name in self.workflows:
            logger.warning(f"Workflow {workflow.name} already registered, replacing")
            
        self.workflows[workflow.name] = workflow
        
        # Add to categories
        if categories:
            for category in categories:
                if category not in self.categories:
                    self.categories[category] = []
                    
                if workflow.name not in self.categories[category]:
                    self.categories[category].append(workflow.name)
                    
        logger.info(f"Registered workflow {workflow.name}")
    
    def unregister(self, workflow_name: str) -> None:
        """Unregister a workflow from the registry"""
        if workflow_name in self.workflows:
            del self.workflows[workflow_name]
            
            # Remove from categories
            for category, workflows in self.categories.items():
                if workflow_name in workflows:
                    workflows.remove(workflow_name)
                    
            logger.info(f"Unregistered workflow {workflow_name}")
        else:
            logger.warning(f"Workflow {workflow_name} not found in registry")
    
    def get(self, workflow_name: str) -> Optional[BaseWorkflow]:
        """Get a workflow by name"""
        return self.workflows.get(workflow_name)
    
    def get_by_category(self, category: str) -> List[BaseWorkflow]:
        """Get all workflows in a category"""
        workflow_names = self.categories.get(category, [])
        return [self.workflows[name] for name in workflow_names if name in self.workflows]
    
    def get_all(self) -> List[BaseWorkflow]:
        """Get all registered workflows"""
        return list(self.workflows.values())
    
    def get_categories(self) -> List[str]:
        """Get all categories"""
        return list(self.categories.keys())
    
    def create_composite_workflow(
        self, 
        name: str, 
        component_workflows: List[str],
        description: Optional[str] = None
    ) -> Optional[BaseWorkflow]:
        """
        Create a composite workflow from multiple component workflows.
        
        This is a simple sequential composition where the workflows
        are executed in the order provided.
        """
        from .composite import CompositeWorkflow
        
        # Get all component workflows
        components = []
        for workflow_name in component_workflows:
            workflow = self.get(workflow_name)
            if not workflow:
                logger.error(f"Component workflow {workflow_name} not found")
                return None
                
            components.append(workflow)
            
        if not components:
            logger.error(f"No valid component workflows provided")
            return None
            
        # Create the composite workflow
        composite = CompositeWorkflow(name, components, description=description)
        
        # Register the composite workflow
        self.register(composite, ["composite"])
        
        return composite
