"""
Thinking capabilities for NocturneAI agents.

This module implements various thinking capabilities that enable
agents to reason about information in different ways.
"""

import asyncio
import logging
import uuid
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime

from ..core.types import AgentCapability, ThoughtNode, ThoughtEdge, ThoughtGraph
from .base import ThinkingCapability

logger = logging.getLogger(__name__)


class GraphThinking(ThinkingCapability):
    """
    Graph-based thinking capability.
    
    This capability enables an agent to think in a graph-based manner,
    representing thoughts as nodes and relationships as edges.
    """
    
    CAPABILITY = AgentCapability.THINKING
    
    def __init__(self, **config):
        """
        Initialize the graph thinking capability.
        
        Args:
            **config: Configuration parameters
                max_nodes: Maximum nodes in the graph (default: 100)
                max_edges: Maximum edges in the graph (default: 500)
                retention_policy: Policy for pruning old nodes (default: 'recency')
        """
        super().__init__(**config)
        self.max_nodes = config.get('max_nodes', 100)
        self.max_edges = config.get('max_edges', 500)
        self.retention_policy = config.get('retention_policy', 'recency')
        self.graph = ThoughtGraph()
        self.current_thinking_id = None
    
    async def initialize(self, agent) -> None:
        """Initialize the capability with the agent"""
        await super().initialize(agent)
        
        # Create initial node for agent state
        await self._create_state_node()
    
    async def think(self, context: Any) -> ThoughtGraph:
        """
        Perform graph-based thinking on the given context.
        
        Args:
            context: The context to think about
            
        Returns:
            The thought graph resulting from thinking
        """
        # Create a new thinking session
        thinking_id = str(uuid.uuid4())
        self.current_thinking_id = thinking_id
        
        # Create context node
        context_node = await self._add_node(
            node_type='context',
            content=context,
            metadata={'thinking_id': thinking_id}
        )
        
        # Process context using agent's LLM
        prompt = self._create_thinking_prompt(context)
        
        try:
            # Generate initial thoughts
            response = await self.agent.llm_provider.generate(prompt)
            
            # Parse response into thoughts
            thoughts = self._parse_thinking_response(response)
            
            # Add thoughts to graph
            thought_nodes = []
            for i, thought in enumerate(thoughts):
                node = await self._add_node(
                    node_type='thought',
                    content=thought,
                    metadata={
                        'thinking_id': thinking_id,
                        'sequence': i,
                        'source': 'initial'
                    }
                )
                thought_nodes.append(node)
                
                # Connect to context node
                await self._add_edge(
                    source=context_node.id,
                    target=node.id,
                    edge_type='inspires',
                    metadata={'thinking_id': thinking_id}
                )
                
                # Connect thoughts in sequence
                if i > 0:
                    await self._add_edge(
                        source=thought_nodes[i-1].id,
                        target=node.id,
                        edge_type='leads_to',
                        metadata={'thinking_id': thinking_id}
                    )
            
            # Generate secondary thoughts (connections between thoughts)
            await self._generate_connections(thought_nodes, thinking_id)
            
            # Generate conclusion
            conclusion = await self._generate_conclusion(thought_nodes, context, thinking_id)
            
            # Connect conclusion to relevant thoughts
            for node in thought_nodes:
                await self._add_edge(
                    source=node.id,
                    target=conclusion.id,
                    edge_type='supports',
                    metadata={'thinking_id': thinking_id}
                )
            
            # Update agent state with thinking results
            state_node = await self._get_state_node()
            if state_node:
                await self._add_edge(
                    source=conclusion.id,
                    target=state_node.id,
                    edge_type='updates',
                    metadata={'thinking_id': thinking_id}
                )
            
            # Prune graph if needed
            await self._prune_graph()
            
            # Return subgraph for this thinking session
            return self._get_subgraph(thinking_id)
        
        except Exception as e:
            logger.error(f"Error during thinking: {str(e)}", exc_info=True)
            
            # Create error node
            error_node = await self._add_node(
                node_type='error',
                content=str(e),
                metadata={'thinking_id': thinking_id}
            )
            
            # Connect error to context
            await self._add_edge(
                source=context_node.id,
                target=error_node.id,
                edge_type='results_in',
                metadata={'thinking_id': thinking_id}
            )
            
            # Return minimal error graph
            return self._get_subgraph(thinking_id)
    
    async def _create_state_node(self) -> ThoughtNode:
        """Create a node representing the agent's state"""
        return await self._add_node(
            node_type='state',
            content={
                'agent_id': self.agent.id,
                'agent_name': self.agent.name,
                'agent_role': self.agent.role.value,
                'created_at': datetime.now().isoformat(),
                'capabilities': [cap.value for cap in self.agent.capabilities]
            },
            metadata={'persistent': True}
        )
    
    async def _get_state_node(self) -> Optional[ThoughtNode]:
        """Get the agent's state node"""
        for node in self.graph.nodes:
            if node.node_type == 'state' and node.metadata.get('persistent', False):
                return node
        return None
    
    async def _add_node(self, node_type: str, content: Any, metadata: Dict[str, Any] = None) -> ThoughtNode:
        """Add a node to the thought graph"""
        node = ThoughtNode(
            id=str(uuid.uuid4()),
            node_type=node_type,
            content=content,
            metadata=metadata or {},
            created_at=datetime.now()
        )
        self.graph.nodes.append(node)
        return node
    
    async def _add_edge(self, source: str, target: str, edge_type: str, metadata: Dict[str, Any] = None) -> ThoughtEdge:
        """Add an edge to the thought graph"""
        edge = ThoughtEdge(
            id=str(uuid.uuid4()),
            source=source,
            target=target,
            edge_type=edge_type,
            metadata=metadata or {},
            created_at=datetime.now()
        )
        self.graph.edges.append(edge)
        return edge
    
    def _create_thinking_prompt(self, context: Any) -> str:
        """Create a prompt for the thinking process"""
        # Get agent details
        agent_name = self.agent.name
        agent_role = self.agent.role.value
        
        # Format context
        if isinstance(context, dict):
            context_str = "\n".join(f"{k}: {v}" for k, v in context.items())
        elif isinstance(context, list):
            context_str = "\n".join(str(item) for item in context)
        else:
            context_str = str(context)
        
        return f"""You are {agent_name}, an AI agent with the role of {agent_role}.

I'm going to give you a context, and I want you to think about it in a structured way.
Generate 3-7 distinct thoughts that explore different aspects of the context.
Each thought should be self-contained and insightful.

Context:
{context_str}

Thoughts:
1."""
    
    def _parse_thinking_response(self, response: str) -> List[str]:
        """Parse the thinking response into individual thoughts"""
        thoughts = []
        
        # Split by numbered lines
        lines = response.split('\n')
        current_thought = ""
        current_number = 1
        
        for line in lines:
            # Check if line starts with a number
            if line.strip().startswith(f"{current_number}."):
                if current_thought:
                    thoughts.append(current_thought.strip())
                current_thought = line.strip()[len(f"{current_number}."):]
                current_number += 1
            else:
                current_thought += " " + line.strip()
        
        # Add the last thought
        if current_thought:
            thoughts.append(current_thought.strip())
        
        return thoughts
    
    async def _generate_connections(self, thought_nodes: List[ThoughtNode], thinking_id: str) -> None:
        """Generate connections between thoughts"""
        if len(thought_nodes) <= 1:
            return
        
        # Create a prompt to find connections
        thoughts_str = "\n".join(f"{i+1}. {node.content}" for i, node in enumerate(thought_nodes))
        
        prompt = f"""I have the following thoughts:

{thoughts_str}

Find meaningful connections between these thoughts. For each connection, explain the relationship between the two thoughts.
Format your response as:
Thought X connects to Thought Y: [brief explanation]"""
        
        try:
            # Generate connections
            response = await self.agent.llm_provider.generate(prompt)
            
            # Parse connections
            connections = self._parse_connections(response)
            
            # Add connections to graph
            for source_idx, target_idx, relation in connections:
                if 0 <= source_idx < len(thought_nodes) and 0 <= target_idx < len(thought_nodes):
                    source_node = thought_nodes[source_idx]
                    target_node = thought_nodes[target_idx]
                    
                    await self._add_edge(
                        source=source_node.id,
                        target=target_node.id,
                        edge_type='relates_to',
                        metadata={
                            'thinking_id': thinking_id,
                            'relation': relation
                        }
                    )
        except Exception as e:
            logger.error(f"Error generating connections: {str(e)}", exc_info=True)
    
    def _parse_connections(self, response: str) -> List[Tuple[int, int, str]]:
        """Parse connection response into source, target, and relation"""
        connections = []
        
        lines = response.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Look for pattern "Thought X connects to Thought Y: explanation"
            if "connects to" in line and ":" in line:
                try:
                    # Extract thought numbers
                    connection_part = line.split(':')[0]
                    explanation = line.split(':', 1)[1].strip()
                    
                    # Find thought numbers
                    import re
                    numbers = re.findall(r'Thought (\d+)', connection_part)
                    
                    if len(numbers) >= 2:
                        source_idx = int(numbers[0]) - 1  # Convert to 0-indexed
                        target_idx = int(numbers[1]) - 1  # Convert to 0-indexed
                        connections.append((source_idx, target_idx, explanation))
                except Exception:
                    continue
        
        return connections
    
    async def _generate_conclusion(self, thought_nodes: List[ThoughtNode], context: Any, thinking_id: str) -> ThoughtNode:
        """Generate a conclusion based on the thoughts"""
        # Create a prompt for conclusion
        thoughts_str = "\n".join(f"{i+1}. {node.content}" for i, node in enumerate(thought_nodes))
        
        if isinstance(context, dict):
            context_str = "\n".join(f"{k}: {v}" for k, v in context.items())
        elif isinstance(context, list):
            context_str = "\n".join(str(item) for item in context)
        else:
            context_str = str(context)
        
        prompt = f"""Context:
{context_str}

Thoughts:
{thoughts_str}

Based on these thoughts, generate a concise conclusion that synthesizes the key insights.
Your conclusion should directly address the original context and provide a clear resolution or next steps."""
        
        try:
            # Generate conclusion
            conclusion_text = await self.agent.llm_provider.generate(prompt)
            
            # Create conclusion node
            conclusion_node = await self._add_node(
                node_type='conclusion',
                content=conclusion_text,
                metadata={
                    'thinking_id': thinking_id,
                    'source': 'synthesis'
                }
            )
            
            return conclusion_node
        except Exception as e:
            logger.error(f"Error generating conclusion: {str(e)}", exc_info=True)
            
            # Create a fallback conclusion
            fallback = "Unable to generate a proper conclusion due to an error."
            conclusion_node = await self._add_node(
                node_type='conclusion',
                content=fallback,
                metadata={
                    'thinking_id': thinking_id,
                    'source': 'fallback',
                    'error': str(e)
                }
            )
            
            return conclusion_node
    
    def _get_subgraph(self, thinking_id: str) -> ThoughtGraph:
        """Get a subgraph for a specific thinking session"""
        subgraph = ThoughtGraph()
        
        # Filter nodes
        for node in self.graph.nodes:
            if node.metadata.get('thinking_id') == thinking_id:
                subgraph.nodes.append(node)
        
        # Filter edges
        for edge in self.graph.edges:
            if edge.metadata.get('thinking_id') == thinking_id:
                subgraph.edges.append(edge)
        
        return subgraph
    
    async def _prune_graph(self) -> None:
        """Prune the graph if it exceeds size limits"""
        # Check if pruning is needed
        if len(self.graph.nodes) <= self.max_nodes and len(self.graph.edges) <= self.max_edges:
            return
        
        # Implement pruning based on retention policy
        if self.retention_policy == 'recency':
            # Sort nodes by creation time (oldest first)
            sorted_nodes = sorted(self.graph.nodes, key=lambda x: x.created_at)
            
            # Calculate how many nodes to remove
            nodes_to_remove = max(0, len(sorted_nodes) - self.max_nodes)
            
            if nodes_to_remove > 0:
                # Get nodes to remove (oldest first, excluding persistent nodes)
                nodes_to_remove_ids = set()
                removed_count = 0
                
                for node in sorted_nodes:
                    # Skip persistent nodes
                    if node.metadata.get('persistent', False):
                        continue
                    
                    nodes_to_remove_ids.add(node.id)
                    removed_count += 1
                    
                    if removed_count >= nodes_to_remove:
                        break
                
                # Remove nodes
                self.graph.nodes = [node for node in self.graph.nodes if node.id not in nodes_to_remove_ids]
                
                # Remove edges connected to removed nodes
                self.graph.edges = [edge for edge in self.graph.edges if 
                                  edge.source not in nodes_to_remove_ids and 
                                  edge.target not in nodes_to_remove_ids]
            
            # If we still have too many edges, remove oldest edges
            if len(self.graph.edges) > self.max_edges:
                # Sort edges by creation time (oldest first)
                sorted_edges = sorted(self.graph.edges, key=lambda x: x.created_at)
                
                # Keep only the newest max_edges
                self.graph.edges = sorted_edges[-self.max_edges:]
        
        # Other policies could be implemented here
        elif self.retention_policy == 'importance':
            # Implementation for importance-based pruning
            pass


class ReflectiveThinking(ThinkingCapability):
    """
    Reflective thinking capability.
    
    This capability enables an agent to reflect on its own thoughts
    and reasoning processes to improve future thinking.
    """
    
    CAPABILITY = AgentCapability.THINKING
    
    def __init__(self, **config):
        """
        Initialize the reflective thinking capability.
        
        Args:
            **config: Configuration parameters
                max_history: Maximum thinking history to retain (default: 10)
                reflection_frequency: How often to reflect (default: 5)
        """
        super().__init__(**config)
        self.max_history = config.get('max_history', 10)
        self.reflection_frequency = config.get('reflection_frequency', 5)
        self.thinking_history = []
        self.reflection_history = []
        self.thinking_count = 0
    
    async def think(self, context: Any) -> ThoughtGraph:
        """
        Perform reflective thinking on the given context.
        
        Args:
            context: The context to think about
            
        Returns:
            A thought graph representing the agent's reasoning
        """
        # Increment thinking count
        self.thinking_count += 1
        
        # Create a graph for this thinking session
        graph = ThoughtGraph()
        
        try:
            # Create initial thought nodes
            thoughts = await self._generate_thoughts(context)
            
            # Add context node
            context_node = ThoughtNode(
                id=str(uuid.uuid4()),
                node_type='context',
                content=context,
                metadata={},
                created_at=datetime.now()
            )
            graph.nodes.append(context_node)
            
            # Add thought nodes and connect to context
            thought_nodes = []
            for i, thought in enumerate(thoughts):
                node = ThoughtNode(
                    id=str(uuid.uuid4()),
                    node_type='thought',
                    content=thought,
                    metadata={'sequence': i},
                    created_at=datetime.now()
                )
                graph.nodes.append(node)
                thought_nodes.append(node)
                
                # Connect to context
                edge = ThoughtEdge(
                    id=str(uuid.uuid4()),
                    source=context_node.id,
                    target=node.id,
                    edge_type='inspires',
                    metadata={},
                    created_at=datetime.now()
                )
                graph.edges.append(edge)
            
            # Generate conclusion
            conclusion = await self._generate_conclusion(thoughts, context)
            conclusion_node = ThoughtNode(
                id=str(uuid.uuid4()),
                node_type='conclusion',
                content=conclusion,
                metadata={},
                created_at=datetime.now()
            )
            graph.nodes.append(conclusion_node)
            
            # Connect thoughts to conclusion
            for node in thought_nodes:
                edge = ThoughtEdge(
                    id=str(uuid.uuid4()),
                    source=node.id,
                    target=conclusion_node.id,
                    edge_type='supports',
                    metadata={},
                    created_at=datetime.now()
                )
                graph.edges.append(edge)
            
            # Store in thinking history
            self.thinking_history.append({
                'context': context,
                'thoughts': thoughts,
                'conclusion': conclusion,
                'graph': graph,
                'timestamp': datetime.now()
            })
            
            # Trim history if needed
            if len(self.thinking_history) > self.max_history:
                self.thinking_history = self.thinking_history[-self.max_history:]
            
            # Reflect if it's time
            if self.thinking_count % self.reflection_frequency == 0:
                await self._reflect()
            
            return graph
        
        except Exception as e:
            logger.error(f"Error during reflective thinking: {str(e)}", exc_info=True)
            
            # Create error node
            error_node = ThoughtNode(
                id=str(uuid.uuid4()),
                node_type='error',
                content=str(e),
                metadata={},
                created_at=datetime.now()
            )
            graph.nodes.append(error_node)
            
            # Connect error to context if it exists
            if context_node:
                error_edge = ThoughtEdge(
                    id=str(uuid.uuid4()),
                    source=context_node.id,
                    target=error_node.id,
                    edge_type='results_in',
                    metadata={},
                    created_at=datetime.now()
                )
                graph.edges.append(error_edge)
            
            return graph
    
    async def _generate_thoughts(self, context: Any) -> List[str]:
        """Generate thoughts about the context"""
        # Format context
        if isinstance(context, dict):
            context_str = "\n".join(f"{k}: {v}" for k, v in context.items())
        elif isinstance(context, list):
            context_str = "\n".join(str(item) for item in context)
        else:
            context_str = str(context)
        
        # Create prompt with reflection insights if available
        prompt = f"""You are {self.agent.name}, an AI agent with the role of {self.agent.role.value}.

I'm going to give you a context, and I want you to think about it in a structured way.
Generate 3-5 distinct thoughts that explore different aspects of the context.
Each thought should be self-contained and insightful.
"""
        
        # Add reflection insights if available
        if self.reflection_history:
            latest_reflection = self.reflection_history[-1]
            prompt += f"""
Based on previous reflection, I should:
{latest_reflection['insights']}

"""
        
        prompt += f"""Context:
{context_str}

Thoughts:
1."""
        
        # Generate thoughts
        response = await self.agent.llm_provider.generate(prompt)
        
        # Parse thoughts
        thoughts = []
        lines = response.split('\n')
        current_thought = ""
        current_number = 1
        
        for line in lines:
            # Check if line starts with a number
            if line.strip().startswith(f"{current_number}."):
                if current_thought:
                    thoughts.append(current_thought.strip())
                current_thought = line.strip()[len(f"{current_number}."):]
                current_number += 1
            else:
                current_thought += " " + line.strip()
        
        # Add the last thought
        if current_thought:
            thoughts.append(current_thought.strip())
        
        return thoughts
    
    async def _generate_conclusion(self, thoughts: List[str], context: Any) -> str:
        """Generate a conclusion based on the thoughts"""
        # Format context and thoughts
        if isinstance(context, dict):
            context_str = "\n".join(f"{k}: {v}" for k, v in context.items())
        elif isinstance(context, list):
            context_str = "\n".join(str(item) for item in context)
        else:
            context_str = str(context)
        
        thoughts_str = "\n".join(f"{i+1}. {thought}" for i, thought in enumerate(thoughts))
        
        prompt = f"""Context:
{context_str}

Thoughts:
{thoughts_str}

Based on these thoughts, generate a concise conclusion that synthesizes the key insights.
Your conclusion should directly address the original context and provide a clear resolution or next steps."""
        
        # Generate conclusion
        conclusion = await self.agent.llm_provider.generate(prompt)
        return conclusion
    
    async def _reflect(self) -> None:
        """Reflect on thinking history to improve future thinking"""
        if not self.thinking_history:
            return
        
        # Format thinking history
        history_str = ""
        for i, item in enumerate(self.thinking_history[-3:]):  # Use last 3 thinking sessions
            history_str += f"Thinking Session {i+1}:\n"
            history_str += f"Context: {item['context']}\n"
            history_str += "Thoughts:\n"
            for j, thought in enumerate(item['thoughts']):
                history_str += f"{j+1}. {thought}\n"
            history_str += f"Conclusion: {item['conclusion']}\n\n"
        
        prompt = f"""You are {self.agent.name}, an AI agent with the role of {self.agent.role.value}.

I want you to reflect on your recent thinking processes to identify patterns, strengths, and areas for improvement.
Here are your recent thinking sessions:

{history_str}

Based on these thinking sessions:
1. What patterns do you notice in your thinking?
2. What are your strengths as a thinker?
3. What are your weaknesses or blind spots?
4. How can you improve your thinking in future sessions?

Provide specific insights and recommendations for improving your thinking process."""
        
        try:
            # Generate reflection
            reflection = await self.agent.llm_provider.generate(prompt)
            
            # Store reflection
            self.reflection_history.append({
                'reflection': reflection,
                'insights': self._extract_insights(reflection),
                'timestamp': datetime.now()
            })
            
            # Limit reflection history
            if len(self.reflection_history) > self.max_history:
                self.reflection_history = self.reflection_history[-self.max_history:]
                
            logger.info(f"Agent {self.agent.name} completed reflection")
        except Exception as e:
            logger.error(f"Error during reflection: {str(e)}", exc_info=True)
    
    def _extract_insights(self, reflection: str) -> str:
        """Extract key insights from reflection for future use"""
        # Look for recommendations section
        if "improve your thinking" in reflection.lower():
            parts = reflection.split("improve your thinking", 1)
            if len(parts) > 1:
                return parts[1].strip()
        
        # Fallback: return last paragraph
        paragraphs = reflection.split("\n\n")
        if paragraphs:
            return paragraphs[-1].strip()
        
        return reflection
