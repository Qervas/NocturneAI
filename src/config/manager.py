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
            logger.error(f"Error loading configuration: {str(e)}")
            self._load_default_config()
    
    def _load_default_config(self) -> None:
        """Load default configuration"""
        self.config = {
            "agent_roles": {
                "assistant": {
                    "description": "General purpose assistant role",
                    "capabilities": ["planning", "reflection", "communication"],
                    "expertise_areas": ["general_knowledge", "problem_solving"],
                    "default_thinking_strategy": "sequential"
                },
                "planner": {
                    "description": "Agent specialized in planning and organizing tasks",
                    "capabilities": ["planning", "reflection"],
                    "expertise_areas": ["task_decomposition", "goal_setting"],
                    "default_thinking_strategy": "tree_of_thought"
                },
                "executor": {
                    "description": "Agent specialized in executing specific tasks",
                    "capabilities": ["communication", "search"],
                    "expertise_areas": ["information_retrieval", "task_execution"],
                    "default_thinking_strategy": "sequential"
                }
            },
            "thinking_strategies": {
                "sequential": {
                    "description": "Linear step-by-step thinking",
                    "parameters": {
                        "max_steps": 5,
                        "step_prefix": "Step",
                        "show_intermediate_steps": True
                    }
                },
                "tree_of_thought": {
                    "description": "Explore multiple reasoning paths and evaluate them",
                    "parameters": {
                        "max_branches": 3,
                        "max_depth": 3,
                        "evaluation_strategy": "best_first",
                        "show_discarded_branches": False
                    }
                },
                "chain_of_thought": {
                    "description": "Explicit reasoning with multiple intermediate steps",
                    "parameters": {
                        "max_steps": 5,
                        "reasoning_prefix": "Thinking:",
                        "show_reasoning": True
                    }
                }
            },
            "reasoning_modes": {
                "analytical": {
                    "description": "Logical, step-by-step reasoning",
                    "prompt_modifiers": [
                        "Analyze this systematically.",
                        "Break this down into logical steps.",
                        "Consider all factors carefully."
                    ]
                },
                "creative": {
                    "description": "Innovative, out-of-the-box thinking",
                    "prompt_modifiers": [
                        "Think outside the box.",
                        "Consider unconventional approaches.",
                        "Don't limit yourself to standard solutions."
                    ]
                },
                "critical": {
                    "description": "Evaluate arguments and identify flaws",
                    "prompt_modifiers": [
                        "Critically evaluate all aspects.",
                        "Identify potential flaws or weaknesses.",
                        "Consider alternative perspectives."
                    ]
                }
            },
            "llm_providers": {
                "openai": {
                    "provider_type": "openai",
                    "model_name": "gpt-4",
                    "api_type": "azure",
                    "api_version": "2023-05-15",
                    "temperature": 0.7,
                    "max_tokens": 2000
                },
                "local": {
                    "provider_type": "local",
                    "model_name": "llama3",
                    "base_url": "http://localhost:11434",
                    "temperature": 0.8,
                    "max_tokens": 1000,
                    "options": {
                        "num_ctx": 4096
                    }
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
            logger.error(f"Error saving configuration: {str(e)}")
            return False
    
    def get_agent_role(self, role_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific agent role"""
        agent_roles = self.config.get("agent_roles", {})
        return agent_roles.get(role_name)
    
    def get_thinking_strategy(self, strategy_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific thinking strategy"""
        strategies = self.config.get("thinking_strategies", {})
        return strategies.get(strategy_name)
    
    def get_reasoning_mode(self, mode_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific reasoning mode"""
        modes = self.config.get("reasoning_modes", {})
        return modes.get(mode_name)
    
    def get_llm_provider(self, provider_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific LLM provider"""
        providers = self.config.get("llm_providers", {})
        return providers.get(provider_name)
    
    def get_system_setting(self, setting_name: str, default: Any = None) -> Any:
        """Get a specific system setting"""
        settings = self.config.get("system_settings", {})
        return settings.get(setting_name, default)
    
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
