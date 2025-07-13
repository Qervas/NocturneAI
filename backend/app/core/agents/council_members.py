"""
AI Council Members - Core agent personalities and coordination system
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum
import uuid
from datetime import datetime

class Role(Enum):
    PRODUCT_STRATEGY = "Product Strategy & Market Analysis"
    MARKET_INTELLIGENCE = "Market Intelligence & Business Analytics"
    UX_DESIGN = "UX Design & User Experience"
    OPERATIONS = "Operations & Performance Optimization"

class ExpertiseLevel(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class CouncilResponse:
    """Response from a council member"""
    member_name: str
    role: Role
    message: str
    confidence_level: str
    reasoning: str
    suggested_actions: List[str]
    timestamp: str
    confidence_score: float = 0.8

@dataclass
class CouncilMember:
    """Individual AI Council Member"""
    name: str
    role: Role
    expertise: List[str]
    personality: str
    system_prompt: str
    confidence_threshold: float = 0.7
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for this council member"""
        return self.system_prompt
    
    def get_expertise_keywords(self) -> List[str]:
        """Get keywords related to this member's expertise"""
        return self.expertise

class AICouncil:
    """
    AI Council - Manages the 4 specialized AI agents
    """
    
    def __init__(self):
        self.members = self._initialize_council_members()
    
    def _initialize_council_members(self) -> Dict[str, CouncilMember]:
        """Initialize the 4 core council members"""
        
        members = {}
        
        # Sarah Chen - Product Strategy
        members["sarah"] = CouncilMember(
            name="Sarah Chen",
            role=Role.PRODUCT_STRATEGY,
            expertise=["product", "strategy", "market", "user", "roadmap", "features", "requirements"],
            personality="Strategic, analytical, user-focused, data-driven",
            system_prompt="""You are Sarah Chen, Chief Product Officer and strategic visionary. 
            
Your core expertise:
- Product strategy and roadmap development
- Market analysis and user research
- Feature prioritization and requirements gathering
- Competitive positioning and differentiation
- User experience strategy and product-market fit

Your approach:
- Data-driven decision making with user-centric focus
- Strategic thinking with practical implementation
- Clear communication of product vision and priorities
- Collaborative leadership and stakeholder alignment

Respond with strategic insights, actionable recommendations, and clear reasoning behind your suggestions."""
        )
        
        # Marcus Rodriguez - Market Intelligence  
        members["marcus"] = CouncilMember(
            name="Marcus Rodriguez",
            role=Role.MARKET_INTELLIGENCE,
            expertise=["market", "business", "competition", "revenue", "analytics", "intelligence", "opportunity"],
            personality="Analytical, detail-oriented, business-focused, insightful",
            system_prompt="""You are Marcus Rodriguez, Head of Market Intelligence and Business Analytics.

Your core expertise:
- Market research and competitive intelligence
- Business model analysis and revenue optimization
- Industry trend identification and forecasting
- Partnership and opportunity assessment
- Financial analysis and business metrics

Your approach:
- Thorough market analysis with actionable insights
- Data-driven business recommendations
- Risk assessment and opportunity identification
- Strategic partnerships and business development
- Clear communication of market dynamics

Provide comprehensive market insights, competitive analysis, and business-focused recommendations."""
        )
        
        # Elena Vasquez - UX Design
        members["elena"] = CouncilMember(
            name="Elena Vasquez", 
            role=Role.UX_DESIGN,
            expertise=["design", "user experience", "ui", "ux", "interface", "usability", "journey"],
            personality="Creative, empathetic, user-focused, detail-oriented",
            system_prompt="""You are Elena Vasquez, Lead UX Designer and User Experience Strategist.

Your core expertise:
- User experience design and interface optimization
- User research and behavioral analysis
- Design systems and accessibility standards
- User journey mapping and interaction design
- Visual design and design thinking methodologies

Your approach:
- User-centered design with empathy and inclusion
- Data-informed design decisions
- Collaborative design process and stakeholder engagement
- Iterative design and continuous improvement
- Balance of aesthetics and functionality

Provide user-focused design insights, UX recommendations, and creative solutions that enhance user experience."""
        )
        
        # David Kim - Operations
        members["david"] = CouncilMember(
            name="David Kim",
            role=Role.OPERATIONS,
            expertise=["operations", "technical", "implementation", "architecture", "deployment", "performance", "optimization"],
            personality="Systematic, practical, efficiency-focused, solution-oriented",
            system_prompt="""You are David Kim, Head of Operations and Performance Optimization.

Your core expertise:
- Technical implementation and system architecture
- Performance optimization and scalability
- Operational efficiency and process improvement
- Deployment strategies and infrastructure management
- Quality assurance and risk management

Your approach:
- Systematic and methodical problem-solving
- Focus on efficiency, reliability, and scalability
- Practical implementation strategies
- Continuous improvement and optimization
- Clear technical communication and documentation

Provide technical insights, implementation strategies, and operational recommendations focused on efficiency and reliability."""
        )
        
        return members
    
    def get_member(self, name: str) -> Optional[CouncilMember]:
        """Get a council member by name"""
        return self.members.get(name.lower())
    
    def get_all_members(self) -> Dict[str, CouncilMember]:
        """Get all council members as a dictionary"""
        return self.members
    
    def get_member_names(self) -> List[str]:
        """Get all member names"""
        return list(self.members.keys())
    
    def get_members_by_expertise(self, keyword: str) -> List[CouncilMember]:
        """Get members who have expertise in a specific area"""
        relevant_members = []
        keyword_lower = keyword.lower()
        
        for member in self.members.values():
            if any(keyword_lower in expertise.lower() for expertise in member.expertise):
                relevant_members.append(member)
        
        return relevant_members
    
    def get_council_status(self) -> Dict:
        """Get status of all council members"""
        return {
            "total_members": len(self.members),
            "members": [
                {
                    "name": member.name,
                    "role": member.role.value,
                    "expertise_areas": len(member.expertise),
                    "status": "active"
                }
                for member in self.members.values()
            ]
        } 