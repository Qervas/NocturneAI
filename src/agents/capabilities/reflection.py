"""
Reflection capabilities for NocturneAI agents.

This module implements capabilities for agents to reflect on their own
behavior, learn from experience, and adapt to new situations.
"""

import asyncio
import logging
import json
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timedelta
import uuid

from ..core.types import AgentCapability, MessageType, Message, ThoughtGraph
from .base import Capability

logger = logging.getLogger(__name__)


class ReflectionCapability(Capability):
    """
    Base reflection capability for agents.
    
    This capability enables agents to reflect on their actions and improve
    their performance over time.
    """
    
    # Specify capability type
    CAPABILITY = AgentCapability.REFLECTION
    
    def __init__(self, agent_id: Optional[str] = None, **config):
        super().__init__(**config)
        self.agent_id = agent_id


class SelfReflection(ReflectionCapability):
    """
    Self-reflection capability for agents.
    
    This capability enables an agent to analyze its own performance,
    learn from experience, and adapt its behavior accordingly.
    """
    
    CAPABILITY = AgentCapability.REFLECTION
    
    def __init__(self, **config):
        """
        Initialize the self-reflection capability.
        
        Args:
            **config: Configuration parameters
                reflection_interval: Time between reflections in minutes (default: 60)
                max_history: Maximum history entries to retain (default: 100)
                metrics: List of metrics to track (default: ['success_rate', 'response_time'])
                min_experiences: Minimum experiences needed before reflection (default: 5)
        """
        super().__init__(**config)
        self.reflection_interval = config.get('reflection_interval', 60)  # minutes
        self.max_history = config.get('max_history', 100)
        self.metrics = config.get('metrics', ['success_rate', 'response_time'])
        self.min_experiences = config.get('min_experiences', 5)
        
        self.experience_history = []
        self.reflection_history = []
        self.last_reflection_time = None
        self.insights = {}
        self.adaptation_rules = {}
    
    async def initialize(self, agent) -> None:
        """Initialize the capability with the agent"""
        await super().initialize(agent)
        self.last_reflection_time = datetime.now()
    
    async def record_experience(self, experience: Dict[str, Any]) -> None:
        """
        Record an experience for later reflection.
        
        Args:
            experience: Details of the experience to record
        """
        # Add timestamp if not present
        if 'timestamp' not in experience:
            experience['timestamp'] = datetime.now().isoformat()
        
        # Add to history
        self.experience_history.append(experience)
        
        # Trim history if needed
        if len(self.experience_history) > self.max_history:
            self.experience_history = self.experience_history[-self.max_history:]
        
        # Check if it's time for reflection
        if self.should_reflect():
            await self.reflect()
    
    async def reflect(self) -> Dict[str, Any]:
        """
        Perform self-reflection to analyze the agent's performance and state.
        
        Returns:
            Dictionary with reflection results
        """
        # Check if we have enough experiences
        if len(self.experience_history) < self.min_experiences:
            logger.info(f"Not enough experiences for reflection ({len(self.experience_history)} < {self.min_experiences})")
            return {"status": "insufficient data", "experiences": len(self.experience_history)}
        
        # Format experiences for reflection
        experiences = self.experience_history[-self.min_experiences:]
        
        # Create a reflection prompt
        prompt = self._create_reflection_prompt(experiences)
        
        try:
            # Generate reflection
            reflection = await self.agent.llm_provider.generate(prompt)
            
            # Parse reflection
            insights, adaptations = self._parse_reflection(reflection)
            
            # Update insights and adaptations
            self.insights.update(insights)
            self.adaptation_rules.update(adaptations)
            
            # Create reflection record
            reflection_record = {
                'id': str(uuid.uuid4()),
                'timestamp': datetime.now().isoformat(),
                'experiences_analyzed': len(experiences),
                'reflection': reflection,
                'insights': insights,
                'adaptations': adaptations
            }
            
            # Add to history
            self.reflection_history.append(reflection_record)
            
            # Update last reflection time
            self.last_reflection_time = datetime.now()
            
            logger.info(f"Agent {self.agent.name} completed reflection")
            
            # Return reflection results
            return {
                'status': 'success',
                'insights': insights,
                'adaptations': adaptations
            }
            
        except Exception as e:
            logger.error(f"Error during reflection: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def adapt(self, feedback: Any) -> bool:
        """
        Adapt the agent's behavior based on feedback.
        
        Args:
            feedback: Feedback to adapt to
            
        Returns:
            True if adaptation was successful, False otherwise
        """
        if isinstance(feedback, str):
            # Direct instruction for adaptation
            prompt = f"""You are {self.agent.name}, an AI agent with the role of {self.agent.role.value}.

You have received the following feedback on your performance:

{feedback}

Based on this feedback, identify specific ways to adapt your behavior. 
For each adaptation, explain:
1. What aspect of your behavior needs to change
2. How you will change it
3. How you will measure if the adaptation is successful

Format your response as a JSON object with "adaptations" as a list of objects."""
            
            try:
                # Generate adaptations
                response = await self.agent.llm_provider.generate(prompt)
                
                # Parse adaptations
                try:
                    data = json.loads(response)
                    adaptations = data.get('adaptations', [])
                except json.JSONDecodeError:
                    # Fallback parsing
                    adaptations = self._extract_adaptations(response)
                
                # Apply adaptations
                for adaptation in adaptations:
                    if isinstance(adaptation, dict) and 'aspect' in adaptation and 'change' in adaptation:
                        key = adaptation['aspect']
                        value = adaptation['change']
                        self.adaptation_rules[key] = value
                
                logger.info(f"Agent {self.agent.name} adapted based on feedback")
                return True
                
            except Exception as e:
                logger.error(f"Error during adaptation: {str(e)}", exc_info=True)
                return False
                
        elif isinstance(feedback, dict):
            # Structured feedback
            for key, value in feedback.items():
                self.adaptation_rules[key] = value
            
            logger.info(f"Agent {self.agent.name} adapted based on structured feedback")
            return True
            
        return False
    
    def should_reflect(self) -> bool:
        """
        Check if it's time for reflection.
        
        Returns:
            True if it's time for reflection, False otherwise
        """
        # Check if we have enough experiences
        if len(self.experience_history) < self.min_experiences:
            return False
        
        # Check if it's been long enough since the last reflection
        if not self.last_reflection_time:
            return True
        
        time_since_last = datetime.now() - self.last_reflection_time
        return time_since_last > timedelta(minutes=self.reflection_interval)
    
    def get_adaptations(self) -> Dict[str, Any]:
        """
        Get the current adaptation rules.
        
        Returns:
            Dictionary of adaptation rules
        """
        return self.adaptation_rules
    
    def get_insights(self) -> Dict[str, Any]:
        """
        Get the current insights.
        
        Returns:
            Dictionary of insights
        """
        return self.insights
    
    def _create_reflection_prompt(self, experiences: List[Dict[str, Any]]) -> str:
        """Create a prompt for reflection"""
        # Format experiences
        experiences_str = json.dumps(experiences, indent=2)
        
        return f"""You are {self.agent.name}, an AI agent with the role of {self.agent.role.value}.

I'm going to provide you with your recent experiences, and I want you to reflect on your performance.
Analyze these experiences to identify patterns, strengths, weaknesses, and areas for improvement.

Recent experiences:
{experiences_str}

Please provide:

1. Insights: What patterns do you notice? What are your strengths and weaknesses?

2. Adaptations: How should you adapt your behavior based on these insights?
   For each adaptation, specify:
   - What aspect of your behavior needs to change
   - How you will change it
   - How you will measure success

Format your response as a JSON object with "insights" and "adaptations" as the main keys."""
    
    def _parse_reflection(self, reflection: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Parse reflection into insights and adaptations"""
        try:
            # Try to parse as JSON
            data = json.loads(reflection)
            insights = data.get('insights', {})
            adaptations = data.get('adaptations', {})
            
            # Convert to dict if list
            if isinstance(insights, list):
                insights_dict = {}
                for i, insight in enumerate(insights):
                    if isinstance(insight, dict) and 'aspect' in insight and 'observation' in insight:
                        insights_dict[insight['aspect']] = insight['observation']
                    else:
                        insights_dict[f"insight_{i}"] = insight
                insights = insights_dict
                
            if isinstance(adaptations, list):
                adaptations_dict = {}
                for i, adaptation in enumerate(adaptations):
                    if isinstance(adaptation, dict) and 'aspect' in adaptation and 'change' in adaptation:
                        adaptations_dict[adaptation['aspect']] = adaptation['change']
                    else:
                        adaptations_dict[f"adaptation_{i}"] = adaptation
                adaptations = adaptations_dict
                
            return insights, adaptations
            
        except json.JSONDecodeError:
            # Fallback parsing
            insights = self._extract_insights(reflection)
            adaptations = self._extract_adaptations(reflection)
            return insights, adaptations
    
    def _extract_insights(self, text: str) -> Dict[str, Any]:
        """Extract insights from reflection text"""
        insights = {}
        
        # Look for the Insights section
        if "Insights:" in text or "INSIGHTS:" in text:
            parts = text.split("Insights:" if "Insights:" in text else "INSIGHTS:")
            if len(parts) > 1:
                insights_text = parts[1].split("Adaptations:" if "Adaptations:" in text else "ADAPTATIONS:")[0]
                
                # Extract bullet points or numbered items
                lines = insights_text.strip().split('\n')
                current_key = None
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Check for numbered or bullet points
                    if line.startswith(('-', '*', '•')) or (line[0].isdigit() and line[1:3] in ('. ', ') ')):
                        # Extract the key part (before :)
                        if ':' in line:
                            parts = line.split(':', 1)
                            key = parts[0].strip().lstrip('-*•0123456789.) ')
                            value = parts[1].strip()
                            insights[key] = value
                        else:
                            # No clear key/value, just use the whole line
                            insights[f"insight_{len(insights)}"] = line
        
        return insights
    
    def _extract_adaptations(self, text: str) -> Dict[str, Any]:
        """Extract adaptations from reflection text"""
        adaptations = {}
        
        # Look for the Adaptations section
        if "Adaptations:" in text or "ADAPTATIONS:" in text:
            parts = text.split("Adaptations:" if "Adaptations:" in text else "ADAPTATIONS:")
            if len(parts) > 1:
                adaptations_text = parts[1]
                
                # Extract bullet points or numbered items
                lines = adaptations_text.strip().split('\n')
                current_key = None
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Check for numbered or bullet points
                    if line.startswith(('-', '*', '•')) or (line[0].isdigit() and line[1:3] in ('. ', ') ')):
                        # Extract the key part (before :)
                        if ':' in line:
                            parts = line.split(':', 1)
                            key = parts[0].strip().lstrip('-*•0123456789.) ')
                            value = parts[1].strip()
                            adaptations[key] = value
                        else:
                            # No clear key/value, just use the whole line
                            adaptations[f"adaptation_{len(adaptations)}"] = line
        
        return adaptations
    
    async def cleanup(self) -> None:
        """Clean up the capability"""
        # Nothing specific to clean up
        await super().cleanup()
