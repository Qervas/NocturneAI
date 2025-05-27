from typing import Dict, Any, List, Optional, Type, TypeVar, Generic, Union, Callable, Awaitable
from ..core.agent import BaseAgent, AgentRole, AgentResponse, AgentState
from ..core.tools import ToolRegistry, Tool, ToolExecutionResult, ToolResultStatus
from ..core.memory import MemoryStore
from ..core.llm import BaseLLMProvider, LLMFactory, LLMResponse
from ..workflows.base import BaseWorkflow, WorkflowContext, WorkflowStatus, WorkflowStep, LLMDrivenStep
from ..workflows.registry import WorkflowRegistry
from ..collaboration.protocol import AgentMessage, MessageType, MessageStatus, CommunicationProtocol
from ..collaboration.knowledge import KnowledgeGraph, Entity, EntityType, Relationship, RelationshipType
from ..collaboration.tasks import Task, TaskStatus, TaskPriority, TaskRegistry
from ..collaboration.conflict import Conflict, ConflictType, ResolutionStrategy, ConflictResolver
import logging
import json
import asyncio
import uuid
from datetime import datetime, timezone
from enum import Enum, auto
from .reasoning import ReasoningMode, ReasoningFactory, ReasoningChain

logger = logging.getLogger(__name__)

class ThinkingStrategy(Enum):
    """Strategies for agent thinking and decision making"""
    REACTIVE = auto()  # Simple stimulus-response with minimal context
    REFLECTIVE = auto()  # Consider past experiences and current context
    PLANNING = auto()  # Create and follow plans toward goals
    CREATIVE = auto()  # Generate novel solutions and approaches
    CRITICAL = auto()  # Evaluate and verify information and reasoning
    COLLABORATIVE = auto()  # Work with other agents toward common goals

    def to_reasoning_mode(self) -> ReasoningMode:
        """Convert thinking strategy to reasoning mode"""
        if self == ThinkingStrategy.REACTIVE:
            return ReasoningMode.SEQUENTIAL
        elif self == ThinkingStrategy.PLANNING:
            return ReasoningMode.TREE
        elif self == ThinkingStrategy.REFLECTIVE:
            return ReasoningMode.REFLECTIVE
        elif self == ThinkingStrategy.CREATIVE:
            return ReasoningMode.TREE
        elif self == ThinkingStrategy.CRITICAL:
            return ReasoningMode.SOCRATIC
        else:
            return ReasoningMode.SEQUENTIAL

class AdvancedAgent(BaseAgent):
    """An advanced agent that can use LLMs, tools, workflows, and collaboration.
    
    This agent combines LLM-powered thinking with tool usage, workflow execution,
    and collaboration capabilities to create a highly autonomous and effective agent.
    Key features include:
    
    1. LLM-driven reasoning and decision making
    2. Tool usage for interacting with external systems
    3. Workflow execution for complex multi-step tasks
    4. Collaboration with other agents via messaging and shared knowledge
    5. Conflict resolution for handling disagreements
    6. Task delegation and tracking
    """
    
    def __init__(
        self, 
        role: AgentRole, 
        name: str, 
        tool_registry: Optional[ToolRegistry] = None,
        memory_store: Optional[MemoryStore] = None,
        llm_provider: Optional[BaseLLMProvider] = None,
        llm_provider_config: Optional[Dict[str, Any]] = None,
        workflow_registry: Optional[WorkflowRegistry] = None,
        comm_protocol: Optional[CommunicationProtocol] = None,
        knowledge_graph: Optional[KnowledgeGraph] = None,
        task_registry: Optional[TaskRegistry] = None,
        conflict_resolver: Optional[ConflictResolver] = None,
        system_prompt: Optional[str] = None,
        thinking_strategy: ThinkingStrategy = ThinkingStrategy.REFLECTIVE,
        expertise_domains: Optional[Dict[str, float]] = None
    ):
        super().__init__(role=role, name=name)
        
        # Core capabilities
        self.tool_registry = tool_registry or ToolRegistry()
        self.memory_store = memory_store or MemoryStore()
        
        # LLM capabilities
        self.llm_provider = llm_provider
        if not self.llm_provider and llm_provider_config:
            try:
                self.llm_provider = LLMFactory.create_provider(**llm_provider_config)
            except Exception as e:
                logger.warning(f"Failed to create LLM provider: {e}")
        
        # Workflow capabilities
        self.workflow_registry = workflow_registry or WorkflowRegistry()
        self.active_workflows: Dict[str, WorkflowContext] = {}
        
        # Collaboration capabilities
        self.comm_protocol = comm_protocol
        if self.comm_protocol:
            self.comm_protocol.register_agent(self.name, {"role": self.role.value})
        
        self.knowledge_graph = knowledge_graph
        self.task_registry = task_registry
        if self.task_registry and expertise_domains:
            capabilities = list(expertise_domains.keys())
            self.task_registry.register_agent(self.name, capabilities)
        
        self.conflict_resolver = conflict_resolver
        self.expertise_domains = expertise_domains or {}
        if self.conflict_resolver and self.expertise_domains:
            for domain, level in self.expertise_domains.items():
                self.conflict_resolver.set_expertise(domain, self.name, level)
        
        # Queue management
        self.message_queue = asyncio.Queue()
        self.task_queue = asyncio.Queue()
        
        # Running state
        self.running = False
        self.max_retries = 3
        self.retry_count = 0
        
        # Decision making
        self.thinking_strategy = thinking_strategy
        self.system_prompt = system_prompt or self._generate_default_system_prompt()
        
        # Message and task handlers
        self.message_handlers = {
            MessageType.QUERY: self._handle_query,
            MessageType.REQUEST: self._handle_request,
            MessageType.INFORM: self._handle_inform,
            MessageType.PROPOSE: self._handle_propose
        }
        
        # Initialize reasoning capabilities
        self.reasoning_strategies = {}
        self._setup_reasoning_strategies()
        
        # Set default system prompt if not provided
        self.system_prompt = system_prompt or self._generate_default_system_prompt()
    
    def _generate_default_system_prompt(self) -> str:
        """Generate a default system prompt based on the agent's role and capabilities"""
        prompt_parts = [
            f"You are an advanced AI agent named {self.name} with the role of {self.role.value}.",
            """You have access to tools, workflows, and can collaborate with other agents.
            Your goal is to provide helpful, accurate, and thoughtful responses."""
        ]
        
        # Add role-specific instructions
        if self.role == AgentRole.COORDINATOR:
            prompt_parts.append("""As a coordinator, your primary responsibility is to manage tasks, 
            delegate work to appropriate agents, and ensure smooth collaboration.
            You should maintain a high-level view of ongoing work and make decisions 
            about resource allocation and prioritization.""")
        elif self.role == AgentRole.PLANNER:
            prompt_parts.append("""As a planner, your primary responsibility is to create 
            detailed plans and strategies for achieving goals. You should break down 
            complex tasks into manageable steps and identify dependencies and risks.""")
        elif self.role == AgentRole.RESEARCHER:
            prompt_parts.append("""As a researcher, your primary responsibility is to 
            gather and analyze information on various topics. You should evaluate 
            sources, identify key insights, and synthesize information into useful knowledge.""")
        elif self.role == AgentRole.EXECUTOR:
            prompt_parts.append("""As an executor, your primary responsibility is to 
            implement plans and perform specific tasks. You should focus on efficiency, 
            accuracy, and delivering high-quality results.""")
        elif self.role == AgentRole.REVIEWER:
            prompt_parts.append("""As a reviewer, your primary responsibility is to 
            evaluate work and provide feedback. You should be critical but constructive, 
            identifying both strengths and areas for improvement.""")
        
        # Add thinking strategy guidance
        if self.thinking_strategy == ThinkingStrategy.REACTIVE:
            prompt_parts.append("""Focus on providing immediate responses based on the 
            current request without extensive deliberation.""")
        elif self.thinking_strategy == ThinkingStrategy.REFLECTIVE:
            prompt_parts.append("""Before responding, reflect on past experiences, relevant 
            context, and potential implications of your response.""")
        elif self.thinking_strategy == ThinkingStrategy.PLANNING:
            prompt_parts.append("""Approach problems by creating structured plans with 
            clear steps toward defined goals.""")
        elif self.thinking_strategy == ThinkingStrategy.CREATIVE:
            prompt_parts.append("""Emphasize novel, innovative approaches and solutions, 
            even if they are unconventional.""")
        elif self.thinking_strategy == ThinkingStrategy.CRITICAL:
            prompt_parts.append("""Carefully evaluate information, identify assumptions, 
            and consider alternative explanations and approaches.""")
        elif self.thinking_strategy == ThinkingStrategy.COLLABORATIVE:
            prompt_parts.append("""Prioritize effective collaboration with other agents, 
            sharing information and coordinating actions toward common goals.""")
        
        # Add expertise domains if available
        if self.expertise_domains:
            expertise_list = [f"{domain} (proficiency: {level:.1f})" 
                            for domain, level in self.expertise_domains.items()]
            prompt_parts.append(f"Your areas of expertise include: {', '.join(expertise_list)}")
        
        return "\n\n".join(prompt_parts)
        
    def _setup_reasoning_strategies(self):
        """Set up reasoning strategies based on thinking strategy"""
        # Set default reasoning mode based on thinking strategy
        default_mode = self.thinking_strategy.to_reasoning_mode()
        
        # Create reasoning strategies
        self.reasoning_strategies[default_mode] = ReasoningFactory.create_reasoning_strategy(
            reasoning_mode=default_mode,
            llm_provider=self.llm_provider
        )
        
        # Add additional reasoning strategies based on agent role and expertise
        if self.role == AgentRole.COORDINATOR or self.role == AgentRole.PLANNER:
            # Add tree reasoning for planning and coordination
            self.reasoning_strategies[ReasoningMode.TREE] = ReasoningFactory.create_reasoning_strategy(
                reasoning_mode=ReasoningMode.TREE,
                llm_provider=self.llm_provider
            )
        
        if self.role == AgentRole.RESEARCHER:
            # Add socratic reasoning for research
            self.reasoning_strategies[ReasoningMode.SOCRATIC] = ReasoningFactory.create_reasoning_strategy(
                reasoning_mode=ReasoningMode.SOCRATIC,
                llm_provider=self.llm_provider
            )
        
        if "critical_thinking" in self.expertise_domains:
            # Add reflective reasoning for critical thinking
            self.reasoning_strategies[ReasoningMode.REFLECTIVE] = ReasoningFactory.create_reasoning_strategy(
                reasoning_mode=ReasoningMode.REFLECTIVE,
                llm_provider=self.llm_provider
            )
    
    async def start(self) -> None:
        """Start the agent's message and task handling loops"""
        if self.running:
            logger.warning(f"Agent {self.name} is already running")
            return
            
        self.running = True
        
        # Start message handling loop
        asyncio.create_task(self._message_loop())
        
        # Start task handling loop
        asyncio.create_task(self._task_loop())
        
        logger.info(f"Agent {self.name} started")
    
    async def stop(self) -> None:
        """Stop the agent's message and task handling loops"""
        self.running = False
        
        # Unregister from collaboration systems
        if self.comm_protocol:
            self.comm_protocol.unregister_agent(self.name)
            
        if self.task_registry:
            self.task_registry.unregister_agent(self.name)
            
        logger.info(f"Agent {self.name} stopped")
    
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Process the input using LLM, tools, workflows, and collaboration"""
        try:
            # Check for special message types
            if "message" in input_data:
                # Handle incoming message from another agent
                message = input_data["message"]
                return await self._process_message(message)
            elif "task" in input_data:
                # Handle assigned task
                task = input_data["task"]
                return await self._process_task(task)
            elif "workflow" in input_data:
                # Handle workflow execution
                workflow_name = input_data["workflow"]
                workflow_context = input_data.get("context", {})
                return await self._execute_workflow(workflow_name, workflow_context)
            
            # Add input to conversation history
            content = input_data.get("content", "")
            self.add_message("user", content)
            
            # Check for direct tool invocation
            if self._should_use_tools(input_data):
                tool_result = await self._use_tools(input_data)
                if tool_result:
                    return tool_result
            
            # Check if we should use default reasoning
            if self.thinking_strategy in [ThinkingStrategy.REFLECTIVE, ThinkingStrategy.PLANNING, ThinkingStrategy.CRITICAL] and len(input_data.get("content", "")) > 100:
                # For complex inputs, use reasoning by default
                reasoning_mode = self.thinking_strategy.to_reasoning_mode()
                reasoning_result = await self._process_with_reasoning(input_data, reasoning_mode)
                return AgentResponse(content=reasoning_result.get("content", ""), metadata={"reasoning_used": True})
            
            # Generate response using LLM with appropriate thinking strategy
            response = await self._generate_response(input_data)
            
            # Store the interaction in memory
            self._remember_interaction(input_data, response)
            
            return response
            
        except Exception as e:
            logger.error(f"Error in {self.name}: {str(e)}", exc_info=True)
            return AgentResponse(
                content=f"Error: {str(e)}",
                metadata={"error": True, "error_message": str(e)}
            )
    
    async def _use_tools(self, input_data: Dict[str, Any]) -> Optional[AgentResponse]:
        """Use tools to process the input"""
        tool_name = input_data.get("tool")
        tool_params = input_data.get("parameters", {})
        
        if not tool_name:
            return None
            
        tool = self.tool_registry.get_tool(tool_name)
        if not tool:
            return AgentResponse(
                content=f"Tool '{tool_name}' not found",
                metadata={"error": True, "tool_error": "not_found"}
            )
        
        # Execute the tool
        result = await tool.execute(**tool_params)
        
        if result.status == ToolResultStatus.SUCCESS:
            self.add_message("tool", {
                "tool": tool_name,
                "result": result.result,
                "metadata": result.metadata
            })
            
            # Store the tool usage in memory
            self.memory_store.add(
                f"Used tool {tool_name} with params {tool_params}",
                {"tool": tool_name, "params": tool_params, "result": result.result}
            )
            
            return AgentResponse(
                content=result.result,
                metadata={"tool_used": tool_name, "result": result.metadata}
            )
        else:
            error_msg = f"Tool {tool_name} failed: {result.error}"
            self.add_message("error", error_msg)
            return AgentResponse(
                content=error_msg,
                metadata={"error": True, "tool_error": result.status}
            )
    
    async def _generate_response(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Generate a response based on input and context using LLM"""
        content = input_data.get("content", "")
        
        if not self.llm_provider:
            # Fallback if no LLM provider is available
            logger.warning(f"No LLM provider available for {self.name}, using echo fallback")
            return AgentResponse(
                content=f"I don't have an LLM provider configured. You said: {content}",
                metadata={"generated": False, "fallback": True}
            )
        
        # Retrieve relevant memories
        memories = self.memory_store.search(content, limit=5)
        memory_context = "\n".join([m.content for m in memories]) if memories else "No relevant memories found."
        
        # Get available tools
        available_tools = self.get_available_tools()
        tools_context = json.dumps(available_tools, indent=2) if available_tools else "No tools available."
        
        # Get active workflows
        active_workflows = []
        for workflow_id, context in self.active_workflows.items():
            active_workflows.append({
                "id": workflow_id,
                "name": context.workflow_name,
                "status": context.status.name,
                "current_step": context.current_step
            })
        workflows_context = json.dumps(active_workflows, indent=2) if active_workflows else "No active workflows."
        
        # Build the message for the LLM
        user_message = f"""{content}

[Context]
Memories: {memory_context}
Tools: {tools_context}
Workflows: {workflows_context}
"""
        
        # Format the thinking based on the chosen strategy
        thinking_prompt = ""
        if self.thinking_strategy == ThinkingStrategy.REFLECTIVE:
            thinking_prompt = """Before responding, reflect on the context and the query. 
            Consider what would be most helpful to the user based on the information available."""
        elif self.thinking_strategy == ThinkingStrategy.PLANNING:
            thinking_prompt = """Analyze this query as a problem to solve. What are the steps 
            needed to provide a comprehensive answer? Outline a plan before answering."""
        elif self.thinking_strategy == ThinkingStrategy.CREATIVE:
            thinking_prompt = """Consider novel or unconventional approaches to this query. 
            Think outside the box and explore creative possibilities."""
        elif self.thinking_strategy == ThinkingStrategy.CRITICAL:
            thinking_prompt = """Critically evaluate the information and assumptions in this query. 
            Consider potential issues or alternative perspectives before responding."""
        elif self.thinking_strategy == ThinkingStrategy.COLLABORATIVE:
            thinking_prompt = """Prioritize effective collaboration with other agents, 
            sharing information and coordinating actions toward common goals."""
        
        if thinking_prompt:
            user_message = f"{user_message}\n\n[Thinking Approach]\n{thinking_prompt}"
        
        # Generate response from LLM
        messages = [
            {"role": "user", "content": user_message}
        ]
        
        llm_response = await self.llm_provider.generate(
            messages=messages,
            system_prompt=self.system_prompt
        )
        
        # Add the response to conversation history
        self.add_message("assistant", llm_response.content)
        
        return AgentResponse(
            content=llm_response.content,
            metadata={
                "generated": True, 
                "memories_used": len(memories),
                "thinking_strategy": self.thinking_strategy.name,
                "llm_metadata": llm_response.metadata
            }
        )
    
    def _should_use_tools(self, input_data: Dict[str, Any]) -> bool:
        """Determine if tools should be used for this input"""
        # Direct tool invocation
        if "tool" in input_data and "parameters" in input_data:
            return True
            
        # Check for tool references in content
        if "content" in input_data:
            content = input_data["content"].lower()
            
            # Get all tool names
            tool_names = [tool.name.lower() for tool in self.tool_registry.get_tools().values()]
            
            # Check if any tool name is mentioned
            for tool_name in tool_names:
                if tool_name in content and ("use" in content or "run" in content or "execute" in content):
                    return True
        
        return False
    
    def _remember_interaction(self, input_data: Dict[str, Any], response: AgentResponse) -> None:
        """Store the interaction in memory"""
        self.memory_store.add(
            f"User: {input_data.get('content', '')}",
            {"type": "user_input", "content": input_data}
        )
        self.memory_store.add(
            f"Assistant: {response.content}",
            {"type": "assistant_response", "content": response.content}
        )
    
    async def _process_with_reasoning(self, input_data: Dict[str, Any], reasoning_mode: ReasoningMode) -> Dict[str, Any]:
        """Process input data using a specific reasoning strategy"""
        # Check if we have the specified reasoning strategy
        if reasoning_mode not in self.reasoning_strategies:
            # Create it on demand
            self.reasoning_strategies[reasoning_mode] = ReasoningFactory.create_reasoning_strategy(
                reasoning_mode=reasoning_mode,
                llm_provider=self.llm_provider
            )
        
        # Extract the problem statement
        problem = input_data.get("content", "")
        if not problem and "problem" in input_data:
            problem = input_data["problem"]
        
        # Extract context
        context = input_data.get("context", {})
        
        # Add agent expertise to context
        context["agent_role"] = self.role.name
        context["agent_name"] = self.name
        context["thinking_strategy"] = self.thinking_strategy.name
        context["expertise_domains"] = self.expertise_domains
        
        # Execute reasoning
        logger.info(f"Agent {self.name} reasoning about problem using {reasoning_mode.name} strategy")
        reasoning_chain = await self.reasoning_strategies[reasoning_mode].reason(
            problem=problem,
            context=context,
            max_steps=input_data.get("max_steps", 5)
        )
        
        # Extract conclusion
        conclusion = ""
        for step in reversed(reasoning_chain.steps):
            if step.step_type in ["conclusion", "synthesis", "evaluation"]:
                conclusion = step.content
                break
        
        if not conclusion and reasoning_chain.steps:
            # Use the last step if no conclusion was found
            conclusion = reasoning_chain.steps[-1].content
        
        # Add reasoning to memory
        if self.memory_store:
            self.memory_store.add_memory(
                agent_id=self.agent_id,
                memory_type="reasoning",
                content=reasoning_chain.to_text(),
                metadata={
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "reasoning_mode": reasoning_mode.name,
                    "problem": problem
                }
            )
        
        return {
            "content": conclusion,
            "metadata": {
                "reasoning_chain": reasoning_chain.to_dict(),
                "reasoning_mode": reasoning_mode.name
            },
            "success": True
        }
    
    async def reason_about_problem(self, problem: str, reasoning_mode: Optional[ReasoningMode] = None, context: Optional[Dict[str, Any]] = None) -> ReasoningChain:
        """Reason about a problem using a specific reasoning strategy"""
        # Use default reasoning mode if none specified
        if reasoning_mode is None:
            reasoning_mode = self.thinking_strategy.to_reasoning_mode()
        
        # Check if we have the specified reasoning strategy
        if reasoning_mode not in self.reasoning_strategies:
            # Create it on demand
            self.reasoning_strategies[reasoning_mode] = ReasoningFactory.create_reasoning_strategy(
                reasoning_mode=reasoning_mode,
                llm_provider=self.llm_provider
            )
        
        # Set up context
        context = context or {}
        context["agent_role"] = self.role.name
        context["agent_name"] = self.name
        context["thinking_strategy"] = self.thinking_strategy.name
        context["expertise_domains"] = self.expertise_domains
        
        # Execute reasoning
        logger.info(f"Agent {self.name} reasoning about problem using {reasoning_mode.name} strategy")
        reasoning_chain = await self.reasoning_strategies[reasoning_mode].reason(
            problem=problem,
            context=context
        )
        
        return reasoning_chain
    
    async def _message_loop(self) -> None:
        """Background loop for processing incoming messages"""
        while self.running:
            try:
                if not self.comm_protocol:
                    await asyncio.sleep(1)
                    continue
                    
                # Try to receive a message
                message = await self.comm_protocol.receive_message(self.name, timeout=1.0)
                if message:
                    # Put the message in the queue for processing
                    await self.message_queue.put(message)
                    logger.debug(f"Agent {self.name} received message from {message.sender}")
                    
            except Exception as e:
                logger.error(f"Error in message loop: {str(e)}", exc_info=True)
                await asyncio.sleep(1)
    
    async def _task_loop(self) -> None:
        """Background loop for processing assigned tasks"""
        while self.running:
            try:
                if not self.task_registry:
                    await asyncio.sleep(1)
                    continue
                    
                # Check for task updates
                updated = await self.task_registry.wait_for_updates(timeout=1.0)
                if updated:
                    # Check for tasks assigned to this agent
                    tasks = self.task_registry.get_agent_tasks(self.name)
                    for task in tasks:
                        if task.status == TaskStatus.ASSIGNED:
                            # Put the task in the queue for processing
                            await self.task_queue.put(task)
                            logger.info(f"Agent {self.name} received task: {task.title}")
                            
                            # Mark the task as in progress
                            self.task_registry.start_task(task.id)
                    
            except Exception as e:
                logger.error(f"Error in task loop: {str(e)}", exc_info=True)
                await asyncio.sleep(1)
    
    async def _handle_query(self, message) -> Dict[str, Any]:
        """Handle a query message from another agent"""
        query = message.content.get("query", "")
        context = message.content.get("context", {})
        
        # Process the query using the LLM
        input_data = {
            "content": query,
            "context": context,
            "sender": message.sender
        }
        
        response = await self.process(input_data)
        
        # Send a response message
        if self.comm_protocol:
            reply = message.create_reply(
                content={"answer": response.content, "metadata": response.metadata},
                message_type=MessageType.RESPONSE
            )
            await self.comm_protocol.send_message(reply)
            
        return response.dict() if hasattr(response, "dict") else {"content": response.content, "metadata": response.metadata}
    
    async def _handle_request(self, message) -> Dict[str, Any]:
        """Handle a request message from another agent"""
        action = message.content.get("action", "")
        parameters = message.content.get("parameters", {})
        
        # Process the request
        if action == "execute_workflow" and "workflow_name" in parameters:
            # Execute a workflow
            workflow_name = parameters["workflow_name"]
            workflow_context = parameters.get("context", {})
            
            response = await self.process({
                "workflow": workflow_name,
                "context": workflow_context
            })
        elif action == "use_tool" and "tool_name" in parameters:
            # Use a tool
            tool_name = parameters["tool_name"]
            tool_params = parameters.get("tool_params", {})
            
            input_data = {
                "tool": tool_name,
                "parameters": tool_params
            }
            
            response = await self.process(input_data)
        else:
            # Process the request using the LLM
            input_data = {
                "content": f"Perform the action: {action}",
                "parameters": parameters,
                "sender": message.sender
            }
            
            response = await self.process(input_data)
        
        # Send a response message
        if self.comm_protocol:
            reply = message.create_reply(
                content={"result": response.content, "metadata": response.metadata},
                message_type=MessageType.RESPONSE
            )
            await self.comm_protocol.send_message(reply)
            
        return response.dict() if hasattr(response, "dict") else {"content": response.content, "metadata": response.metadata}
    
    async def _handle_inform(self, message) -> Dict[str, Any]:
        """Handle an inform message from another agent"""
        # Check if this is a special action
        if "action" in message.content:
            action = message.content["action"]
            
            # Task assignment
            if action == "task_assigned" and "task_id" in message.content:
                task_id = message.content["task_id"]
                if self.task_registry:
                    task = self.task_registry.get_task(task_id)
                    if task:
                        await self.task_queue.put(task)
                        return {
                            "content": f"Received task assignment: {task.title}",
                            "metadata": {"task_id": task_id}
                        }
            
            # Conflict raised
            elif action == "conflict_raised" and "conflict_id" in message.content:
                conflict_id = message.content["conflict_id"]
                if self.conflict_resolver:
                    conflict = self.conflict_resolver.get_conflict(conflict_id)
                    if conflict:
                        # Let the LLM decide which option to vote for
                        input_data = {
                            "content": f"Please vote on the following conflict:\n{conflict.description}",
                            "conflict": conflict.dict(),
                            "options": conflict.options
                        }
                        
                        response = await self.process(input_data)
                        
                        # Try to extract the chosen option from the response
                        option_id = None
                        for opt_id in conflict.options.keys():
                            if opt_id in response.content:
                                option_id = opt_id
                                break
                                
                        if option_id:
                            self.conflict_resolver.vote(conflict_id, self.name, option_id)
                            return {
                                "content": f"Voted for option {option_id} in conflict {conflict_id}",
                                "metadata": {"conflict_id": conflict_id, "option_id": option_id}
                            }
                        
                        return {
                            "content": f"Received conflict but couldn't determine which option to vote for",
                            "metadata": {"conflict_id": conflict_id}
                        }
        
        # Regular inform message
        topic = message.content.get("topic", "General Information")
        info = message.content.get("info", {})
        
        # Process the information using the LLM
        input_data = {
            "content": f"New information on topic: {topic}",
            "info": info,
            "sender": message.sender
        }
        
        response = await self.process(input_data)
        
        return {
            "content": f"Acknowledged information from {message.sender} on topic: {topic}",
            "metadata": {"message_id": message.id}
        }
    
    async def _handle_propose(self, message) -> Dict[str, Any]:
        """Handle a proposal message from another agent"""
        proposal = message.content.get("proposal", {})
        
        # Process the proposal using the LLM
        input_data = {
            "content": f"Consider the following proposal from {message.sender}",
            "proposal": proposal,
            "sender": message.sender
        }
        
        response = await self.process(input_data)
        
        # Determine whether to accept or reject
        accept = "accept" in response.content.lower()
        
        # Send a response message
        if self.comm_protocol:
            reply_type = MessageType.ACCEPT if accept else MessageType.REJECT
            reason = response.content
            
            reply = message.create_reply(
                content={"reason": reason, "metadata": response.metadata},
                message_type=reply_type
            )
            await self.comm_protocol.send_message(reply)
            
        return {
            "content": f"{'Accepted' if accept else 'Rejected'} proposal from {message.sender}",
            "metadata": {"message_id": message.id, "accepted": accept}
        }
    
    async def handle_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle incoming messages"""
        if message["type"] == MessageType.QUERY:
            return await self._handle_query(message)
        elif message["type"] == MessageType.REQUEST:
            return await self._handle_request(message)
        elif message["type"] == MessageType.INFORM:
            return await self._handle_inform(message)
        elif message["type"] == MessageType.PROPOSE:
            return await self._handle_propose(message)
        else:
            logger.warning(f"Unknown message type: {message['type']}")
            return None
    
    async def add_knowledge(self, 
                          entity_name: str,
                          entity_type: EntityType,
                          properties: Dict[str, Any],
                          confidence: float = 1.0) -> Optional[str]:
        """Add knowledge to the shared knowledge graph"""
        if not self.knowledge_graph:
            logger.warning(f"Agent {self.name} has no knowledge graph")
            return None
            
        entity = Entity(
            name=entity_name,
            type=entity_type,
            properties=properties,
            confidence=confidence,
            source=self.name
        )
        
        entity_id = self.knowledge_graph.add_entity(entity)
        return entity_id
    
    async def add_relationship(self,
                             source_name: str,
                             target_name: str,
                             relationship_type: RelationshipType,
                             properties: Optional[Dict[str, Any]] = None,
                             bidirectional: bool = False) -> Optional[str]:
        """Add a relationship to the shared knowledge graph"""
        if not self.knowledge_graph:
            logger.warning(f"Agent {self.name} has no knowledge graph")
            return None
            
        # Get the entities
        source_entity = self.knowledge_graph.get_entity_by_name(source_name)
        if not source_entity:
            logger.warning(f"Source entity {source_name} not found")
            return None
            
        target_entity = self.knowledge_graph.get_entity_by_name(target_name)
        if not target_entity:
            logger.warning(f"Target entity {target_name} not found")
            return None
            
        # Create the relationship
        relationship = Relationship(
            source_id=source_entity.id,
            target_id=target_entity.id,
            type=relationship_type,
            properties=properties or {},
            bidirectional=bidirectional,
            source_agent=self.name
        )
        
        relationship_id = self.knowledge_graph.add_relationship(relationship)
        return relationship_id
    
    async def raise_conflict(self,
                           description: str,
                           conflict_type: ConflictType,
                           resolution_strategy: ResolutionStrategy,
                           options: Dict[str, Dict[str, Any]],
                           participants: List[str],
                           domain: Optional[str] = None) -> Optional[str]:
        """Raise a conflict for resolution"""
        if not self.conflict_resolver:
            logger.warning(f"Agent {self.name} has no conflict resolver")
            return None
            
        conflict = Conflict(
            type=conflict_type,
            description=description,
            resolution_strategy=resolution_strategy,
            participants=participants,
            context={"domain": domain} if domain else {}
        )
        
        # Add options
        for agent_id, option_data in options.items():
            conflict.add_option(self.name, option_data)
            
        conflict_id = self.conflict_resolver.create_conflict(conflict)
        
        # Notify participants if communication protocol is available
        if self.comm_protocol:
            for participant in participants:
                if participant != self.name:
                    await self.send_message(
                        recipient=participant,
                        content={
                            "action": "conflict_raised",
                            "conflict_id": conflict_id,
                            "conflict": conflict.dict()
                        },
                        message_type=MessageType.INFORM
                    )
        
        return conflict_id
    
    async def vote_on_conflict(self, conflict_id: str, option_id: str) -> bool:
        """Vote on a conflict option"""
        if not self.conflict_resolver:
            logger.warning(f"Agent {self.name} has no conflict resolver")
            return False
            
        return self.conflict_resolver.vote(conflict_id, self.name, option_id)
