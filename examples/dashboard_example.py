"""
Agent Dashboard Example

This example demonstrates a dashboard for monitoring and visualizing
the execution of agent collaborations, including workflow progress,
agent interactions, and system metrics.
"""

import asyncio
import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import json
from dotenv import load_dotenv
import argparse
import time
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Add the project root to the Python path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.agent import AgentRole
from src.core.memory import MemoryStore
from src.core.tools import ToolRegistry
from src.tools.web_search import CalculatorTool, TimeTool
from src.agents.advanced_agent import AdvancedAgent, ThinkingStrategy
from src.collaboration.protocol import CommunicationProtocol, MessageType, MessageStatus
from src.collaboration.knowledge import KnowledgeGraph, EntityType, RelationshipType
from src.collaboration.tasks import TaskRegistry, TaskPriority, TaskStatus
from src.collaboration.conflict import ConflictResolver, ConflictType, ResolutionStrategy
from src.workflows.registry import WorkflowRegistry
from src.workflows.planning import ProjectPlanningWorkflow
from src.workflows.research import ResearchWorkflow
from src.workflows.monitoring import WorkflowMonitor, MonitoredWorkflow

class AgentDashboard:
    """
    Dashboard for monitoring agent collaborations.
    
    This class provides a simple text-based dashboard for monitoring
    the execution of agent collaborations, including workflow progress,
    agent interactions, and system metrics.
    """
    
    def __init__(self):
        """Initialize the agent dashboard"""
        # Shared collaboration infrastructure
        self.comm_protocol = CommunicationProtocol()
        self.knowledge_graph = KnowledgeGraph()
        self.task_registry = TaskRegistry()
        self.conflict_resolver = ConflictResolver()
        self.workflow_registry = WorkflowRegistry()
        self.workflow_monitor = WorkflowMonitor()
        
        # Shared memory store
        self.memory_store = MemoryStore()
        
        # Tool registry
        self.tool_registry = ToolRegistry()
        self._register_tools()
        
        # Register workflows
        self._register_workflows()
        
        # Create agents
        self.agents = {}
        self._setup_agents()
        
        # Dashboard state
        self.is_running = False
        self.update_interval = 2  # seconds
        self.total_messages = 0
        self.messages_by_type = {}
        self.total_tasks = 0
        self.tasks_by_status = {}
        self.total_workflows = 0
        self.workflows_by_status = {}
    
    def _register_tools(self):
        """Register tools for the agents to use"""
        # Calculator tool
        self.tool_registry.register(CalculatorTool())
        
        # Time tool
        self.tool_registry.register(TimeTool())
    
    def _register_workflows(self):
        """Register workflows for the agents to use"""
        # Set up LLM provider config
        if os.getenv("OPENAI_API_KEY"):
            provider_type = "openai"
            provider_config = {
                "provider_type": provider_type,
                "model_name": os.getenv("MODEL_NAME", "gpt-3.5-turbo")
            }
        else:
            provider_type = "local"
            provider_config = {
                "provider_type": provider_type,
                "model_name": os.getenv("MODEL_NAME", "gemma3")
            }
            
            # Add base URL for Ollama if specified
            if os.getenv("OLLAMA_BASE_URL"):
                provider_config["base_url"] = os.getenv("OLLAMA_BASE_URL")
        
        # Create planning workflow
        planning_workflow = ProjectPlanningWorkflow(
            llm_provider_config=provider_config
        )
        self.workflow_registry.register(planning_workflow, ["planning", "project"])
        
        # Create research workflow
        research_workflow = ResearchWorkflow(
            llm_provider_config=provider_config
        )
        self.workflow_registry.register(research_workflow, ["research", "information"])
    
    def _setup_agents(self):
        """Set up specialized agents with different roles"""
        # Determine LLM provider config
        if os.getenv("OPENAI_API_KEY"):
            provider_type = "openai"
            provider_config = {
                "provider_type": provider_type,
                "model_name": os.getenv("MODEL_NAME", "gpt-3.5-turbo")
            }
        else:
            provider_type = "local"
            provider_config = {
                "provider_type": provider_type,
                "model_name": os.getenv("MODEL_NAME", "gemma3")
            }
            
            # Add base URL for Ollama if specified
            if os.getenv("OLLAMA_BASE_URL"):
                provider_config["base_url"] = os.getenv("OLLAMA_BASE_URL")
        
        # Create agents with different roles
        agent_configs = [
            {"name": "coordinator", "role": AgentRole.COORDINATOR, "thinking": ThinkingStrategy.PLANNING},
            {"name": "planner", "role": AgentRole.PLANNER, "thinking": ThinkingStrategy.PLANNING},
            {"name": "researcher", "role": AgentRole.RESEARCHER, "thinking": ThinkingStrategy.REFLECTIVE},
            {"name": "executor", "role": AgentRole.EXECUTOR, "thinking": ThinkingStrategy.REACTIVE},
            {"name": "reviewer", "role": AgentRole.REVIEWER, "thinking": ThinkingStrategy.CRITICAL},
            {"name": "creative", "role": AgentRole.ASSISTANT, "thinking": ThinkingStrategy.CREATIVE}
        ]
        
        # Create agents
        for config in agent_configs:
            agent = AdvancedAgent(
                role=config["role"],
                name=config["name"],
                llm_provider_config=provider_config,
                tool_registry=self.tool_registry,
                memory_store=self.memory_store,
                comm_protocol=self.comm_protocol,
                knowledge_graph=self.knowledge_graph,
                task_registry=self.task_registry,
                conflict_resolver=self.conflict_resolver,
                workflow_registry=self.workflow_registry,
                thinking_strategy=config["thinking"],
                expertise_domains={} # Would be defined based on agent role
            )
            
            self.agents[config["name"]] = agent
    
    async def start(self):
        """Start the dashboard and agents"""
        # Start workflow monitor
        await self.workflow_monitor.start()
        
        # Start agents
        for name, agent in self.agents.items():
            await agent.start()
            logger.info(f"Started agent: {name}")
        
        # Start dashboard
        self.is_running = True
        asyncio.create_task(self._update_loop())
    
    async def stop(self):
        """Stop the dashboard and agents"""
        self.is_running = False
        
        # Stop agents
        for name, agent in self.agents.items():
            await agent.stop()
            logger.info(f"Stopped agent: {name}")
        
        # Stop workflow monitor
        await self.workflow_monitor.stop()
    
    async def _update_loop(self):
        """Update the dashboard periodically"""
        while self.is_running:
            self._update_stats()
            self._print_dashboard()
            await asyncio.sleep(self.update_interval)
    
    def _update_stats(self):
        """Update dashboard statistics"""
        # Update message stats
        all_messages = self.comm_protocol.get_all_messages()
        self.total_messages = len(all_messages)
        
        # Count messages by type
        self.messages_by_type = {}
        for message in all_messages:
            msg_type = message.message_type.name
            if msg_type in self.messages_by_type:
                self.messages_by_type[msg_type] += 1
            else:
                self.messages_by_type[msg_type] = 1
        
        # Update task stats
        all_tasks = self.task_registry.get_all_tasks()
        self.total_tasks = len(all_tasks)
        
        # Count tasks by status
        self.tasks_by_status = {}
        for task in all_tasks:
            status = task.status.name
            if status in self.tasks_by_status:
                self.tasks_by_status[status] += 1
            else:
                self.tasks_by_status[status] = 1
        
        # Update workflow stats
        active_workflows = self.workflow_monitor.get_active_workflows()
        self.total_workflows = len(active_workflows)
        
        # Count workflows by status
        self.workflows_by_status = {}
        for workflow_id, workflow_data in active_workflows.items():
            status = workflow_data.get("status", "unknown")
            if status in self.workflows_by_status:
                self.workflows_by_status[status] += 1
            else:
                self.workflows_by_status[status] = 1
    
    def _print_dashboard(self):
        """Print the dashboard to the console"""
        # Clear the console (works on most terminals)
        os.system('cls' if os.name == 'nt' else 'clear')
        
        # Print header
        print(f"{'='*80}")
        print(f"AGENT COLLABORATION DASHBOARD")
        print(f"{'='*80}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*80}\n")
        
        # Print agent status
        print(f"AGENT STATUS")
        print(f"{'-'*80}")
        for name, agent in self.agents.items():
            status = "Active" if agent.is_running else "Inactive"
            print(f"  {name.ljust(15)} | {status.ljust(10)} | Role: {agent.role.name.ljust(15)} | Strategy: {agent.thinking_strategy.name}")
        print()
        
        # Print message stats
        print(f"MESSAGE STATISTICS")
        print(f"{'-'*80}")
        print(f"  Total Messages: {self.total_messages}")
        for msg_type, count in self.messages_by_type.items():
            print(f"  {msg_type.ljust(20)}: {count}")
        print()
        
        # Print task stats
        print(f"TASK STATISTICS")
        print(f"{'-'*80}")
        print(f"  Total Tasks: {self.total_tasks}")
        for status, count in self.tasks_by_status.items():
            print(f"  {status.ljust(20)}: {count}")
        print()
        
        # Print workflow stats
        print(f"WORKFLOW STATISTICS")
        print(f"{'-'*80}")
        print(f"  Total Workflows: {self.total_workflows}")
        for status, count in self.workflows_by_status.items():
            print(f"  {status.ljust(20)}: {count}")
        print()
        
        # Print recent activity
        print(f"RECENT ACTIVITY")
        print(f"{'-'*80}")
        # Get the 5 most recent messages
        recent_messages = sorted(
            self.comm_protocol.get_all_messages(), 
            key=lambda m: m.timestamp, 
            reverse=True
        )[:5]
        
        for message in recent_messages:
            timestamp = message.timestamp.strftime("%H:%M:%S")
            print(f"  [{timestamp}] {message.sender} -> {message.recipient}: {message.message_type.name}")
            # Truncate content to 50 chars
            content = message.content[:50] + "..." if len(message.content) > 50 else message.content
            print(f"    {content}")
        print()
    
    async def simulate_collaborative_work(self, project_info: Dict[str, Any], duration: int = 60):
        """Simulate collaborative work between agents for a specified duration"""
        print(f"Starting collaborative simulation for {duration} seconds...")
        
        # Initialize a project in the knowledge graph
        project_id = await self.agents["coordinator"].add_knowledge(
            entity_name=project_info["name"],
            entity_type=EntityType.CONCEPT,
            properties={
                "description": project_info["description"],
                "goals": project_info.get("goals", []),
                "status": "planning"
            }
        )
        
        # Create initial tasks
        for i, requirement in enumerate(project_info.get("requirements", [])):
            task_title = f"Analyze requirement {i+1}"
            task_id = await self.agents["coordinator"].create_task(
                title=task_title,
                description=f"Analyze the following requirement and determine implementation approach:\n\n{requirement}",
                assignee="planner",
                priority=TaskPriority.HIGH
            )
        
        # Start simulation time
        start_time = time.time()
        end_time = start_time + duration
        
        # Define some simulation scenarios
        scenarios = [
            self._simulate_research,
            self._simulate_task_delegation,
            self._simulate_planning,
            self._simulate_conflict,
            self._simulate_implementation
        ]
        
        # Run the simulation
        while time.time() < end_time and self.is_running:
            # Choose a random scenario
            scenario = random.choice(scenarios)
            await scenario(project_info)
            
            # Wait a bit between scenarios
            await asyncio.sleep(random.uniform(3, 7))
        
        print(f"\nSimulation completed after {int(time.time() - start_time)} seconds")
    
    async def _simulate_research(self, project_info: Dict[str, Any]):
        """Simulate research activity"""
        # Choose a random research topic from the project goals
        if project_info.get("goals"):
            topic = random.choice(project_info["goals"])
            
            # Send a research request to the researcher
            message_id = await self.agents["coordinator"].send_message(
                recipient="researcher",
                message_type=MessageType.REQUEST,
                content=f"Please research technologies and approaches for: {topic}"
            )
            
            # Simulate a research response
            await asyncio.sleep(random.uniform(1, 3))
            
            # Generate some research findings
            findings = [
                f"Found approach {random.randint(1, 100)} which could work for this goal",
                f"Technology X{random.randint(1, 100)} has 85% alignment with our requirements",
                f"Recent developments in the field suggest using pattern Y{random.randint(1, 20)}"
            ]
            
            await self.agents["researcher"].send_message(
                recipient="coordinator",
                message_type=MessageType.RESPONSE,
                content=f"Research findings for '{topic}':\n\n" + "\n".join(findings),
                reference_id=message_id
            )
    
    async def _simulate_task_delegation(self, project_info: Dict[str, Any]):
        """Simulate task delegation"""
        # Create a new task
        task_title = f"Task #{random.randint(1000, 9999)}"
        
        # Choose a random assignee
        assignees = ["planner", "researcher", "executor", "reviewer", "creative"]
        assignee = random.choice(assignees)
        
        # Choose a random priority
        priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL]
        priority = random.choice(priorities)
        
        # Create the task
        task_id = await self.agents["coordinator"].create_task(
            title=task_title,
            description=f"This is a simulated task for the {project_info['name']} project.",
            assignee=assignee,
            priority=priority
        )
        
        # Simulate task acceptance
        await asyncio.sleep(random.uniform(0.5, 1.5))
        
        # Update task status
        new_status = random.choice([
            TaskStatus.IN_PROGRESS, 
            TaskStatus.BLOCKED,
            TaskStatus.COMPLETED
        ])
        
        await self.agents[assignee].update_task_status(
            task_id=task_id,
            status=new_status,
            notes=f"Task status updated to {new_status.name}"
        )
    
    async def _simulate_planning(self, project_info: Dict[str, Any]):
        """Simulate planning activity"""
        # Start a planning workflow
        workflow_name = "project_planning"
        
        if workflow_name in self.workflow_registry.workflows:
            # Create context data
            context_data = {
                "project_name": project_info["name"],
                "requirements": project_info.get("requirements", []),
                "team_info": [
                    {"name": name, "role": agent.role.name} 
                    for name, agent in self.agents.items()
                ]
            }
            
            # Execute the workflow
            response = await self.agents["planner"].process({
                "workflow": workflow_name,
                "context": context_data
            })
            
            # Simulate workflow completion
            # In a real implementation, the workflow would execute its steps
            
            # Share the plan with other agents
            for agent_name in ["coordinator", "executor", "researcher"]:
                await self.agents["planner"].send_message(
                    recipient=agent_name,
                    message_type=MessageType.INFO,
                    content=f"Project plan for {project_info['name']} has been updated"
                )
    
    async def _simulate_conflict(self, project_info: Dict[str, Any]):
        """Simulate conflict resolution"""
        # Create a conflict with voting
        conflict_description = f"Decision needed for {project_info['name']}"
        
        # Create options for voting
        options = {}
        for i in range(3):
            options[f"option_{i+1}"] = {
                "name": f"Approach {chr(65+i)}",
                "description": f"This is approach {chr(65+i)} for solving the problem."
            }
        
        # Raise the conflict
        conflict_id = await self.agents["coordinator"].raise_conflict(
            description=conflict_description,
            conflict_type=ConflictType.APPROACH,
            resolution_strategy=ResolutionStrategy.VOTING,
            options=options,
            participants=list(self.agents.keys()),
            domain="implementation"
        )
        
        # Simulate voting
        for agent_name, agent in self.agents.items():
            # Choose a random option
            option_key = random.choice(list(options.keys()))
            
            # Cast a vote
            await agent.vote_on_conflict(
                conflict_id=conflict_id,
                option_key=option_key,
                confidence=random.uniform(0.6, 1.0)
            )
    
    async def _simulate_implementation(self, project_info: Dict[str, Any]):
        """Simulate implementation activity"""
        # Simulate the executor implementing a feature
        feature_name = f"Feature-{random.randint(100, 999)}"
        
        # Add the feature to the knowledge graph
        feature_id = await self.agents["executor"].add_knowledge(
            entity_name=feature_name,
            entity_type=EntityType.ARTIFACT,
            properties={
                "description": f"This is a simulated feature for {project_info['name']}",
                "status": "in_progress",
                "completion": random.uniform(0, 1.0)
            }
        )
        
        # Link the feature to the project
        await self.agents["executor"].add_relationship(
            source_name=feature_name,
            target_name=project_info["name"],
            relationship_type=RelationshipType.PART_OF,
            properties={"type": "feature"}
        )
        
        # Notify the team about progress
        await self.agents["executor"].send_message(
            recipient="all",
            message_type=MessageType.STATUS,
            content=f"Implementation update: {feature_name} is {int(random.uniform(10, 90))}% complete"
        )
        
        # Request a review if the feature is mostly complete
        if random.random() > 0.7:
            await self.agents["executor"].send_message(
                recipient="reviewer",
                message_type=MessageType.REQUEST,
                content=f"Please review {feature_name} implementation"
            )

async def run_dashboard_example():
    """Run the agent dashboard example"""
    parser = argparse.ArgumentParser(description='Agent Dashboard Example')
    parser.add_argument('--duration', type=int, default=60, help='Simulation duration in seconds')
    parser.add_argument('--update-interval', type=float, default=2.0, help='Dashboard update interval in seconds')
    
    # Use sys.argv if running as script
    if __name__ == "__main__":
        args = parser.parse_args()
    else:
        # Default values for module import
        args = parser.parse_args([])
    
    # Sample project information
    project_info = {
        "name": "Autonomous Delivery System",
        "description": "A system for autonomous delivery of packages using drones and ground robots",
        "goals": [
            "Create a fleet management system for autonomous delivery vehicles",
            "Implement route optimization algorithms",
            "Design a user interface for tracking deliveries",
            "Develop safety protocols for autonomous operation"
        ],
        "requirements": [
            "The system must handle up to 1000 vehicles simultaneously",
            "Delivery routes must be optimized for energy efficiency",
            "The system must integrate with existing logistics infrastructure",
            "Autonomous vehicles must follow all relevant safety regulations",
            "The user interface must provide real-time tracking information"
        ]
    }
    
    # Create and start the dashboard
    dashboard = AgentDashboard()
    
    try:
        # Set update interval
        dashboard.update_interval = args.update_interval
        
        # Start the dashboard
        await dashboard.start()
        
        # Run the simulation
        await dashboard.simulate_collaborative_work(project_info, args.duration)
        
    finally:
        # Stop the dashboard
        await dashboard.stop()

if __name__ == "__main__":
    asyncio.run(run_dashboard_example())
