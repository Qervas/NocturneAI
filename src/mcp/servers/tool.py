"""
Tool MCP Server

This module implements an MCP server for tool operations, providing
a standardized interface for agents to invoke various tools.
"""

from typing import Dict, Any, List, Optional, Union, Callable, Type
import os
import logging
import asyncio
import json
import importlib
import inspect
from pydantic import BaseModel, Field, create_model

from ..base import MCPServer, MCPRequest, MCPResponse, MCPStatus

logger = logging.getLogger(__name__)

class ToolParameter(BaseModel):
    """Parameter definition for a tool"""
    name: str
    description: str
    type: str
    required: bool = True
    default: Optional[Any] = None

class ToolDefinition(BaseModel):
    """Definition of a tool"""
    name: str
    description: str
    parameters: List[ToolParameter]

class Tool:
    """Base class for all tools"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
    
    def get_definition(self) -> ToolDefinition:
        """Get the tool definition"""
        # Inspect the execute method to get parameter information
        sig = inspect.signature(self.execute)
        parameters = []
        
        for name, param in sig.parameters.items():
            if name == "self":
                continue
            
            # Determine if the parameter is required
            required = param.default == inspect.Parameter.empty
            default = None if required else param.default
            
            # Get the parameter type
            param_type = "any"
            if param.annotation != inspect.Parameter.empty:
                if param.annotation == str:
                    param_type = "string"
                elif param.annotation == int:
                    param_type = "integer"
                elif param.annotation == float:
                    param_type = "number"
                elif param.annotation == bool:
                    param_type = "boolean"
                elif param.annotation == list or param.annotation == List:
                    param_type = "array"
                elif param.annotation == dict or param.annotation == Dict:
                    param_type = "object"
            
            # Get parameter description from docstring if available
            param_desc = f"Parameter: {name}"
            doc = inspect.getdoc(self.execute)
            if doc:
                # Try to find parameter description in docstring
                for line in doc.split("\n"):
                    if line.strip().startswith(f"{name}:"):
                        param_desc = line.strip()[len(f"{name}:"):].strip()
            
            parameters.append(ToolParameter(
                name=name,
                description=param_desc,
                type=param_type,
                required=required,
                default=default
            ))
        
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=parameters
        )
    
    async def execute(self, **kwargs) -> Any:
        """Execute the tool with the given parameters"""
        raise NotImplementedError("Tool.execute must be implemented by subclasses")

class ToolMCPServer(MCPServer):
    """MCP Server for tool operations"""
    
    def __init__(self):
        """Initialize the tool MCP server"""
        super().__init__(
            name="tool",
            description="MCP Server for tool operations, providing a standardized interface for invoking tools"
        )
        
        self.tools: Dict[str, Tool] = {}
        
        logger.info("Tool MCP Server initialized")
    
    def _register_operations(self):
        """Register all tool operations"""
        self.register_operation(
            "list_tools",
            self.list_tools,
            "List all available tools"
        )
        
        self.register_operation(
            "get_tool_definition",
            self.get_tool_definition,
            "Get the definition of a specific tool"
        )
        
        self.register_operation(
            "execute_tool",
            self.execute_tool,
            "Execute a tool with the given parameters"
        )
        
        self.register_operation(
            "register_tool",
            self.register_tool_operation,
            "Register a new tool"
        )
    
    def register_tool(self, tool: Tool):
        """Register a tool with the server
        
        Args:
            tool: The tool to register
        """
        if tool.name in self.tools:
            logger.warning(f"Tool {tool.name} already registered, replacing")
        
        self.tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")
    
    async def list_tools(self) -> Dict[str, Any]:
        """List all available tools
        
        Returns:
            Dictionary with tool definitions
        """
        definitions = {}
        for name, tool in self.tools.items():
            definitions[name] = tool.get_definition().dict()
        
        return {
            "tools": definitions
        }
    
    async def get_tool_definition(self, tool_name: str) -> Dict[str, Any]:
        """Get the definition of a specific tool
        
        Args:
            tool_name: Name of the tool
            
        Returns:
            Dictionary with the tool definition
        """
        if tool_name not in self.tools:
            raise ValueError(f"Tool {tool_name} not found")
        
        tool = self.tools[tool_name]
        
        return {
            "definition": tool.get_definition().dict()
        }
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with the given parameters
        
        Args:
            tool_name: Name of the tool
            parameters: Tool parameters
            
        Returns:
            Dictionary with the tool execution result
        """
        if tool_name not in self.tools:
            raise ValueError(f"Tool {tool_name} not found")
        
        tool = self.tools[tool_name]
        
        try:
            # Validate parameters
            definition = tool.get_definition()
            
            # Check for missing required parameters
            for param in definition.parameters:
                if param.required and param.name not in parameters:
                    raise ValueError(f"Missing required parameter: {param.name}")
            
            # Execute the tool
            result = await tool.execute(**parameters)
            
            return {
                "tool_name": tool_name,
                "parameters": parameters,
                "result": result
            }
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}", exc_info=True)
            raise RuntimeError(f"Error executing tool {tool_name}: {str(e)}")
    
    async def register_tool_operation(self, tool_class: str, tool_module: str, tool_args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Register a new tool from a module
        
        Args:
            tool_class: Name of the tool class
            tool_module: Module containing the tool class
            tool_args: Optional arguments for the tool constructor
            
        Returns:
            Dictionary with the registered tool definition
        """
        try:
            # Import the module
            module = importlib.import_module(tool_module)
            
            # Get the tool class
            if not hasattr(module, tool_class):
                raise ValueError(f"Tool class {tool_class} not found in module {tool_module}")
            
            tool_cls = getattr(module, tool_class)
            
            # Check if it's a valid tool class
            if not issubclass(tool_cls, Tool):
                raise ValueError(f"Class {tool_class} is not a subclass of Tool")
            
            # Create the tool instance
            tool_args = tool_args or {}
            tool = tool_cls(**tool_args)
            
            # Register the tool
            self.register_tool(tool)
            
            return {
                "tool_name": tool.name,
                "definition": tool.get_definition().dict()
            }
        except Exception as e:
            logger.error(f"Error registering tool: {str(e)}", exc_info=True)
            raise RuntimeError(f"Error registering tool: {str(e)}")
