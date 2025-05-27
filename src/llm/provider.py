"""
LLM provider implementations for NocturneAI.

This module contains the base interface and concrete implementations
for different LLM providers, including OpenAI and local models.
"""

from typing import Dict, Any, List, Optional, Union, Callable
from abc import ABC, abstractmethod
import json
import logging
import os
import asyncio
from pydantic import BaseModel, Field
import openai

logger = logging.getLogger(__name__)

class LLMMessage(BaseModel):
    """Represents a message in a conversation with an LLM"""
    role: str
    content: str
    name: Optional[str] = None

class LLMResponse(BaseModel):
    """Response from an LLM"""
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class BaseLLMProvider(ABC):
    """Base class for LLM providers"""
    
    @abstractmethod
    async def generate(self, 
                     messages: List[Dict[str, str]], 
                     system_prompt: Optional[str] = None,
                     temperature: float = 0.7,
                     max_tokens: Optional[int] = None,
                     **kwargs) -> LLMResponse:
        """Generate a response from the LLM"""
        pass

    @abstractmethod
    async def generate_with_tools(self,
                                messages: List[Dict[str, str]],
                                tools: List[Dict[str, Any]],
                                system_prompt: Optional[str] = None,
                                temperature: float = 0.7,
                                **kwargs) -> Dict[str, Any]:
        """Generate a response with tool calling capability"""
        pass

class OpenAIProvider(BaseLLMProvider):
    """OpenAI API provider"""
    
    def __init__(self, model_name: str = "gpt-3.5-turbo"):
        self.model_name = model_name
        self.api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not found in environment variables")
        else:
            openai.api_key = self.api_key
    
    async def generate(self, 
                     messages: List[Dict[str, str]], 
                     system_prompt: Optional[str] = None,
                     temperature: float = 0.7,
                     max_tokens: Optional[int] = None,
                     **kwargs) -> LLMResponse:
        """
        Generate a response from the OpenAI API.
        
        Args:
            messages: List of message dictionaries, each with 'role' and 'content' keys
            system_prompt: Optional system prompt to prepend to the messages
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum number of tokens to generate
            **kwargs: Additional parameters to pass to the API
            
        Returns:
            LLMResponse object with the generated content
        """
        if not self.api_key:
            raise ValueError("OpenAI API key not set")
        
        formatted_messages = self._format_messages(messages, system_prompt)
        
        try:
            completion_kwargs = {
                "model": self.model_name,
                "messages": formatted_messages,
                "temperature": temperature,
            }
            
            if max_tokens:
                completion_kwargs["max_tokens"] = max_tokens
                
            # Add any additional parameters
            for key, value in kwargs.items():
                if key not in completion_kwargs:
                    completion_kwargs[key] = value
            
            client = openai.AsyncOpenAI(api_key=self.api_key)
            response = await client.chat.completions.create(**completion_kwargs)
            
            response_message = response.choices[0].message
            content = response_message.content or ""
            
            # Extract metadata from the response
            metadata = {
                "model": response.model,
                "completion_tokens": response.usage.completion_tokens,
                "prompt_tokens": response.usage.prompt_tokens,
                "total_tokens": response.usage.total_tokens,
                "finish_reason": response.choices[0].finish_reason
            }
            
            return LLMResponse(content=content, metadata=metadata)
        
        except Exception as e:
            logger.error(f"Error generating response from OpenAI: {str(e)}")
            raise
    
    async def generate_with_tools(self,
                                messages: List[Dict[str, str]],
                                tools: List[Dict[str, Any]],
                                system_prompt: Optional[str] = None,
                                temperature: float = 0.7,
                                **kwargs) -> Dict[str, Any]:
        """
        Generate a response with tool calling capability.
        
        Args:
            messages: List of message dictionaries
            tools: List of tool definitions
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            **kwargs: Additional parameters
            
        Returns:
            Dict containing content, metadata, and any tool calls
        """
        if not self.api_key:
            raise ValueError("OpenAI API key not set")
        
        formatted_messages = self._format_messages(messages, system_prompt)
        
        try:
            completion_kwargs = {
                "model": self.model_name,
                "messages": formatted_messages,
                "temperature": temperature,
                "tools": tools,
                "tool_choice": kwargs.get("tool_choice", "auto")
            }
            
            # Add any additional parameters
            for key, value in kwargs.items():
                if key not in completion_kwargs and key != "tool_choice":
                    completion_kwargs[key] = value
            
            client = openai.AsyncOpenAI(api_key=self.api_key)
            response = await client.chat.completions.create(**completion_kwargs)
            
            response_message = response.choices[0].message
            content = response_message.content or ""
            
            # Extract metadata from the response
            metadata = {
                "model": response.model,
                "completion_tokens": response.usage.completion_tokens,
                "prompt_tokens": response.usage.prompt_tokens,
                "total_tokens": response.usage.total_tokens,
                "finish_reason": response.choices[0].finish_reason
            }
            
            # Extract tool calls if any
            tool_calls = []
            if response_message.tool_calls:
                for tool_call in response_message.tool_calls:
                    try:
                        tool_call_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        # If arguments are not valid JSON, use the raw string
                        tool_call_args = tool_call.function.arguments
                    
                    tool_calls.append({
                        "id": tool_call.id,
                        "type": "function",  # Currently only function calls are supported
                        "function": {
                            "name": tool_call.function.name,
                            "arguments": tool_call_args
                        }
                    })
            
            return {
                "content": content,
                "metadata": metadata,
                "tool_calls": tool_calls
            }
        
        except Exception as e:
            logger.error(f"Error generating response with tools from OpenAI: {str(e)}")
            raise
    
    def _format_messages(self, 
                        messages: List[Dict[str, str]], 
                        system_prompt: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Format messages for the OpenAI API.
        
        Args:
            messages: List of message dictionaries
            system_prompt: Optional system prompt
            
        Returns:
            Formatted messages
        """
        formatted_messages = []
        
        # Add system prompt if provided
        if system_prompt:
            formatted_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # Add the rest of the messages
        for message in messages:
            # Ensure all required fields are present
            if "role" not in message or "content" not in message:
                raise ValueError("Message must contain 'role' and 'content' keys")
            
            # Create a new dict with only the allowed keys
            formatted_message = {
                "role": message["role"],
                "content": message["content"]
            }
            
            # Add optional name if present
            if "name" in message:
                formatted_message["name"] = message["name"]
            
            formatted_messages.append(formatted_message)
        
        return formatted_messages

class LocalLLMProvider(BaseLLMProvider):
    """
    Provider for local LLM models, supporting Ollama or other similar providers.
    """
    
    def __init__(self, 
                model_name: str = "llama2", 
                base_url: str = "http://localhost:11434",
                options: Optional[Dict[str, Any]] = None):
        self.model_name = model_name
        self.base_url = base_url.rstrip('/')  # Remove trailing slashes
        self.options = options or {}
    
    async def generate(self, 
                     messages: List[Dict[str, str]], 
                     system_prompt: Optional[str] = None,
                     temperature: float = 0.7,
                     max_tokens: Optional[int] = None,
                     **kwargs) -> LLMResponse:
        """
        Generate a response from a local LLM provider.
        
        Args:
            messages: List of message dictionaries
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            max_tokens: Maximum number of tokens to generate
            **kwargs: Additional parameters
            
        Returns:
            LLMResponse with the generated content
        """
        formatted_messages = self._format_messages(messages, system_prompt)
        
        try:
            # Prepare request data
            request_data = {
                "model": self.model_name,
                "messages": formatted_messages,
                "options": {
                    "temperature": temperature,
                    **self.options
                }
            }
            
            if max_tokens:
                request_data["options"]["num_predict"] = max_tokens
            
            # Add additional options from kwargs
            for key, value in kwargs.items():
                if key not in ["model", "messages"]:
                    request_data["options"][key] = value
            
            # Make API request
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/chat",
                    json=request_data
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise ValueError(f"Error from LLM API: {error_text}")
                    
                    data = await response.json()
                    
                    content = data.get("message", {}).get("content", "")
                    metadata = {
                        "model": data.get("model", self.model_name),
                        # Add any other metadata that might be available
                    }
                    
                    return LLMResponse(content=content, metadata=metadata)
        
        except Exception as e:
            logger.error(f"Error generating response from local LLM: {str(e)}")
            raise
    
    async def generate_with_tools(self,
                                messages: List[Dict[str, str]],
                                tools: List[Dict[str, Any]],
                                system_prompt: Optional[str] = None,
                                temperature: float = 0.7,
                                **kwargs) -> Dict[str, Any]:
        """
        Generate a response with tool calling capability.
        
        Note: Many local LLMs don't have native tool calling capabilities.
        This implementation uses a custom approach to enable tool calling.
        
        Args:
            messages: List of message dictionaries
            tools: List of tool definitions
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            **kwargs: Additional parameters
            
        Returns:
            Dict containing content, metadata, and any tool calls
        """
        # Adapt the tools format for the local model
        # We need to modify the prompt to instruct the model on how to use tools
        
        # Create a combined system prompt that includes tool instructions
        combined_system_prompt = ""
        if system_prompt:
            combined_system_prompt += system_prompt + "\n\n"
        
        combined_system_prompt += "You have access to the following tools:\n\n"
        
        for tool in tools:
            combined_system_prompt += f"Tool: {tool['function']['name']}\n"
            combined_system_prompt += f"Description: {tool['function']['description']}\n"
            combined_system_prompt += "Parameters:\n"
            
            for param_name, param_info in tool['function']['parameters'].get('properties', {}).items():
                combined_system_prompt += f"- {param_name}: {param_info.get('description', 'No description')}\n"
            
            combined_system_prompt += "\n"
        
        combined_system_prompt += """
When you want to use a tool, respond ONLY with a JSON object in the following format:

```json
{
  "tool_calls": [
    {
      "type": "function",
      "function": {
        "name": "tool_name",
        "arguments": {
          "param1": "value1",
          "param2": "value2"
        }
      }
    }
  ]
}
```

If you don't need to use a tool, respond normally without the JSON format.
"""
        
        # Generate the response
        response = await self.generate(
            messages=messages,
            system_prompt=combined_system_prompt,
            temperature=temperature,
            **kwargs
        )
        
        content = response.content
        tool_calls = []
        
        # Try to extract tool calls from the content
        # Look for JSON blocks in the response
        json_pattern = r"```json\s*(.*?)\s*```"
        import re
        json_matches = re.findall(json_pattern, content, re.DOTALL)
        
        if json_matches:
            for json_str in json_matches:
                try:
                    data = json.loads(json_str)
                    if "tool_calls" in data:
                        tool_calls = data["tool_calls"]
                        # Remove the JSON block from the content
                        content = re.sub(r"```json\s*" + re.escape(json_str) + r"\s*```", "", content, flags=re.DOTALL)
                        break
                except json.JSONDecodeError:
                    # Not valid JSON, treat as regular content
                    pass
        
        return {
            "content": content,
            "metadata": response.metadata,
            "tool_calls": tool_calls
        }
    
    def _format_messages(self, 
                        messages: List[Dict[str, str]], 
                        system_prompt: Optional[str] = None) -> List[Dict[str, str]]:
        """Format messages for the local LLM API"""
        formatted_messages = []
        
        # Add system prompt if provided
        if system_prompt:
            formatted_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # Add the rest of the messages
        for message in messages:
            formatted_message = {
                "role": message.get("role", "user"),
                "content": message.get("content", "")
            }
            formatted_messages.append(formatted_message)
        
        return formatted_messages

class LLMFactory:
    """Factory for creating LLM providers based on configuration"""
    
    @staticmethod
    def create_provider(provider_type: str, **kwargs) -> BaseLLMProvider:
        """Create an LLM provider instance"""
        if provider_type.lower() == "openai":
            # Filter parameters to only include those accepted by OpenAIProvider
            openai_params = {}
            if "model_name" in kwargs:
                openai_params["model_name"] = kwargs["model_name"]
            # Add any other OpenAI-specific parameters here
            
            return OpenAIProvider(**openai_params)
            
        elif provider_type.lower() == "local" or provider_type.lower() == "ollama":
            # Filter parameters to only include those accepted by LocalLLMProvider
            local_params = {}
            if "model_name" in kwargs:
                local_params["model_name"] = kwargs["model_name"]
            if "base_url" in kwargs:
                local_params["base_url"] = kwargs["base_url"]
            if "options" in kwargs:
                local_params["options"] = kwargs["options"]
            # Add any other local provider parameters here
            
            return LocalLLMProvider(**local_params)
        else:
            raise ValueError(f"Unknown LLM provider type: {provider_type}")

# Utility function to get an LLM provider instance
def get_llm_provider(provider_type: str, **kwargs) -> BaseLLMProvider:
    """
    Get an LLM provider instance based on the provider type.
    
    Args:
        provider_type: Type of LLM provider to get ('openai', 'local', 'ollama', etc.)
        **kwargs: Additional arguments to pass to the provider constructor
        
    Returns:
        An instance of BaseLLMProvider
    """
    return LLMFactory.create_provider(provider_type, **kwargs)
