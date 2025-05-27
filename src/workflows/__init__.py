"""
Modular workflow system for agent collaboration.

This module provides a framework for creating composable workflows
that can be combined to create complex agent collaboration patterns.
"""

from .base import BaseWorkflow, WorkflowStep, WorkflowContext
from .registry import WorkflowRegistry

__all__ = [
    'BaseWorkflow',
    'WorkflowStep',
    'WorkflowContext',
    'WorkflowRegistry',
]
