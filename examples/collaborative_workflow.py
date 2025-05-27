"""
Collaborative workflow example that demonstrates how multiple agents
can work together using the collaboration infrastructure.

This example creates a team of specialized agents that collaborate on
a complex task, sharing knowledge, delegating subtasks, and resolving conflicts.
"""

import asyncio
import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta
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

from src.core.agent import AgentRole
from src.core.memory import MemoryStore
from src.core.tools import ToolRegistry
from src.tools.web_search import CalculatorTool, TimeTool
from src.agents.collaborative_agent import CollaborativeAgent
from src.collaboration.protocol import CommunicationProtocol, MessageType
from src.collaboration.knowledge import KnowledgeGraph, EntityType, RelationshipType
from src.collaboration.tasks import TaskRegistry, TaskPriority, TaskStatus
from src.collaboration.conflict import ConflictResolver, ConflictType, ResolutionStrategy

class CollaborativeWorkflowExample:
    """
    Example of a collaborative workflow where multiple agents work together.
    
    This class demonstrates how agents can collaborate on a complex task,
    showing the use of:
    1. Communication protocols for message passing
    2. Shared knowledge graphs for information storage
    3. Task delegation for distributed work
    4. Conflict resolution for handling disagreements
    """
    
    def __init__(self):
        """Initialize the collaborative workflow example"""
        # Shared collaboration infrastructure
        self.comm_protocol = CommunicationProtocol()
        self.knowledge_graph = KnowledgeGraph()
        self.task_registry = TaskRegistry()
        self.conflict_resolver = ConflictResolver()
        
        # Shared memory store
        self.memory_store = MemoryStore()
        
        # Tool registry
        self.tool_registry = ToolRegistry()
        self._register_tools()
        
        # Create agents
        self.agents = {}
        self._setup_agents()
        
        # Track generated artifacts
        self.artifacts = {}
    
    def _register_tools(self):
        """Register tools for the agents to use"""
        # Calculator tool
        self.tool_registry.register(CalculatorTool())
        
        # Time tool
        self.tool_registry.register(TimeTool())
    
    def _setup_agents(self):
        """Set up the collaborative agents"""
        # Determine LLM provider type based on environment
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
        
        # Create a coordinator agent
        self.agents["coordinator"] = CollaborativeAgent(
            role=AgentRole.COORDINATOR,
            name="coordinator",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            expertise_domains={"project_management": 0.9, "coordination": 0.95}
        )
        
        # Create a planning agent
        self.agents["planner"] = CollaborativeAgent(
            role=AgentRole.PLANNER,
            name="planner",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            expertise_domains={"planning": 0.9, "requirements_analysis": 0.85}
        )
        
        # Create a research agent
        self.agents["researcher"] = CollaborativeAgent(
            role=AgentRole.RESEARCHER,
            name="researcher",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            expertise_domains={"research": 0.9, "data_analysis": 0.8, "technology": 0.85}
        )
        
        # Create an executor agent
        self.agents["executor"] = CollaborativeAgent(
            role=AgentRole.EXECUTOR,
            name="executor",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            expertise_domains={"implementation": 0.9, "coding": 0.85, "problem_solving": 0.8}
        )
        
        # Create a reviewer agent
        self.agents["reviewer"] = CollaborativeAgent(
            role=AgentRole.REVIEWER,
            name="reviewer",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            expertise_domains={"quality_assurance": 0.9, "testing": 0.85, "standards": 0.8}
        )
    
    async def start_agents(self):
        """Start all agents"""
        for name, agent in self.agents.items():
            await agent.start()
            logger.info(f"Started agent: {name}")
    
    async def stop_agents(self):
        """Stop all agents"""
        for name, agent in self.agents.items():
            await agent.stop()
            logger.info(f"Stopped agent: {name}")
    
    async def setup_project_knowledge(self, project_info: Dict[str, Any]):
        """Set up initial project knowledge in the knowledge graph"""
        # Add the project entity
        project_id = await self.agents["coordinator"].add_knowledge(
            entity_name=project_info["name"],
            entity_type=EntityType.CONCEPT,
            properties={
                "description": project_info["description"],
                "goals": project_info["goals"],
                "deadline": project_info.get("deadline"),
                "status": "planning"
            }
        )
        
        # Add stakeholders
        for stakeholder in project_info.get("stakeholders", []):
            stakeholder_id = await self.agents["coordinator"].add_knowledge(
                entity_name=stakeholder["name"],
                entity_type=EntityType.AGENT,
                properties={
                    "role": stakeholder.get("role", "Stakeholder"),
                    "interests": stakeholder.get("interests", [])
                }
            )
            
            # Link to project
            await self.agents["coordinator"].add_relationship(
                source_name=stakeholder["name"],
                target_name=project_info["name"],
                relationship_type=RelationshipType.RELATED_TO,
                properties={"type": "stakeholder"}
            )
        
        # Add requirements
        for i, req in enumerate(project_info.get("requirements", [])):
            req_name = f"Requirement {i+1}: {req[:30]}..."
            req_id = await self.agents["coordinator"].add_knowledge(
                entity_name=req_name,
                entity_type=EntityType.CONCEPT,
                properties={"description": req, "status": "defined"}
            )
            
            # Link to project
            await self.agents["coordinator"].add_relationship(
                source_name=req_name,
                target_name=project_info["name"],
                relationship_type=RelationshipType.PART_OF
            )
        
        # Add resources
        for resource in project_info.get("resources", []):
            resource_id = await self.agents["coordinator"].add_knowledge(
                entity_name=resource["name"],
                entity_type=EntityType.RESOURCE,
                properties={
                    "type": resource.get("type", "Other"),
                    "availability": resource.get("availability", "Available")
                }
            )
            
            # Link to project
            await self.agents["coordinator"].add_relationship(
                source_name=resource["name"],
                target_name=project_info["name"],
                relationship_type=RelationshipType.RELATED_TO,
                properties={"type": "resource"}
            )
    
    async def create_project_plan(self, project_name: str):
        """Create a project plan using the planning agent"""
        # Get the project from knowledge graph
        project = self.knowledge_graph.get_entity_by_name(project_name)
        if not project:
            logger.error(f"Project {project_name} not found in knowledge graph")
            return None
            
        # Create a planning task
        planning_task_id = await self.agents["coordinator"].create_task(
            title=f"Create project plan for {project_name}",
            description=f"Create a comprehensive project plan for {project_name} based on the requirements and resources.",
            assignee="planner",
            priority=TaskPriority.HIGH
        )
        
        # Wait for the planning task to complete
        while True:
            task = self.task_registry.get_task(planning_task_id)
            if task and task.status == TaskStatus.COMPLETED:
                break
            await asyncio.sleep(1)
        
        # Get the plan from the task result
        task = self.task_registry.get_task(planning_task_id)
        if task and task.result:
            plan = task.result.get("result", "No plan generated")
            
            # Store the plan as an artifact
            self.artifacts["project_plan"] = plan
            
            # Add the plan to the knowledge graph
            plan_id = await self.agents["planner"].add_knowledge(
                entity_name=f"Plan for {project_name}",
                entity_type=EntityType.ARTIFACT,
                properties={"content": plan, "status": "draft"}
            )
            
            # Link to project
            await self.agents["planner"].add_relationship(
                source_name=f"Plan for {project_name}",
                target_name=project_name,
                relationship_type=RelationshipType.RELATED_TO,
                properties={"type": "plan"}
            )
            
            return plan
        
        return None
    
    async def create_tasks_from_plan(self, project_name: str):
        """Create tasks based on the project plan"""
        # Get the plan from knowledge graph
        plan_entity = self.knowledge_graph.get_entity_by_name(f"Plan for {project_name}")
        if not plan_entity:
            logger.error(f"Plan for {project_name} not found in knowledge graph")
            return []
            
        plan_content = plan_entity.properties.get("content", "")
        
        # Ask the coordinator to create tasks from the plan
        input_data = {
            "content": f"Create tasks from the following project plan for {project_name}:\n\n{plan_content}",
            "context": {"project": project_name}
        }
        
        response = await self.agents["coordinator"].process(input_data)
        
        # For demonstration, we'll create some example tasks
        task_ids = []
        
        # Research task
        research_task_id = await self.agents["coordinator"].create_task(
            title=f"Research technologies for {project_name}",
            description="Research and evaluate technologies that could be used for this project.",
            assignee="researcher",
            priority=TaskPriority.HIGH
        )
        task_ids.append(research_task_id)
        
        # Design task
        design_task_id = await self.agents["coordinator"].create_task(
            title=f"Create design document for {project_name}",
            description="Create a detailed design document based on the project plan and research.",
            assignee="planner",
            priority=TaskPriority.HIGH,
            dependencies=[research_task_id]
        )
        task_ids.append(design_task_id)
        
        # Implementation task
        impl_task_id = await self.agents["coordinator"].create_task(
            title=f"Implement prototype for {project_name}",
            description="Implement a prototype based on the design document.",
            assignee="executor",
            priority=TaskPriority.MEDIUM,
            dependencies=[design_task_id]
        )
        task_ids.append(impl_task_id)
        
        # Testing task
        test_task_id = await self.agents["coordinator"].create_task(
            title=f"Test prototype for {project_name}",
            description="Test the prototype and provide feedback.",
            assignee="reviewer",
            priority=TaskPriority.MEDIUM,
            dependencies=[impl_task_id]
        )
        task_ids.append(test_task_id)
        
        return task_ids
    
    async def resolve_technology_conflict(self, project_name: str):
        """Simulate and resolve a conflict about technology choices"""
        # Create a conflict about technology choices
        options = {
            "option1": {
                "technology": "Python/Django",
                "pros": ["Rapid development", "Extensive libraries", "Well-established"],
                "cons": ["Performance overhead", "Monolithic by default"]
            },
            "option2": {
                "technology": "Node.js/Express",
                "pros": ["Fast execution", "JavaScript throughout", "Large ecosystem"],
                "cons": ["Callback hell", "Less mature ORM options"]
            },
            "option3": {
                "technology": "Rust/Actix",
                "pros": ["Excellent performance", "Memory safety", "Modern language features"],
                "cons": ["Steeper learning curve", "Smaller ecosystem", "Longer development time"]
            }
        }
        
        # Raise a conflict
        conflict_id = await self.agents["researcher"].raise_conflict(
            description=f"Technology stack selection for {project_name}",
            conflict_type=ConflictType.APPROACH,
            resolution_strategy=ResolutionStrategy.VOTING,
            options=options,
            participants=["coordinator", "planner", "researcher", "executor", "reviewer"],
            domain="technology"
        )
        
        # Wait for all agents to vote
        await asyncio.sleep(2)  # In reality, we would wait for all votes
        
        # Manually cast votes for demonstration
        await self.agents["planner"].vote_on_conflict(conflict_id, "option1")
        await self.agents["executor"].vote_on_conflict(conflict_id, "option2")
        await self.agents["reviewer"].vote_on_conflict(conflict_id, "option1")
        await self.agents["coordinator"].vote_on_conflict(conflict_id, "option1")
        
        # Resolve the conflict
        resolution = self.conflict_resolver.try_resolve(conflict_id)
        
        if resolution:
            # Add the resolution to the knowledge graph
            tech_choice = resolution["resolved_data"]["technology"]
            
            tech_id = await self.agents["coordinator"].add_knowledge(
                entity_name=f"Technology Stack: {tech_choice}",
                entity_type=EntityType.CONCEPT,
                properties={
                    "description": f"Selected technology stack: {tech_choice}",
                    "pros": resolution["resolved_data"]["pros"],
                    "cons": resolution["resolved_data"]["cons"]
                }
            )
            
            # Link to project
            await self.agents["coordinator"].add_relationship(
                source_name=f"Technology Stack: {tech_choice}",
                target_name=project_name,
                relationship_type=RelationshipType.RELATED_TO,
                properties={"type": "technology_decision"}
            )
            
            # Store the resolution as an artifact
            self.artifacts["technology_decision"] = {
                "selected_technology": tech_choice,
                "voting_results": resolution
            }
            
            return resolution
        
        return None
    
    async def run_collaborative_workflow(self, project_info: Dict[str, Any]):
        """Run the complete collaborative workflow"""
        try:
            print(f"\n{'='*80}")
            print(f"Starting collaborative workflow for project: {project_info['name']}")
            print(f"{'='*80}\n")
            
            # Start all agents
            await self.start_agents()
            
            # Set up initial project knowledge
            print("\nSetting up project knowledge...")
            await self.setup_project_knowledge(project_info)
            
            # Create a project plan
            print("\nCreating project plan...")
            plan = await self.create_project_plan(project_info["name"])
            if plan:
                print("\nProject Plan:")
                print("-" * 40)
                print(plan)
            
            # Create tasks from the plan
            print("\nCreating tasks from plan...")
            task_ids = await self.create_tasks_from_plan(project_info["name"])
            if task_ids:
                print(f"\nCreated {len(task_ids)} tasks:")
                for task_id in task_ids:
                    task = self.task_registry.get_task(task_id)
                    if task:
                        print(f"- {task.title} (assigned to {task.assignee})")
            
            # Resolve a technology conflict
            print("\nResolving technology stack conflict...")
            resolution = await self.resolve_technology_conflict(project_info["name"])
            if resolution:
                tech = resolution["resolved_data"]["technology"]
                print(f"\nResolved conflict: Selected {tech} as technology stack")
                print(f"Voting results: {resolution['vote_count']} out of {resolution['total_votes']} votes")
            
            # Wait for tasks to complete
            print("\nWaiting for tasks to complete...")
            completed = False
            start_time = datetime.now(timezone.utc)
            timeout = timedelta(seconds=30)
            
            while not completed and datetime.now(timezone.utc) - start_time < timeout:
                # Check if all tasks are completed
                all_tasks = []
                for task_id in task_ids:
                    task = self.task_registry.get_task(task_id)
                    if task:
                        all_tasks.append(task)
                
                completed_count = sum(1 for task in all_tasks if task.status == TaskStatus.COMPLETED)
                if completed_count == len(all_tasks) and len(all_tasks) > 0:
                    completed = True
                    break
                
                await asyncio.sleep(1)
            
            # Display results
            print("\nWorkflow Results:")
            print("-" * 40)
            
            # Show project structure from knowledge graph
            project = self.knowledge_graph.get_entity_by_name(project_info["name"])
            if project:
                related_entities = self.knowledge_graph.get_related_entities(project.id)
                
                print(f"\nProject Structure:")
                print(f"- Project: {project_info['name']}")
                
                for entity in related_entities:
                    print(f"  - {entity.type.name}: {entity.name}")
            
            # Show task status
            print("\nTask Status:")
            for task_id in task_ids:
                task = self.task_registry.get_task(task_id)
                if task:
                    status = "✓" if task.status == TaskStatus.COMPLETED else "○"
                    print(f"  {status} {task.title} - {task.status.name}")
            
            # Show artifacts
            print("\nArtifacts Generated:")
            for name, artifact in self.artifacts.items():
                if isinstance(artifact, str):
                    print(f"- {name}: {artifact[:50]}...")
                else:
                    print(f"- {name}: {str(artifact)[:50]}...")
            
            print("\nWorkflow Complete")
            print("=" * 40)
            
        finally:
            # Stop all agents
            await self.stop_agents()

async def run_example():
    """Run the collaborative workflow example"""
    # Sample project information
    project_info = {
        "name": "Smart Home Automation System",
        "description": "A system to automate various aspects of home management including lighting, climate control, security, and entertainment.",
        "goals": [
            "Create an integrated system for controlling home devices",
            "Develop a user-friendly interface for controlling the system",
            "Ensure high reliability and security",
            "Support expansion with new device types"
        ],
        "stakeholders": [
            {"name": "Homeowners", "interests": ["Ease of use", "Reliability", "Cost efficiency"]},
            {"name": "Device Manufacturers", "interests": ["Compatibility", "Feature showcase"]},
            {"name": "Installation Technicians", "interests": ["Ease of installation", "Troubleshooting"]}
        ],
        "requirements": [
            "The system must control lighting in at least 10 zones",
            "The system must regulate temperature based on time, occupancy, and weather",
            "The system must integrate with major smart home protocols (Zigbee, Z-Wave, etc.)",
            "The system must provide a mobile app and voice control interface",
            "The system must handle internet outages gracefully",
            "The system must implement strong security measures"
        ],
        "resources": [
            {"name": "Development Team", "type": "Human", "availability": "Full-time"},
            {"name": "Test Devices", "type": "Hardware", "availability": "Limited"},
            {"name": "Cloud Infrastructure", "type": "Computing", "availability": "Available"}
        ]
    }
    
    workflow = CollaborativeWorkflowExample()
    await workflow.run_collaborative_workflow(project_info)

if __name__ == "__main__":
    asyncio.run(run_example())
