from typing import Dict, Any, List, Optional, Type, Union
from ..core.agent import BaseAgent, AgentRole, AgentResponse, AgentState
from ..core.tools import ToolRegistry, Tool, ToolExecutionResult, ToolResultStatus
from ..core.memory import MemoryStore
from ..core.llm import BaseLLMProvider, LLMFactory, LLMResponse
import logging
import json
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class IntelligentAgent(BaseAgent):
    """
    Intelligent agent that uses LLM for decision making and processing.
    
    This agent combines tool usage, memory, and LLM capabilities to provide
    intelligent responses and actions.
    """
    
    def __init__(
        self, 
        role: AgentRole,
        name: str,
        llm_provider: Optional[BaseLLMProvider] = None,
        llm_provider_config: Optional[Dict[str, Any]] = None,
        tool_registry: Optional[ToolRegistry] = None,
        memory_store: Optional[MemoryStore] = None,
        system_prompt: Optional[str] = None
    ):
        super().__init__(role=role, name=name)
        
        # Set up LLM provider
        if llm_provider:
            self.llm = llm_provider
        elif llm_provider_config:
            provider_type = llm_provider_config.pop("provider_type", "openai")
            model_name = llm_provider_config.get("model_name")
            
            # Use the specified provider and model
            self.llm = LLMFactory.create_provider(provider_type, **llm_provider_config)
        else:
            # Check for environment variables
            model_name = os.getenv("MODEL_NAME")
            ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            
            # Default to OpenAI if API key available, otherwise use local provider
            if os.getenv("OPENAI_API_KEY"):
                self.llm = LLMFactory.create_provider("openai", model_name=model_name)
            else:
                self.llm = LLMFactory.create_provider("local", 
                                                    model_name=model_name or "gemma3",
                                                    base_url=ollama_base_url)
        
        # Set up tools and memory
        self.tool_registry = tool_registry or ToolRegistry()
        self.memory_store = memory_store or MemoryStore()
        
        # Set default system prompt if none provided
        self.system_prompt = system_prompt or self._get_default_system_prompt()
        
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Process the input using the LLM to generate responses"""
        try:
            # Add input to conversation history
            content = input_data.get("content", "")
            self.add_message("user", content)
            
            # Check for direct tool invocation keywords
            # For specific tasks that should use tools directly without LLM involvement
            if self._should_invoke_tool_directly(content):
                tool_response = await self._handle_direct_tool_invocation(content)
                if tool_response:
                    return tool_response
            
            # Prepare context for the LLM
            context = self._prepare_context(input_data)
            
            # Retrieve relevant memories
            memories = self._retrieve_relevant_memories(content)
            memory_context = self._format_memories_for_llm(memories)
            
            # Build the messages for the LLM
            messages = self._build_llm_messages(content, context, memory_context)
            
            # Check if we should use tools
            if self.tool_registry.get_tools():
                response = await self._process_with_tools(messages)
            else:
                response = await self._process_without_tools(messages)
            
            # Remember this interaction
            self._remember_interaction(content, response.content)
            
            # Determine next agent
            next_agent = self._determine_next_agent(response, input_data)
            
            return AgentResponse(
                content=response.content,
                metadata=response.metadata,
                next_agent=next_agent
            )
            
        except Exception as e:
            logger.error(f"Error in intelligent agent: {str(e)}", exc_info=True)
            return AgentResponse(
                content=f"Error processing input: {str(e)}",
                metadata={"error": True, "error_message": str(e)}
            )
    
    async def _process_with_tools(self, messages: List[Dict[str, str]]) -> LLMResponse:
        """Process with tool calling capability"""
        # Convert tools to format expected by LLMs
        tools = self._prepare_tools_for_llm()
        
        # Generate with tools
        response = await self.llm.generate_with_tools(
            messages=messages,
            tools=tools,
            system_prompt=self.system_prompt
        )
        
        # Handle tool calls if any
        tool_calls = response.get("tool_calls", [])
        if tool_calls:
            # Execute tools and build a response with results
            tool_results = await self._execute_tool_calls(tool_calls)
            
            # Add tool results to messages and generate a final response
            for result in tool_results:
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [result["tool_call"]]
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": result["tool_call"]["id"],
                    "content": result["result"]
                })
            
            # Generate final response with tool results
            final_response = await self.llm.generate(
                messages=messages,
                system_prompt=self.system_prompt
            )
            return final_response
        else:
            # No tool calls, just return the content
            return LLMResponse(
                content=response["content"],
                metadata=response["metadata"]
            )
    
    async def _process_without_tools(self, messages: List[Dict[str, str]]) -> LLMResponse:
        """Process without tool calling"""
        return await self.llm.generate(
            messages=messages,
            system_prompt=self.system_prompt
        )
    
    async def _execute_tool_calls(self, tool_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute tool calls and return results"""
        results = []
        
        for call in tool_calls:
            if call["type"] != "function":
                continue
                
            function = call["function"]
            tool_name = function["name"]
            
            try:
                # Parse arguments
                arguments = json.loads(function["arguments"])
                
                # Get and execute the tool
                tool = self.tool_registry.get_tool(tool_name)
                if tool:
                    execution_result = await tool.execute(**arguments)
                    
                    # Format the result
                    if execution_result.status == ToolResultStatus.SUCCESS:
                        result_str = json.dumps(execution_result.result)
                    else:
                        result_str = f"Error: {execution_result.error}"
                else:
                    result_str = f"Error: Tool '{tool_name}' not found"
                    
                results.append({
                    "tool_call": call,
                    "result": result_str
                })
                
            except json.JSONDecodeError:
                results.append({
                    "tool_call": call,
                    "result": "Error: Invalid tool arguments"
                })
            except Exception as e:
                results.append({
                    "tool_call": call,
                    "result": f"Error executing tool: {str(e)}"
                })
        
        return results
    
    def _prepare_context(self, input_data: Dict[str, Any]) -> str:
        """Prepare context information for the LLM"""
        # Extract relevant information from input_data
        context_items = []
        
        # Add date and time
        context_items.append(f"Current date and time: {datetime.now(timezone.utc).isoformat()}")
        
        # Add agent role information
        context_items.append(f"Your role: {self.role.value}")
        
        # Add any additional context from input_data
        for key, value in input_data.items():
            if key not in ["content", "timestamp"]:
                if isinstance(value, dict) or isinstance(value, list):
                    context_items.append(f"{key}: {json.dumps(value)}")
                else:
                    context_items.append(f"{key}: {value}")
        
        return "\n".join(context_items)
    
    def _retrieve_relevant_memories(self, query: str) -> List[Any]:
        """Retrieve memories relevant to the query"""
        return self.memory_store.search(query, limit=5)
    
    def _format_memories_for_llm(self, memories: List[Any]) -> str:
        """Format memories for inclusion in LLM context"""
        if not memories:
            return ""
            
        memory_items = ["# Relevant Memories:"]
        for memory in memories:
            memory_items.append(f"- {memory.content}")
        
        return "\n".join(memory_items)
    
    def _build_llm_messages(self, content: str, context: str, memory_context: str) -> List[Dict[str, str]]:
        """Build the messages to send to the LLM"""
        # Start with conversation history
        messages = []
        for message in self.state.messages[-10:]:  # Only use the last 10 messages
            messages.append({
                "role": message["role"],
                "content": message["content"]
            })
        
        # If the history doesn't include the current message, add it
        if not messages or messages[-1]["content"] != content:
            messages.append({
                "role": "user",
                "content": content
            })
        
        # Enhance the last user message with context if available
        if context or memory_context:
            enhanced_content = messages[-1]["content"]
            
            if context:
                enhanced_content += f"\n\n{context}"
            
            if memory_context:
                enhanced_content += f"\n\n{memory_context}"
                
            messages[-1]["content"] = enhanced_content
        
        return messages
    
    def _remember_interaction(self, user_input: str, response: str) -> None:
        """Remember the interaction in memory"""
        self.memory_store.add(
            f"User: {user_input}",
            {"type": "user_input", "content": user_input}
        )
        self.memory_store.add(
            f"Assistant ({self.name}): {response}",
            {"type": "assistant_response", "content": response}
        )
    
    def _should_invoke_tool_directly(self, content: str) -> bool:
        """Check if the user input should directly invoke a tool without LLM"""
        # List of direct invocation keywords and their matching tools
        direct_invocations = {
            "check the time": "get_current_time",
            "what time is it": "get_current_time",
            "current time": "get_current_time",
            "calculate": "calculator",
            "compute": "calculator"
        }
        
        content_lower = content.lower()
        return any(keyword in content_lower for keyword in direct_invocations)
    
    async def _handle_direct_tool_invocation(self, content: str) -> Optional[AgentResponse]:
        """Handle direct tool invocation based on keywords"""
        content_lower = content.lower()
        
        # Check for time-related queries
        if any(phrase in content_lower for phrase in ["time", "what time", "current time"]):
            time_tool = self.tool_registry.get_tool("get_current_time")
            if time_tool:
                # Get timezone from content if specified
                timezone = "UTC"  # Default timezone
                
                # Execute the tool
                result = await time_tool.execute(timezone=timezone)
                if result.status == ToolResultStatus.SUCCESS:
                    time_info = result.result
                    response_text = f"The current time is {time_info['time']} ({time_info['timezone']}).\n\nUTC Offset: {time_info['utc_offset']} hours"
                    return AgentResponse(
                        content=response_text,
                        metadata={"tool_used": "get_current_time", "result": result.result}
                    )
        
        # Check for calculation queries
        if any(phrase in content_lower for phrase in ["calculate", "compute"]):
            calc_tool = self.tool_registry.get_tool("calculator")
            if calc_tool:
                # Try to extract the expression from the content
                # This is a very simple extraction - would need more robust parsing in production
                expression = content.split("calculate", 1)[-1].strip()
                if not expression:
                    expression = content.split("compute", 1)[-1].strip()
                
                if expression:
                    result = await calc_tool.execute(expression=expression)
                    if result.status == ToolResultStatus.SUCCESS:
                        return AgentResponse(
                            content=f"Result: {result.result}",
                            metadata={"tool_used": "calculator", "result": result.result}
                        )
        
        # No direct tool invocation matched or succeeded
        return None
    
    def _determine_next_agent(self, response: LLMResponse, input_data: Dict[str, Any]) -> Optional[str]:
        """Determine the next agent to handle the task"""
        # Check if input_data specifies a next agent
        if "next_agent" in input_data:
            return input_data["next_agent"]
            
        # Default to None (no next agent)
        return None
    
    def _prepare_tools_for_llm(self) -> List[Dict[str, Any]]:
        """Prepare tools in format expected by LLMs"""
        llm_tools = []
        
        for tool in self.tool_registry.get_tools().values():
            tool_def = tool.definition.to_dict()
            llm_tools.append({
                "type": "function",
                "function": {
                    "name": tool_def["name"],
                    "description": tool_def["description"],
                    "parameters": tool_def["parameters"]
                }
            })
            
        return llm_tools
    
    def _get_default_system_prompt(self) -> str:
        """Get the default system prompt based on agent role"""
        role_prompts = {
            AgentRole.PLANNER: """You are a Planning Agent responsible for creating and managing project plans.
Your tasks include breaking down complex projects, estimating timelines, and prioritizing tasks.
Always be thorough and consider edge cases in your planning.""",

            AgentRole.RESEARCHER: """You are a Research Agent tasked with finding and analyzing information.
Your job is to gather relevant information, compare options, and provide well-supported recommendations.
Be objective and comprehensive in your research.""",

            AgentRole.EXECUTOR: """You are an Executor Agent responsible for implementing solutions.
Your job is to write code, fix bugs, and execute tasks according to specifications.
Be precise and efficient in your work.""",

            AgentRole.REVIEWER: """You are a Review Agent responsible for quality assurance.
Your job is to check work for errors, suggest improvements, and ensure standards are met.
Be thorough and constructive in your feedback.""",

            AgentRole.COORDINATOR: """You are a Coordinator Agent responsible for managing workflows between other agents.
Your job is to delegate tasks, track progress, and ensure smooth collaboration.
Be organized and proactive in your coordination."""
        }
        
        return role_prompts.get(self.role, 
            """You are an Intelligent Agent assisting with various tasks.
Respond to user queries clearly and helpfully, using available tools when appropriate.
Always provide well-reasoned and accurate information.""")
    
    def register_tool(self, tool: Tool) -> None:
        """Register a new tool with this agent"""
        self.tool_registry.register(tool)
