# NocturneAI Agent Capabilities

This document describes the capabilities available to NocturneAI agents and how to use them.

## Overview

Capabilities provide modular functionality to agents, allowing them to be composed of different abilities as needed. Each capability handles a specific domain of functionality, such as:

- Memory management
- Planning and goal-directed behavior
- Research and information gathering
- Expertise in specific domains
- Team collaboration and coordination

## Available Capabilities

### Memory Capability

Memory capabilities allow agents to store and retrieve information.

#### SimpleMemory

A basic in-memory storage system.

```python
{
    AgentCapability.MEMORY: {
        'implementation': 'SimpleMemory',
        'config': {}
    }
}
```

#### PersistentMemory

A persistent storage system that saves memories to disk.

```python
{
    AgentCapability.MEMORY: {
        'implementation': 'PersistentMemory',
        'config': {
            'storage_path': '/path/to/storage',
            'agent_id': 'unique_agent_id'
        }
    }
}
```

### Planning Capability

Planning capabilities enable agents to create and execute structured plans.

#### StructuredPlanning

Creates hierarchical plans with steps and dependencies.

```python
{
    AgentCapability.PLANNING: {
        'implementation': 'StructuredPlanning',
        'config': {
            'max_steps': 10,
            'persistence_path': '/path/to/plans'
        }
    }
}
```

### Research Capability

Research capabilities enable information gathering and synthesis.

#### WebSearchResearch

Performs web searches and synthesizes information.

```python
{
    AgentCapability.RESEARCH: {
        'implementation': 'WebSearchResearch',
        'config': {
            'search_providers': ['google', 'bing'],
            'max_results': 5
        }
    }
}
```

#### KnowledgeBaseResearch

Searches through local knowledge bases.

```python
{
    AgentCapability.RESEARCH: {
        'implementation': 'KnowledgeBaseResearch',
        'config': {
            'kb_path': '/path/to/knowledge_base'
        }
    }
}
```

### Expertise Capability

Expertise capabilities provide domain-specific knowledge and skills.

#### DomainExpertise

Provides expertise in a specific domain.

```python
{
    AgentCapability.EXPERTISE: {
        'implementation': 'DomainExpertise',
        'config': {
            'domain': 'quantum_physics',
            'confidence_threshold': 0.7,
            'use_external_sources': True
        }
    }
}
```

#### MultiDomainExpertise

Manages expertise across multiple domains.

```python
{
    AgentCapability.EXPERTISE: {
        'implementation': 'MultiDomainExpertise',
        'config': {
            'domains': [
                {
                    'name': 'quantum_physics',
                    'confidence_threshold': 0.7
                },
                {
                    'name': 'machine_learning',
                    'confidence_threshold': 0.8
                }
            ],
            'routing_strategy': 'auto'
        }
    }
}
```

### Collaboration Capability

Collaboration capabilities enable agents to work together effectively.

#### TeamCoordination

Allows agents to form teams, coordinate tasks, and share information.

```python
{
    AgentCapability.COLLABORATION: {
        'implementation': 'TeamCoordination',
        'config': {
            'team_name': 'research_team',
            'team_objective': 'Solve complex problems together',
            'max_team_size': 5
        }
    }
}
```

#### ConsensusBuilding

Enables group decision-making and conflict resolution.

```python
{
    AgentCapability.COLLABORATION: {
        'implementation': 'ConsensusBuilding',
        'config': {
            'decision_threshold': 0.6,
            'voting_timeout': 60,
            'conflict_resolution_strategy': 'majority'
        }
    }
}
```

## Using Capabilities

Capabilities can be added to agents during creation using the `AgentFactory`:

```python
from src.agents.core.factory import AgentFactory
from src.agents.core.types import AgentRole, AgentCapability

factory = AgentFactory()

# Create an agent with multiple capabilities
agent = await factory.create_agent(
    name="ResearchCoordinator",
    role=AgentRole.COORDINATOR,
    llm_provider=llm_provider,
    capabilities={
        AgentCapability.MEMORY: {
            'implementation': 'PersistentMemory',
            'config': {
                'storage_path': './memory',
                'agent_id': 'research_coordinator'
            }
        },
        AgentCapability.COLLABORATION: {
            'implementation': 'TeamCoordination',
            'config': {
                'team_name': 'research_team',
                'max_team_size': 5
            }
        },
        AgentCapability.PLANNING: {
            'implementation': 'StructuredPlanning',
            'config': {}
        }
    }
)
```

## Accessing Capabilities

Once an agent has been created with capabilities, you can access those capabilities:

```python
# Get a capability module
memory_module = agent.get_capability_module(AgentCapability.MEMORY)
collaboration_module = agent.get_capability_module(AgentCapability.COLLABORATION)

# Use the capability
await memory_module.remember("key", "value")
team = await collaboration_module.form_team("Solve problem X", [agent1.id, agent2.id])
```

## Examples

See the `examples/` directory for practical demonstrations of using agent capabilities.

- `memory_example.py`: Demonstrates memory capabilities
- `planning_example.py`: Demonstrates planning capabilities
- `research_example.py`: Demonstrates research capabilities
- `expertise_example.py`: Demonstrates expertise capabilities
- `collaboration_example.py`: Demonstrates collaboration capabilities
