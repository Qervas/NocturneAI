"""
Configuration management for NocturneAI.

This module provides a centralized configuration system for defining and accessing
agent settings, role definitions, thinking strategies, and other system parameters.
"""

from .manager import (
    ConfigurationManager,
    get_config_manager,
    DEFAULT_CONFIG_DIR,
    DEFAULT_CONFIG_FILE
)

__all__ = [
    'ConfigurationManager',
    'get_config_manager',
    'DEFAULT_CONFIG_DIR',
    'DEFAULT_CONFIG_FILE'
]
