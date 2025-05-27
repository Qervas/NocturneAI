"""
Network MCP Server

This module implements an MCP server for network operations, providing
a standardized interface for agents to make HTTP requests and API calls.
"""

from typing import Dict, Any, List, Optional, Union
import os
import logging
import asyncio
import json
import aiohttp
from urllib.parse import urlparse

from ..base import MCPServer, MCPRequest, MCPResponse, MCPStatus

logger = logging.getLogger(__name__)

class NetworkMCPServer(MCPServer):
    """MCP Server for network operations"""
    
    def __init__(self, allowed_domains: Optional[List[str]] = None):
        """Initialize the network MCP server with allowed domains
        
        Args:
            allowed_domains: List of domains that are allowed to be accessed.
                           If None, all domains are allowed.
        """
        super().__init__(
            name="network",
            description="MCP Server for network operations including HTTP requests and API calls"
        )
        
        self.allowed_domains = allowed_domains
        self.session = None
        
        logger.info(f"Network MCP Server initialized with allowed domains: {self.allowed_domains}")
    
    def _register_operations(self):
        """Register all network operations"""
        self.register_operation(
            "http_get",
            self.http_get,
            "Make an HTTP GET request"
        )
        
        self.register_operation(
            "http_post",
            self.http_post,
            "Make an HTTP POST request"
        )
        
        self.register_operation(
            "http_put",
            self.http_put,
            "Make an HTTP PUT request"
        )
        
        self.register_operation(
            "http_delete",
            self.http_delete,
            "Make an HTTP DELETE request"
        )
        
        self.register_operation(
            "http_request",
            self.http_request,
            "Make a custom HTTP request"
        )
        
        self.register_operation(
            "list_allowed_domains",
            self.list_allowed_domains,
            "List the domains that are allowed to be accessed"
        )
    
    def _is_domain_allowed(self, url: str) -> bool:
        """Check if a URL's domain is allowed
        
        Args:
            url: The URL to check
            
        Returns:
            True if the domain is allowed, False otherwise
        """
        if self.allowed_domains is None:
            return True
        
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        
        # Remove port if present
        if ":" in domain:
            domain = domain.split(":")[0]
        
        # Check if the domain or any parent domain is allowed
        domain_parts = domain.split(".")
        for i in range(len(domain_parts)):
            test_domain = ".".join(domain_parts[i:])
            if test_domain in self.allowed_domains:
                return True
        
        return False
    
    async def _ensure_session(self):
        """Ensure an aiohttp ClientSession exists"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
    
    async def http_get(self, url: str, headers: Optional[Dict[str, str]] = None, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make an HTTP GET request
        
        Args:
            url: The URL to request
            headers: Optional request headers
            params: Optional query parameters
            
        Returns:
            Dictionary with the response data
        """
        # Security check
        if not self._is_domain_allowed(url):
            raise ValueError(f"Domain in URL {url} is not allowed")
        
        await self._ensure_session()
        
        try:
            async with self.session.get(url, headers=headers, params=params) as response:
                content_type = response.headers.get("Content-Type", "")
                
                if "application/json" in content_type:
                    data = await response.json()
                else:
                    data = await response.text()
                
                return {
                    "url": url,
                    "status": response.status,
                    "headers": dict(response.headers),
                    "content_type": content_type,
                    "data": data
                }
        except Exception as e:
            raise RuntimeError(f"Error making GET request to {url}: {str(e)}")
    
    async def http_post(self, url: str, data: Any = None, json_data: Any = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make an HTTP POST request
        
        Args:
            url: The URL to request
            data: Optional form data
            json_data: Optional JSON data
            headers: Optional request headers
            
        Returns:
            Dictionary with the response data
        """
        # Security check
        if not self._is_domain_allowed(url):
            raise ValueError(f"Domain in URL {url} is not allowed")
        
        await self._ensure_session()
        
        try:
            async with self.session.post(url, data=data, json=json_data, headers=headers) as response:
                content_type = response.headers.get("Content-Type", "")
                
                if "application/json" in content_type:
                    data = await response.json()
                else:
                    data = await response.text()
                
                return {
                    "url": url,
                    "status": response.status,
                    "headers": dict(response.headers),
                    "content_type": content_type,
                    "data": data
                }
        except Exception as e:
            raise RuntimeError(f"Error making POST request to {url}: {str(e)}")
    
    async def http_put(self, url: str, data: Any = None, json_data: Any = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make an HTTP PUT request
        
        Args:
            url: The URL to request
            data: Optional form data
            json_data: Optional JSON data
            headers: Optional request headers
            
        Returns:
            Dictionary with the response data
        """
        # Security check
        if not self._is_domain_allowed(url):
            raise ValueError(f"Domain in URL {url} is not allowed")
        
        await self._ensure_session()
        
        try:
            async with self.session.put(url, data=data, json=json_data, headers=headers) as response:
                content_type = response.headers.get("Content-Type", "")
                
                if "application/json" in content_type:
                    data = await response.json()
                else:
                    data = await response.text()
                
                return {
                    "url": url,
                    "status": response.status,
                    "headers": dict(response.headers),
                    "content_type": content_type,
                    "data": data
                }
        except Exception as e:
            raise RuntimeError(f"Error making PUT request to {url}: {str(e)}")
    
    async def http_delete(self, url: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make an HTTP DELETE request
        
        Args:
            url: The URL to request
            headers: Optional request headers
            
        Returns:
            Dictionary with the response data
        """
        # Security check
        if not self._is_domain_allowed(url):
            raise ValueError(f"Domain in URL {url} is not allowed")
        
        await self._ensure_session()
        
        try:
            async with self.session.delete(url, headers=headers) as response:
                content_type = response.headers.get("Content-Type", "")
                
                if "application/json" in content_type:
                    data = await response.json()
                else:
                    data = await response.text()
                
                return {
                    "url": url,
                    "status": response.status,
                    "headers": dict(response.headers),
                    "content_type": content_type,
                    "data": data
                }
        except Exception as e:
            raise RuntimeError(f"Error making DELETE request to {url}: {str(e)}")
    
    async def http_request(self, method: str, url: str, data: Any = None, json_data: Any = None, headers: Optional[Dict[str, str]] = None, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make a custom HTTP request
        
        Args:
            method: The HTTP method (GET, POST, PUT, DELETE, etc.)
            url: The URL to request
            data: Optional form data
            json_data: Optional JSON data
            headers: Optional request headers
            params: Optional query parameters
            
        Returns:
            Dictionary with the response data
        """
        # Security check
        if not self._is_domain_allowed(url):
            raise ValueError(f"Domain in URL {url} is not allowed")
        
        await self._ensure_session()
        
        try:
            async with self.session.request(method, url, data=data, json=json_data, headers=headers, params=params) as response:
                content_type = response.headers.get("Content-Type", "")
                
                if "application/json" in content_type:
                    data = await response.json()
                else:
                    data = await response.text()
                
                return {
                    "url": url,
                    "method": method,
                    "status": response.status,
                    "headers": dict(response.headers),
                    "content_type": content_type,
                    "data": data
                }
        except Exception as e:
            raise RuntimeError(f"Error making {method} request to {url}: {str(e)}")
    
    async def list_allowed_domains(self) -> Dict[str, Any]:
        """List the domains that are allowed to be accessed
        
        Returns:
            Dictionary with allowed domains
        """
        return {
            "allowed_domains": self.allowed_domains
        }
    
    async def cleanup(self):
        """Clean up resources"""
        if self.session and not self.session.closed:
            await self.session.close()
