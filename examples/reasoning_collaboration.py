"""
Reasoning Collaboration Example

This example demonstrates how multiple agents with different reasoning strategies
can collaborate to solve complex problems using their specialized capabilities.
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
from src.agents.reasoning import ReasoningMode, ReasoningChain
from src.collaboration.protocol import CommunicationProtocol, MessageType, MessageStatus
from src.collaboration.knowledge import KnowledgeGraph, EntityType, RelationshipType
from src.collaboration.tasks import TaskRegistry, TaskPriority, TaskStatus
from src.collaboration.conflict import ConflictResolver, ConflictType, ResolutionStrategy
from src.workflows.monitoring import WorkflowMonitor
from src.workflows.base import WorkflowContext, WorkflowStatus

class ReasoningCollaborationSystem:
    """
    A system that demonstrates collaboration between agents with different reasoning strategies.
    
    This system shows how agents can use specialized reasoning strategies to:
    1. Break down complex problems
    2. Explore multiple solution approaches
    3. Evaluate trade-offs
    4. Make collective decisions
    """
    
    def __init__(self):
        """Initialize the reasoning collaboration system"""
        # Shared collaboration infrastructure
        self.comm_protocol = CommunicationProtocol()
        self.knowledge_graph = KnowledgeGraph()
        self.task_registry = TaskRegistry()
        self.conflict_resolver = ConflictResolver()
        self.workflow_monitor = WorkflowMonitor()
        
        # Shared memory store
        self.memory_store = MemoryStore()
        
        # Tool registry
        self.tool_registry = ToolRegistry()
        self._register_tools()
        
        # Create agents with different reasoning strategies
        self.agents = {}
        self._setup_agents()
    
    def _register_tools(self):
        """Register tools for the agents to use"""
        # Calculator tool
        self.tool_registry.register(CalculatorTool())
        
        # Time tool
        self.tool_registry.register(TimeTool())
    
    def _setup_agents(self):
        """Set up specialized agents with different reasoning strategies"""
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
        
        # Create agents with different reasoning specializations
        self.agents["strategist"] = AdvancedAgent(
            role=AgentRole.PLANNER,
            name="strategist",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            thinking_strategy=ThinkingStrategy.PLANNING,
            expertise_domains={"strategic_planning": 0.9, "decision_making": 0.85, "resource_allocation": 0.8}
        )
        
        self.agents["explorer"] = AdvancedAgent(
            role=AgentRole.RESEARCHER,
            name="explorer",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            thinking_strategy=ThinkingStrategy.CREATIVE,
            expertise_domains={"creative_thinking": 0.9, "exploration": 0.85, "innovation": 0.8}
        )
        
        self.agents["analyst"] = AdvancedAgent(
            role=AgentRole.REVIEWER,
            name="analyst",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            thinking_strategy=ThinkingStrategy.CRITICAL,
            expertise_domains={"critical_analysis": 0.9, "risk_assessment": 0.85, "validation": 0.8}
        )
        
        self.agents["reflector"] = AdvancedAgent(
            role=AgentRole.ASSISTANT,
            name="reflector",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            thinking_strategy=ThinkingStrategy.REFLECTIVE,
            expertise_domains={"reflection": 0.95, "systems_thinking": 0.9, "ethics": 0.85}
        )
        
        self.agents["implementer"] = AdvancedAgent(
            role=AgentRole.EXECUTOR,
            name="implementer",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store,
            comm_protocol=self.comm_protocol,
            knowledge_graph=self.knowledge_graph,
            task_registry=self.task_registry,
            conflict_resolver=self.conflict_resolver,
            thinking_strategy=ThinkingStrategy.REACTIVE,
            expertise_domains={"implementation": 0.9, "execution": 0.85, "efficiency": 0.8}
        )
    
    async def start_agents(self):
        """Start all agents"""
        for name, agent in self.agents.items():
            await agent.start()
            logger.info(f"Started agent: {name}")
        
        # Start workflow monitor
        await self.workflow_monitor.start()
    
    async def stop_agents(self):
        """Stop all agents"""
        for name, agent in self.agents.items():
            await agent.stop()
            logger.info(f"Stopped agent: {name}")
        
        # Stop workflow monitor
        await self.workflow_monitor.stop()
    
    async def solve_problem_collaboratively(self, problem: Dict[str, Any]):
        """
        Solve a complex problem using collaborative reasoning.
        
        This method demonstrates how agents with different reasoning strategies
        can work together to solve a complex problem through a multi-stage process:
        1. Strategic decomposition
        2. Creative exploration
        3. Critical analysis
        4. Reflective synthesis
        5. Practical implementation
        """
        problem_id = f"problem_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        problem_statement = problem.get("statement", "")
        problem_context = problem.get("context", {})
        
        print(f"\n{'='*80}")
        print(f"COLLABORATIVE PROBLEM SOLVING: {problem.get('title', 'Unnamed Problem')}")
        print(f"{'='*80}\n")
        print(f"Problem Statement: {problem_statement}\n")
        
        # Create a knowledge entity for the problem
        await self.agents["strategist"].add_knowledge(
            entity_name=problem.get("title", "Unnamed Problem"),
            entity_type=EntityType.CONCEPT,
            properties={
                "description": problem_statement,
                "context": problem_context,
                "status": "analyzing"
            }
        )
        
        # STAGE 1: Strategic decomposition by the strategist
        print("\nSTAGE 1: STRATEGIC DECOMPOSITION")
        print("--------------------------------")
        
        strategic_prompt = f"""
        Analyze the following problem and create a strategic plan to solve it:
        
        PROBLEM: {problem_statement}
        
        CONTEXT: {json.dumps(problem_context, indent=2)}
        
        Your task is to:
        1. Break down this problem into 3-5 key subproblems or components
        2. Identify the core challenges for each component
        3. Create a high-level plan for addressing these components
        4. Specify what information or expertise might be needed
        
        Create a structured decomposition that will guide our collaborative problem-solving.
        """
        
        strategic_reasoning = await self.agents["strategist"].reason_about_problem(
            problem=strategic_prompt,
            reasoning_mode=ReasoningMode.TREE
        )
        
        # Extract the conclusion
        strategic_conclusion = ""
        for step in reversed(strategic_reasoning.steps):
            if step.step_type in ["conclusion", "evaluation"]:
                strategic_conclusion = step.content
                break
        
        if not strategic_conclusion and strategic_reasoning.steps:
            strategic_conclusion = strategic_reasoning.steps[-1].content
        
        print(f"\nStrategic Analysis:\n{strategic_conclusion}\n")
        
        # Create tasks based on the strategic decomposition
        task_ids = []
        
        # Use a simple approach to extract components from the text
        components = []
        in_component = False
        current_component = ""
        
        for line in strategic_conclusion.split("\n"):
            if "component" in line.lower() or "subproblem" in line.lower() or line.strip().startswith("1.") or line.strip().startswith("2.") or line.strip().startswith("3.") or line.strip().startswith("4.") or line.strip().startswith("5."):
                if in_component and current_component.strip():
                    components.append(current_component.strip())
                current_component = line
                in_component = True
            elif in_component:
                current_component += "\n" + line
        
        # Add the last component
        if in_component and current_component.strip():
            components.append(current_component.strip())
        
        # If we couldn't extract components, create a generic task
        if not components:
            task_id = await self.agents["strategist"].create_task(
                title=f"Solve problem: {problem.get('title', 'Unnamed Problem')}",
                description=problem_statement,
                assignee="explorer",
                priority=TaskPriority.HIGH
            )
            task_ids.append(task_id)
        else:
            # Create tasks for each component
            for i, component in enumerate(components):
                component_title = component.split("\n")[0][:50]
                
                task_id = await self.agents["strategist"].create_task(
                    title=f"Component {i+1}: {component_title}",
                    description=component,
                    assignee="explorer",
                    priority=TaskPriority.HIGH
                )
                task_ids.append(task_id)
        
        # Wait for task creation
        await asyncio.sleep(1)
        
        # STAGE 2: Creative exploration by the explorer
        print("\nSTAGE 2: CREATIVE EXPLORATION")
        print("-----------------------------")
        
        # Get the tasks
        exploration_results = []
        
        for task_id in task_ids:
            task = self.task_registry.get_task(task_id)
            if not task:
                continue
                
            print(f"\nExploring: {task.title}")
            
            # Create exploration prompt
            exploration_prompt = f"""
            Generate creative approaches and solutions for the following component:
            
            COMPONENT: {task.description}
            
            Your task is to:
            1. Explore at least 3 different approaches to address this component
            2. Think outside the box and consider non-obvious solutions
            3. For each approach, outline its potential benefits and limitations
            4. Identify any innovative techniques or technologies that could be applied
            
            Focus on generating diverse and creative options rather than analyzing them in depth.
            """
            
            exploration_reasoning = await self.agents["explorer"].reason_about_problem(
                problem=exploration_prompt,
                reasoning_mode=ReasoningMode.TREE
            )
            
            # Extract the conclusion
            exploration_conclusion = ""
            for step in reversed(exploration_reasoning.steps):
                if step.step_type in ["conclusion", "evaluation"]:
                    exploration_conclusion = step.content
                    break
            
            if not exploration_conclusion and exploration_reasoning.steps:
                exploration_conclusion = exploration_reasoning.steps[-1].content
            
            print(f"\nExploration Results:\n{exploration_conclusion[:200]}...\n")
            
            exploration_results.append({
                "task_id": task_id,
                "task_title": task.title,
                "exploration": exploration_conclusion
            })
            
            # Update the task
            await self.agents["explorer"].update_task_status(
                task_id=task_id,
                status=TaskStatus.COMPLETED,
                notes=f"Completed exploration with {len(exploration_reasoning.steps)} reasoning steps"
            )
        
        # STAGE 3: Critical analysis by the analyst
        print("\nSTAGE 3: CRITICAL ANALYSIS")
        print("--------------------------")
        
        # Create a combined prompt for analysis
        analysis_components = []
        for result in exploration_results:
            analysis_components.append(f"COMPONENT: {result['task_title']}\n\nEXPLORATION:\n{result['exploration']}")
        
        analysis_prompt = f"""
        Critically analyze the following exploration results for our problem:
        
        PROBLEM: {problem_statement}
        
        {'-'*50}
        
        {('-'*50 + '\n\n').join(analysis_components)}
        
        {'-'*50}
        
        Your task is to:
        1. Critically evaluate the proposed approaches for each component
        2. Identify potential risks, gaps, or logical flaws in the reasoning
        3. Assess the feasibility and effectiveness of each approach
        4. Determine which approaches seem most promising and why
        5. Highlight any important considerations that have been overlooked
        
        Provide a rigorous analysis that challenges assumptions and identifies potential issues.
        """
        
        analysis_reasoning = await self.agents["analyst"].reason_about_problem(
            problem=analysis_prompt,
            reasoning_mode=ReasoningMode.SOCRATIC
        )
        
        # Extract the conclusion
        analysis_conclusion = ""
        for step in reversed(analysis_reasoning.steps):
            if step.step_type in ["conclusion", "synthesis"]:
                analysis_conclusion = step.content
                break
        
        if not analysis_conclusion and analysis_reasoning.steps:
            analysis_conclusion = analysis_reasoning.steps[-1].content
        
        print(f"\nCritical Analysis:\n{analysis_conclusion[:200]}...\n")
        
        # STAGE 4: Reflective synthesis by the reflector
        print("\nSTAGE 4: REFLECTIVE SYNTHESIS")
        print("----------------------------")
        
        synthesis_prompt = f"""
        Synthesize the strategic decomposition, creative exploration, and critical analysis 
        to form a coherent solution to our problem:
        
        PROBLEM: {problem_statement}
        
        STRATEGIC DECOMPOSITION:
        {strategic_conclusion}
        
        CRITICAL ANALYSIS:
        {analysis_conclusion}
        
        Your task is to:
        1. Reflect on the entire problem-solving process so far
        2. Identify the most promising elements from each stage
        3. Consider how these elements can be integrated into a cohesive solution
        4. Address any tensions or contradictions between different perspectives
        5. Provide a holistic solution that balances different considerations
        
        Create a thoughtful synthesis that represents our collective intelligence on this problem.
        """
        
        synthesis_reasoning = await self.agents["reflector"].reason_about_problem(
            problem=synthesis_prompt,
            reasoning_mode=ReasoningMode.REFLECTIVE
        )
        
        # Extract the conclusion
        synthesis_conclusion = ""
        for step in reversed(synthesis_reasoning.steps):
            if step.step_type in ["conclusion", "revised_reasoning_3"]:
                synthesis_conclusion = step.content
                break
        
        if not synthesis_conclusion and synthesis_reasoning.steps:
            synthesis_conclusion = synthesis_reasoning.steps[-1].content
        
        print(f"\nReflective Synthesis:\n{synthesis_conclusion[:200]}...\n")
        
        # STAGE 5: Practical implementation by the implementer
        print("\nSTAGE 5: PRACTICAL IMPLEMENTATION")
        print("--------------------------------")
        
        implementation_prompt = f"""
        Create a practical implementation plan for the following solution:
        
        PROBLEM: {problem_statement}
        
        SOLUTION SYNTHESIS:
        {synthesis_conclusion}
        
        Your task is to:
        1. Develop a concrete, step-by-step implementation plan
        2. Specify the resources, tools, or technologies needed
        3. Identify key milestones and success criteria
        4. Outline potential challenges during implementation and how to address them
        5. Suggest a timeline and approach for monitoring progress
        
        Focus on practical details that would make this solution actionable in the real world.
        """
        
        implementation_reasoning = await self.agents["implementer"].reason_about_problem(
            problem=implementation_prompt,
            reasoning_mode=ReasoningMode.SEQUENTIAL
        )
        
        # Extract the conclusion
        implementation_conclusion = ""
        for step in reversed(implementation_reasoning.steps):
            if step.step_type in ["conclusion"]:
                implementation_conclusion = step.content
                break
        
        if not implementation_conclusion and implementation_reasoning.steps:
            implementation_conclusion = implementation_reasoning.steps[-1].content
        
        print(f"\nImplementation Plan:\n{implementation_conclusion[:200]}...\n")
        
        # FINAL SOLUTION: Combine all insights
        print("\nFINAL COLLABORATIVE SOLUTION")
        print("----------------------------")
        
        final_solution = f"""
        COLLABORATIVE SOLUTION FOR: {problem.get('title', 'Unnamed Problem')}
        
        PROBLEM STATEMENT:
        {problem_statement}
        
        STRATEGIC DECOMPOSITION:
        {strategic_conclusion}
        
        IMPLEMENTATION PLAN:
        {implementation_conclusion}
        
        This solution represents the collaborative reasoning of multiple specialized agents,
        combining strategic thinking, creative exploration, critical analysis, reflective
        synthesis, and practical implementation planning.
        """
        
        print(f"\n{final_solution}\n")
        
        # Update the problem status in the knowledge graph
        problem_entity = self.knowledge_graph.get_entity_by_name(problem.get("title", "Unnamed Problem"))
        if problem_entity:
            problem_entity.properties["status"] = "solved"
            problem_entity.properties["solution"] = final_solution
        
        return {
            "problem_id": problem_id,
            "solution": final_solution,
            "reasoning_chains": {
                "strategic": strategic_reasoning.to_dict(),
                "exploration": [result["exploration"] for result in exploration_results],
                "analysis": analysis_reasoning.to_dict(),
                "synthesis": synthesis_reasoning.to_dict(),
                "implementation": implementation_reasoning.to_dict()
            }
        }

async def run_example():
    """Run the reasoning collaboration example"""
    # Sample complex problem
    problem = {
        "title": "Urban Transportation Optimization",
        "statement": "Design a next-generation urban transportation system that reduces congestion, minimizes environmental impact, and improves accessibility for all citizens, while being economically sustainable.",
        "context": {
            "city_size": "Metropolitan area with 2-5 million residents",
            "current_issues": [
                "Heavy traffic congestion during peak hours",
                "Limited public transportation coverage in certain areas",
                "Growing air quality concerns",
                "Aging infrastructure requiring significant investment",
                "Increasing demand for accessibility and equity in transportation"
            ],
            "constraints": [
                "Limited budget for new infrastructure",
                "Need to maintain existing services during transitions",
                "Space constraints in dense urban areas",
                "Varying needs across different demographic groups",
                "Rapidly evolving transportation technologies"
            ],
            "opportunities": [
                "Emerging autonomous vehicle technologies",
                "Smart city data infrastructure",
                "Growing public support for sustainable solutions",
                "Potential for public-private partnerships",
                "Increased remote work reducing some commute demands"
            ]
        }
    }
    
    system = ReasoningCollaborationSystem()
    
    try:
        # Start the agents
        await system.start_agents()
        
        # Solve the problem collaboratively
        solution = await system.solve_problem_collaboratively(problem)
        
    finally:
        # Stop the agents
        await system.stop_agents()

if __name__ == "__main__":
    asyncio.run(run_example())
