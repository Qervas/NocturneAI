"""
Registry for MCP servers

This module provides a registry for managing MCP servers, making it easy for
agents to discover and interact with available servers.
"""

from typing import Dict, Any, List, Optional, Type
import logging
from .base import MCPServer, MCPRequest, MCPResponse, MCPStatus

logger = logging.getLogger(__name__)

class MCPRegistry:
    """Registry for MCP servers"""
    
    _instance = None
    
    def __new__(cls):
        """Implement singleton pattern"""
        if cls._instance is None:
            cls._instance = super(MCPRegistry, cls).__new__(cls)
            cls._instance.servers = {}
        return cls._instance
    
    def register_server(self, server: MCPServer):
        """Register an MCP server"""
        if server.name in self.servers:
            logger.warning(f"Overwriting existing server {server.name}")
        self.servers[server.name] = server
        logger.info(f"Registered MCP server: {server.name}")
    
    def get_server(self, name: str) -> Optional[MCPServer]:
        """Get an MCP server by name"""
        return self.servers.get(name)
    
    def list_servers(self) -> List[str]:
        """List all registered servers"""
        return list(self.servers.keys())
    
    def get_server_schema(self, name: str) -> Optional[Dict[str, Any]]:
        """Get the schema for a server"""
        server = self.get_server(name)
        if server:
            return server.get_schema()
        return None
    
    async def execute(self, server_name: str, operation: str, **parameters) -> MCPResponse:
        """Execute an operation on a server"""
        server = self.get_server(server_name)
        if not server:
            return MCPResponse(
                request_id="",  # No request ID since we didn't create a request
                status=MCPStatus.NOT_FOUND,
                error=f"Server {server_name} not found"
            )
        
        # Create a request
        request = MCPRequest(
            operation=operation,
            parameters=parameters
        )
        
        # Handle the request
        return await server.handle_request(request)
    
    async def execute_request(self, server_name: str, request: MCPRequest) -> MCPResponse:
        """Execute a request on a server"""
        server = self.get_server(server_name)
        if not server:
            return MCPResponse(
                request_id=request.id,
                status=MCPStatus.NOT_FOUND,
                error=f"Server {server_name} not found"
            )
        
        # Handle the request
        return await server.handle_request(request)
