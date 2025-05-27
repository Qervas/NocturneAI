from typing import Any, Dict, List, Optional, Type, TypeVar, Generic, Callable, Awaitable
from pydantic import BaseModel, Field
from dataclasses import dataclass
from enum import Enum
import inspect
import json

class ToolResultStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    INVALID_INPUT = "invalid_input"
    NOT_FOUND = "not_found"
    UNAUTHORIZED = "unauthorized"

@dataclass
class ToolExecutionResult:
    """Result of a tool execution"""
    status: ToolResultStatus
    result: Any
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ToolParameter(BaseModel):
    """Definition of a tool parameter"""
    name: str
    type: Type
    description: str
    required: bool = True
    default: Any = None
    enum: Optional[List[Any]] = None
    
class ToolDefinition(BaseModel):
    """Definition of a tool that can be used by agents"""
    name: str
    description: str
    parameters: List[ToolParameter]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to OpenAPI schema format"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": {
                    p.name: {
                        "type": p.type.__name__,
                        "description": p.description,
                        **({"enum": p.enum} if p.enum else {})
                    }
                    for p in self.parameters
                },
                "required": [p.name for p in self.parameters if p.required],
            }
        }

class Tool:
    """Base class for all tools"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.definition = self._create_definition()
    
    def _create_definition(self) -> ToolDefinition:
        """Create tool definition from method signature"""
        params = []
        sig = inspect.signature(self.execute)
        
        # Skip 'self' parameter
        parameters = list(sig.parameters.values())[1:]  # Skip self
        
        for param in parameters:
            # Get type hints
            param_type = param.annotation
            if param_type == inspect.Parameter.empty:
                param_type = str  # Default to string if no type hint
                
            # Get description from docstring if available
            doc = inspect.getdoc(self.execute)
            param_doc = ""
            if doc:
                # Simple parsing of numpy-style docstring
                for line in doc.split('\n'):
                    line = line.strip()
                    if line.startswith(param.name + ' :'):
                        param_doc = line.split(':', 1)[1].strip()
                        break
            
            params.append(ToolParameter(
                name=param.name,
                type=param_type,
                description=param_doc or f"Parameter {param.name}",
                required=param.default == inspect.Parameter.empty,
                default=param.default if param.default != inspect.Parameter.empty else None
            ))
        
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=params
        )
    
    async def execute(self, **kwargs) -> ToolExecutionResult:
        """Execute the tool with the given parameters"""
        raise NotImplementedError("Subclasses must implement execute method")
    
    def __call__(self, **kwargs) -> Awaitable[ToolExecutionResult]:
        """Make the tool callable"""
        return self.execute(**kwargs)

class ToolRegistry:
    """Manages available tools"""
    
    def __init__(self):
        self._tools: Dict[str, Tool] = {}
    
    def register(self, tool: Tool) -> None:
        """Register a new tool"""
        if tool.name in self._tools:
            raise ValueError(f"Tool with name '{tool.name}' already registered")
        self._tools[tool.name] = tool
    
    def get_tool(self, name: str) -> Optional[Tool]:
        """Get a tool by name"""
        return self._tools.get(name)
    
    def get_tools(self) -> Dict[str, Tool]:
        """Get all registered tools"""
        return self._tools.copy()
    
    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Get OpenAPI schema for all tools"""
        return [tool.definition.to_dict() for tool in self._tools.values()]
    
    async def execute_tool(
        self, 
        tool_name: str, 
        parameters: Dict[str, Any]
    ) -> ToolExecutionResult:
        """Execute a tool with the given parameters"""
        tool = self.get_tool(tool_name)
        if not tool:
            return ToolExecutionResult(
                status=ToolResultStatus.NOT_FOUND,
                result=None,
                error=f"Tool '{tool_name}' not found"
            )
        
        try:
            return await tool.execute(**parameters)
        except Exception as e:
            return ToolExecutionResult(
                status=ToolResultStatus.ERROR,
                result=None,
                error=str(e)
            )
