"""
Fixed Ollama Provider Implementation

This file contains a fixed version of the LocalLLMProvider that properly formats
messages for the Ollama Python package.
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Union
import ollama

logger = logging.getLogger(__name__)

class LLMResponse:
    """Response from an LLM provider"""
    
    def __init__(self, content: str, metadata: Optional[Dict[str, Any]] = None):
        self.content = content
        self.metadata = metadata or {}

class FixedLocalLLMProvider:
    """Provider for local LLMs like Ollama using the official Python package with proper message formatting"""
    
    def __init__(self, model_name: str = "llama3", base_url: str = "http://localhost:11434", options: Dict[str, Any] = None):
        # Clean up model name - remove any comments or extra whitespace
        if '#' in model_name:
            self.model_name = model_name.split('#')[0].strip()
        else:
            self.model_name = model_name.strip()
        
        self.base_url = base_url
        self.options = options or {}
        self._client = None  # Will be initialized lazily
    
    def _get_client(self):
        """Get the Ollama client, initializing it if needed"""
        if self._client is None:
            self._client = ollama.AsyncClient(host=self.base_url)
        return self._client
    
    def _format_messages(self, messages: List[Any], system_prompt: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Format messages in a way that's compatible with the Ollama API
        
        Args:
            messages: List of message objects or strings
            system_prompt: Optional system prompt to prepend
            
        Returns:
            List of properly formatted message dictionaries
        """
        formatted_messages = []
        
        # Add system prompt if provided
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        
        # Format each message
        for message in messages:
            if isinstance(message, dict):
                # Ensure required fields are present
                if "role" in message and "content" in message:
                    # Create a new clean message dict with only the required fields
                    formatted_messages.append({
                        "role": message["role"],
                        "content": str(message["content"])
                    })
            elif isinstance(message, str):
                # If message is a string, assume it's user content
                formatted_messages.append({
                    "role": "user",
                    "content": message
                })
        
        return formatted_messages
    
    async def generate(self, 
                     messages: List[Dict[str, str]], 
                     system_prompt: Optional[str] = None,
                     temperature: float = 0.7,
                     max_tokens: Optional[int] = None,
                     **kwargs) -> LLMResponse:
        """Generate a response from a local LLM using the Ollama package"""
        # Format messages properly
        formatted_messages = self._format_messages(messages, system_prompt)
        
        if not formatted_messages:
            return LLMResponse(
                content="Error: No valid messages to send to the model",
                metadata={"error": "invalid_input", "message": "No valid messages provided"}
            )
        
        # Prepare options for Ollama
        options = {"temperature": temperature}
        if self.options:
            for key, value in self.options.items():
                options[key] = value
                
        if max_tokens:
            options["num_predict"] = max_tokens
        
        try:
            # Get the client
            client = self._get_client()
            
            # Make the request using the Ollama package
            response = await client.chat(
                model=self.model_name,
                messages=formatted_messages,
                options=options
            )
            
            # Extract content from the response
            return LLMResponse(
                content=response.message.content,
                metadata={
                    "model": self.model_name,
                    "raw_response": response.model_dump()
                }
            )
            
        except ollama.ResponseError as e:
            logger.error(f"Ollama API error: {str(e)}", exc_info=True)
            return LLMResponse(
                content=f"Error from Ollama API: {str(e)}",
                metadata={"error": "api_error", "message": str(e)}
            )
        except Exception as e:
            logger.error(f"Error generating from Ollama: {str(e)}", exc_info=True)
            return LLMResponse(
                content=f"Error connecting to Ollama: {str(e)}. Make sure Ollama is installed and running.",
                metadata={"error": "general_error", "message": str(e)}
            )
            
    async def generate_with_tools(self,
                                messages: List[Dict[str, str]],
                                tools: List[Dict[str, Any]],
                                system_prompt: Optional[str] = None,
                                temperature: float = 0.7,
                                **kwargs) -> Dict[str, Any]:
        """
        Generate a response with tool calling capability
        
        Note: This is a simplified implementation since many local LLMs don't
        natively support OpenAI-style tool calling. We enhance the system prompt
        with tool descriptions and parse the output to find tool calls.
        """
        # Add tool information to the system prompt
        tools_description = json.dumps(tools, indent=2)
        enhanced_system_prompt = system_prompt or ""
        enhanced_system_prompt += f"\n\nYou can call the following tools:\n{tools_description}\n"
        enhanced_system_prompt += "\nTo call a tool, output JSON in the format: {\"tool\": \"tool_name\", \"parameters\": {\"param1\": \"value1\"}}"
        
        # Generate a response using the enhanced system prompt
        response = await self.generate(
            messages=messages,
            system_prompt=enhanced_system_prompt,
            temperature=temperature,
            **kwargs
        )
        
        # Simple tool call extraction - in real use would need more robust parsing
        tool_calls = []
        content = response.content
        
        # Very basic JSON extraction - would need more robust handling in production
        try:
            # Check if the response looks like JSON
            if content.strip().startswith('{') and content.strip().endswith('}'):
                tool_data = json.loads(content)
                if "tool" in tool_data and "parameters" in tool_data:
                    tool_calls.append({
                        "tool": tool_data["tool"],
                        "parameters": tool_data["parameters"]
                    })
        except json.JSONDecodeError:
            # Not valid JSON, just return the text response
            pass
        
        # Format the final response
        if tool_calls:
            return {
                "content": None,
                "tool_calls": tool_calls
            }
        else:
            return {
                "content": content,
                "tool_calls": []
            }


async def test_fixed_provider():
    """Test the fixed Ollama provider"""
    provider = FixedLocalLLMProvider(
        model_name="gemma3:latest",
        base_url="http://localhost:11434"
    )
    
    messages = [
        {"role": "user", "content": "What are 3 effective strategies for improving an electrical grid?"}
    ]
    
    print("Testing fixed Ollama provider...")
    response = await provider.generate(messages=messages)
    print(f"\nResponse: {response.content[:200]}...")
    
if __name__ == "__main__":
    asyncio.run(test_fixed_provider())
