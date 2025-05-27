"""
Planning workflow implementation.

This module provides specialized workflows for project planning
and task decomposition using LLM-powered agents.
"""

from typing import Dict, List, Any, Optional
import logging
import json
from datetime import datetime, timezone
from ..core.llm import BaseLLMProvider, LLMFactory
from .base import BaseWorkflow, WorkflowStep, WorkflowContext, LLMDrivenStep

logger = logging.getLogger(__name__)

class RequirementsAnalysisStep(LLMDrivenStep):
    """Step that analyzes project requirements using an LLM"""
    
    def __init__(self, name: str = "requirements_analysis", llm_provider = None):
        system_prompt = """You are a requirements analysis expert. Your task is to:
1. Review the raw project requirements
2. Identify and categorize each requirement
3. Assess clarity, completeness, and potential conflicts
4. Suggest clarification questions for ambiguous requirements
5. Prioritize requirements (Must-Have, Should-Have, Could-Have, Won't-Have)

Provide your output in a structured format that can be easily processed."""
        
        super().__init__(
            name=name,
            description="Analyze project requirements and categorize them",
            llm_provider=llm_provider,
            system_prompt=system_prompt
        )
    
    def _default_input_formatter(self, context: WorkflowContext) -> str:
        """Format the input for the LLM"""
        # Get the project requirements
        project_name = context.get_data("project_name", "Unnamed Project")
        raw_requirements = context.get_data("requirements", [])
        
        if not raw_requirements:
            return f"No requirements provided for project {project_name}. Please provide requirements to analyze."
            
        # Format the requirements
        requirements_text = "\n".join([f"- {req}" for req in raw_requirements])
        
        input_text = f"""# Requirements Analysis for {project_name}

## Raw Requirements:
{requirements_text}

## Analysis Task:
1. Categorize each requirement (Functional, Non-functional, Constraint, etc.)
2. Assess clarity and completeness
3. Identify potential conflicts or dependencies
4. Prioritize using MoSCoW method (Must, Should, Could, Won't)
5. Suggest clarification questions for ambiguous requirements

Please provide your analysis in a structured format with clear sections.
"""
        return input_text
    
    def _default_output_parser(self, output: str, context: WorkflowContext) -> Dict[str, Any]:
        """Parse the LLM output"""
        # Simple parser that extracts structured information from the LLM output
        result = {
            "categorized_requirements": [],
            "potential_conflicts": [],
            "clarification_questions": [],
            "priorities": {
                "must_have": [],
                "should_have": [],
                "could_have": [],
                "wont_have": []
            }
        }
        
        # Extract categories
        categories = ["functional", "non-functional", "constraint", "business", "user", "system"]
        for category in categories:
            if f"{category}:" in output.lower() or f"{category} requirements:" in output.lower():
                # Simple extraction - in a real implementation, this would be more robust
                result["categorized_requirements"].append({
                    "category": category,
                    "requirements": []  # Would extract these in a real implementation
                })
        
        # Extract conflicts
        if "conflict" in output.lower():
            # Simple extraction
            result["potential_conflicts"].append("Conflicts detected")
        
        # Extract questions
        if "question" in output.lower() or "clarification" in output.lower():
            # Simple extraction
            result["clarification_questions"].append("Questions identified")
        
        # Extract priorities
        priority_keywords = [
            ("must", "must_have"),
            ("should", "should_have"),
            ("could", "could_have"),
            ("won't", "wont_have")
        ]
        
        for keyword, key in priority_keywords:
            if keyword in output.lower():
                # Simple extraction
                result["priorities"][key].append("Priorities identified")
        
        return result

class TaskDecompositionStep(LLMDrivenStep):
    """Step that decomposes a project into tasks using an LLM"""
    
    def __init__(self, name: str = "task_decomposition", llm_provider = None):
        system_prompt = """You are a project planning expert. Your task is to:
1. Review the project requirements and analysis
2. Break down the project into manageable tasks
3. Identify dependencies between tasks
4. Estimate effort for each task
5. Suggest task assignments based on team skills (if provided)

Provide your output in a structured format that can be easily processed."""
        
        super().__init__(
            name=name,
            description="Decompose project into manageable tasks",
            llm_provider=llm_provider,
            system_prompt=system_prompt
        )
    
    def _default_input_formatter(self, context: WorkflowContext) -> str:
        """Format the input for the LLM"""
        # Get the project information
        project_name = context.get_data("project_name", "Unnamed Project")
        req_analysis = context.get_data("requirements_analysis.categorized_requirements", [])
        priorities = context.get_data("requirements_analysis.priorities", {})
        team_info = context.get_data("team_info", [])
        
        # Format the requirements analysis
        req_analysis_text = "No requirements analysis available"
        if req_analysis:
            req_analysis_text = "\n".join([
                f"## {cat['category'].title()} Requirements:",
                "\n".join([f"- {req}" for req in cat.get("requirements", ["Details not available"])])
                for cat in req_analysis
            ])
        
        # Format the priorities
        priorities_text = "No priority information available"
        if priorities:
            priorities_text = "\n".join([
                f"## {key.replace('_', ' ').title()}:",
                "\n".join([f"- {req}" for req in reqs])
                for key, reqs in priorities.items() if reqs
            ])
        
        # Format team information
        team_text = "No team information available"
        if team_info:
            team_text = "\n".join([
                f"- {member.get('name', 'Unnamed')}: {', '.join(member.get('skills', []))}"
                for member in team_info
            ])
        
        input_text = f"""# Task Decomposition for {project_name}

## Requirements Analysis:
{req_analysis_text}

## Priorities:
{priorities_text}

## Team Information:
{team_text}

## Decomposition Task:
1. Break down the project into manageable tasks
2. Identify dependencies between tasks
3. Estimate effort for each task (in hours or days)
4. Suggest task assignments based on team skills

Please provide your task breakdown in a structured format that clearly shows:
- Task name
- Description
- Estimated effort
- Dependencies (if any)
- Suggested assignee (if applicable)
- Priority level
"""
        return input_text
    
    def _default_output_parser(self, output: str, context: WorkflowContext) -> Dict[str, Any]:
        """Parse the LLM output"""
        # Simple parser that extracts structured information from the LLM output
        tasks = []
        
        # Extract tasks - in a real implementation, this would use a more robust parser
        # For example, looking for structured task sections or using regex patterns
        
        # Simple implementation that looks for lines that might be task definitions
        lines = output.split("\n")
        current_task = None
        
        for line in lines:
            line = line.strip()
            
            # Check if this line might be a task name
            if line.startswith("- ") or line.startswith("# ") or line.startswith("Task "):
                # Save previous task if we were building one
                if current_task:
                    tasks.append(current_task)
                
                # Start a new task
                current_task = {
                    "name": line.split(":", 1)[0].strip("- #*"),
                    "description": "",
                    "effort": "Unknown",
                    "dependencies": [],
                    "assignee": "Unassigned",
                    "priority": "Medium"
                }
                
                # See if there's a description on this line
                if ":" in line:
                    current_task["description"] = line.split(":", 1)[1].strip()
            
            # Add details to current task
            elif current_task:
                lower_line = line.lower()
                if "effort" in lower_line or "estimate" in lower_line:
                    current_task["effort"] = line.split(":", 1)[1].strip() if ":" in line else line
                elif "depend" in lower_line:
                    current_task["dependencies"] = [d.strip() for d in line.split(":", 1)[1].split(",")] if ":" in line else [line]
                elif "assign" in lower_line:
                    current_task["assignee"] = line.split(":", 1)[1].strip() if ":" in line else line
                elif "priority" in lower_line:
                    current_task["priority"] = line.split(":", 1)[1].strip() if ":" in line else line
                else:
                    # Append to description
                    current_task["description"] += " " + line
        
        # Add the last task if we were building one
        if current_task:
            tasks.append(current_task)
        
        return {"tasks": tasks}

class ProjectPlanningWorkflow(BaseWorkflow):
    """
    Workflow for planning a project using LLM-powered agents.
    
    This workflow takes project requirements and team information as input
    and produces a detailed project plan with tasks, dependencies, and assignments.
    """
    
    def __init__(self, name: str = "project_planning", llm_provider = None):
        description = "Plan a project by analyzing requirements and decomposing into tasks"
        super().__init__(name, description)
        
        # Create the LLM provider if not provided
        if not llm_provider:
            # Try to create from environment variables
            provider_type = "local"  # Default to local
            provider_config = {"model_name": "gemma3"}
            
            try:
                llm_provider = LLMFactory.create_provider(provider_type, **provider_config)
            except Exception as e:
                logger.warning(f"Failed to create LLM provider: {e}")
        
        # Create workflow steps
        req_analysis_step = RequirementsAnalysisStep(llm_provider=llm_provider)
        task_decomp_step = TaskDecompositionStep(llm_provider=llm_provider)
        
        # Add steps to workflow
        self.add_step(req_analysis_step, is_entry=True)
        self.add_step(task_decomp_step, is_exit=True)
        
        # Add dependencies
        task_decomp_step.add_dependency(req_analysis_step.name)
    
    def create_graph(self) -> Dict[str, Any]:
        """Create a graph representation of the workflow"""
        return {
            "name": self.name,
            "description": self.description,
            "type": "planning",
            "steps": [
                {
                    "name": step.name,
                    "description": step.description,
                    "dependencies": step.dependencies
                }
                for step in self.steps.values()
            ]
        }
