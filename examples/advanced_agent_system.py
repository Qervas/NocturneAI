"""
Advanced Agent System Example

This example demonstrates a team of specialized agents working together
to solve complex tasks using LLM-powered decision making, workflows,
and agent collaboration.

Key features demonstrated:
1. Setting up specialized agents with different roles and expertise
2. Communication between agents via message passing
3. Shared knowledge graph for collective intelligence
4. Task delegation and tracking
5. Workflow execution for structured problem solving
6. Conflict resolution for handling disagreements
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

from src.core.agent import AgentRole
from src.core.memory import MemoryStore
from src.core.tools import ToolRegistry
from src.tools.web_search import CalculatorTool, TimeTool
from src.agents.advanced_agent import AdvancedAgent, ThinkingStrategy
from src.collaboration.protocol import CommunicationProtocol
from src.collaboration.knowledge import KnowledgeGraph, EntityType, RelationshipType
from src.collaboration.tasks import TaskRegistry, TaskPriority
from src.collaboration.conflict import ConflictResolver, ConflictType, ResolutionStrategy
from src.workflows.registry import WorkflowRegistry
from src.workflows.planning import ProjectPlanningWorkflow
from src.workflows.research import ResearchWorkflow

class AdvancedAgentSystem:
    """
    Advanced multi-agent system with collaboration capabilities.
    
    This class demonstrates how to set up and run a team of specialized agents
    that work together to solve complex problems, share knowledge, and
    coordinate activities.
    """
    
    def __init__(self):
        """Initialize the advanced agent system"""
        # Shared collaboration infrastructure
        self.comm_protocol = CommunicationProtocol()
        self.knowledge_graph = KnowledgeGraph()
        self.task_registry = TaskRegistry()
        self.conflict_resolver = ConflictResolver()
        self.workflow_registry = WorkflowRegistry()
        
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
        
        # Create a coordinator agent
        self.agents["coordinator"] = AdvancedAgent(
            role=AgentRole.COORDINATOR,
            name="coordinator",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            workflow_registry=self.workflow_registry,
            thinking_strategy=ThinkingStrategy.PLANNING,
            expertise_domains={"project_management": 0.9, "coordination": 0.95, "prioritization": 0.85}
        )
        
        # Create a planner agent
        self.agents["planner"] = AdvancedAgent(
            role=AgentRole.PLANNER,
            name="planner",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            workflow_registry=self.workflow_registry,
            thinking_strategy=ThinkingStrategy.PLANNING,
            expertise_domains={"planning": 0.9, "requirements_analysis": 0.85, "design": 0.8}
        )
        
        # Create a researcher agent
        self.agents["researcher"] = AdvancedAgent(
            role=AgentRole.RESEARCHER,
            name="researcher",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            workflow_registry=self.workflow_registry,
            thinking_strategy=ThinkingStrategy.REFLECTIVE,
            expertise_domains={"research": 0.9, "data_analysis": 0.8, "technology": 0.85}
        )
        
        # Create an executor agent
        self.agents["executor"] = AdvancedAgent(
            role=AgentRole.EXECUTOR,
            name="executor",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            workflow_registry=self.workflow_registry,
            thinking_strategy=ThinkingStrategy.REACTIVE,
            expertise_domains={"implementation": 0.9, "coding": 0.85, "problem_solving": 0.8}
        )
        
        # Create a reviewer agent
        self.agents["reviewer"] = AdvancedAgent(
            role=AgentRole.REVIEWER,
            name="reviewer",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            workflow_registry=self.workflow_registry,
            thinking_strategy=ThinkingStrategy.CRITICAL,
            expertise_domains={"quality_assurance": 0.9, "testing": 0.85, "standards": 0.8}
        )
        
        # Create a creative agent
        self.agents["creative"] = AdvancedAgent(
            role=AgentRole.ASSISTANT,
            name="creative",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            workflow_registry=self.workflow_registry,
            thinking_strategy=ThinkingStrategy.CREATIVE,
            expertise_domains={"creative_thinking": 0.95, "innovation": 0.9, "user_experience": 0.85}
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
    
    async def research_technologies(self, project_name: str, topic: str):
        """Ask the researcher to research technologies for the project"""
        logger.info(f"Requesting technology research for {project_name} on topic: {topic}")
        
        # Prepare the research context
        context_data = {
            "research_topic": topic,
            "project_name": project_name,
            "existing_knowledge": [],
            "constraints": []
        }
        
        # Get project information from knowledge graph
        project = self.knowledge_graph.get_entity_by_name(project_name)
        if project:
            context_data["existing_knowledge"].append(f"Project description: {project.properties.get('description', '')}")
            context_data["existing_knowledge"].extend(project.properties.get("goals", []))
            
            # Get requirements
            related_entities = self.knowledge_graph.get_related_entities(project.id)
            requirements = [entity for entity in related_entities if "Requirement" in entity.name]
            context_data["existing_knowledge"].extend([
                f"Requirement: {req.properties.get('description', '')}" 
                for req in requirements
            ])
        
        # Execute the research workflow
        response = await self.agents["researcher"].process({
            "workflow": "research_workflow",
            "context": context_data
        })
        
        # Create a task for the planner to review the research
        if "data" in response.metadata:
            research_data = response.metadata["data"]
            
            # Extract insights
            insights = []
            for key, value in research_data.items():
                if "insight" in key.lower() and isinstance(value, list):
                    insights.extend(value)
                    
            # Create a task for the planner
            task_id = await self.agents["coordinator"].create_task(
                title=f"Review research on {topic} for {project_name}",
                description=f"Review the research findings and incorporate relevant technologies into the project plan.\n\nKey insights:\n" + "\n".join([f"- {insight}" for insight in insights]),
                assignee="planner",
                priority=TaskPriority.HIGH
            )
            
            logger.info(f"Created task {task_id} for planner to review research")
        
        return response
    
    async def create_project_plan(self, project_name: str):
        """Ask the planner to create a project plan"""
        logger.info(f"Requesting project plan creation for {project_name}")
        
        # Prepare the planning context
        context_data = {
            "project_name": project_name,
            "requirements": [],
            "team_info": []
        }
        
        # Get project information from knowledge graph
        project = self.knowledge_graph.get_entity_by_name(project_name)
        if project:
            # Get requirements
            related_entities = self.knowledge_graph.get_related_entities(project.id)
            requirements = [entity for entity in related_entities if "Requirement" in entity.name]
            context_data["requirements"] = [
                req.properties.get("description", "")
                for req in requirements
            ]
            
            # Add team info (our agents)
            for agent_name, agent in self.agents.items():
                context_data["team_info"].append({
                    "name": agent_name,
                    "role": agent.role.value,
                    "skills": list(agent.expertise_domains.keys())
                })
        
        # Execute the planning workflow
        response = await self.agents["planner"].process({
            "workflow": "project_planning",
            "context": context_data
        })
        
        # Create tasks based on the plan
        if "data" in response.metadata:
            planning_data = response.metadata["data"]
            
            # Extract tasks
            plan_tasks = []
            for key, value in planning_data.items():
                if "task" in key.lower() and isinstance(value, list):
                    plan_tasks.extend(value)
            
            # Create system tasks based on the plan
            created_tasks = []
            for plan_task in plan_tasks:
                if isinstance(plan_task, dict):
                    # Determine assignee based on task name and description
                    assignee = plan_task.get("assignee", "").lower()
                    if not assignee or assignee not in self.agents:
                        # Auto-assign based on task content
                        task_text = (plan_task.get("name", "") + " " + plan_task.get("description", "")).lower()
                        
                        if "research" in task_text or "investigate" in task_text:
                            assignee = "researcher"
                        elif "implement" in task_text or "code" in task_text or "build" in task_text:
                            assignee = "executor"
                        elif "test" in task_text or "review" in task_text or "validate" in task_text:
                            assignee = "reviewer"
                        elif "design" in task_text or "creative" in task_text or "interface" in task_text:
                            assignee = "creative"
                        else:
                            assignee = "coordinator"
                    
                    # Create the task
                    task_id = await self.agents["coordinator"].create_task(
                        title=plan_task.get("name", "Untitled Task"),
                        description=plan_task.get("description", ""),
                        assignee=assignee,
                        priority=TaskPriority.MEDIUM
                    )
                    
                    created_tasks.append({
                        "task_id": task_id,
                        "title": plan_task.get("name", ""),
                        "assignee": assignee
                    })
            
            logger.info(f"Created {len(created_tasks)} tasks based on the project plan")
            
            # Add the plan to the knowledge graph
            plan_entity_id = await self.agents["planner"].add_knowledge(
                entity_name=f"Plan for {project_name}",
                entity_type=EntityType.ARTIFACT,
                properties={
                    "content": response.content,
                    "tasks": created_tasks,
                    "status": "active"
                }
            )
            
            # Link to project
            await self.agents["planner"].add_relationship(
                source_name=f"Plan for {project_name}",
                target_name=project_name,
                relationship_type=RelationshipType.RELATED_TO,
                properties={"type": "plan"}
            )
        
        return response
    
    async def brainstorm_innovative_features(self, project_name: str):
        """Ask the creative agent to brainstorm innovative features"""
        logger.info(f"Requesting innovative feature brainstorming for {project_name}")
        
        # Get project information from knowledge graph
        project = self.knowledge_graph.get_entity_by_name(project_name)
        if not project:
            return None
        
        # Prepare the prompt
        prompt = f"""Brainstorm innovative and creative features for the project: {project_name}

Project Description:
{project.properties.get('description', '')}

Goals:
{", ".join(project.properties.get('goals', []))}

Please think outside the box and suggest 5-7 innovative features that could differentiate
this project and create unique value. For each feature, provide:
1. A catchy name
2. A brief description
3. Why it would be valuable
4. How it might be implemented at a high level"""

        # Ask the creative agent
        response = await self.agents["creative"].process({
            "content": prompt
        })
        
        # Create a conflict for team voting on the features
        if response.content:
            # Extract features (this is a simplified extraction)
            features = []
            current_feature = None
            
            for line in response.content.split("\n"):
                line = line.strip()
                if not line:
                    continue
                    
                # Look for numbered features or feature names with colons
                if (line.startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.")) or 
                    (":" in line and len(line.split(":")[0]) < 30)):
                    # Save previous feature if we have one
                    if current_feature:
                        features.append(current_feature)
                    
                    # Start new feature
                    current_feature = {
                        "name": line,
                        "description": ""
                    }
                elif current_feature:
                    # Add to current feature description
                    current_feature["description"] += line + "\n"
            
            # Add the last feature
            if current_feature:
                features.append(current_feature)
            
            # Create voting options
            options = {}
            for i, feature in enumerate(features[:5]):  # Limit to 5 features for voting
                options[f"feature_{i+1}"] = {
                    "name": feature["name"],
                    "description": feature["description"]
                }
            
            # Raise a conflict for voting
            if options:
                conflict_id = await self.agents["coordinator"].raise_conflict(
                    description=f"Vote on innovative features for {project_name}",
                    conflict_type=ConflictType.APPROACH,
                    resolution_strategy=ResolutionStrategy.VOTING,
                    options=options,
                    participants=list(self.agents.keys()),
                    domain="innovation"
                )
                
                logger.info(f"Created feature voting (conflict ID: {conflict_id})")
                
                # Wait for votes (in a real implementation, would wait for callbacks)
                await asyncio.sleep(2)
                
                # Get the result
                if self.conflict_resolver:
                    resolution = self.conflict_resolver.try_resolve(conflict_id)
                    
                    if resolution:
                        # Add the winning feature to the knowledge graph
                        feature_name = resolution["resolved_data"]["name"]
                        feature_desc = resolution["resolved_data"]["description"]
                        
                        feature_id = await self.agents["creative"].add_knowledge(
                            entity_name=f"Feature: {feature_name}",
                            entity_type=EntityType.CONCEPT,
                            properties={
                                "description": feature_desc,
                                "votes": resolution["vote_count"],
                                "status": "approved"
                            }
                        )
                        
                        # Link to project
                        await self.agents["creative"].add_relationship(
                            source_name=f"Feature: {feature_name}",
                            target_name=project_name,
                            relationship_type=RelationshipType.PART_OF,
                            properties={"type": "feature"}
                        )
                        
                        logger.info(f"Added winning feature to knowledge graph: {feature_name}")
        
        return response
    
    async def run_project_collaboration(self, project_info: Dict[str, Any]):
        """Run a complete project collaboration workflow"""
        try:
            print(f"\n{'='*80}")
            print(f"Starting advanced agent collaboration for project: {project_info['name']}")
            print(f"{'='*80}\n")
            
            # Start all agents
            await self.start_agents()
            
            # Set up initial project knowledge
            print("\nSetting up project knowledge...")
            await self.setup_project_knowledge(project_info)
            
            # Research technologies
            print("\nResearching technologies...")
            research_response = await self.research_technologies(
                project_info["name"], 
                project_info.get("research_topic", "Technologies for " + project_info["name"])
            )
            print(f"\nResearch completed: {research_response.content[:100]}...")
            
            # Allow time for the researcher to process the results
            await asyncio.sleep(2)
            
            # Create a project plan
            print("\nCreating project plan...")
            plan_response = await self.create_project_plan(project_info["name"])
            print(f"\nProject plan created: {plan_response.content[:100]}...")
            
            # Brainstorm innovative features
            print("\nBrainstorming innovative features...")
            feature_response = await self.brainstorm_innovative_features(project_info["name"])
            print(f"\nFeature brainstorming completed: {feature_response.content[:100] if feature_response else 'No response'}...")
            
            # Wait for tasks to make progress
            print("\nWaiting for tasks to make progress...")
            await asyncio.sleep(5)
            
            # Show project status
            print("\nProject Status:")
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
            active_tasks = []
            for agent_name, agent in self.agents.items():
                if agent.task_registry:
                    agent_tasks = agent.task_registry.get_agent_tasks(agent_name)
                    active_tasks.extend(agent_tasks)
            
            if active_tasks:
                print("\nActive Tasks:")
                for task in active_tasks:
                    print(f"  - {task.title} (Assigned to: {task.assignee}, Status: {task.status.name})")
            
            print("\nCollaboration Complete")
            print("=" * 40)
            
        finally:
            # Stop all agents
            await self.stop_agents()

async def run_example():
    """Run the advanced agent system example"""
    # Sample project information
    project_info = {
        "name": "Smart Home Automation System",
        "description": "A system to automate various aspects of home management including lighting, climate control, security, and entertainment.",
        "research_topic": "Smart Home Technologies and Standards",
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
    
    system = AdvancedAgentSystem()
    await system.run_project_collaboration(project_info)

if __name__ == "__main__":
    asyncio.run(run_example())
