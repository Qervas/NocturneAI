"""
Unit tests for the expertise capabilities in NocturneAI.
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.agents.core.types import AgentCapability
from src.agents.capabilities.expertise import DomainExpertise


@pytest.fixture
def domain_expertise():
    """Create a test domain expertise capability."""
    return DomainExpertise(domains=["quantum_computing", "algorithms"])


@pytest.fixture
def mock_agent():
    """Create a mock agent."""
    agent = MagicMock()
    agent.id = "test-agent-id"
    agent.name = "TestAgent"
    return agent


@pytest.mark.asyncio
async def test_initialization(domain_expertise, mock_agent):
    """Test initializing the expertise capability."""
    await domain_expertise.initialize(mock_agent)
    assert domain_expertise.agent == mock_agent
    assert "quantum_computing" in domain_expertise.domains
    assert "algorithms" in domain_expertise.domains


@pytest.mark.asyncio
async def test_provide_expertise_matching_domain(domain_expertise, mock_agent):
    """Test providing expertise in a matching domain."""
    await domain_expertise.initialize(mock_agent)
    
    # Test for a topic in a domain the agent has expertise in
    result = await domain_expertise.provide_expertise(
        query="quantum computing applications in cryptography"
    )
    
    # Verify the result
    assert result is not None
    assert result["has_expertise"] is True
    assert result["confidence"] > 0.7
    assert len(result["insights"]) > 0
    assert len(result["recommendations"]) > 0


@pytest.mark.asyncio
async def test_provide_expertise_non_matching_domain(domain_expertise, mock_agent):
    """Test providing expertise in a non-matching domain."""
    await domain_expertise.initialize(mock_agent)
    
    # Test for a topic in a domain the agent does not have expertise in
    result = await domain_expertise.provide_expertise(
        query="economics and financial markets"
    )
    
    # Verify the result
    assert result is not None
    assert result["has_expertise"] is False
    assert result["confidence"] < 0.5


@pytest.mark.asyncio
async def test_evaluate_content(domain_expertise, mock_agent):
    """Test evaluating content using domain expertise."""
    await domain_expertise.initialize(mock_agent)
    
    # Test evaluating content in a domain the agent has expertise in
    content = "Quantum computers use qubits which leverage superposition and entanglement. " + \
              "This enables quantum algorithms like Shor's algorithm to factor large numbers efficiently."
    
    result = await domain_expertise.evaluate(content)
    
    # Verify the result
    assert result is not None
    assert result["has_expertise"] is True
    assert result["confidence"] > 0.7
    assert "evaluation" in result
    assert "summary" in result


@pytest.mark.asyncio
async def test_add_and_remove_domain(domain_expertise, mock_agent):
    """Test adding and removing domains."""
    await domain_expertise.initialize(mock_agent)
    
    # Initial domains
    initial_domains = await domain_expertise.get_domains()
    assert "quantum_computing" in initial_domains
    assert "algorithms" in initial_domains
    assert "quantum_machine_learning" not in initial_domains
    
    # Add a domain
    added = await domain_expertise.add_domain("quantum_machine_learning")
    assert added is True
    
    # Check updated domains
    updated_domains = await domain_expertise.get_domains()
    assert "quantum_machine_learning" in updated_domains
    
    # Remove a domain
    removed = await domain_expertise.remove_domain("algorithms")
    assert removed is True
    
    # Check final domains
    final_domains = await domain_expertise.get_domains()
    assert "quantum_computing" in final_domains
    assert "quantum_machine_learning" in final_domains
    assert "algorithms" not in final_domains