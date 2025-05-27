"""
Tool use capabilities for NocturneAI agents.

This module implements capabilities for agents to interact with tools,
including MCP-based tools and other external systems.
"""

import asyncio
import logging
import inspect
import json
from typing import Dict, Any, List, Optional, Set, Callable, Union
import uuid
from datetime import datetime

from ..core.types import AgentCapability, MessageType, Message
from .base import ToolUseCapability

logger = logging.getLogger(__name__)


class MCPToolUse(ToolUseCapability):
    """
    Tool use capability for MCP server integration.
    
    This capability enables an agent to use tools provided by MCP servers,
    with dynamic tool discovery, invocation, and result handling.
    """
    
    CAPABILITY = AgentCapability.TOOL_USE
    
    def __init__(self, **config):
        """
        Initialize the MCP tool use capability.
        
        Args:
            **config: Configuration parameters
                mcp_servers: List of MCP server names to enable (default: all available)
                auto_discover: Whether to auto-discover tools on initialization (default: True)
                tool_context_window: Number of recent tool calls to include in context (default: 5)
                max_tool_history: Maximum number of tool calls to store in history (default: 100)
        """
        super().__init__(**config)
        self.mcp_servers = config.get('mcp_servers', [])
        self.auto_discover = config.get('auto_discover', True)
        self.tool_context_window = config.get('tool_context_window', 5)
        self.max_tool_history = config.get('max_tool_history', 100)
        
        # Tool registry and history
        self.tools: Dict[str, Dict[str, Any]] = {}
        self.tool_history: List[Dict[str, Any]] = []
        self.server_connections = {}
    
    async def initialize(self, agent) -> None:
        """Initialize the capability with the agent"""
        await super().initialize(agent)
        
        if self.auto_discover:
            await self.discover_tools()
    
    async def discover_tools(self) -> int:
        """
        Discover available tools from MCP servers.
        
        Returns:
            Number of tools discovered
        """
        from ...mcp.servers import get_available_servers, get_server
        
        # Get available servers
        available_servers = get_available_servers()
        
        # Filter servers if specific ones are configured
        if self.mcp_servers:
            servers_to_use = [s for s in available_servers if s in self.mcp_servers]
        else:
            servers_to_use = available_servers
        
        count = 0
        
        # Connect to each server and discover tools
        for server_name in servers_to_use:
            try:
                server = get_server(server_name)
                if not server:
                    logger.warning(f"MCP server '{server_name}' not found")
                    continue
                
                # Store server connection
                self.server_connections[server_name] = server
                
                # Get server's tools
                server_tools = await server.get_tools()
                
                # Register each tool
                for tool in server_tools:
                    tool_name = f"{server_name}_{tool['name']}"
                    
                    self.tools[tool_name] = {
                        'name': tool_name,
                        'description': tool.get('description', ''),
                        'server': server_name,
                        'original_name': tool['name'],
                        'parameters': tool.get('parameters', {}),
                        'returns': tool.get('returns', {}),
                        'metadata': tool.get('metadata', {})
                    }
                    
                    count += 1
                    logger.debug(f"Registered tool '{tool_name}' from server '{server_name}'")
            
            except Exception as e:
                logger.error(f"Error discovering tools from server '{server_name}': {str(e)}", exc_info=True)
        
        logger.info(f"Discovered {count} tools from {len(servers_to_use)} MCP servers")
        return count
    
    async def use_tool(self, tool_name: str, **parameters) -> Any:
        """
        Use a tool with the given parameters.
        
        Args:
            tool_name: Name of the tool to use
            **parameters: Parameters for the tool
            
        Returns:
            Result of the tool execution
        """
        # Check if tool exists
        if tool_name not in self.tools:
            raise ValueError(f"Tool '{tool_name}' not found")
        
        tool = self.tools[tool_name]
        server_name = tool['server']
        original_name = tool['original_name']
        
        # Get server connection
        server = self.server_connections.get(server_name)
        if not server:
            raise ValueError(f"MCP server '{server_name}' not connected")
        
        start_time = datetime.now()
        
        try:
            # Invoke tool
            result = await server.invoke_tool(original_name, parameters)
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Record in history
            history_entry = {
                'id': str(uuid.uuid4()),
                'tool_name': tool_name,
                'parameters': parameters,
                'result': result,
                'success': True,
                'timestamp': start_time.isoformat(),
                'duration': duration
            }
            
            self._add_to_history(history_entry)
            
            logger.info(f"Tool '{tool_name}' executed successfully in {duration:.2f}s")
            return result
            
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Record error in history
            history_entry = {
                'id': str(uuid.uuid4()),
                'tool_name': tool_name,
                'parameters': parameters,
                'error': str(e),
                'success': False,
                'timestamp': start_time.isoformat(),
                'duration': duration
            }
            
            self._add_to_history(history_entry)
            
            logger.error(f"Error executing tool '{tool_name}': {str(e)}", exc_info=True)
            raise
    
    async def register_tool(self, tool_name: str, tool_function: Callable, description: str) -> bool:
        """
        Register a custom tool for use by the agent.
        
        Args:
            tool_name: Name of the tool
            tool_function: Function implementing the tool
            description: Description of the tool
            
        Returns:
            True if the tool was registered, False otherwise
        """
        if tool_name in self.tools:
            logger.warning(f"Tool '{tool_name}' already registered")
            return False
        
        # Extract parameter information from function
        signature = inspect.signature(tool_function)
        parameters = {}
        
        for param_name, param in signature.parameters.items():
            # Skip self and cls parameters
            if param_name in ('self', 'cls'):
                continue
                
            # Get parameter type and default value
            param_type = 'any'
            if param.annotation != inspect.Parameter.empty:
                param_type = str(param.annotation)
            
            has_default = param.default != inspect.Parameter.empty
            default_value = param.default if has_default else None
            
            parameters[param_name] = {
                'type': param_type,
                'required': not has_default,
                'default': default_value
            }
        
        # Register the tool
        self.tools[tool_name] = {
            'name': tool_name,
            'description': description,
            'server': 'custom',
            'original_name': tool_name,
            'parameters': parameters,
            'function': tool_function,
            'metadata': {
                'custom': True
            }
        }
        
        logger.info(f"Registered custom tool '{tool_name}'")
        return True
    
    def list_tools(self) -> List[Dict[str, Any]]:
        """
        List all tools available to the agent.
        
        Returns:
            List of tool descriptions
        """
        return [
            {
                'name': tool_name,
                'description': tool_info['description'],
                'server': tool_info['server'],
                'parameters': tool_info['parameters'],
                'metadata': tool_info.get('metadata', {})
            }
            for tool_name, tool_info in self.tools.items()
        ]
    
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific tool.
        
        Args:
            tool_name: Name of the tool
            
        Returns:
            Tool information, or None if not found
        """
        return self.tools.get(tool_name)
    
    def get_tool_history(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get the history of tool usage.
        
        Args:
            limit: Optional limit on number of entries to return
            
        Returns:
            List of tool usage history entries
        """
        if limit is None:
            return self.tool_history
        return self.tool_history[-limit:]
    
    def get_tool_context(self) -> str:
        """
        Get a string representation of recent tool usage for context.
        
        Returns:
            String with recent tool usage context
        """
        recent = self.tool_history[-self.tool_context_window:]
        
        if not recent:
            return "No recent tool usage."
        
        context = "Recent tool usage:\n"
        
        for entry in recent:
            tool_name = entry['tool_name']
            params = ', '.join(f"{k}={v}" for k, v in entry['parameters'].items())
            success = entry['success']
            
            if success:
                result = entry.get('result')
                if isinstance(result, dict) and len(str(result)) > 100:
                    result = f"{len(result)} items"
                context += f"- {tool_name}({params}) -> {result}\n"
            else:
                error = entry.get('error', 'Unknown error')
                context += f"- {tool_name}({params}) -> ERROR: {error}\n"
        
        return context
    
    def _add_to_history(self, entry: Dict[str, Any]) -> None:
        """Add an entry to the tool usage history"""
        self.tool_history.append(entry)
        
        # Trim history if needed
        if len(self.tool_history) > self.max_tool_history:
            self.tool_history = self.tool_history[-self.max_tool_history:]
    
    async def cleanup(self) -> None:
        """Clean up the capability"""
        # Close server connections
        for server_name, server in self.server_connections.items():
            try:
                if hasattr(server, 'close') and callable(server.close):
                    await server.close()
            except Exception as e:
                logger.error(f"Error closing connection to server '{server_name}': {str(e)}", exc_info=True)
        
        # Clear data
        self.server_connections.clear()
        
        await super().cleanup()


class ToolChain(ToolUseCapability):
    """
    Tool chaining capability for complex operations.
    
    This capability enables an agent to chain multiple tool calls together
    to perform complex operations, with automatic handling of intermediate results.
    """
    
    CAPABILITY = AgentCapability.TOOL_USE
    
    def __init__(self, **config):
        """
        Initialize the tool chain capability.
        
        Args:
            **config: Configuration parameters
                base_tool_capability: Name of the base tool capability to use (default: 'MCPToolUse')
                max_chain_length: Maximum number of steps in a chain (default: 10)
                max_chain_history: Maximum number of chains to store in history (default: 20)
        """
        super().__init__(**config)
        self.base_tool_capability_name = config.get('base_tool_capability', 'MCPToolUse')
        self.max_chain_length = config.get('max_chain_length', 10)
        self.max_chain_history = config.get('max_chain_history', 20)
        
        self.base_tool_capability = None
        self.chain_history = []
    
    async def initialize(self, agent) -> None:
        """Initialize the capability with the agent"""
        await super().initialize(agent)
        
        # Find the base tool capability
        for cap_type in agent.capabilities:
            if cap_type == AgentCapability.TOOL_USE:
                for module in agent.capability_modules.get(cap_type, []):
                    if module.__class__.__name__ == self.base_tool_capability_name:
                        self.base_tool_capability = module
                        logger.info(f"Using {self.base_tool_capability_name} as base tool capability")
                        break
        
        if not self.base_tool_capability:
            logger.warning(f"Base tool capability {self.base_tool_capability_name} not found")
    
    async def use_tool(self, tool_name: str, **parameters) -> Any:
        """
        Use a tool with the given parameters.
        
        If the tool name starts with 'chain:', it will be treated as a chain definition.
        Otherwise, it will be forwarded to the base tool capability.
        
        Args:
            tool_name: Name of the tool to use
            **parameters: Parameters for the tool
            
        Returns:
            Result of the tool execution
        """
        # Check if this is a chain
        if tool_name.startswith('chain:'):
            chain_name = tool_name[6:]
            return await self._execute_chain(chain_name, parameters)
        
        # Forward to base tool capability
        if not self.base_tool_capability:
            raise ValueError("No base tool capability available")
        
        return await self.base_tool_capability.use_tool(tool_name, **parameters)
    
    async def register_tool(self, tool_name: str, tool_function: Callable, description: str) -> bool:
        """
        Register a custom tool for use by the agent.
        
        Args:
            tool_name: Name of the tool
            tool_function: Function implementing the tool
            description: Description of the tool
            
        Returns:
            True if the tool was registered, False otherwise
        """
        # Forward to base tool capability
        if not self.base_tool_capability:
            raise ValueError("No base tool capability available")
        
        return await self.base_tool_capability.register_tool(tool_name, tool_function, description)
    
    def list_tools(self) -> List[Dict[str, Any]]:
        """
        List all tools available to the agent.
        
        Returns:
            List of tool descriptions
        """
        if not self.base_tool_capability:
            return []
        
        # Get base tools
        base_tools = self.base_tool_capability.list_tools()
        
        # Add chain tools
        chain_tools = self._list_chains()
        
        return base_tools + chain_tools
    
    async def register_chain(self, chain_name: str, chain_definition: List[Dict[str, Any]], description: str) -> bool:
        """
        Register a tool chain.
        
        Args:
            chain_name: Name for the chain
            chain_definition: List of steps in the chain
            description: Description of the chain
            
        Returns:
            True if the chain was registered, False otherwise
        """
        tool_name = f"chain:{chain_name}"
        
        async def chain_function(**params):
            return await self._execute_chain(chain_name, params)
        
        # Register the chain as a tool
        return await self.register_tool(tool_name, chain_function, description)
    
    async def _execute_chain(self, chain_name: str, parameters: Dict[str, Any]) -> Any:
        """Execute a tool chain"""
        # Get chain definition
        chain_info = self.base_tool_capability.get_tool_info(f"chain:{chain_name}")
        if not chain_info:
            raise ValueError(f"Chain '{chain_name}' not found")
        
        chain_definition = chain_info.get('chain_definition', [])
        if not chain_definition:
            raise ValueError(f"Chain '{chain_name}' has no steps defined")
        
        # Check chain length
        if len(chain_definition) > self.max_chain_length:
            raise ValueError(f"Chain '{chain_name}' exceeds maximum length ({len(chain_definition)} > {self.max_chain_length})")
        
        # Start chain execution
        start_time = datetime.now()
        context = {
            'input': parameters,
            'steps': []
        }
        
        try:
            # Execute each step
            for i, step in enumerate(chain_definition):
                step_name = step.get('name', f"step_{i}")
                tool_name = step.get('tool')
                if not tool_name:
                    raise ValueError(f"Step {i} in chain '{chain_name}' has no tool specified")
                
                # Resolve parameters for this step
                step_params = {}
                for param_name, param_value in step.get('parameters', {}).items():
                    # Check if this is a reference to previous output
                    if isinstance(param_value, str) and param_value.startswith('$'):
                        path = param_value[1:].split('.')
                        
                        # Navigate the context to get the value
                        current = context
                        for key in path:
                            if key in current:
                                current = current[key]
                            else:
                                raise ValueError(f"Reference '{param_value}' not found in context")
                        
                        step_params[param_name] = current
                    else:
                        # Use literal value
                        step_params[param_name] = param_value
                
                # Add input parameters for the first step
                if i == 0:
                    for param_name, param_value in parameters.items():
                        if param_name not in step_params:
                            step_params[param_name] = param_value
                
                # Execute the tool
                step_start = datetime.now()
                result = await self.base_tool_capability.use_tool(tool_name, **step_params)
                step_end = datetime.now()
                
                # Record step execution
                step_info = {
                    'name': step_name,
                    'tool': tool_name,
                    'parameters': step_params,
                    'result': result,
                    'duration': (step_end - step_start).total_seconds()
                }
                
                context['steps'].append(step_info)
                
                # Store result for next steps
                output_as = step.get('output_as')
                if output_as:
                    context[output_as] = result
            
            # Chain completed successfully
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Determine final result
            final_result = context.get('steps', [])[-1].get('result') if context.get('steps') else None
            
            # Add to history
            history_entry = {
                'id': str(uuid.uuid4()),
                'chain_name': chain_name,
                'parameters': parameters,
                'steps': context.get('steps', []),
                'result': final_result,
                'success': True,
                'timestamp': start_time.isoformat(),
                'duration': duration
            }
            
            self._add_to_history(history_entry)
            
            logger.info(f"Chain '{chain_name}' executed successfully in {duration:.2f}s")
            return final_result
            
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Add to history
            history_entry = {
                'id': str(uuid.uuid4()),
                'chain_name': chain_name,
                'parameters': parameters,
                'steps': context.get('steps', []),
                'error': str(e),
                'success': False,
                'timestamp': start_time.isoformat(),
                'duration': duration
            }
            
            self._add_to_history(history_entry)
            
            logger.error(f"Error executing chain '{chain_name}': {str(e)}", exc_info=True)
            raise
    
    def _list_chains(self) -> List[Dict[str, Any]]:
        """List available chains as tools"""
        if not self.base_tool_capability:
            return []
        
        chains = []
        
        # Find all chain tools
        for tool_name, tool_info in self.base_tool_capability.tools.items():
            if tool_name.startswith('chain:'):
                chain_name = tool_name[6:]
                chains.append({
                    'name': tool_name,
                    'description': tool_info['description'],
                    'server': 'chain',
                    'parameters': tool_info['parameters'],
                    'metadata': {
                        'chain': True,
                        'steps': len(tool_info.get('chain_definition', []))
                    }
                })
        
        return chains
    
    def _add_to_history(self, entry: Dict[str, Any]) -> None:
        """Add an entry to the chain execution history"""
        self.chain_history.append(entry)
        
        # Trim history if needed
        if len(self.chain_history) > self.max_chain_history:
            self.chain_history = self.chain_history[-self.max_chain_history:]
    
    async def cleanup(self) -> None:
        """Clean up the capability"""
        # The base tool capability will be cleaned up by the agent
        self.base_tool_capability = None
        
        await super().cleanup()
