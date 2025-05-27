"""
Configuration management for the agent system.

This module provides a centralized configuration system for defining and accessing
agent settings, role definitions, thinking strategies, and other system parameters.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Set, Tuple, Union
from enum import Enum, auto
import yaml
from pathlib import Path

logger = logging.getLogger(__name__)

# Default configuration directories
DEFAULT_CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config")
DEFAULT_CONFIG_FILE = os.path.join(DEFAULT_CONFIG_DIR, "agent_config.yaml")

class ConfigurationManager:
    """
    Central configuration manager for the agent system.
    
    This class provides methods for loading, accessing, and modifying
    system-wide configuration settings.
    """
    
    def __init__(self, config_file: Optional[str] = None):
        """Initialize the configuration manager"""
        self.config_file = config_file or DEFAULT_CONFIG_FILE
        self.config: Dict[str, Any] = {}
        self.load_config()
    
    def load_config(self) -> None:
        """Load configuration from the config file"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    if self.config_file.endswith('.yaml') or self.config_file.endswith('.yml'):
                        self.config = yaml.safe_load(f)
                    elif self.config_file.endswith('.json'):
                        self.config = json.load(f)
                    else:
                        logger.warning(f"Unsupported config file format: {self.config_file}")
                        self._load_default_config()
                logger.info(f"Loaded configuration from {self.config_file}")
            else:
                logger.warning(f"Config file not found: {self.config_file}")
                self._load_default_config()
        except Exception as e:
            logger.error(f"Error loading config file: {str(e)}", exc_info=True)
            self._load_default_config()
    
    def _load_default_config(self) -> None:
        """Load default configuration settings"""
        self.config = {
            "agent_roles": {
                "COORDINATOR": {
                    "name": "COORDINATOR",
                    "description": "Manages tasks and coordinates agent activities",
                    "prompt_template": """As a coordinator, your primary responsibility is to manage tasks, 
                        delegate work to appropriate agents, and ensure smooth collaboration.
                        You should maintain a high-level view of ongoing work and make decisions 
                        about resource allocation and prioritization."""
                },
                "PLANNER": {
                    "name": "PLANNER",
                    "description": "Creates strategic plans and breaks down problems",
                    "prompt_template": """As a planner, your primary responsibility is to create 
                        detailed plans and strategies for achieving goals. You should break down 
                        complex tasks into manageable steps and identify dependencies and risks."""
                },
                "RESEARCHER": {
                    "name": "RESEARCHER",
                    "description": "Gathers and analyzes information",
                    "prompt_template": """As a researcher, your primary responsibility is to 
                        gather and analyze information on various topics. You should evaluate 
                        sources, identify key insights, and synthesize information into useful knowledge."""
                },
                "EXECUTOR": {
                    "name": "EXECUTOR",
                    "description": "Implements solutions and executes tasks",
                    "prompt_template": """As an executor, your primary responsibility is to 
                        implement plans and perform specific tasks. You should focus on efficiency, 
                        accuracy, and delivering high-quality results."""
                },
                "REVIEWER": {
                    "name": "REVIEWER",
                    "description": "Evaluates work and provides critical feedback",
                    "prompt_template": """As a reviewer, your primary responsibility is to 
                        evaluate work and provide feedback. You should be critical but constructive, 
                        identifying both strengths and areas for improvement."""
                },
                "ASSISTANT": {
                    "name": "ASSISTANT",
                    "description": "Helps users and provides information",
                    "prompt_template": """As an assistant, your primary responsibility is to help users 
                        and provide information. You should be helpful, informative, and user-focused."""
                }
            },
            "thinking_strategies": {
                "REACTIVE": {
                    "name": "REACTIVE",
                    "description": "Quick responses with minimal planning",
                    "prompt_template": """Focus on providing immediate responses based on the 
                        current request without extensive deliberation.""",
                    "reasoning_mode": "SEQUENTIAL"
                },
                "PLANNING": {
                    "name": "PLANNING",
                    "description": "Deliberate planning before action",
                    "prompt_template": """Approach problems by creating structured plans with 
                        clear steps toward defined goals.""",
                    "reasoning_mode": "TREE"
                },
                "REFLECTIVE": {
                    "name": "REFLECTIVE",
                    "description": "Reflection on past experiences",
                    "prompt_template": """Before responding, reflect on past experiences, relevant 
                        context, and potential implications of your response.""",
                    "reasoning_mode": "REFLECTIVE"
                },
                "CREATIVE": {
                    "name": "CREATIVE",
                    "description": "Focus on novel or innovative solutions",
                    "prompt_template": """Emphasize novel, innovative approaches and solutions, 
                        even if they are unconventional.""",
                    "reasoning_mode": "TREE"
                },
                "CRITICAL": {
                    "name": "CRITICAL",
                    "description": "Focus on evaluation and assessment",
                    "prompt_template": """Carefully evaluate information, identify assumptions, 
                        and consider alternative explanations and approaches.""",
                    "reasoning_mode": "SOCRATIC"
                },
                "COLLABORATIVE": {
                    "name": "COLLABORATIVE",
                    "description": "Focus on working with others",
                    "prompt_template": """Prioritize effective collaboration with other agents, 
                        sharing information and coordinating actions toward common goals.""",
                    "reasoning_mode": "SEQUENTIAL"
                }
            },
            "reasoning_modes": {
                "SEQUENTIAL": {
                    "name": "SEQUENTIAL",
                    "description": "Step-by-step reasoning",
                    "max_steps": 5
                },
                "TREE": {
                    "name": "TREE",
                    "description": "Tree-based reasoning with multiple branches",
                    "max_branches": 3,
                    "max_depth": 2
                },
                "REFLECTIVE": {
                    "name": "REFLECTIVE",
                    "description": "Reflective reasoning with self-critique",
                    "max_iterations": 3
                },
                "SOCRATIC": {
                    "name": "SOCRATIC",
                    "description": "Question-based exploration",
                    "max_questions": 5
                },
                "COT": {
                    "name": "COT",
                    "description": "Chain-of-thought reasoning",
                    "max_steps": 5
                },
                "DIALECTICAL": {
                    "name": "DIALECTICAL",
                    "description": "Thesis-antithesis-synthesis reasoning",
                    "max_iterations": 3
                }
            },
            "llm_providers": {
                "openai": {
                    "name": "openai",
                    "description": "OpenAI API for LLM access",
                    "default_model": "gpt-3.5-turbo",
                    "timeout": 30,
                    "max_tokens": 1000
                },
                "local": {
                    "name": "local",
                    "description": "Local LLM via Ollama",
                    "default_model": "gemma3",
                    "timeout": 60,
                    "max_tokens": 2000
                }
            },
            "system_settings": {
                "log_level": "INFO",
                "memory_persistence": True,
                "memory_dir": "./data/memory",
                "default_expertise_level": 0.5,
                "default_expertise_confidence": 0.5
            }
        }
        
        logger.info("Loaded default configuration")
    
    def save_config(self, config_file: Optional[str] = None) -> bool:
        """Save the current configuration to a file"""
        target_file = config_file or self.config_file
        
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(target_file), exist_ok=True)
            
            with open(target_file, 'w') as f:
                if target_file.endswith('.yaml') or target_file.endswith('.yml'):
                    yaml.dump(self.config, f, default_flow_style=False)
                elif target_file.endswith('.json'):
                    json.dump(self.config, f, indent=2)
                else:
                    logger.warning(f"Unsupported config file format: {target_file}")
                    return False
                
            logger.info(f"Saved configuration to {target_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving config file: {str(e)}", exc_info=True)
            return False
    
    def get_agent_role(self, role_name: str) -> Dict[str, Any]:
        """Get configuration for a specific agent role"""
        roles = self.config.get("agent_roles", {})
        role = roles.get(role_name)
        
        if not role:
            logger.warning(f"Role not found: {role_name}")
            # Return a default role
            return {
                "name": role_name,
                "description": "Generic agent role",
                "prompt_template": "You are a helpful assistant."
            }
        
        return role
    
    def get_thinking_strategy(self, strategy_name: str) -> Dict[str, Any]:
        """Get configuration for a specific thinking strategy"""
        strategies = self.config.get("thinking_strategies", {})
        strategy = strategies.get(strategy_name)
        
        if not strategy:
            logger.warning(f"Thinking strategy not found: {strategy_name}")
            # Return a default strategy
            return {
                "name": strategy_name,
                "description": "Generic thinking strategy",
                "prompt_template": "Think step by step.",
                "reasoning_mode": "SEQUENTIAL"
            }
        
        return strategy
    
    def get_reasoning_mode(self, mode_name: str) -> Dict[str, Any]:
        """Get configuration for a specific reasoning mode"""
        modes = self.config.get("reasoning_modes", {})
        mode = modes.get(mode_name)
        
        if not mode:
            logger.warning(f"Reasoning mode not found: {mode_name}")
            # Return a default mode
            return {
                "name": mode_name,
                "description": "Generic reasoning mode",
                "max_steps": 5
            }
        
        return mode
    
    def get_llm_provider(self, provider_name: str) -> Dict[str, Any]:
        """Get configuration for a specific LLM provider"""
        providers = self.config.get("llm_providers", {})
        provider = providers.get(provider_name)
        
        if not provider:
            logger.warning(f"LLM provider not found: {provider_name}")
            # Return a default provider
            return {
                "name": provider_name,
                "description": "Generic LLM provider",
                "default_model": "gpt-3.5-turbo",
                "timeout": 30,
                "max_tokens": 1000
            }
        
        return provider
    
    def get_system_setting(self, setting_name: str, default_value: Any = None) -> Any:
        """Get a specific system setting"""
        settings = self.config.get("system_settings", {})
        return settings.get(setting_name, default_value)
    
    def update_agent_role(self, role_name: str, role_config: Dict[str, Any]) -> None:
        """Update configuration for a specific agent role"""
        if "agent_roles" not in self.config:
            self.config["agent_roles"] = {}
            
        self.config["agent_roles"][role_name] = role_config
    
    def update_thinking_strategy(self, strategy_name: str, strategy_config: Dict[str, Any]) -> None:
        """Update configuration for a specific thinking strategy"""
        if "thinking_strategies" not in self.config:
            self.config["thinking_strategies"] = {}
            
        self.config["thinking_strategies"][strategy_name] = strategy_config
    
    def update_reasoning_mode(self, mode_name: str, mode_config: Dict[str, Any]) -> None:
        """Update configuration for a specific reasoning mode"""
        if "reasoning_modes" not in self.config:
            self.config["reasoning_modes"] = {}
            
        self.config["reasoning_modes"][mode_name] = mode_config
    
    def update_llm_provider(self, provider_name: str, provider_config: Dict[str, Any]) -> None:
        """Update configuration for a specific LLM provider"""
        if "llm_providers" not in self.config:
            self.config["llm_providers"] = {}
            
        self.config["llm_providers"][provider_name] = provider_config
    
    def update_system_setting(self, setting_name: str, value: Any) -> None:
        """Update a specific system setting"""
        if "system_settings" not in self.config:
            self.config["system_settings"] = {}
            
        self.config["system_settings"][setting_name] = value
    
    def get_all_agent_roles(self) -> Dict[str, Dict[str, Any]]:
        """Get all configured agent roles"""
        return self.config.get("agent_roles", {})
    
    def get_all_thinking_strategies(self) -> Dict[str, Dict[str, Any]]:
        """Get all configured thinking strategies"""
        return self.config.get("thinking_strategies", {})
    
    def get_all_reasoning_modes(self) -> Dict[str, Dict[str, Any]]:
        """Get all configured reasoning modes"""
        return self.config.get("reasoning_modes", {})
    
    def get_all_llm_providers(self) -> Dict[str, Dict[str, Any]]:
        """Get all configured LLM providers"""
        return self.config.get("llm_providers", {})
    
    def get_all_system_settings(self) -> Dict[str, Any]:
        """Get all system settings"""
        return self.config.get("system_settings", {})

# Singleton instance
_config_manager = None

def get_config_manager(config_file: Optional[str] = None) -> ConfigurationManager:
    """Get the singleton configuration manager instance"""
    global _config_manager
    if _config_manager is None or config_file:
        _config_manager = ConfigurationManager(config_file)
    return _config_manager
