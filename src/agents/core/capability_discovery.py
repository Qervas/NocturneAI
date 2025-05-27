"""
Capability Discovery System for NocturneAI.

This module handles the automatic discovery and registration of agent capabilities,
ensuring that all capabilities (including TeamCoordination and ConsensusBuilding)
are properly loaded and available to agents.
"""

import importlib
import inspect
import logging
import os
import pkgutil
import sys
from typing import Dict, List, Type, Set, Any, Optional

from ..capabilities.base import AgentCapability

logger = logging.getLogger(__name__)


class CapabilityDiscovery:
    """
    A system for discovering and registering agent capabilities dynamically.
    
    This addresses the issue where capabilities like TeamCoordination and 
    ConsensusBuilding were not being properly discovered and registered.
    """
    
    def __init__(self):
        self.registered_capabilities: Dict[str, Type[AgentCapability]] = {}
    
    def discover_capabilities(self, package_paths: List[str]) -> None:
        """
        Discover all capability classes in the specified packages.
        
        Args:
            package_paths: List of package paths to search for capabilities
        """
        for package_path in package_paths:
            try:
                # Convert package path to module path
                package_name = package_path.replace('/', '.')
                
                # Import the package
                package = importlib.import_module(package_name)
                
                # Get the package directory
                package_dir = os.path.dirname(package.__file__)
                
                # Discover all modules in the package
                for _, module_name, is_pkg in pkgutil.iter_modules([package_dir]):
                    # Skip __pycache__ and other special directories
                    if module_name.startswith('__'):
                        continue
                    
                    # Import the module
                    full_module_name = f"{package_name}.{module_name}"
                    try:
                        module = importlib.import_module(full_module_name)
                        
                        # Find all classes in the module that are AgentCapability subclasses
                        for name, obj in inspect.getmembers(module, inspect.isclass):
                            if (issubclass(obj, AgentCapability) and 
                                    obj.__module__ == full_module_name and
                                    obj != AgentCapability):
                                # Register the capability
                                self.register_capability(name, obj)
                                logger.debug(f"Discovered capability: {name} in {full_module_name}")
                    except (ImportError, AttributeError) as e:
                        logger.warning(f"Error importing module {full_module_name}: {e}")
                
                # If the package itself is a package, recursively discover capabilities
                if is_pkg:
                    self.discover_capabilities([f"{package_name}.{subpkg}" for subpkg in package.__path__])
                    
            except (ImportError, AttributeError) as e:
                logger.warning(f"Error discovering capabilities in {package_path}: {e}")
    
    def register_capability(self, name: str, capability_class: Type[AgentCapability]) -> None:
        """
        Register a capability class.
        
        Args:
            name: Name of the capability
            capability_class: The capability class to register
        """
        if name in self.registered_capabilities:
            logger.warning(f"Capability {name} already registered, overwriting")
        
        self.registered_capabilities[name] = capability_class
        logger.debug(f"Registered capability: {name}")
    
    def get_capability_class(self, name: str) -> Optional[Type[AgentCapability]]:
        """
        Get a capability class by name.
        
        Args:
            name: Name of the capability
            
        Returns:
            The capability class if found, None otherwise
        """
        return self.registered_capabilities.get(name)
    
    def get_all_capability_classes(self) -> Dict[str, Type[AgentCapability]]:
        """
        Get all registered capability classes.
        
        Returns:
            Dictionary of capability name to capability class
        """
        return self.registered_capabilities.copy()
    
    def create_capability_instance(self, 
                                 name: str, 
                                 agent_id: Optional[str] = None,
                                 **kwargs) -> Optional[AgentCapability]:
        """
        Create an instance of a capability by name.
        
        Args:
            name: Name of the capability
            agent_id: Optional agent ID to assign
            **kwargs: Additional arguments to pass to the capability constructor
            
        Returns:
            An instance of the capability if found, None otherwise
        """
        capability_class = self.get_capability_class(name)
        if not capability_class:
            logger.warning(f"Capability {name} not found")
            return None
        
        try:
            # Check if the capability constructor accepts agent_id
            sig = inspect.signature(capability_class.__init__)
            if 'agent_id' in sig.parameters:
                # Pass agent_id if the constructor accepts it
                capability = capability_class(agent_id=agent_id, **kwargs)
            else:
                # Otherwise, just use the kwargs
                capability = capability_class(**kwargs)
            
            return capability
        except Exception as e:
            logger.error(f"Error creating capability {name}: {e}")
            return None
