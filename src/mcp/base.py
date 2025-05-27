"""
Base classes for the Model Context Protocol (MCP)

This module defines the core abstractions for the MCP system, including:
- MCPServer: Base class for all MCP servers
- MCPRequest: Standardized request format
- MCPResponse: Standardized response format
- MCPStatus: Status codes for responses
"""

from typing import Dict, Any, List, Optional, Union, Type, Protocol, runtime_checkable
from enum import Enum, auto
import json
import logging
import asyncio
from pydantic import BaseModel, Field
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class MCPStatus(str, Enum):
    """Status codes for MCP responses"""
    SUCCESS = "success"
    ERROR = "error"
    PENDING = "pending"
    NOT_FOUND = "not_found"
    UNAUTHORIZED = "unauthorized"
    RATE_LIMITED = "rate_limited"
    TIMEOUT = "timeout"
    INVALID_REQUEST = "invalid_request"

class MCPRequest(BaseModel):
    """Standardized request format for MCP operations"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    operation: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert request to dictionary"""
        return {
            "id": self.id,
            "operation": self.operation,
            "parameters": self.parameters,
            "context": self.context,
            "timestamp": self.timestamp.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MCPRequest":
        """Create request from dictionary"""
        if "timestamp" in data and isinstance(data["timestamp"], str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)

class MCPResponse(BaseModel):
    """Standardized response format for MCP operations"""
    request_id: str
    status: MCPStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary"""
        return {
            "request_id": self.request_id,
            "status": self.status,
            "result": self.result,
            "error": self.error,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MCPResponse":
        """Create response from dictionary"""
        if "timestamp" in data and isinstance(data["timestamp"], str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)

class MCPServer:
    """Base class for all MCP servers"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.operations: Dict[str, Any] = {}
        self._register_operations()
        
    def _register_operations(self):
        """Register all operations supported by this server"""
        # This method should be overridden by subclasses
        pass
    
    def register_operation(self, name: str, handler, description: str):
        """Register a new operation"""
        self.operations[name] = {
            "handler": handler,
            "description": description
        }
    
    async def handle_request(self, request: MCPRequest) -> MCPResponse:
        """Handle an MCP request"""
        if request.operation not in self.operations:
            return MCPResponse(
                request_id=request.id,
                status=MCPStatus.NOT_FOUND,
                error=f"Operation {request.operation} not found"
            )
        
        try:
            operation = self.operations[request.operation]
            handler = operation["handler"]
            
            # Call the handler with the request parameters
            result = await handler(**request.parameters)
            
            return MCPResponse(
                request_id=request.id,
                status=MCPStatus.SUCCESS,
                result=result
            )
        except Exception as e:
            logger.error(f"Error handling request {request.id}: {str(e)}", exc_info=True)
            return MCPResponse(
                request_id=request.id,
                status=MCPStatus.ERROR,
                error=str(e)
            )
    
    def get_schema(self) -> Dict[str, Any]:
        """Get the schema for this server"""
        operations = {}
        for name, operation in self.operations.items():
            operations[name] = {
                "description": operation["description"],
                # We could add parameter schema information here
            }
        
        return {
            "name": self.name,
            "description": self.description,
            "operations": operations
        }
