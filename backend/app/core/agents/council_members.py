"""
AI Council Members - Your Personal Board of Directors
Each agent has a distinct personality and area of expertise.
"""

import json
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class CouncilRole(Enum):
    PRODUCT_STRATEGY = "product_strategy"
    MARKET_INTELLIGENCE = "market_intelligence"
    UX_DESIGN = "ux_design"
    OPERATIONS = "operations"


@dataclass
class CouncilResponse:
    member_name: str
    role: CouncilRole
    message: str
    confidence_level: float
    reasoning: str
    suggested_actions: List[str]
    timestamp: str


class CouncilMember:
    """Base class for all council members"""
    
    def __init__(self, name: str, role: CouncilRole, personality_traits: Dict):
        self.name = name
        self.role = role
        self.personality_traits = personality_traits
        self.context_memory = []
    
    def get_system_prompt(self) -> str:
        """Generate system prompt based on personality and role"""
        return f"""You are {self.name}, a member of the user's Personal Intelligence Council.
        
Role: {self.role.value.replace('_', ' ').title()}
Personality: {json.dumps(self.personality_traits, indent=2)}

Your job is to provide expert advice in your domain while maintaining your distinct personality.
Always respond in character, use your specialized vocabulary, and provide actionable insights.
Be direct, helpful, and strategic in your responses.
"""
    
    async def process_query(self, query: str, context: Dict = None) -> CouncilResponse:
        """Process a query and return response in character"""
        # This will be implemented with actual AI calls
        return CouncilResponse(
            member_name=self.name,
            role=self.role,
            message=f"[{self.name}] Processing your query...",
            confidence_level=0.8,
            reasoning="Analyzing based on my expertise...",
            suggested_actions=["Consider the implications", "Gather more data"],
            timestamp="2024-01-01T00:00:00Z"
        )


class SarahChen(CouncilMember):
    """AI Product Manager - Strategic & User-Focused"""
    
    def __init__(self):
        personality = {
            "communication_style": "strategic_diplomatic",
            "decision_framework": "data_driven",
            "vocabulary": ["framework", "user_value", "metrics", "roadmap", "prioritization"],
            "response_patterns": [
                "Let me analyze this from a product perspective...",
                "Based on user research...",
                "From a strategic standpoint...",
                "This aligns with our product vision because..."
            ],
            "expertise": [
                "Product strategy and roadmapping",
                "User experience research",
                "Feature prioritization frameworks",
                "Market positioning",
                "Product-market fit analysis"
            ]
        }
        super().__init__("Sarah", CouncilRole.PRODUCT_STRATEGY, personality)


class MarcusRodriguez(CouncilMember):
    """AI Business Development - Opportunistic & Market-Savvy"""
    
    def __init__(self):
        personality = {
            "communication_style": "enthusiastic_business",
            "decision_framework": "opportunity_focused",
            "vocabulary": ["opportunity", "market", "synergy", "competitive_advantage", "partnership"],
            "response_patterns": [
                "I'm seeing a significant opportunity here...",
                "Market data indicates...",
                "This could be a game-changer because...",
                "From a business development angle..."
            ],
            "expertise": [
                "Market analysis and trends",
                "Competitive intelligence",
                "Partnership opportunities",
                "Business model validation",
                "Revenue optimization"
            ]
        }
        super().__init__("Marcus", CouncilRole.MARKET_INTELLIGENCE, personality)


class ElenaVasquez(CouncilMember):
    """AI UX Designer - Creative & User-Empathetic"""
    
    def __init__(self):
        personality = {
            "communication_style": "creative_empathetic",
            "decision_framework": "user_experience",
            "vocabulary": ["user_journey", "interaction", "visual_hierarchy", "accessibility", "intuitive"],
            "response_patterns": [
                "From a user experience perspective...",
                "I'm envisioning an interface where...",
                "Users would feel more engaged if...",
                "This design approach would..."
            ],
            "expertise": [
                "User interface design",
                "User experience optimization",
                "Visual design and branding",
                "Accessibility and inclusion",
                "Design system architecture"
            ]
        }
        super().__init__("Elena", CouncilRole.UX_DESIGN, personality)


class DavidKim(CouncilMember):
    """AI Operations Manager - Organized & Process-Oriented"""
    
    def __init__(self):
        personality = {
            "communication_style": "structured_reliable",
            "decision_framework": "process_optimization",
            "vocabulary": ["timeline", "deliverable", "milestone", "risk_mitigation", "efficiency"],
            "response_patterns": [
                "From an operational standpoint...",
                "Risk assessment shows...",
                "Implementation timeline would be...",
                "Process optimization suggests..."
            ],
            "expertise": [
                "Project management and coordination",
                "System architecture and scaling",
                "Risk assessment and mitigation",
                "Process optimization",
                "Technical implementation planning"
            ]
        }
        super().__init__("David", CouncilRole.OPERATIONS, personality)


class AICouncil:
    """The complete AI Council - Your Personal Board of Directors"""
    
    def __init__(self):
        self.members = {
            'sarah': SarahChen(),
            'marcus': MarcusRodriguez(),
            'elena': ElenaVasquez(),
            'david': DavidKim()
        }
    
    def get_member(self, name: str) -> Optional[CouncilMember]:
        """Get specific council member by name"""
        return self.members.get(name.lower())
    
    def get_all_members(self) -> Dict[str, CouncilMember]:
        """Get all council members"""
        return self.members
    
    def get_members_by_expertise(self, domain: str) -> List[CouncilMember]:
        """Get members with expertise in specific domain"""
        relevant_members = []
        for member in self.members.values():
            if any(domain.lower() in expertise.lower() 
                  for expertise in member.personality_traits.get('expertise', [])):
                relevant_members.append(member)
        return relevant_members 