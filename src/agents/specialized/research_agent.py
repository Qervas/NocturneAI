from typing import Dict, Any, List, Optional, Union
from ...core.agent import BaseAgent, AgentRole, AgentResponse
from ...core.tools import ToolRegistry
from ...core.memory import MemoryStore
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ResearchAgent(BaseAgent):
    """
    Research Agent that gathers information and conducts analyses.
    
    This agent is responsible for:
    1. Gathering information on specific topics
    2. Analyzing technical documentation
    3. Comparing technologies and approaches
    4. Staying updated on industry trends
    5. Building and maintaining a knowledge base
    """
    
    def __init__(
        self,
        name: str = "research_agent",
        tool_registry: Optional[ToolRegistry] = None,
        memory_store: Optional[MemoryStore] = None,
        llm_provider: Any = None
    ):
        super().__init__(role=AgentRole.RESEARCHER, name=name)
        self.tool_registry = tool_registry or ToolRegistry()
        self.memory_store = memory_store or MemoryStore()
        self.llm_provider = llm_provider
        
        # Knowledge base - in a real implementation, this would be a vector database
        self.knowledge_base = {}
    
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Process the input and conduct research"""
        try:
            # Add input to conversation history
            content = input_data.get("content", "")
            self.add_message("user", content)
            
            # Extract research query
            query = content
            sources = input_data.get("sources", [])
            depth = input_data.get("depth", "medium")
            
            # Conduct research
            research_results = await self._conduct_research(query, sources, depth)
            
            # Store research in knowledge base and memory
            self._store_research_results(query, research_results)
            
            # Determine next steps
            next_agent = input_data.get("next_agent")
            
            return AgentResponse(
                content=self._format_research_response(research_results),
                metadata={"research_results": research_results},
                next_agent=next_agent
            )
            
        except Exception as e:
            logger.error(f"Error in research agent: {str(e)}", exc_info=True)
            return AgentResponse(
                content=f"Error conducting research: {str(e)}",
                metadata={"error": True, "error_message": str(e)}
            )
    
    async def _conduct_research(
        self, 
        query: str, 
        sources: List[str], 
        depth: str
    ) -> Dict[str, Any]:
        """Conduct research based on the query"""
        # In a real implementation, this would use tools to search for information
        # and LLMs to analyze and synthesize findings
        
        # For demonstration, return mock research results
        current_time = datetime.now(timezone.utc)
        
        # Example research findings
        findings = [
            {
                "title": f"Information about {query}",
                "content": f"This is an example finding about {query}.",
                "source": "https://example.com/article1",
                "relevance": 0.92
            },
            {
                "title": f"Alternative approaches to {query}",
                "content": f"Several alternative approaches exist for {query}...",
                "source": "https://example.com/article2",
                "relevance": 0.85
            },
            {
                "title": f"Best practices for {query}",
                "content": f"When working with {query}, it's recommended to...",
                "source": "https://example.com/best-practices",
                "relevance": 0.78
            }
        ]
        
        research_results = {
            "query": query,
            "timestamp": current_time.isoformat(),
            "depth": depth,
            "sources_consulted": sources or ["web", "knowledge_base"],
            "findings": findings,
            "summary": f"Research on {query} revealed valuable information from multiple sources.",
            "key_insights": [
                f"Insight 1 about {query}",
                f"Insight 2 about {query}",
                f"Insight 3 about {query}"
            ],
            "related_topics": [
                f"{query} optimization",
                f"{query} comparison",
                f"{query} alternatives"
            ]
        }
        
        return research_results
    
    def _store_research_results(self, query: str, results: Dict[str, Any]) -> None:
        """Store research results in memory and knowledge base"""
        # Store in memory
        self.memory_store.add(
            f"Research on {query}",
            {"type": "research", "query": query, "results": results}
        )
        
        # Store in knowledge base
        self.knowledge_base[query] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "results": results
        }
    
    def search_knowledge_base(self, query: str, threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Search the knowledge base for relevant information"""
        # In a real implementation, this would use vector similarity search
        # For now, we'll just do a simple keyword match
        results = []
        
        for topic, data in self.knowledge_base.items():
            # Simple relevance score based on string matching
            # In a real implementation, this would be semantic similarity
            if query.lower() in topic.lower():
                relevance = 0.8  # Arbitrary score
                results.append({
                    "topic": topic,
                    "timestamp": data["timestamp"],
                    "relevance": relevance,
                    "data": data["results"]
                })
        
        # Sort by relevance
        results.sort(key=lambda x: x["relevance"], reverse=True)
        
        # Filter by threshold
        results = [r for r in results if r["relevance"] >= threshold]
        
        return results
    
    def _format_research_response(self, research_results: Dict[str, Any]) -> str:
        """Format research results into a readable response"""
        findings = research_results.get("findings", [])
        findings_count = len(findings)
        
        response = [
            "# Research Report",
            "",
            f"**Query**: {research_results.get('query', 'Unknown')}",
            f"**Date**: {research_results.get('timestamp', 'Unknown')}",
            f"**Depth**: {research_results.get('depth', 'Unknown').title()}",
            f"**Sources Consulted**: {', '.join(research_results.get('sources_consulted', []))}",
            ""
        ]
        
        if findings_count > 0:
            response.append("## Findings")
            for i, finding in enumerate(findings, 1):
                response.append(
                    f"\n### {i}. {finding['title']}"
                    f"\n{finding['content']}"
                    f"\n\n**Source**: [{finding['source']}]({finding['source']})"
                    f"\n**Relevance**: {int(finding['relevance'] * 100)}%"
                )
        
        response.append("\n## Key Insights")
        for insight in research_results.get("key_insights", []):
            response.append(f"\n- {insight}")
        
        response.append("\n## Related Topics")
        for topic in research_results.get("related_topics", []):
            response.append(f"\n- {topic}")
            
        response.append(f"\n## Summary\n\n{research_results.get('summary', '')}")
        
        return "\n".join(response)
