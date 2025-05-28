"""
MCP Server Implementations

This package contains implementations of various MCP servers for different domains:
- FileSystem: File and directory operations
- Git: Version control operations 
- Memory: Persistent storage of agent state and knowledge
- Network: HTTP requests and API calls
- Tool: Standard tool invocation interface
"""

import os
import logging
from typing import List, Optional
from ..registry import MCPRegistry
from ..base import MCPServer

logger = logging.getLogger(__name__)

_registry = MCPRegistry()

def get_available_servers() -> List[str]:
    """
    Get a list of available MCP servers.
    
    Returns:
        List of server names
    """
    return _registry.list_servers()

def get_server(name: str) -> Optional[MCPServer]:
    """
    Get an MCP server by name.
    
    Args:
        name: Name of the server
        
    Returns:
        The server if found, None otherwise
    """
    return _registry.get_server(name)
