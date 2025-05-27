"""
Research capabilities for NocturneAI agents.

This module provides capabilities for information research and retrieval.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
import json
import os

from ..core.types import AgentCapability
from .base import ResearchCapability
from ...tools.web_search import WebSearchTool

logger = logging.getLogger(__name__)


class WebSearchResearch(ResearchCapability):
    """
    Web search research capability for agents.
    
    Enables agents to search the web for information using the WebSearchTool.
    """
    
    CAPABILITY = AgentCapability.RESEARCH
    
    def __init__(self, search_providers: List[str] = None, max_results: int = 5, api_key: str = None, **config):
        """
        Initialize the web search research capability.
        
        Args:
            search_providers: List of search provider names to use
            max_results: Maximum number of results to return
            api_key: API key for the search service (optional, can use environment variable)
            **config: Additional configuration
        """
        super().__init__(**config)
        self.search_providers = search_providers or ["default"]
        self.max_results = max_results
        
        # Use provided API key or get from environment
        self.api_key = api_key or os.environ.get("BRAVE_SEARCH_API_KEY")
        
        # Initialize the web search tool
        self.search_tool = WebSearchTool(api_key=self.api_key)
    
    async def initialize(self, agent):
        """Initialize the capability with the agent."""
        await super().initialize(agent)
        logger.info(f"WebSearchResearch capability initialized for agent {agent.name}")
    
    async def search(self, query: str, search_type: str = "web", **options) -> Dict[str, Any]:
        """
        Search for information based on a query.
        
        Args:
            query: The search query
            search_type: Type of search to perform
            **options: Additional search options
            
        Returns:
            Dictionary with search results
        """
        logger.info(f"Performing {search_type} search for: {query}")
        
        # If we don't have an API key, return simulated results
        if not self.api_key:
            logger.warning("No API key available, using simulated search results")
            return self._get_simulated_results(query, search_type)
        
        # Use the WebSearchTool for actual search
        count = options.get("max_results", self.max_results)
        tool_result = await self.search_tool.execute(query=query, count=count)
        
        if tool_result.status == "success":
            return {
                "query": query,
                "search_type": search_type,
                "results": tool_result.result,
                "total_results": len(tool_result.result)
            }
        else:
            logger.warning(f"Web search failed: {tool_result.error}")
            # Fall back to simulated results
            return self._get_simulated_results(query, search_type)
    
    def _get_simulated_results(self, query: str, search_type: str) -> Dict[str, Any]:
        """Get simulated search results for when real search is unavailable"""
        if search_type == "web":
            # Simulate web search results
            results = [
                {
                    "title": "Introduction to Quantum Computing",
                    "url": "https://example.com/quantum-computing-intro",
                    "description": "Quantum computing is an emerging field that leverages quantum mechanics to process information in ways classical computers cannot."
                },
                {
                    "title": "Recent Breakthroughs in Quantum Computing",
                    "url": "https://example.com/quantum-breakthroughs",
                    "description": "Recent advances include error correction improvements, higher qubit counts, and practical quantum algorithms."
                },
                {
                    "title": "Applications of Quantum Computing",
                    "url": "https://example.com/quantum-applications",
                    "description": "Quantum computers have potential applications in cryptography, drug discovery, optimization problems, and material science."
                }
            ]
        elif search_type == "academic":
            # Simulate academic search results
            results = [
                {
                    "title": "Quantum Error Correction: A Review",
                    "authors": ["Smith, J.", "Johnson, A."],
                    "journal": "Journal of Quantum Information",
                    "year": 2024,
                    "description": "This paper reviews recent advances in quantum error correction techniques."
                },
                {
                    "title": "Practical Quantum Machine Learning Algorithms",
                    "authors": ["Lee, S.", "Wong, T."],
                    "journal": "Quantum Computing Research",
                    "year": 2023,
                    "description": "We present several quantum machine learning algorithms with practical implementations."
                }
            ]
        else:
            results = []
        
        return {
            "query": query,
            "search_type": search_type,
            "results": results[:self.max_results],
            "total_results": len(results)
        }
    
    async def analyze(self, information: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze information from search results.
        
        Args:
            information: List of information items to analyze
            
        Returns:
            Dictionary with analysis results
        """
        # In a real implementation, this would use the agent's LLM to analyze the results
        # For the example, we'll return a simulated analysis
        
        topics = ["quantum computing", "qubits", "quantum algorithms", "error correction"]
        key_points = [
            "Quantum computers use qubits instead of classical bits",
            "Quantum error correction is essential for practical quantum computing",
            "Quantum algorithms can solve certain problems exponentially faster than classical algorithms",
            "Quantum computers are especially suited for optimization and simulation problems"
        ]
        
        return {
            "topics": topics,
            "key_points": key_points,
            "relevance_score": 0.85,
            "confidence": 0.78
        }
    
    async def synthesize(self, information: List[Dict[str, Any]], query: str = None) -> Dict[str, Any]:
        """
        Synthesize information from multiple sources.
        
        Args:
            information: List of information items to synthesize
            query: Optional query to focus the synthesis
            
        Returns:
            Dictionary with synthesis results
        """
        # For the example, we'll return a simulated synthesis
        
        summary = "Quantum computing is an emerging field that uses quantum mechanics to process information. " \
                 "Recent breakthroughs include improved error correction techniques, higher qubit counts, and " \
                 "practical quantum algorithms. The most promising applications include drug discovery, optimization " \
                 "problems, cryptography, and material science simulations."
        
        sources = [
            "https://example.com/quantum-computing-intro",
            "https://example.com/quantum-breakthroughs",
            "https://example.com/quantum-applications"
        ]
        
        return {
            "summary": summary,
            "sources": sources,
            "query": query,
            "confidence": 0.82
        }
    
    async def verify(self, information: Any, sources: List[str] = None) -> Dict[str, bool]:
        """
        Verify information against sources.
        
        Args:
            information: Information to verify
            sources: List of sources to check against
            
        Returns:
            Dictionary with verification results
        """
        # For the example, we'll return a simulated verification
        
        return {
            "verified": True,
            "confidence": 0.75,
            "sources_checked": len(sources) if sources else 0,
            "conflicting_information": False
        }


class KnowledgeBaseResearch(ResearchCapability):
    """
    Knowledge base research capability.
    
    This capability enables an agent to research information from
    structured knowledge bases and databases.
    """
    
    CAPABILITY = AgentCapability.RESEARCH
    
    def __init__(self, **config):
        """
        Initialize the knowledge base research capability.
        
        Args:
            **config: Configuration parameters
                knowledge_bases: List of knowledge base sources to use
                default_kb: Default knowledge base to use
                max_results: Maximum number of results to return (default: 10)
        """
        super().__init__(**config)
        self.knowledge_bases = config.get('knowledge_bases', [])
        self.default_kb = config.get('default_kb')
        self.max_results = config.get('max_results', 10)
        
        # Dictionary to store knowledge base connections
        self.kb_connections = {}
    
    async def search(self, query: str, sources: List[str] = None) -> Dict[str, Any]:
        """
        Search for information based on a query.
        
        Args:
            query: Search query
            sources: List of knowledge bases to search (if None, searches default or all)
            
        Returns:
            Dictionary with search results
        """
        # Determine which knowledge bases to search
        if sources:
            kb_sources = [kb for kb in self.knowledge_bases if kb.get('name') in sources]
        elif self.default_kb:
            kb_sources = [kb for kb in self.knowledge_bases if kb.get('name') == self.default_kb]
        else:
            kb_sources = self.knowledge_bases
        
        if not kb_sources:
            return {
                'query': query,
                'results': [],
                'total_results': 0,
                'error': 'No knowledge bases available for search',
                'timestamp': datetime.now().isoformat()
            }
        
        # Search each knowledge base
        all_results = []
        errors = []
        
        for kb in kb_sources:
            try:
                results = await self._search_knowledge_base(query, kb)
                all_results.extend(results)
            except Exception as e:
                logger.error(f"Error searching knowledge base {kb.get('name')}: {str(e)}", exc_info=True)
                errors.append({
                    'kb': kb.get('name'),
                    'error': str(e)
                })
        
        # Sort results by relevance (if available)
        all_results.sort(key=lambda x: x.get('relevance', 0), reverse=True)
        
        # Limit results
        all_results = all_results[:self.max_results]
        
        return {
            'query': query,
            'results': all_results,
            'total_results': len(all_results),
            'sources': [kb.get('name') for kb in kb_sources],
            'errors': errors if errors else None,
            'timestamp': datetime.now().isoformat()
        }
    
    async def synthesize(self, information: List[Any]) -> Dict[str, Any]:
        """
        Synthesize information from knowledge base results.
        
        Args:
            information: List of information items to synthesize
            
        Returns:
            Dictionary with synthesis results
        """
        # Format content
        content_list = []
        for item in information:
            content_list.append({
                'source': item.get('source', 'unknown'),
                'content': item.get('content', ''),
                'title': item.get('title', '')
            })
        
        # Create synthesis prompt
        prompt = self._create_synthesis_prompt(content_list)
        
        try:
            # Generate synthesis
            synthesis = await self.agent.llm_provider.generate(prompt)
            
            # Try to parse as JSON
            try:
                synthesis_data = json.loads(synthesis)
            except json.JSONDecodeError:
                # Use the raw text
                synthesis_data = {
                    'synthesis': synthesis,
                    'key_points': []
                }
            
            # Prepare results
            results = {
                'synthesis': synthesis_data.get('synthesis', synthesis),
                'key_points': synthesis_data.get('key_points', []),
                'sources': [item.get('source') for item in content_list],
                'timestamp': datetime.now().isoformat()
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Error synthesizing information: {str(e)}", exc_info=True)
            return {
                'error': str(e),
                'status': 'failed'
            }
    
    async def verify(self, information: Any, sources: List[str] = None) -> Dict[str, bool]:
        """
        Verify information against knowledge bases.
        
        Args:
            information: Information to verify
            sources: List of knowledge bases to check against
            
        Returns:
            Dictionary with verification results
        """
        # Format information
        if isinstance(information, dict):
            info_str = json.dumps(information)
        else:
            info_str = str(information)
        
        # Search for relevant information
        search_results = await self.search(info_str, sources)
        
        # Create verification prompt
        prompt = self._create_verification_prompt(info_str, search_results)
        
        try:
            # Generate verification
            verification = await self.agent.llm_provider.generate(prompt)
            
            # Try to parse as JSON
            try:
                verification_data = json.loads(verification)
            except json.JSONDecodeError:
                # Simple verification
                is_verified = (
                    'verified' in verification.lower() or 
                    'confirmed' in verification.lower()
                ) and not (
                    'not verified' in verification.lower() or 
                    'unverified' in verification.lower()
                )
                
                verification_data = {
                    'verified': is_verified,
                    'confidence': 0.5 if is_verified else 0.0,
                    'raw_verification': verification
                }
            
            return verification_data
            
        except Exception as e:
            logger.error(f"Error verifying information: {str(e)}", exc_info=True)
            return {
                'verified': False,
                'confidence': 0.0,
                'error': str(e)
            }
    
    async def _search_knowledge_base(self, query: str, kb_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search a specific knowledge base"""
        kb_type = kb_config.get('type')
        kb_name = kb_config.get('name')
        
        if kb_type == 'vector':
            return await self._search_vector_kb(query, kb_config)
        elif kb_type == 'sql':
            return await self._search_sql_kb(query, kb_config)
        elif kb_type == 'api':
            return await self._search_api_kb(query, kb_config)
        else:
            logger.warning(f"Unknown knowledge base type: {kb_type}")
            return []
    
    async def _search_vector_kb(self, query: str, kb_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search a vector knowledge base"""
        # Implementation would depend on the specific vector database
        # This is a simplified mock implementation
        return [{
            'title': f"Result for {query}",
            'content': f"This is a sample result from the {kb_config.get('name')} vector knowledge base for query '{query}'.",
            'source': kb_config.get('name'),
            'relevance': 0.85
        }]
    
    async def _search_sql_kb(self, query: str, kb_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search a SQL knowledge base"""
        # Implementation would depend on the specific SQL database
        # This is a simplified mock implementation
        return [{
            'title': f"SQL Result for {query}",
            'content': f"This is a sample result from the {kb_config.get('name')} SQL knowledge base for query '{query}'.",
            'source': kb_config.get('name'),
            'relevance': 0.75
        }]
    
    async def _search_api_kb(self, query: str, kb_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search an API-based knowledge base"""
        # Implementation would depend on the specific API
        # This is a simplified mock implementation
        return [{
            'title': f"API Result for {query}",
            'content': f"This is a sample result from the {kb_config.get('name')} API knowledge base for query '{query}'.",
            'source': kb_config.get('name'),
            'relevance': 0.80
        }]
    
    def _create_synthesis_prompt(self, content_list: List[Dict[str, Any]]) -> str:
        """Create a prompt for synthesis"""
        sources_text = ""
        for i, item in enumerate(content_list):
            sources_text += f"Source {i+1}: {item.get('title', 'Untitled')}\n"
            sources_text += f"Source KB: {item.get('source', 'Unknown')}\n"
            sources_text += f"Content: {item.get('content', '')}\n\n"
        
        prompt = f"""You are {self.agent.name}, an AI agent with the role of {self.agent.role.value}.

I need you to synthesize information from multiple knowledge base entries. Below are excerpts from different sources:

{sources_text}

Please synthesize this information into a coherent summary. Include:
1. A comprehensive synthesis of the information
2. Key points or insights

Format your response as a JSON object with the following structure:
{{
  "synthesis": "Your comprehensive synthesis",
  "key_points": [
    "Key point 1",
    "Key point 2",
    // more key points
  ]
}}"""
        
        return prompt
    
    def _create_verification_prompt(self, information: str, search_results: Dict[str, Any]) -> str:
        """Create a prompt for verification"""
        sources_text = ""
        for i, result in enumerate(search_results.get('results', [])):
            sources_text += f"Source {i+1}: {result.get('title', 'Untitled')}\n"
            sources_text += f"Source KB: {result.get('source', 'Unknown')}\n"
            sources_text += f"Content: {result.get('content', '')}\n\n"
        
        prompt = f"""You are {self.agent.name}, an AI agent with the role of {self.agent.role.value}.

I need you to verify the following information against our knowledge bases:

{information}

Below are knowledge base entries that may be relevant:

{sources_text}

Please verify the information against these sources. Determine:
1. Whether the information is verified by the sources
2. Your confidence level in the verification (0.0 to 1.0)
3. Which parts of the information are supported or contradicted

Format your response as a JSON object with the following structure:
{{
  "verified": true/false,
  "confidence": 0.85, // a value between 0.0 and 1.0
  "supported": [
    "Fact or claim that is supported by sources"
  ],
  "contradicted": [
    "Fact or claim that is contradicted by sources"
  ],
  "uncertain": [
    "Fact or claim that couldn't be verified either way"
  ]
}}"""
        
        return prompt
    
    async def cleanup(self) -> None:
        """Clean up the capability"""
        # Close knowledge base connections
        for kb_name, connection in self.kb_connections.items():
            try:
                if hasattr(connection, 'close') and callable(connection.close):
                    if asyncio.iscoroutinefunction(connection.close):
                        await connection.close()
                    else:
                        connection.close()
            except Exception as e:
                logger.error(f"Error closing connection to {kb_name}: {str(e)}", exc_info=True)
        
        self.kb_connections.clear()
        
        await super().cleanup()
