"""
Ollama Service - Local AI Model Integration
Connects to your local Ollama instance for private AI responses
"""

import os
import asyncio
import httpx
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class OllamaConfig:
    host: str = "http://localhost:11434"
    model: str = "gemma3:latest"
    timeout: int = 30


class OllamaService:
    """Service for communicating with local Ollama AI models"""
    
    def __init__(self, config: Optional[OllamaConfig] = None):
        self.config = config or OllamaConfig(
            host=os.getenv("OLLAMA_HOST", "http://localhost:11434"),
            model=os.getenv("OLLAMA_MODEL", "gemma3:latest")
        )
        self.client = httpx.AsyncClient(timeout=self.config.timeout)
    
    async def is_available(self) -> bool:
        """Check if Ollama service is available"""
        try:
            response = await self.client.get(f"{self.config.host}/api/tags")
            return response.status_code == 200
        except Exception:
            return False
    
    async def list_models(self) -> List[str]:
        """Get list of available models"""
        try:
            response = await self.client.get(f"{self.config.host}/api/tags")
            if response.status_code == 200:
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
            return []
        except Exception:
            return []
    
    async def generate_response(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> str:
        """Generate AI response using Ollama"""
        try:
            model_name = model or self.config.model
            
            # Prepare the request payload
            payload = {
                "model": model_name,
                "prompt": prompt,
                "system": system_prompt,
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": temperature,
                    "top_p": 0.9,
                    "stop": ["<|im_end|>", "</s>"]
                }
            }
            
            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}
            
            response = await self.client.post(
                f"{self.config.host}/api/generate",
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            raise Exception(f"Failed to generate Ollama response: {str(e)}")
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> str:
        """Chat completion using Ollama (converts to prompt format)"""
        try:
            model_name = model or self.config.model
            
            # Convert messages to single prompt
            prompt_parts = []
            system_message = None
            
            for message in messages:
                role = message.get("role", "")
                content = message.get("content", "")
                
                if role == "system":
                    system_message = content
                elif role == "user":
                    prompt_parts.append(f"User: {content}")
                elif role == "assistant":
                    prompt_parts.append(f"Assistant: {content}")
            
            prompt = "\n".join(prompt_parts) + "\nAssistant:"
            
            return await self.generate_response(
                prompt=prompt,
                system_prompt=system_message,
                model=model_name,
                max_tokens=max_tokens,
                temperature=temperature
            )
            
        except Exception as e:
            raise Exception(f"Failed to complete chat: {str(e)}")
    
    async def get_model_info(self, model: Optional[str] = None) -> Dict:
        """Get information about a specific model"""
        try:
            model_name = model or self.config.model
            response = await self.client.post(
                f"{self.config.host}/api/show",
                json={"name": model_name}
            )
            
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception:
            return {}
    
    async def health_check(self) -> Dict:
        """Comprehensive health check"""
        try:
            is_available = await self.is_available()
            models = await self.list_models()
            model_available = self.config.model in models
            
            return {
                "service_available": is_available,
                "configured_model": self.config.model,
                "model_available": model_available,
                "available_models": models,
                "host": self.config.host
            }
        except Exception as e:
            return {
                "service_available": False,
                "error": str(e),
                "configured_model": self.config.model,
                "host": self.config.host
            }
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global instance
ollama_service = OllamaService() 