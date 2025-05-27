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

from .agent import Agent
from .registry import AgentRegistry
from .types import AgentRole, AgentCapability
from ...core.llm import BaseLLMProvider, get_llm_provider

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
                    logger.error(f"Unsupported configuration file format: {config_path}")
                    return
            
            logger.info(f"Loaded agent configuration from {config_path}")
        except Exception as e:
            logger.error(f"Error loading agent configuration: {str(e)}", exc_info=True)
    
    def register_capability_class(
        self,
        capability: AgentCapability,
        name: str,
        cls: Type
    ) -> None:
        """
        Register a capability class for a specific capability.
        
        Args:
            capability: The capability type
            name: Name for the capability implementation
            cls: The class implementing the capability
        """
        if capability not in self.capability_classes:
            self.capability_classes[capability] = {}
        
        self.capability_classes[capability][name] = cls
        logger.info(f"Registered capability class '{name}' for capability {capability.value}")
    
    def discover_capability_classes(self, package_path: str) -> int:
        """
        Discover and register capability classes from a package.
        
        Args:
            package_path: Path to the package containing capability classes
            
        Returns:
            Number of capability classes discovered
        """
        try:
            # Import the package
            package = importlib.import_module(package_path)
            count = 0
            
            # Check if the package has __all__ defined
            module_names = getattr(package, '__all__', [])
            
            # If __all__ isn't defined, try to find modules in another way
            if not module_names:
                # Get the physical path of the package to scan for files
                if hasattr(package, '__path__'):
                    import os
                    import pkgutil
                    package_dir = package.__path__[0]
                    module_names = [name for _, name, _ in pkgutil.iter_modules([package_dir])]
                    logger.info(f"Found {len(module_names)} modules in {package_path}: {module_names}")
            
            # Also explicitly include any modules imported in __init__.py
            for attr_name in dir(package):
                attr = getattr(package, attr_name)
                if isinstance(attr, type) and hasattr(attr, 'CAPABILITY') and attr_name not in module_names:
                    # This is a capability class directly imported in __init__.py
                    capability = getattr(attr, 'CAPABILITY', None)
                    if capability and isinstance(capability, AgentCapability):
                        self.register_capability_class(capability, attr_name, attr)
                        count += 1
                        logger.info(f"Registered {attr_name} capability from {package_path} directly")
            
            # Now process all modules found
            for name in module_names:
                # Skip special modules like __pycache__
                if name.startswith('__'):
                    continue
                
                try:
                    # Import the module
                    module = getattr(package, name, None)
                    
                    # If not available as an attribute, try importing it
                    if module is None:
                        module_path = f"{package_path}.{name}"
                        try:
                            module = importlib.import_module(module_path)
                        except ImportError as e:
                            logger.warning(f"Error importing module {module_path}: {str(e)}")
                            continue
                    
                    # Look for capability classes in the module
                    for class_name, obj in inspect.getmembers(module, inspect.isclass):
                        # Check if the class has a capability attribute
                        capability = getattr(obj, 'CAPABILITY', None)
                        if capability and isinstance(capability, AgentCapability):
                            self.register_capability_class(capability, class_name, obj)
                            count += 1
                            logger.info(f"Registered {class_name} capability from {name}")
                except Exception as e:
                    logger.warning(f"Error processing module {name}: {str(e)}")
            
            logger.info(f"Discovered {count} capability classes in {package_path}")
            return count
        except Exception as e:
            logger.error(f"Error discovering capability classes: {str(e)}", exc_info=True)
            return 0
    
    def get_capability_class(
        self,
        capability: AgentCapability,
        name: Optional[str] = None
    ) -> Optional[Type]:
        """
        Get a capability class for a specific capability.
        
        Args:
            capability: The capability type
            name: Name of the capability implementation (if None, returns the first available)
            
        Returns:
            The capability class, or None if not found
        """
        if capability not in self.capability_classes:
            return None
        
        if not self.capability_classes[capability]:
            return None
        
        if name is not None:
            return self.capability_classes[capability].get(name)
        
        # Return the first available capability class
        return next(iter(self.capability_classes[capability].values()), None)
    
    async def create_agent(
        self,
        name: str,
        role: AgentRole,
        llm_provider: Optional[Union[str, BaseLLMProvider]] = None,
        capabilities: Optional[Dict[AgentCapability, Dict[str, Any]]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> Optional[Agent]:
        """
        Create a new agent with the specified capabilities.
        
        Args:
            name: Name for the agent
            role: Role for the agent
            llm_provider: LLM provider instance or name (if string, looked up or created)
            capabilities: Optional dictionary mapping capability types to configuration
            config: Optional agent configuration
            
        Returns:
            The created agent, or None if creation failed
        """
        try:
            # Handle LLM provider
            provider: BaseLLMProvider
            if isinstance(llm_provider, BaseLLMProvider):
                provider = llm_provider
            elif isinstance(llm_provider, str):
                provider = get_llm_provider(llm_provider)
            else:
                # Default LLM provider if none specified
                provider = get_llm_provider(config.get('llm_provider', 'openai'))
            
            # Create the agent
            agent = Agent(
                name=name,
                role=role,
                llm_provider=provider,
                capabilities=set(),
                config=config or {}
            )
            
            # Add capabilities
            if capabilities:
                for capability, cap_config in capabilities.items():
                    implementation = cap_config.get('implementation')
                    config = cap_config.get('config', {})
                    
                    # Get the capability class
                    cap_class = self.get_capability_class(capability, implementation)
                    if not cap_class:
                        logger.warning(f"Capability class for {capability.value} implementation '{implementation}' not found")
                        continue
                    
                    # Create and add the capability
                    try:
                        # Special handling for expertise capability which requires a domain parameter
                        if capability == AgentCapability.EXPERTISE and 'domain' not in config:
                            config['domain'] = config.get('domain', 'general')
                        
                        # Special handling for collaboration capability
                        if capability == AgentCapability.COLLABORATION and 'team_name' not in config:
                            config['team_name'] = f"team_{name}"
                        
                        # Create capability instance
                        cap_instance = cap_class(**config)
                        await agent.add_capability(capability, cap_instance)
                    except Exception as e:
                        logger.error(f"Error adding capability {capability.value} to agent {name}: {str(e)}", exc_info=True)
            
            # Initialize the agent
            await agent.initialize()
            
            # Register the agent with the registry
            self.registry.register_agent(agent)
            
            logger.info(f"Created agent {name} with role {role.value}")
            return agent
        except Exception as e:
            logger.error(f"Error creating agent {name}: {str(e)}", exc_info=True)
            return None
    
    async def create_agents_from_config(self) -> List[Agent]:
        """
        Create agents based on the loaded configuration.
        
        Returns:
            List of created agents
        """
        if not self.config:
            logger.warning("No configuration loaded, cannot create agents")
            return []
        
        agents = []
        agent_configs = self.config.get('agents', [])
        
        for agent_config in agent_configs:
            try:
                name = agent_config.get('name')
                role_str = agent_config.get('role')
                
                if not name or not role_str:
                    logger.warning(f"Agent configuration missing required fields: {agent_config}")
                    continue
                
                # Convert role string to enum
                try:
                    role = AgentRole(role_str)
                except ValueError:
                    logger.warning(f"Invalid role '{role_str}' for agent {name}")
                    continue
                
                # Get LLM provider
                llm_provider_name = agent_config.get('llm_provider', 'default')
                
                # Get capabilities
                capability_configs = {}
                for cap_config in agent_config.get('capabilities', []):
                    cap_name = cap_config.get('capability')
                    if not cap_name:
                        continue
                    
                    try:
                        capability = AgentCapability(cap_name)
                        capability_configs[capability] = {
                            'implementation': cap_config.get('implementation'),
                            'config': cap_config.get('config', {})
                        }
                    except ValueError:
                        logger.warning(f"Invalid capability '{cap_name}' for agent {name}")
                        continue
                
                # Create the agent
                agent = await self.create_agent(
                    name=name,
                    role=role,
                    llm_provider=llm_provider_name,
                    capabilities=capability_configs,
                    config=agent_config.get('config', {})
                )
                
                if agent:
                    agents.append(agent)
            except Exception as e:
                logger.error(f"Error creating agent from config: {str(e)}", exc_info=True)
        
        logger.info(f"Created {len(agents)} agents from configuration")
        return agents
    
    async def create_agent_from_template(
        self,
        template_name: str,
        name: Optional[str] = None,
        llm_provider: Optional[Union[str, BaseLLMProvider]] = None,
        config_overrides: Optional[Dict[str, Any]] = None
    ) -> Optional[Agent]:
        """
        Create an agent from a template defined in the configuration.
        
        Args:
            template_name: Name of the template to use
            name: Optional name override for the agent
            llm_provider: Optional LLM provider override
            config_overrides: Optional configuration overrides
            
        Returns:
            The created agent, or None if creation failed
        """
        if not self.config:
            logger.warning("No configuration loaded, cannot create agent from template")
            return None
        
        # Get the template
        templates = self.config.get('templates', {})
        template = templates.get(template_name)
        
        if not template:
            logger.warning(f"Template '{template_name}' not found")
            return None
        
        try:
            # Apply overrides
            agent_config = template.copy()
            if config_overrides:
                # Merge config
                if 'config' in agent_config and 'config' in config_overrides:
                    agent_config['config'] = {**agent_config['config'], **config_overrides['config']}
                    del config_overrides['config']
                
                # Override other fields
                agent_config.update(config_overrides)
            
            # Override name if provided
            if name:
                agent_config['name'] = name
            
            # Convert role string to enum
            role_str = agent_config.get('role')
            try:
                role = AgentRole(role_str)
            except ValueError:
                logger.warning(f"Invalid role '{role_str}' in template {template_name}")
                return None
            
            # Get LLM provider
            provider = llm_provider or agent_config.get('llm_provider', 'default')
            
            # Get capabilities
            capability_configs = {}
            for cap_config in agent_config.get('capabilities', []):
                cap_name = cap_config.get('capability')
                if not cap_name:
                    continue
                
                try:
                    capability = AgentCapability(cap_name)
                    capability_configs[capability] = {
                        'implementation': cap_config.get('implementation'),
                        'config': cap_config.get('config', {})
                    }
                except ValueError:
                    logger.warning(f"Invalid capability '{cap_name}' in template {template_name}")
                    continue
            
            # Create the agent
            agent = await self.create_agent(
                name=agent_config.get('name', f"Agent-{template_name}"),
                role=role,
                llm_provider=provider,
                capabilities=capability_configs,
                config=agent_config.get('config', {})
            )
            
            return agent
        except Exception as e:
            logger.error(f"Error creating agent from template {template_name}: {str(e)}", exc_info=True)
            return None
    
    async def clone_agent(
        self,
        agent_id: str,
        new_name: str,
        capability_overrides: Optional[Dict[AgentCapability, Dict[str, Any]]] = None,
        config_overrides: Optional[Dict[str, Any]] = None
    ) -> Optional[Agent]:
        """
        Clone an existing agent with optional overrides.
        
        Args:
            agent_id: ID of the agent to clone
            new_name: Name for the new agent
            capability_overrides: Optional capability configuration overrides
            config_overrides: Optional agent configuration overrides
            
        Returns:
            The cloned agent, or None if cloning failed
        """
        # Get the source agent
        source_agent = self.registry.get_agent(agent_id)
        if not source_agent:
            logger.warning(f"Source agent {agent_id} not found")
            return None
        
        try:
            # Create the new agent with the same role and LLM provider
            new_agent = Agent(
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
