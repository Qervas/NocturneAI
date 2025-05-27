"""
Research workflow implementation.

This module provides specialized workflows for information gathering
and analysis using LLM-powered agents.
"""

from typing import Dict, List, Any, Optional
import logging
import json
from datetime import datetime, timezone
from ..core.llm import BaseLLMProvider, LLMFactory
from .base import BaseWorkflow, WorkflowStep, WorkflowContext, LLMDrivenStep

logger = logging.getLogger(__name__)

class InformationGatheringStep(LLMDrivenStep):
    """Step that gathers information on a topic using an LLM"""
    
    def __init__(self, name: str = "information_gathering", llm_provider = None):
        system_prompt = """You are a research specialist. Your task is to:
1. Identify key information needs based on the research topic
2. Organize needed information into categories
3. Suggest reliable sources for each information category
4. Create specific research questions to answer
5. Outline a research approach

Provide your output in a structured format that can be easily processed."""
        
        super().__init__(
            name=name,
            description="Gather information on a research topic",
            llm_provider=llm_provider,
            system_prompt=system_prompt
        )
    
    def _default_input_formatter(self, context: WorkflowContext) -> str:
        """Format the input for the LLM"""
        # Get the research topic
        topic = context.get_data("research_topic", "Unspecified Topic")
        existing_knowledge = context.get_data("existing_knowledge", [])
        constraints = context.get_data("constraints", [])
        
        # Format existing knowledge
        knowledge_text = "No existing knowledge provided"
        if existing_knowledge:
            knowledge_text = "\n".join([f"- {item}" for item in existing_knowledge])
        
        # Format constraints
        constraints_text = "No constraints specified"
        if constraints:
            constraints_text = "\n".join([f"- {constraint}" for constraint in constraints])
        
        input_text = f"""# Information Gathering for Research Topic: {topic}

## Existing Knowledge:
{knowledge_text}

## Research Constraints:
{constraints_text}

## Gathering Task:
1. Identify key information needs for this topic
2. Organize needed information into logical categories
3. Suggest reliable sources for each information category
4. Create specific research questions to answer
5. Outline a research approach considering the constraints

Please provide your research plan in a structured format with clear sections.
"""
        return input_text
    
    def _default_output_parser(self, output: str, context: WorkflowContext) -> Dict[str, Any]:
        """Parse the LLM output"""
        # Simple parser that extracts structured information from the LLM output
        result = {
            "information_needs": [],
            "categories": [],
            "sources": [],
            "research_questions": [],
            "approach": ""
        }
        
        # Extract information needs
        if "information needs" in output.lower():
            # Look for bullet points or numbered lists after "information needs"
            lines = output.split("\n")
            capturing = False
            for line in lines:
                if "information needs" in line.lower():
                    capturing = True
                elif capturing and (line.strip().startswith("-") or line.strip().startswith("*")):
                    # Extract the item, removing the bullet
                    item = line.strip().lstrip("-*").strip()
                    result["information_needs"].append(item)
                elif capturing and not line.strip():
                    # Empty line, stop capturing
                    capturing = False
        
        # Extract categories
        if "categories" in output.lower():
            # Look for bullet points or numbered lists after "categories"
            lines = output.split("\n")
            capturing = False
            for line in lines:
                if "categories" in line.lower():
                    capturing = True
                elif capturing and (line.strip().startswith("-") or line.strip().startswith("*")):
                    # Extract the item, removing the bullet
                    item = line.strip().lstrip("-*").strip()
                    result["categories"].append(item)
                elif capturing and not line.strip():
                    # Empty line, stop capturing
                    capturing = False
        
        # Extract sources
        if "sources" in output.lower():
            # Look for bullet points or numbered lists after "sources"
            lines = output.split("\n")
            capturing = False
            for line in lines:
                if "sources" in line.lower():
                    capturing = True
                elif capturing and (line.strip().startswith("-") or line.strip().startswith("*")):
                    # Extract the item, removing the bullet
                    item = line.strip().lstrip("-*").strip()
                    result["sources"].append(item)
                elif capturing and not line.strip():
                    # Empty line, stop capturing
                    capturing = False
        
        # Extract research questions
        if "research questions" in output.lower() or "questions" in output.lower():
            # Look for bullet points or numbered lists after "research questions"
            lines = output.split("\n")
            capturing = False
            for line in lines:
                if "research questions" in line.lower() or "questions" in line.lower():
                    capturing = True
                elif capturing and (line.strip().startswith("-") or line.strip().startswith("*") or line.strip().startswith("?")):
                    # Extract the item, removing the bullet
                    item = line.strip().lstrip("-*?").strip()
                    result["research_questions"].append(item)
                elif capturing and not line.strip():
                    # Empty line, stop capturing
                    capturing = False
        
        # Extract approach
        if "approach" in output.lower():
            # Look for text after "approach"
            lines = output.split("\n")
            capturing = False
            approach_text = []
            for line in lines:
                if "approach" in line.lower():
                    capturing = True
                elif capturing and line.strip():
                    # Add the line to the approach text
                    approach_text.append(line.strip())
                elif capturing and not line.strip() and approach_text:
                    # Empty line after we've captured something, stop capturing
                    capturing = False
            
            result["approach"] = " ".join(approach_text)
        
        return result

class InformationAnalysisStep(LLMDrivenStep):
    """Step that analyzes gathered information using an LLM"""
    
    def __init__(self, name: str = "information_analysis", llm_provider = None):
        system_prompt = """You are a research analyst. Your task is to:
1. Analyze the gathered information
2. Identify key insights and patterns
3. Evaluate the reliability and relevance of information
4. Synthesize findings into coherent conclusions
5. Identify gaps or areas needing further research

Provide your output in a structured format with clear sections."""
        
        super().__init__(
            name=name,
            description="Analyze gathered information and identify insights",
            llm_provider=llm_provider,
            system_prompt=system_prompt
        )
    
    def _default_input_formatter(self, context: WorkflowContext) -> str:
        """Format the input for the LLM"""
        # Get the research information
        topic = context.get_data("research_topic", "Unspecified Topic")
        
        # Get information from the previous step
        info_needs = context.get_data("information_gathering.information_needs", [])
        categories = context.get_data("information_gathering.categories", [])
        research_questions = context.get_data("information_gathering.research_questions", [])
        
        # Get research findings
        findings = context.get_data("research_findings", [])
        
        # Format information needs
        info_needs_text = "No information needs identified"
        if info_needs:
            info_needs_text = "\n".join([f"- {need}" for need in info_needs])
        
        # Format categories
        categories_text = "No categories identified"
        if categories:
            categories_text = "\n".join([f"- {category}" for category in categories])
        
        # Format research questions
        questions_text = "No research questions identified"
        if research_questions:
            questions_text = "\n".join([f"- {question}" for question in research_questions])
        
        # Format findings
        findings_text = "No research findings provided"
        if findings:
            findings_text = ""
            for i, finding in enumerate(findings):
                findings_text += f"\n## Finding {i+1}:\n"
                if isinstance(finding, dict):
                    for key, value in finding.items():
                        findings_text += f"- {key}: {value}\n"
                else:
                    findings_text += f"{finding}\n"
        
        input_text = f"""# Information Analysis for Research Topic: {topic}

## Information Needs:
{info_needs_text}

## Information Categories:
{categories_text}

## Research Questions:
{questions_text}

## Research Findings:
{findings_text}

## Analysis Task:
1. Analyze the gathered information in relation to the research questions
2. Identify key insights and patterns in the findings
3. Evaluate the reliability and relevance of the information
4. Synthesize findings into coherent conclusions
5. Identify gaps or areas needing further research

Please provide your analysis in a structured format with clear sections.
"""
        return input_text
    
    def _default_output_parser(self, output: str, context: WorkflowContext) -> Dict[str, Any]:
        """Parse the LLM output"""
        # Simple parser that extracts structured information from the LLM output
        result = {
            "key_insights": [],
            "reliability_assessment": [],
            "conclusions": [],
            "gaps": [],
            "summary": ""
        }
        
        # Extract key insights
        if "insights" in output.lower() or "key insights" in output.lower():
            lines = output.split("\n")
            capturing = False
            for line in lines:
                if "insights" in line.lower():
                    capturing = True
                elif capturing and (line.strip().startswith("-") or line.strip().startswith("*")):
                    # Extract the item, removing the bullet
                    item = line.strip().lstrip("-*").strip()
                    result["key_insights"].append(item)
                elif capturing and not line.strip():
                    # Empty line, stop capturing
                    capturing = False
        
        # Extract reliability assessment
        if "reliability" in output.lower():
            lines = output.split("\n")
            capturing = False
            for line in lines:
                if "reliability" in line.lower():
                    capturing = True
                elif capturing and (line.strip().startswith("-") or line.strip().startswith("*")):
                    # Extract the item, removing the bullet
                    item = line.strip().lstrip("-*").strip()
                    result["reliability_assessment"].append(item)
                elif capturing and not line.strip():
                    # Empty line, stop capturing
                    capturing = False
        
        # Extract conclusions
        if "conclusion" in output.lower():
            lines = output.split("\n")
            capturing = False
            for line in lines:
                if "conclusion" in line.lower():
                    capturing = True
                elif capturing and (line.strip().startswith("-") or line.strip().startswith("*")):
                    # Extract the item, removing the bullet
                    item = line.strip().lstrip("-*").strip()
                    result["conclusions"].append(item)
                elif capturing and not line.strip():
                    # Empty line, stop capturing
                    capturing = False
        
        # Extract gaps
        if "gaps" in output.lower() or "further research" in output.lower():
            lines = output.split("\n")
            capturing = False
            for line in lines:
                if "gaps" in line.lower() or "further research" in line.lower():
                    capturing = True
                elif capturing and (line.strip().startswith("-") or line.strip().startswith("*")):
                    # Extract the item, removing the bullet
                    item = line.strip().lstrip("-*").strip()
                    result["gaps"].append(item)
                elif capturing and not line.strip():
                    # Empty line, stop capturing
                    capturing = False
        
        # Extract summary
        if "summary" in output.lower():
            lines = output.split("\n")
            capturing = False
            summary_text = []
            for line in lines:
                if "summary" in line.lower():
                    capturing = True
                elif capturing and line.strip():
                    # Add the line to the summary text
                    summary_text.append(line.strip())
                elif capturing and not line.strip() and summary_text:
                    # Empty line after we've captured something, stop capturing
                    capturing = False
            
            result["summary"] = " ".join(summary_text)
        
        return result

class ResearchWorkflow(BaseWorkflow):
    """
    Workflow for conducting research using LLM-powered agents.
    
    This workflow takes a research topic as input and produces a structured
    analysis with insights, conclusions, and identified gaps.
    """
    
    def __init__(self, name: str = "research_workflow", llm_provider = None):
        description = "Conduct research on a topic by gathering and analyzing information"
        super().__init__(name, description)
        
        # Create the LLM provider if not provided
        if not llm_provider:
            # Try to create from environment variables
            provider_type = "local"  # Default to local
            provider_config = {"model_name": "gemma3"}
            
            try:
                llm_provider = LLMFactory.create_provider(provider_type, **provider_config)
            except Exception as e:
                logger.warning(f"Failed to create LLM provider: {e}")
        
        # Create workflow steps
        info_gathering_step = InformationGatheringStep(llm_provider=llm_provider)
        info_analysis_step = InformationAnalysisStep(llm_provider=llm_provider)
        
        # Add steps to workflow
        self.add_step(info_gathering_step, is_entry=True)
        self.add_step(info_analysis_step, is_exit=True)
        
        # Add dependencies
        info_analysis_step.add_dependency(info_gathering_step.name)
    
    def create_graph(self) -> Dict[str, Any]:
        """Create a graph representation of the workflow"""
        return {
            "name": self.name,
            "description": self.description,
            "type": "research",
            "steps": [
                {
                    "name": step.name,
                    "description": step.description,
                    "dependencies": step.dependencies
                }
                for step in self.steps.values()
            ]
        }
