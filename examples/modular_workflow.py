"""
Example demonstrating the modular workflow system with LLM-powered agents.

This example shows how to use the modular workflow system to:
1. Create specialized workflows for different tasks
2. Compose workflows together
3. Execute workflows with shared context
"""

import asyncio
import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Add the project root to the Python path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.llm import LLMFactory
from src.workflows.base import WorkflowContext
from src.workflows.planning import ProjectPlanningWorkflow
from src.workflows.research import ResearchWorkflow
from src.workflows.composite import CompositeWorkflow
from src.workflows.registry import WorkflowRegistry

class ModularWorkflowExample:
    """
    Example demonstrating the modular workflow system.
    
    This class shows how to create, register, and execute workflows
    using the modular workflow system with LLM-powered agents.
    """
    
    def __init__(self):
        """Initialize the modular workflow example"""
        # Set up LLM provider
        self.llm_provider = self._setup_llm_provider()
        
        # Create workflow registry
        self.workflow_registry = WorkflowRegistry()
        
        # Register workflows
        self._register_workflows()
    
    def _setup_llm_provider(self):
        """Set up LLM provider based on environment"""
        # Configure provider based on environment
        if os.getenv("OPENAI_API_KEY"):
            provider_type = "openai"
            provider_config = {
                "model_name": os.getenv("MODEL_NAME", "gpt-3.5-turbo")
            }
        else:
            provider_type = "local"
            provider_config = {
                "model_name": os.getenv("MODEL_NAME", "gemma3")
            }
            
            # Add base URL for Ollama if specified
            if os.getenv("OLLAMA_BASE_URL"):
                provider_config["base_url"] = os.getenv("OLLAMA_BASE_URL")
        
        try:
            return LLMFactory.create_provider(provider_type, **provider_config)
        except Exception as e:
            logger.warning(f"Failed to create LLM provider: {e}")
            return None
    
    def _register_workflows(self):
        """Register workflows with the registry"""
        # Create planning workflow
        planning_workflow = ProjectPlanningWorkflow(
            llm_provider=self.llm_provider
        )
        self.workflow_registry.register(planning_workflow, ["planning", "project"])
        
        # Create research workflow
        research_workflow = ResearchWorkflow(
            llm_provider=self.llm_provider
        )
        self.workflow_registry.register(research_workflow, ["research", "information"])
        
        # Create a composite workflow
        composite_workflow = CompositeWorkflow(
            name="research_and_planning",
            component_workflows=[research_workflow, planning_workflow],
            description="Research a topic and then create a project plan",
            sequential=True
        )
        self.workflow_registry.register(composite_workflow, ["composite", "end-to-end"])
    
    async def run_planning_workflow(self, project_info: Dict[str, Any]):
        """Run the planning workflow"""
        # Get the workflow
        workflow = self.workflow_registry.get("project_planning")
        if not workflow:
            logger.error("Planning workflow not found")
            return None
        
        # Create workflow context
        context = WorkflowContext(workflow_name=workflow.name)
        
        # Add project info to context
        context.add_data("project_name", project_info.get("name", "Unnamed Project"))
        context.add_data("requirements", project_info.get("requirements", []))
        context.add_data("team_info", project_info.get("team", []))
        
        # Execute workflow
        print(f"\n{'='*80}")
        print(f"Running planning workflow for project: {project_info.get('name', 'Unnamed Project')}")
        print(f"{'='*80}\n")
        
        result_context = await workflow.execute(context)
        
        # Display results
        print(f"\n{'='*80}")
        print(f"Planning workflow results")
        print(f"{'='*80}\n")
        
        print(f"Status: {result_context.status.name}")
        if result_context.status.name == "COMPLETED":
            # Display tasks
            tasks = result_context.get_data("task_decomposition.tasks", [])
            if tasks:
                print("\nTasks:")
                for i, task in enumerate(tasks, 1):
                    print(f"{i}. {task.get('name', 'Unnamed Task')}")
                    print(f"   Description: {task.get('description', 'No description')}")
                    print(f"   Effort: {task.get('effort', 'Unknown')}")
                    print(f"   Assignee: {task.get('assignee', 'Unassigned')}")
                    print(f"   Priority: {task.get('priority', 'Medium')}")
                    print()
        else:
            # Display errors
            print("\nErrors:")
            for error in result_context.errors:
                print(f"- {error.get('message', 'Unknown error')}")
        
        return result_context
    
    async def run_research_workflow(self, research_info: Dict[str, Any]):
        """Run the research workflow"""
        # Get the workflow
        workflow = self.workflow_registry.get("research_workflow")
        if not workflow:
            logger.error("Research workflow not found")
            return None
        
        # Create workflow context
        context = WorkflowContext(workflow_name=workflow.name)
        
        # Add research info to context
        context.add_data("research_topic", research_info.get("topic", "Unspecified Topic"))
        context.add_data("existing_knowledge", research_info.get("existing_knowledge", []))
        context.add_data("constraints", research_info.get("constraints", []))
        
        # Execute workflow
        print(f"\n{'='*80}")
        print(f"Running research workflow for topic: {research_info.get('topic', 'Unspecified Topic')}")
        print(f"{'='*80}\n")
        
        result_context = await workflow.execute(context)
        
        # Display results
        print(f"\n{'='*80}")
        print(f"Research workflow results")
        print(f"{'='*80}\n")
        
        print(f"Status: {result_context.status.name}")
        if result_context.status.name == "COMPLETED":
            # Display insights
            insights = result_context.get_data("information_analysis.key_insights", [])
            if insights:
                print("\nKey Insights:")
                for i, insight in enumerate(insights, 1):
                    print(f"{i}. {insight}")
                print()
            
            # Display conclusions
            conclusions = result_context.get_data("information_analysis.conclusions", [])
            if conclusions:
                print("\nConclusions:")
                for i, conclusion in enumerate(conclusions, 1):
                    print(f"{i}. {conclusion}")
                print()
            
            # Display gaps
            gaps = result_context.get_data("information_analysis.gaps", [])
            if gaps:
                print("\nGaps requiring further research:")
                for i, gap in enumerate(gaps, 1):
                    print(f"{i}. {gap}")
                print()
        else:
            # Display errors
            print("\nErrors:")
            for error in result_context.errors:
                print(f"- {error.get('message', 'Unknown error')}")
        
        return result_context
    
    async def run_composite_workflow(self, project_info: Dict[str, Any]):
        """Run the composite workflow"""
        # Get the workflow
        workflow = self.workflow_registry.get("research_and_planning")
        if not workflow:
            logger.error("Composite workflow not found")
            return None
        
        # Create workflow context
        context = WorkflowContext(workflow_name=workflow.name)
        
        # Add info to context - needed by both component workflows
        context.add_data("research_topic", project_info.get("research_topic", ""))
        context.add_data("existing_knowledge", project_info.get("existing_knowledge", []))
        context.add_data("constraints", project_info.get("constraints", []))
        context.add_data("project_name", project_info.get("name", "Unnamed Project"))
        context.add_data("requirements", project_info.get("requirements", []))
        context.add_data("team_info", project_info.get("team", []))
        
        # Execute workflow
        print(f"\n{'='*80}")
        print(f"Running composite workflow for project: {project_info.get('name', 'Unnamed Project')}")
        print(f"{'='*80}\n")
        
        result_context = await workflow.execute(context)
        
        # Display results
        print(f"\n{'='*80}")
        print(f"Composite workflow results")
        print(f"{'='*80}\n")
        
        print(f"Status: {result_context.status.name}")
        if result_context.status.name == "COMPLETED":
            print("\nWorkflow completed successfully!")
            print("\nComponent Results:")
            
            # Show research insights
            research_insights = result_context.get_data("research_workflow.information_analysis.key_insights", [])
            if research_insights:
                print("\nResearch Insights:")
                for i, insight in enumerate(research_insights, 1):
                    print(f"{i}. {insight}")
            
            # Show planning tasks
            planning_tasks = result_context.get_data("project_planning.task_decomposition.tasks", [])
            if planning_tasks:
                print("\nProject Tasks:")
                for i, task in enumerate(planning_tasks, 1):
                    print(f"{i}. {task.get('name', 'Unnamed Task')}")
        else:
            # Display errors
            print("\nErrors:")
            for error in result_context.errors:
                print(f"- {error.get('message', 'Unknown error')}")
        
        return result_context

async def run_example():
    """Run the modular workflow example"""
    example = ModularWorkflowExample()
    
    # Sample project information
    project_info = {
        "name": "Smart Home Automation System",
        "research_topic": "Smart Home Technologies",
        "existing_knowledge": [
            "IoT devices are becoming increasingly popular",
            "Smart speakers like Amazon Echo and Google Home are widely used",
            "Security is a major concern for smart home systems"
        ],
        "constraints": [
            "Project must be completed within 6 months",
            "Budget is limited to $100,000",
            "System must be compatible with existing home infrastructure"
        ],
        "requirements": [
            "The system must control lighting in at least 10 zones",
            "The system must regulate temperature based on time, occupancy, and weather",
            "The system must integrate with major smart home protocols (Zigbee, Z-Wave, etc.)",
            "The system must provide a mobile app and voice control interface",
            "The system must handle internet outages gracefully",
            "The system must implement strong security measures"
        ],
        "team": [
            {"name": "Alice", "skills": ["Project Management", "Requirements Analysis", "UX Design"]},
            {"name": "Bob", "skills": ["Backend Development", "Database Design", "API Development"]},
            {"name": "Carol", "skills": ["IoT Development", "Embedded Systems", "Security"]},
            {"name": "Dave", "skills": ["Mobile Development", "Frontend Development", "UI Design"]}
        ]
    }
    
    # Choose which workflow to run
    print("\nModular Workflow Example")
    print("=" * 40)
    print("\nAvailable workflows:")
    print("1. Project Planning Workflow")
    print("2. Research Workflow")
    print("3. Composite Workflow (Research + Planning)")
    
    try:
        choice = int(input("\nSelect a workflow (1-3): "))
        
        if choice == 1:
            await example.run_planning_workflow(project_info)
        elif choice == 2:
            await example.run_research_workflow(project_info)
        elif choice == 3:
            await example.run_composite_workflow(project_info)
        else:
            print("Invalid choice, please select a number between 1 and 3")
    except ValueError:
        print("Please enter a number")

if __name__ == "__main__":
    asyncio.run(run_example())
