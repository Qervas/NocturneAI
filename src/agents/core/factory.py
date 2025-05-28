"""
Agent Factory for NocturneAI.

The factory handles dynamic creation and configuration of agents with
modular capabilities based on configuration or runtime requirements.
"""

import asyncio
import logging
import importlib
import inspect
from typing import Dict, Any, List, Optional, Set, Type, Union
import yaml
import os
import json

from .modular_agent import ModularAgent
from .registry import AgentRegistry
from .types import AgentRole, AgentCapability
from ...llm import BaseLLMProvider, get_llm_provider

logger = logging.getLogger(__name__)


class AgentFactory:
    """
    Factory for creating and configuring agents dynamically.
    
    The AgentFactory enables dynamic creation of agents with modular capabilities,
    supporting both configuration-based and runtime-based agent composition.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the agent factory.
        
        Args:
            config_path: Optional path to agent configuration file
        """
        self.registry = AgentRegistry()
        self.config_path = config_path
        self.capability_classes: Dict[AgentCapability, Dict[str, Type]] = {
            capability: {} for capability in AgentCapability
        }
        
        # Load configuration if provided
        self.config: Dict[str, Any] = {}
        if config_path and os.path.exists(config_path):
            self._load_config(config_path)
        
        # Auto-discover capabilities in the standard locations
        self.discover_capability_classes("src.agents.capabilities")
        
        logger.info("Agent factory initialized")
    
    def _load_config(self, config_path: str) -> None:
        """
        Load agent configuration from a file.
        
        Args:
            config_path: Path to the configuration file
        """
        try:
            with open(config_path, 'r') as f:
                if config_path.endswith('.yaml') or config_path.endswith('.yml'):
                    self.config = yaml.safe_load(f)
                elif config_path.endswith('.json'):
                    self.config = json.load(f)
                else:
                    logger.warning(f"Unsupported configuration file format: {config_path}")
                    return
                
                logger.info(f"Loaded configuration from {config_path}")
        except Exception as e:
            logger.error(f"Error loading configuration: {str(e)}", exc_info=True)
    
    def discover_capability_classes(self, module_path: str) -> None:
        """
        Discover capability classes in a module and its submodules.
        
        Args:
            module_path: The import path to the module to discover
        """
        try:
            # Import the main module
            module = importlib.import_module(module_path)
            
            # Get all submodules
            submodule_paths = []
            if hasattr(module, '__path__'):
                import pkgutil
                for _, name, _ in pkgutil.iter_modules(module.__path__):
                    submodule_paths.append(f"{module_path}.{name}")
            
            # Register all capability classes in the module
            self._register_capability_classes_in_module(module)
            
            # Process all submodules
            for submodule_path in submodule_paths:
                try:
                    submodule = importlib.import_module(submodule_path)
                    self._register_capability_classes_in_module(submodule)
                except ImportError as e:
                    logger.warning(f"Error importing submodule {submodule_path}: {str(e)}")
        except ImportError as e:
            logger.warning(f"Error importing module {module_path}: {str(e)}")
    
    def _register_capability_classes_in_module(self, module: Any) -> None:
        """
        Register all capability classes in a module.
        
        Args:
            module: The module to search for capability classes
        """
        # Get all classes defined in the module
        for name, obj in inspect.getmembers(module, inspect.isclass):
            # Skip classes defined elsewhere
            if obj.__module__ != module.__name__:
                continue
            
            # Check if it's a capability class
            if hasattr(obj, 'CAPABILITY') and isinstance(obj.CAPABILITY, AgentCapability):
                capability = obj.CAPABILITY
                implementation_name = name.lower()
                
                # Register the capability class
                self.capability_classes[capability][implementation_name] = obj
                logger.debug(f"Registered capability class {name} for {capability}")
    
    def get_capability_class(
        self,
        capability: AgentCapability,
        implementation: Optional[str] = None
    ) -> Optional[Type]:
        """
        Get a capability class by capability type and implementation name.
        
        Args:
            capability: The capability type
            implementation: The implementation name (defaults to first available)
            
        Returns:
            The capability class, or None if not found
        """
        if capability not in self.capability_classes or not self.capability_classes[capability]:
            return None
        
        if implementation:
            # Normalize implementation name
            implementation = implementation.lower()
            return self.capability_classes[capability].get(implementation)
        else:
            # Return the first available implementation
            return next(iter(self.capability_classes[capability].values()), None)
    
    async def create_agent(
        self,
        name: str,
        role: AgentRole,
        llm_provider: BaseLLMProvider,
        capabilities: Optional[Set[Union[AgentCapability, Dict[str, Any]]]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> Optional[ModularAgent]:
        """
        Create an agent with the specified capabilities.
        
        Args:
            name: The name of the agent
            role: The role of the agent
            llm_provider: The LLM provider to use
            capabilities: Set of capabilities to add to the agent
            config: Additional configuration for the agent
            
        Returns:
            The created agent, or None if creation failed
        """
        try:
            # Create the agent
            agent = ModularAgent(
                name=name,
                role=role,
                llm_provider=llm_provider,
                capabilities=set(),
                config=config or {}
            )
            
            # Add capabilities
            if capabilities:
                for cap in capabilities:
                    if isinstance(cap, AgentCapability):
                        # Just add the capability with default implementation
                        cap_class = self.get_capability_class(cap)
                        if cap_class:
                            cap_module = cap_class()
                            await agent.add_capability(cap, cap_module)
                    elif isinstance(cap, dict) and 'type' in cap:
                        # Add the capability with specific implementation and config
                        cap_type = AgentCapability[cap['type'].upper()]
                        impl_name = cap.get('implementation')
                        cap_config = cap.get('config', {})
                        
                        cap_class = self.get_capability_class(cap_type, impl_name)
                        if cap_class:
                            cap_module = cap_class(**cap_config)
                            await agent.add_capability(cap_type, cap_module)
            
            # Initialize the agent
            await agent.initialize()
            
            # Register the agent with the registry
            self.registry.register_agent(agent)
            
            logger.info(f"Created agent {name} with role {role}")
            return agent
        except Exception as e:
            logger.error(f"Error creating agent {name}: {str(e)}", exc_info=True)
            return None
    
    async def create_agents_from_config(self) -> List[ModularAgent]:
        """
        Create agents based on the loaded configuration.
        
        Returns:
            List of created agents
        """
        agents = []
        
        if not self.config or 'agents' not in self.config:
            logger.warning("No agent configurations found")
            return agents
        
        for agent_id, agent_config in self.config['agents'].items():
            agent = await self.create_agent_from_config(agent_id)
            if agent:
                agents.append(agent)
        
        logger.info(f"Created {len(agents)} agents from configuration")
        return agents
    
    async def create_agent_from_config(self, agent_id: str) -> Optional[ModularAgent]:
        """
        Create an agent based on the configuration.
        
        Args:
            agent_id: The agent ID in the configuration
            
        Returns:
            The created agent, or None if creation failed
        """
        if not self.config or 'agents' not in self.config or agent_id not in self.config['agents']:
            logger.warning(f"No configuration found for agent {agent_id}")
            return None
        
        agent_config = self.config['agents'][agent_id]
        
        # Check required fields
        required_fields = ['name', 'role']
        if not all(field in agent_config for field in required_fields):
            logger.warning(f"Agent configuration missing required fields: {agent_config}")
            return None
        
        # Get agent parameters
        name = agent_config['name']
        role = AgentRole[agent_config['role'].upper()]
        
        # Get LLM provider
        provider_config = agent_config.get('llm_provider', {})
        if isinstance(provider_config, str):
            provider = get_llm_provider(provider_config)
        else:
            provider_type = provider_config.get('type', 'openai')
            provider_params = provider_config.get('params', {})
            provider = get_llm_provider(provider_type, **provider_params)
        
        # Get capabilities
        capabilities = set()
        if 'capabilities' in agent_config:
            for cap_config in agent_config['capabilities']:
                if isinstance(cap_config, str):
                    # Simple capability name
                    cap_type = AgentCapability[cap_config.upper()]
                    capabilities.add(cap_type)
                elif isinstance(cap_config, dict) and 'type' in cap_config:
                    # Capability with implementation and config
                    capabilities.add(cap_config)
        
        # Get extra configuration
        config = agent_config.get('config', {})
        
        # Create the agent
        return await self.create_agent(
            name=name,
            role=role,
            llm_provider=provider,
            capabilities=capabilities,
            config=config
        )
    
    async def create_agent_from_template(
        self,
        template_name: str,
        name: Optional[str] = None,
        config_overrides: Optional[Dict[str, Any]] = None,
        capability_overrides: Optional[Dict[AgentCapability, Dict[str, Any]]] = None
    ) -> Optional[ModularAgent]:
        """
        Create an agent from a template.
        
        Args:
            template_name: The name of the template to use
            name: The name of the new agent (defaults to template name)
            config_overrides: Overrides for the agent configuration
            capability_overrides: Overrides for the agent capabilities
            
        Returns:
            The created agent, or None if creation failed
        """
        if not self.config or 'templates' not in self.config or template_name not in self.config['templates']:
            logger.warning(f"No template found for {template_name}")
            return None
        
        template_config = self.config['templates'][template_name]
        
        # Create a new agent configuration
        agent_config = {
            'name': name or f"Agent-{template_name}",
            'role': template_config.get('role', 'ASSISTANT'),
            'llm_provider': template_config.get('llm_provider', {}),
            'capabilities': template_config.get('capabilities', []),
            'config': {
                **template_config.get('config', {}),
                **(config_overrides or {})
            }
        }
        
        # Override capabilities if specified
        if capability_overrides:
            new_capabilities = []
            for cap_config in agent_config['capabilities']:
                if isinstance(cap_config, str):
                    cap_type = AgentCapability[cap_config.upper()]
                    if cap_type in capability_overrides:
                        # Add with overrides
                        new_capabilities.append({
                            'type': cap_type.name.lower(),
                            **capability_overrides[cap_type]
                        })
                    else:
                        # Keep as is
                        new_capabilities.append(cap_config)
                elif isinstance(cap_config, dict) and 'type' in cap_config:
                    cap_type = AgentCapability[cap_config['type'].upper()]
                    if cap_type in capability_overrides:
                        # Add with overrides
                        new_capabilities.append({
                            **cap_config,
                            **capability_overrides[cap_type]
                        })
                    else:
                        # Keep as is
                        new_capabilities.append(cap_config)
            
            agent_config['capabilities'] = new_capabilities
        
        # Create the agent
        return await self.create_agent_from_dict(agent_config)
    
    async def create_agent_from_dict(self, agent_config: Dict[str, Any]) -> Optional[ModularAgent]:
        """
        Create an agent from a dictionary configuration.
        
        Args:
            agent_config: The agent configuration dictionary
            
        Returns:
            The created agent, or None if creation failed
        """
        # Check required fields
        required_fields = ['name', 'role']
        if not all(field in agent_config for field in required_fields):
            logger.warning(f"Agent configuration missing required fields: {agent_config}")
            return None
        
        # Get agent parameters
        name = agent_config['name']
        role = AgentRole[agent_config['role'].upper()] if isinstance(agent_config['role'], str) else agent_config['role']
        
        # Get LLM provider
        provider_config = agent_config.get('llm_provider', {})
        if isinstance(provider_config, str):
            provider = get_llm_provider(provider_config)
        else:
            provider_type = provider_config.get('type', 'openai')
            provider_params = provider_config.get('params', {})
            provider = get_llm_provider(provider_type, **provider_params)
        
        # Get capabilities
        capabilities = set()
        if 'capabilities' in agent_config:
            for cap_config in agent_config['capabilities']:
                if isinstance(cap_config, str):
                    # Simple capability name
                    cap_type = AgentCapability[cap_config.upper()]
                    capabilities.add(cap_type)
                elif isinstance(cap_config, dict) and 'type' in cap_config:
                    # Capability with implementation and config
                    capabilities.add(cap_config)
        
        # Get extra configuration
        config = agent_config.get('config', {})
        
        # Create the agent
        return await self.create_agent(
            name=name,
            role=role,
            llm_provider=provider,
            capabilities=capabilities,
            config=config
        )
    
    async def clone_agent(
        self,
        agent_id: str,
        new_name: str,
        config_overrides: Optional[Dict[str, Any]] = None,
        capability_overrides: Optional[Dict[AgentCapability, Dict[str, Any]]] = None
    ) -> Optional[ModularAgent]:
        """
        Clone an existing agent with optional overrides.
        
        Args:
            agent_id: The ID of the agent to clone
            new_name: The name of the new agent
            config_overrides: Overrides for the agent configuration
            capability_overrides: Overrides for the agent capabilities
            
        Returns:
            The cloned agent, or None if cloning failed
        """
        source_agent = self.registry.get_agent(agent_id)
        if not source_agent:
            logger.warning(f"No agent found with ID {agent_id}")
            return None
        
        try:
            # Create the new agent with the same role and LLM provider
            new_agent = ModularAgent(
                name=new_name,
                role=source_agent.role,
                llm_provider=source_agent.llm_provider,
                capabilities=set(),
                config={**source_agent.config, **(config_overrides or {})}
            )
            
            # Clone capabilities
            for capability in source_agent.capabilities:
                source_module = source_agent.get_capability_module(capability)
                if not source_module:
                    continue
                
                # Check if we have an override for this capability
                if capability_overrides and capability in capability_overrides:
                    # Get the capability class
                    impl_name = capability_overrides[capability].get('implementation')
                    cap_class = self.get_capability_class(capability, impl_name)
                    
                    if not cap_class:
                        # Fall back to copying the source module
                        await new_agent.add_capability(capability, source_module)
                        continue
                    
                    # Create a new module with the overridden configuration
                    cap_config = capability_overrides[capability].get('config', {})
                    cap_module = cap_class(**cap_config)
                    await new_agent.add_capability(capability, cap_module)
                else:
                    # Just copy the source module
                    await new_agent.add_capability(capability, source_module)
            
            # Initialize the agent
            await new_agent.initialize()
            
            # Register the agent with the registry
            self.registry.register_agent(new_agent)
            
            logger.info(f"Cloned agent {source_agent.name} to {new_name}")
            return new_agent
        except Exception as e:
            logger.error(f"Error cloning agent {agent_id}: {str(e)}", exc_info=True)
            return None
