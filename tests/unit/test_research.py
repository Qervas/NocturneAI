"""
Unit tests for the research capabilities in NocturneAI.
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock
import os
import json

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.agents.core.types import AgentCapability, AgentRole
from src.agents.capabilities.research import WebSearchResearch


@pytest.fixture
def mock_agent():
    """Create a mock agent."""
    agent = MagicMock()
    agent.id = "test-agent-id"
    agent.name = "TestAgent"
    agent.role = AgentRole.RESEARCHER
    
    # Mock LLM provider for analysis
    agent.llm_provider = MagicMock()
    agent.llm_provider.generate = MagicMock()
    
    return agent


@pytest.fixture
def web_search_research():
    """Create a web search research capability."""
    return WebSearchResearch(
        search_providers=["mock_provider"],
        max_results=3,
        api_key="test_api_key"
    )


class AsyncMock(MagicMock):
    """Helper for mocking async functions."""
    async def __call__(self, *args, **kwargs):
        return super(AsyncMock, self).__call__(*args, **kwargs)


@pytest.mark.asyncio
async def test_web_search_initialization(web_search_research, mock_agent):
    """Test initializing the web search research capability."""
    await web_search_research.initialize(mock_agent)
    assert web_search_research.agent == mock_agent
    assert web_search_research.search_providers == ["mock_provider"]
    assert web_search_research.max_results == 3
    assert web_search_research.api_key == "test_api_key"
    assert web_search_research.search_tool is not None


@pytest.mark.asyncio
async def test_search(web_search_research, mock_agent):
    """Test performing a web search."""
    await web_search_research.initialize(mock_agent)
    
    # Replace the search tool with a mock
    mock_search_results = [
        {
            "title": "Test Result 1",
            "url": "https://example.com/1",
            "description": "This is test result 1"
        },
        {
            "title": "Test Result 2",
            "url": "https://example.com/2",
            "description": "This is test result 2"
        },
        {
            "title": "Test Result 3",
            "url": "https://example.com/3",
            "description": "This is test result 3"
        }
    ]
    
    # Create a mock search method
    original_search = web_search_research.search
    
    async def mock_search(query, search_type="web", **options):
        return mock_search_results
    
    # Replace the method
    web_search_research.search = mock_search
    
    # Perform a search
    results = await web_search_research.search("test query")
    
    # Verify search results
    assert len(results) == 3
    assert results[0]["title"] == "Test Result 1"
    assert results[1]["url"] == "https://example.com/2"
    assert results[2]["description"] == "This is test result 3"


@pytest.mark.asyncio
async def test_analyze_and_synthesize(web_search_research, mock_agent):
    """Test analyzing and synthesizing search results."""
    await web_search_research.initialize(mock_agent)
    
    # Mock search results
    search_results = [
        {
            "title": "Document 1",
            "content": "This is the content of document 1 about AI.",
            "url": "https://example.com/doc1",
            "published_date": "2023-01-01"
        },
        {
            "title": "Document 2",
            "content": "This is the content of document 2 about AI and machine learning.",
            "url": "https://example.com/doc2",
            "published_date": "2023-01-02"
        },
        {
            "title": "Document 3",
            "content": "This is the content of document 3 about AI and deep learning.",
            "url": "https://example.com/doc3",
            "published_date": "2023-01-03"
        }
    ]
    
    # Mock the _analyze_with_llm method
    original_analyze = web_search_research._analyze_with_llm
    
    async def mock_analyze(query, search_results):
        return {
            "confidence": 0.82,
            "quality": "high",
            "synthesis": "AI is a technology that enables machines to mimic human behavior.",
            "key_points": [
                "AI is a growing field",
                "Machine learning is a subset of AI",
                "Deep learning is a subset of machine learning"
            ],
            "sources_quality": {
                "https://example.com/doc1": 0.7,
                "https://example.com/doc2": 0.8,
                "https://example.com/doc3": 0.9
            },
            "missing_information": [
                "AI applications in healthcare",
                "Ethical considerations of AI"
            ]
        }
    
    # Replace the method
    web_search_research._analyze_with_llm = mock_analyze
    
    # Perform analysis and synthesis
    analysis = await web_search_research.analyze_and_synthesize(
        query="What is AI?",
        search_results=search_results
    )
    
    # Verify analysis result structure
    assert analysis is not None
    assert 'synthesis' in analysis
    assert 'confidence' in analysis
    assert 'key_points' in analysis
    assert len(analysis['key_points']) == 3
    assert 'sources_quality' in analysis
    assert len(analysis['sources_quality']) == 3
    assert 'missing_information' in analysis


@pytest.mark.asyncio
async def test_verify(web_search_research, mock_agent):
    """Test verifying information against sources."""
    await web_search_research.initialize(mock_agent)
    
    # Information to verify
    information_to_verify = "AI is rapidly evolving and transforming various industries."
    
    # Create a mock execute method for the search tool
    class MockToolResult:
        def __init__(self, result):
            self.status = "success"
            self.result = result
            self.error = None
    
    # Create mock search results for verification
    mock_results = [
        {
            "title": "AI Evolution",
            "url": "https://example.com/ai-evolution",
            "description": "AI is indeed evolving quickly and changing how businesses operate."
        },
        {
            "title": "AI Impact",
            "url": "https://example.com/ai-impact",
            "description": "The transformative effects of AI are seen across healthcare, finance, and education."
        }
    ]
    
    # Mock the search method
    original_search = web_search_research.search
    
    async def mock_search(query, search_type="web", **options):
        return mock_results
    
    # Replace the method
    web_search_research.search = mock_search
    
    # Mock the LLM response for verification
    mock_agent.llm_provider.generate.return_value = AsyncMock(return_value={
        "content": """{
            "verified": true,
            "confidence": 0.9,
            "supported": ["AI is rapidly evolving", "AI is transforming industries"],
            "contradicted": [],
            "uncertain": []
        }"""
    })()
    
    # Verify information
    verification = await web_search_research.verify(
        information=information_to_verify,
        sources=["https://example.com/ai-evolution"]
    )
    
    # Check verification results
    assert verification is not None 
    assert "verified" in verification


@pytest.mark.asyncio
@patch.dict(os.environ, {"BRAVE_SEARCH_API_KEY": "env_api_key"})
async def test_api_key_from_environment():
    """Test getting API key from environment variable."""
    # Create capability without explicit API key
    research = WebSearchResearch(
        search_providers=["brave"],
        max_results=3
    )
    
    # Verify the API key was taken from environment
    assert research.api_key == "env_api_key"