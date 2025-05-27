"""
WebSearch MCP Server

This module implements an MCP server for web search operations, providing
a standardized interface for agents to search the web.
"""

from typing import Dict, Any, List, Optional, Union
import os
import logging
import asyncio
import json
import aiohttp
from urllib.parse import quote_plus
import re
from bs4 import BeautifulSoup

from ..base import MCPServer, MCPRequest, MCPResponse, MCPStatus

logger = logging.getLogger(__name__)

class WebSearchMCPServer(MCPServer):
    """MCP Server for web search operations"""
    
    def __init__(self, bing_api_key: Optional[str] = None, serp_api_key: Optional[str] = None):
        """Initialize the web search MCP server
        
        Args:
            bing_api_key: Bing Search API key (optional)
            serp_api_key: SerpAPI key (optional)
        """
        super().__init__(
            name="websearch",
            description="MCP Server for web search operations"
        )
        
        self.bing_api_key = bing_api_key or os.environ.get("BING_API_KEY")
        self.serp_api_key = serp_api_key or os.environ.get("SERP_API_KEY")
        self.session = None
        
        logger.info("WebSearch MCP Server initialized")
    
    def _register_operations(self):
        """Register all web search operations"""
        self.register_operation(
            "search",
            self.search,
            "Search the web with a query"
        )
        
        self.register_operation(
            "search_news",
            self.search_news,
            "Search for news articles"
        )
        
        self.register_operation(
            "search_images",
            self.search_images,
            "Search for images"
        )
        
        self.register_operation(
            "search_with_bing",
            self.search_with_bing,
            "Search the web using Bing Search API"
        )
        
        self.register_operation(
            "search_with_serp",
            self.search_with_serp,
            "Search the web using SerpAPI"
        )
        
        self.register_operation(
            "fallback_search",
            self.fallback_search,
            "Fallback search method using web scraping (for demo purposes only)"
        )
    
    async def _ensure_session(self):
        """Ensure an aiohttp ClientSession exists"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
    
    async def search(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """Search the web with a query
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            Dictionary with search results
        """
        # Try different search methods in order of preference
        if self.bing_api_key:
            try:
                return await self.search_with_bing(query, num_results)
            except Exception as e:
                logger.warning(f"Bing search failed: {str(e)}")
        
        if self.serp_api_key:
            try:
                return await self.search_with_serp(query, num_results)
            except Exception as e:
                logger.warning(f"SerpAPI search failed: {str(e)}")
        
        # Fallback to basic scraping for demo purposes
        return await self.fallback_search(query, num_results)
    
    async def search_news(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """Search for news articles
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            Dictionary with news search results
        """
        if self.bing_api_key:
            await self._ensure_session()
            
            url = f"https://api.bing.microsoft.com/v7.0/news/search"
            headers = {"Ocp-Apim-Subscription-Key": self.bing_api_key}
            params = {"q": query, "count": num_results, "textDecorations": True, "textFormat": "HTML"}
            
            async with self.session.get(url, headers=headers, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise RuntimeError(f"Bing News API error ({response.status}): {error_text}")
                
                data = await response.json()
                
                results = []
                for article in data.get("value", []):
                    results.append({
                        "title": article.get("name"),
                        "url": article.get("url"),
                        "description": article.get("description"),
                        "published": article.get("datePublished"),
                        "source": article.get("provider", [{}])[0].get("name")
                    })
                
                return {
                    "query": query,
                    "results": results
                }
        else:
            # Fallback to general search
            search_results = await self.search(query, num_results)
            return {
                "query": query,
                "results": search_results.get("results", []),
                "note": "News-specific search requires Bing API key"
            }
    
    async def search_images(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """Search for images
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            Dictionary with image search results
        """
        if self.bing_api_key:
            await self._ensure_session()
            
            url = f"https://api.bing.microsoft.com/v7.0/images/search"
            headers = {"Ocp-Apim-Subscription-Key": self.bing_api_key}
            params = {"q": query, "count": num_results}
            
            async with self.session.get(url, headers=headers, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise RuntimeError(f"Bing Image Search API error ({response.status}): {error_text}")
                
                data = await response.json()
                
                results = []
                for image in data.get("value", []):
                    results.append({
                        "title": image.get("name"),
                        "url": image.get("contentUrl"),
                        "thumbnail": image.get("thumbnailUrl"),
                        "source": image.get("hostPageDisplayUrl"),
                        "width": image.get("width"),
                        "height": image.get("height")
                    })
                
                return {
                    "query": query,
                    "results": results
                }
        else:
            # Return a message that image search requires an API key
            return {
                "query": query,
                "results": [],
                "error": "Image search requires Bing API key"
            }
    
    async def search_with_bing(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """Search the web using Bing Search API
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            Dictionary with search results
        """
        if not self.bing_api_key:
            raise ValueError("Bing API key not provided")
        
        await self._ensure_session()
        
        url = f"https://api.bing.microsoft.com/v7.0/search"
        headers = {"Ocp-Apim-Subscription-Key": self.bing_api_key}
        params = {"q": query, "count": num_results, "textDecorations": True, "textFormat": "HTML"}
        
        async with self.session.get(url, headers=headers, params=params) as response:
            if response.status != 200:
                error_text = await response.text()
                raise RuntimeError(f"Bing Search API error ({response.status}): {error_text}")
            
            data = await response.json()
            
            results = []
            for page in data.get("webPages", {}).get("value", []):
                results.append({
                    "title": page.get("name"),
                    "url": page.get("url"),
                    "snippet": page.get("snippet")
                })
            
            return {
                "query": query,
                "results": results,
                "total_results": data.get("webPages", {}).get("totalEstimatedMatches", 0)
            }
    
    async def search_with_serp(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """Search the web using SerpAPI
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            Dictionary with search results
        """
        if not self.serp_api_key:
            raise ValueError("SerpAPI key not provided")
        
        await self._ensure_session()
        
        url = f"https://serpapi.com/search"
        params = {
            "q": query,
            "num": num_results,
            "api_key": self.serp_api_key
        }
        
        async with self.session.get(url, params=params) as response:
            if response.status != 200:
                error_text = await response.text()
                raise RuntimeError(f"SerpAPI error ({response.status}): {error_text}")
            
            data = await response.json()
            
            results = []
            for result in data.get("organic_results", []):
                results.append({
                    "title": result.get("title"),
                    "url": result.get("link"),
                    "snippet": result.get("snippet")
                })
            
            return {
                "query": query,
                "results": results
            }
    
    async def fallback_search(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """Fallback search method using web scraping (for demo purposes only)
        
        WARNING: This is only for demonstration and should not be used in production
        as it may violate terms of service of search engines.
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            Dictionary with search results
        """
        # This is a very basic implementation for demo purposes
        await self._ensure_session()
        
        # Use DuckDuckGo HTML search as a fallback
        encoded_query = quote_plus(query)
        url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
        
        try:
            async with self.session.get(url, headers={"User-Agent": "Mozilla/5.0"}) as response:
                if response.status != 200:
                    return {
                        "query": query,
                        "results": [],
                        "error": f"Search failed with status {response.status}"
                    }
                
                html = await response.text()
                soup = BeautifulSoup(html, "html.parser")
                
                results = []
                result_elements = soup.select(".result")[:num_results]
                
                for element in result_elements:
                    title_element = element.select_one(".result__title")
                    url_element = element.select_one(".result__url")
                    snippet_element = element.select_one(".result__snippet")
                    
                    if title_element and url_element:
                        title = title_element.get_text(strip=True)
                        url = url_element.get_text(strip=True)
                        snippet = snippet_element.get_text(strip=True) if snippet_element else ""
                        
                        results.append({
                            "title": title,
                            "url": url,
                            "snippet": snippet
                        })
                
                return {
                    "query": query,
                    "results": results,
                    "note": "Results from fallback search (limited functionality)"
                }
        except Exception as e:
            logger.error(f"Fallback search error: {str(e)}")
            return {
                "query": query,
                "results": [],
                "error": f"Search failed: {str(e)}"
            }
    
    async def cleanup(self):
        """Clean up resources"""
        if self.session and not self.session.closed:
            await self.session.close()
