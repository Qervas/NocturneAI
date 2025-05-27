"""
Advanced reasoning capabilities for agents.

This module provides various reasoning strategies and capabilities
that can be used by intelligent agents to improve their decision-making,
problem-solving, and planning abilities.
"""

from typing import Dict, List, Any, Optional, Tuple, Union
from enum import Enum, auto
import logging
import json
import re
import ast
import asyncio
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ReasoningMode(Enum):
    """Different reasoning modes that agents can employ"""
    SEQUENTIAL = auto()       # Step-by-step reasoning
    TREE = auto()             # Tree-based reasoning
    REFLECTIVE = auto()       # Reflective reasoning
    COT = auto()              # Chain-of-thought reasoning
    SOCRATIC = auto()         # Socratic reasoning
    DIALECTICAL = auto()      # Dialectical reasoning
    COUNTERFACTUAL = auto()   # Counterfactual reasoning
    ANALOGICAL = auto()       # Analogical reasoning
    ABDUCTIVE = auto()        # Abductive reasoning

class ReasoningStep:
    """A single step in a reasoning process"""
    
    def __init__(self, 
                content: str, 
                step_type: str = "thinking",
                metadata: Optional[Dict[str, Any]] = None):
        """Initialize a reasoning step"""
        self.content = content
        self.step_type = step_type
        self.metadata = metadata or {}
        self.timestamp = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the reasoning step to a dictionary"""
        return {
            "content": self.content,
            "step_type": self.step_type,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat()
        }

class ReasoningChain:
    """A chain of reasoning steps"""
    
    def __init__(self, 
                title: str, 
                reasoning_mode: ReasoningMode = ReasoningMode.SEQUENTIAL,
                metadata: Optional[Dict[str, Any]] = None):
        """Initialize a reasoning chain"""
        self.title = title
        self.reasoning_mode = reasoning_mode
        self.metadata = metadata or {}
        self.steps: List[ReasoningStep] = []
        self.created_at = datetime.now(timezone.utc)
        self.updated_at = self.created_at
    
    def add_step(self, step: Union[ReasoningStep, str]) -> ReasoningStep:
        """Add a step to the reasoning chain"""
        if isinstance(step, str):
            step = ReasoningStep(content=step)
            
        self.steps.append(step)
        self.updated_at = datetime.now(timezone.utc)
        return step
    
    def get_last_step(self) -> Optional[ReasoningStep]:
        """Get the last step in the reasoning chain"""
        if not self.steps:
            return None
        return self.steps[-1]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the reasoning chain to a dictionary"""
        return {
            "title": self.title,
            "reasoning_mode": self.reasoning_mode.name,
            "metadata": self.metadata,
            "steps": [step.to_dict() for step in self.steps],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    def to_text(self) -> str:
        """Convert the reasoning chain to text format"""
        lines = [f"# {self.title}", ""]
        
        for i, step in enumerate(self.steps, 1):
            lines.append(f"## Step {i}: {step.step_type.capitalize()}")
            lines.append(step.content)
            lines.append("")
            
        return "\n".join(lines)
    
    def __str__(self) -> str:
        """String representation of the reasoning chain"""
        return f"ReasoningChain({self.title}, {len(self.steps)} steps, {self.reasoning_mode.name})"

class SequentialReasoning:
    """
    Sequential reasoning strategy.
    
    This strategy involves breaking down a problem into a sequence
    of steps, where each step builds on the previous ones.
    """
    
    def __init__(self, llm_provider):
        """Initialize sequential reasoning"""
        self.llm_provider = llm_provider
    
    async def reason(self, 
                    problem: str, 
                    context: Optional[Dict[str, Any]] = None, 
                    max_steps: int = 5) -> ReasoningChain:
        """
        Perform sequential reasoning about a problem.
        
        Args:
            problem: The problem to reason about
            context: Additional context for the reasoning
            max_steps: Maximum number of reasoning steps
            
        Returns:
            A reasoning chain with the reasoning steps
        """
        context = context or {}
        chain = ReasoningChain(
            title=f"Sequential reasoning about: {problem[:50]}..." if len(problem) > 50 else problem,
            reasoning_mode=ReasoningMode.SEQUENTIAL
        )
        
        # Initial reasoning step
        prompt = f"""
Problem: {problem}

Additional context:
{json.dumps(context, indent=2)}

I need to solve this problem step by step. Let me break it down:

Step 1:
"""
        
        response = await self.llm_provider.generate(prompt)
        chain.add_step(ReasoningStep(
            content=response,
            step_type="initial_analysis"
        ))
        
        # Additional reasoning steps
        for i in range(2, max_steps + 1):
            previous_steps = "\n\n".join([
                f"Step {j}: {step.content}" 
                for j, step in enumerate(chain.steps, 1)
            ])
            
            prompt = f"""
Problem: {problem}

Previous reasoning:
{previous_steps}

Step {i}:
"""
            
            response = await self.llm_provider.generate(prompt)
            chain.add_step(ReasoningStep(
                content=response,
                step_type=f"step_{i}"
            ))
        
        # Final conclusion
        previous_steps = "\n\n".join([
            f"Step {j}: {step.content}" 
            for j, step in enumerate(chain.steps, 1)
        ])
        
        prompt = f"""
Problem: {problem}

My reasoning process:
{previous_steps}

Based on this reasoning, my conclusion is:
"""
        
        response = await self.llm_provider.generate(prompt)
        chain.add_step(ReasoningStep(
            content=response,
            step_type="conclusion"
        ))
        
        return chain

class TreeReasoning:
    """
    Tree-based reasoning strategy.
    
    This strategy explores multiple branches of reasoning,
    creating a tree-like structure of thoughts.
    """
    
    def __init__(self, llm_provider):
        """Initialize tree reasoning"""
        self.llm_provider = llm_provider
    
    async def reason(self, 
                    problem: str, 
                    context: Optional[Dict[str, Any]] = None, 
                    max_branches: int = 3,
                    max_depth: int = 2) -> ReasoningChain:
        """
        Perform tree-based reasoning about a problem.
        
        Args:
            problem: The problem to reason about
            context: Additional context for the reasoning
            max_branches: Maximum number of branches to explore
            max_depth: Maximum depth of the reasoning tree
            
        Returns:
            A reasoning chain with the reasoning steps
        """
        context = context or {}
        chain = ReasoningChain(
            title=f"Tree reasoning about: {problem[:50]}..." if len(problem) > 50 else problem,
            reasoning_mode=ReasoningMode.TREE
        )
        
        # Initial problem statement
        chain.add_step(ReasoningStep(
            content=problem,
            step_type="problem"
        ))
        
        # Generate initial branches
        prompt = f"""
Problem: {problem}

Additional context:
{json.dumps(context, indent=2)}

I need to explore different approaches to solve this problem. Let me consider {max_branches} different approaches:

Approach 1:
"""
        
        response = await self.llm_provider.generate(prompt)
        approaches = self._parse_approaches(response, max_branches)
        
        # Add initial branches
        for i, approach in enumerate(approaches, 1):
            chain.add_step(ReasoningStep(
                content=approach,
                step_type=f"approach_{i}",
                metadata={"branch": i, "depth": 1}
            ))
        
        # Explore each branch further if depth > 1
        if max_depth > 1:
            for i, approach in enumerate(approaches, 1):
                # For each branch, explore consequences or next steps
                prompt = f"""
Problem: {problem}

Approach {i}: {approach}

Let me explore this approach further. What are the implications, consequences, or next steps for this approach?

Further analysis:
"""
                
                response = await self.llm_provider.generate(prompt)
                chain.add_step(ReasoningStep(
                    content=response,
                    step_type=f"analysis_{i}",
                    metadata={"branch": i, "depth": 2}
                ))
        
        # Final evaluation of all branches
        branches_text = "\n\n".join([
            f"Approach {i}: {step.content}" 
            for i, step in enumerate(chain.steps[1:max_branches+1], 1)
        ])
        
        if max_depth > 1:
            for i in range(1, len(approaches) + 1):
                analysis_steps = [
                    step for step in chain.steps 
                    if step.metadata.get("branch") == i and step.metadata.get("depth") == 2
                ]
                
                if analysis_steps:
                    branches_text += f"\n\nFurther analysis of Approach {i}:\n{analysis_steps[0].content}"
        
        prompt = f"""
Problem: {problem}

I've explored these different approaches:

{branches_text}

Considering all these approaches, my evaluation and final conclusion is:
"""
        
        response = await self.llm_provider.generate(prompt)
        chain.add_step(ReasoningStep(
            content=response,
            step_type="evaluation",
            metadata={"depth": max_depth + 1}
        ))
        
        return chain
    
    def _parse_approaches(self, text, max_branches: int) -> List[str]:
        """Parse different approaches from text"""
        # Convert LLMResponse or other response objects to string if needed
        if hasattr(text, 'content'):
            text_content = text.content
        elif hasattr(text, '__str__'):
            text_content = str(text)
        else:
            text_content = text
            
        # Simple parsing based on line breaks and numbered list indicators
        approaches = []
        current_approach = ""
        
        for line in text_content.split("\n"):
            # Check if this line starts a new approach
            if re.match(r"^(Approach\s+\d+:|^\d+\.|^\-\s)", line.strip()):
                if current_approach:
                    approaches.append(current_approach.strip())
                    if len(approaches) >= max_branches:
                        break
                current_approach = line
            else:
                current_approach += "\n" + line
        
        # Add the last approach
        if current_approach and len(approaches) < max_branches:
            approaches.append(current_approach.strip())
        
        # If we couldn't parse properly, split the text roughly
        if not approaches:
            chunk_size = len(text_content) // max_branches if len(text_content) > 0 else 1
            approaches = [text_content[i:i+chunk_size].strip() for i in range(0, len(text_content), chunk_size)]
            approaches = approaches[:max_branches]
        
        return approaches

class ReflectiveReasoning:
    """
    Reflective reasoning strategy.
    
    This strategy involves reflecting on the reasoning process itself,
    critiquing assumptions, and refining the approach.
    """
    
    def __init__(self, llm_provider):
        """Initialize reflective reasoning"""
        self.llm_provider = llm_provider
    
    async def reason(self, 
                    problem: str, 
                    context: Optional[Dict[str, Any]] = None, 
                    max_iterations: int = 3) -> ReasoningChain:
        """
        Perform reflective reasoning about a problem.
        
        Args:
            problem: The problem to reason about
            context: Additional context for the reasoning
            max_iterations: Maximum number of reflection iterations
            
        Returns:
            A reasoning chain with the reasoning steps
        """
        context = context or {}
        chain = ReasoningChain(
            title=f"Reflective reasoning about: {problem[:50]}..." if len(problem) > 50 else problem,
            reasoning_mode=ReasoningMode.REFLECTIVE
        )
        
        # Initial reasoning
        prompt = f"""
Problem: {problem}

Additional context:
{json.dumps(context, indent=2)}

Let me think about how to solve this problem:
"""
        
        response = await self.llm_provider.generate(prompt)
        chain.add_step(ReasoningStep(
            content=response,
            step_type="initial_reasoning"
        ))
        
        # Reflection iterations
        for i in range(1, max_iterations + 1):
            previous_reasoning = chain.steps[-1].content
            
            prompt = f"""
Problem: {problem}

My previous reasoning:
{previous_reasoning}

Let me reflect on my reasoning. What assumptions am I making? What perspectives am I missing? How can I improve my approach?

Reflection:
"""
            
            reflection = await self.llm_provider.generate(prompt)
            chain.add_step(ReasoningStep(
                content=reflection,
                step_type=f"reflection_{i}"
            ))
            
            # Refined reasoning based on reflection
            prompt = f"""
Problem: {problem}

My previous reasoning:
{previous_reasoning}

My reflection:
{reflection}

Given this reflection, let me revise my approach:
"""
            
            revised_reasoning = await self.llm_provider.generate(prompt)
            chain.add_step(ReasoningStep(
                content=revised_reasoning,
                step_type=f"revised_reasoning_{i}"
            ))
        
        # Final conclusion
        prompt = f"""
Problem: {problem}

My reasoning process:
{chain.steps[-1].content}

Based on my reasoning and reflections, my final conclusion is:
"""
        
        response = await self.llm_provider.generate(prompt)
        chain.add_step(ReasoningStep(
            content=response,
            step_type="conclusion"
        ))
        
        return chain

class SocraticReasoning:
    """
    Socratic reasoning strategy.
    
    This strategy uses a series of questions to explore a problem,
    leading to deeper understanding through inquiry.
    """
    
    def __init__(self, llm_provider):
        """Initialize Socratic reasoning"""
        self.llm_provider = llm_provider
    
    async def reason(self, 
                    problem: str, 
                    context: Optional[Dict[str, Any]] = None, 
                    max_questions: int = 5) -> ReasoningChain:
        """
        Perform Socratic reasoning about a problem.
        
        Args:
            problem: The problem to reason about
            context: Additional context for the reasoning
            max_questions: Maximum number of questions to explore
            
        Returns:
            A reasoning chain with the reasoning steps
        """
        context = context or {}
        chain = ReasoningChain(
            title=f"Socratic reasoning about: {problem[:50]}..." if len(problem) > 50 else problem,
            reasoning_mode=ReasoningMode.SOCRATIC
        )
        
        # Initial problem statement
        chain.add_step(ReasoningStep(
            content=problem,
            step_type="problem"
        ))
        
        # Generate initial questions
        prompt = f"""
Problem: {problem}

Additional context:
{json.dumps(context, indent=2)}

I'll use the Socratic method to explore this problem. What are the key questions I should ask to better understand this problem?

Questions:
"""
        
        response = await self.llm_provider.generate(prompt)
        questions = self._parse_questions(response, max_questions)
        
        # Add questions
        for i, question in enumerate(questions, 1):
            chain.add_step(ReasoningStep(
                content=question,
                step_type=f"question_{i}"
            ))
            
            # Generate answer for each question
            prompt = f"""
Problem: {problem}

Question: {question}

Let me explore this question:
"""
            
            answer = await self.llm_provider.generate(prompt)
            chain.add_step(ReasoningStep(
                content=answer,
                step_type=f"answer_{i}"
            ))
        
        # Final synthesis
        questions_and_answers = ""
        for i in range(len(questions)):
            q_idx = i * 2
            a_idx = q_idx + 1
            
            if q_idx + 1 < len(chain.steps) and a_idx + 1 < len(chain.steps):
                questions_and_answers += f"Question: {chain.steps[q_idx + 1].content}\n"
                questions_and_answers += f"Answer: {chain.steps[a_idx + 1].content}\n\n"
        
        prompt = f"""
Problem: {problem}

I've explored the following questions and answers:

{questions_and_answers}

Based on this Socratic exploration, my synthesis and conclusion is:
"""
        
        response = await self.llm_provider.generate(prompt)
        chain.add_step(ReasoningStep(
            content=response,
            step_type="synthesis"
        ))
        
        return chain
    
    def _parse_questions(self, text, max_questions: int) -> List[str]:
        """Parse questions from text"""
        # Convert LLMResponse or other response objects to string if needed
        if hasattr(text, 'content'):
            text_content = text.content
        elif hasattr(text, '__str__'):
            text_content = str(text)
        else:
            text_content = text
            
        # Simple parsing based on line breaks and question marks
        questions = []
        
        for line in text_content.split("\n"):
            line = line.strip()
            if line and "?" in line:
                # Extract the question part (everything up to and including the question mark)
                question_match = re.search(r"^.*?\?", line)
                if question_match:
                    questions.append(question_match.group(0).strip())
                else:
                    questions.append(line)
                
                if len(questions) >= max_questions:
                    break
        
        # If we couldn't extract enough questions with question marks,
        # just take the first max_questions lines
        if len(questions) < max_questions:
            for line in text_content.split("\n"):
                line = line.strip()
                if line and line not in questions:
                    questions.append(line)
                    if len(questions) >= max_questions:
                        break
        
        return questions[:max_questions]

class ReasoningFactory:
    """
    Factory for creating reasoning strategies.
    
    This factory provides methods for creating different reasoning
    strategies based on the desired reasoning mode.
    """
    
    @staticmethod
    def create_reasoning_strategy(reasoning_mode: ReasoningMode, llm_provider):
        """
        Create a reasoning strategy.
        
        Args:
            reasoning_mode: The desired reasoning mode
            llm_provider: The LLM provider to use for reasoning
            
        Returns:
            A reasoning strategy instance
        """
        if reasoning_mode == ReasoningMode.SEQUENTIAL:
            return SequentialReasoning(llm_provider)
        elif reasoning_mode == ReasoningMode.TREE:
            return TreeReasoning(llm_provider)
        elif reasoning_mode == ReasoningMode.REFLECTIVE:
            return ReflectiveReasoning(llm_provider)
        elif reasoning_mode == ReasoningMode.SOCRATIC:
            return SocraticReasoning(llm_provider)
        elif reasoning_mode == ReasoningMode.COT:
            # Chain-of-thought is similar to sequential
            return SequentialReasoning(llm_provider)
        else:
            # Default to sequential reasoning
            logger.warning(f"Reasoning mode {reasoning_mode} not implemented, defaulting to sequential")
            return SequentialReasoning(llm_provider)
