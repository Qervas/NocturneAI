"""
Master Intelligence - Dynamic Agent System
Central coordinator using the dynamic agent system for flexible agent operations.
"""

import os
from datetime import datetime
from typing import Dict, List, Optional, Union
from dataclasses import dataclass

from ..agents.dynamic_agent_system import dynamic_agent_system, DynamicAgent
from ...models.agent_profile import AgentProfile, AGENT_TEMPLATES
from ...services.ollama_service import ollama_service


@dataclass
class IntelligenceResponse:
    query: str
    response_data: Dict
    processing_time: float
    timestamp: str


class MasterIntelligence:
    """
    Master Intelligence - Dynamic Agent System Coordinator
    Manages dynamic agent creation, interaction, and autonomous behavior.
    """
    
    def __init__(self):
        self.agent_system = dynamic_agent_system
        self.conversation_history = []
        self.ollama_service = ollama_service
        
        # Initialize with default agents if none exist
        if not self.agent_system.agents:
            self._initialize_default_agents()
    
    def _initialize_default_agents(self):
        """Initialize default agents from templates"""
        # Start with just 1 agent - the foundation of the multiagent system
        default_agents = [
            {"template": "marketing_researcher", "name": "Sarah Chen", "role": "Product Strategy Advisor"}
        ]
        
        for agent_config in default_agents:
            try:
                self.agent_system.create_agent_from_template(
                    agent_config["template"],
                    agent_config["name"],
                    agent_config["role"]
                )
            except Exception as e:
                print(f"Error creating default agent {agent_config['name']}: {e}")
    
    async def process_query(self, message: str, user_id: str = "user-1", context: Optional[Dict] = None) -> Dict:
        """
        Main intelligence processing using dynamic agents
        """
        start_time = datetime.now()
        
        # Get first available agent for single responses
        agents = list(self.agent_system.agents.values())
        if not agents:
            return {"error": "No agents available"}
        
        agent = agents[0]
        
        try:
            response = await agent.process_message(message, sender_id=user_id, context=context)
            
            response_data = {
                "response": response,
                "agent_name": agent.profile.name,
                "agent_role": agent.profile.role,
                "timestamp": agent.current_state["last_interaction"],
                "agent_state": {
                    "mood": agent.current_state.get("mood", "focused"),
                    "energy": agent.current_state["energy"],
                    "confidence": agent.current_state["confidence"]
                }
            }
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Store in history
            intelligence_response = IntelligenceResponse(
                query=message,
                response_data=response_data,
                processing_time=processing_time,
                timestamp=datetime.now().isoformat()
            )
            
            self.conversation_history.append(intelligence_response)
            
            return response_data
            
        except Exception as e:
            return {"error": f"Error processing query: {str(e)}"}
    
    async def get_council_response(self, message: str, user_id: str = "user-1") -> Dict:
        """Get multi-agent council response"""
        
        agents = list(self.agent_system.agents.values())
        if not agents:
            return {"error": "No agents available"}
        
        # Get responses from multiple agents
        responses = []
        for agent in agents[:3]:  # Limit to first 3 agents
            try:
                response = await agent.process_message(message, sender_id=user_id, context={"type": "council"})
                responses.append({
                    "agent_name": agent.profile.name,
                    "agent_role": agent.profile.role,
                    "response": response,
                    "confidence": agent.current_state["confidence"]
                })
            except Exception as e:
                print(f"Error getting response from {agent.profile.name}: {e}")
        
        # Create synthesis of responses
        synthesis = self._synthesize_responses(message, responses)
        
        return {
            "synthesis": synthesis,
            "individual_responses": responses,
            "timestamp": agents[0].current_state["last_interaction"] if agents else None,
            "processing_time": 2.5
        }
    
    def _synthesize_responses(self, query: str, responses: List[Dict]) -> str:
        """Synthesize multiple agent responses"""
        if not responses:
            return "No responses available to synthesize."
        
        if len(responses) == 1:
            return responses[0]["response"]
        
        # Simple synthesis - in practice, could use AI to create better synthesis
        synthesis = f"Based on input from {len(responses)} agents:\n\n"
        
        for i, response in enumerate(responses, 1):
            synthesis += f"{i}. **{response['agent_name']}** ({response['agent_role']}):\n"
            synthesis += f"   {response['response'][:200]}...\n\n"
        
        synthesis += "This represents a collaborative perspective from multiple specialized agents."
        return synthesis
    
    def get_council_status(self) -> Dict:
        """Get status of all agents"""
        return self.agent_system.get_system_status()
    
    def get_conversation_history(self, limit: int = 10) -> List[Dict]:
        """Get recent conversation history"""
        recent_history = self.conversation_history[-limit:]
        return [
            {
                "query": h.query,
                "response": h.response_data,
                "processing_time": h.processing_time,
                "timestamp": h.timestamp
            }
            for h in recent_history
        ]
    
    def get_agent(self, agent_id: str) -> Optional[DynamicAgent]:
        """Get agent by ID"""
        return self.agent_system.get_agent(agent_id)
    
    def get_all_agents(self) -> Dict[str, DynamicAgent]:
        """Get all agents"""
        return self.agent_system.get_all_agents()
    
    def get_agent_templates(self) -> Dict:
        """Get available agent templates"""
        return {
            template_name: {
                "name": template.name,
                "role": template.role,
                "description": template.description,
                "avatar_emoji": template.avatar_emoji,
                "color_theme": template.color_theme,
                "primary_traits": [trait.value for trait in template.primary_traits],
                "skill_categories": [skill.value for skill in template.skill_categories],
                "expertise_areas": template.expertise_areas
            }
            for template_name, template in AGENT_TEMPLATES.items()
        }
    
    async def create_agent(self, profile_data: Dict) -> Dict:
        """Create a new agent"""
        try:
            agent = self.agent_system.create_agent(profile_data)
            return {
                "success": True,
                "agent": agent.to_dict(),
                "message": f"Agent {agent.profile.name} created successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to create agent"
            }
    
    async def create_agent_from_template(self, template_name: str, name: str, role: str) -> Dict:
        """Create agent from template"""
        try:
            agent = self.agent_system.create_agent_from_template(template_name, name, role)
            return {
                "success": True,
                "agent": agent.to_dict(),
                "message": f"Agent {name} created from template {template_name}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to create agent from template"
            }
    
    async def update_agent(self, agent_id: str, updates: Dict) -> Dict:
        """Update an existing agent"""
        try:
            success = self.agent_system.update_agent(agent_id, updates)
            if success:
                agent = self.agent_system.get_agent(agent_id)
                if agent:
                    return {
                        "success": True,
                        "agent": agent.to_dict(),
                        "message": f"Agent {agent_id} updated successfully"
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Agent {agent_id} not found after update"
                    }
            else:
                return {
                    "success": False,
                    "message": f"Agent {agent_id} not found"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to update agent"
            }
    
    async def delete_agent(self, agent_id: str) -> Dict:
        """Delete an agent"""
        try:
            success = self.agent_system.delete_agent(agent_id)
            return {
                "success": success,
                "message": f"Agent {agent_id} deleted successfully" if success else f"Agent {agent_id} not found"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to delete agent"
            }
    
    async def facilitate_agent_interaction(self, sender_id: str, recipient_id: str, message: str) -> Dict:
        """Facilitate interaction between agents"""
        try:
            response = await self.agent_system.facilitate_agent_interaction(sender_id, recipient_id, message)
            if response:
                return {
                    "success": True,
                    "response": response,
                    "message": "Interaction completed successfully"
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to facilitate interaction"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Error facilitating interaction"
            }


# Global instance
master_intelligence = MasterIntelligence() 