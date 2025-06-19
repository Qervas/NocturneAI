"""
Personal Sovereignty Database - Your Digital Identity and Strategic Assets
Phase 2: Core system for managing personal identity, goals, and intelligence assets.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from enum import Enum
import json
import uuid


class GoalStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    UNDER_REVIEW = "under_review"


class DecisionType(Enum):
    STRATEGIC = "strategic"
    TACTICAL = "tactical"
    OPERATIONAL = "operational"
    PERSONAL = "personal"
    INVESTMENT = "investment"
    BUSINESS = "business"


class IntelligenceAssetType(Enum):
    KNOWLEDGE = "knowledge"
    INSIGHT = "insight"
    RELATIONSHIP = "relationship"
    OPPORTUNITY = "opportunity"
    STRATEGY = "strategy"
    ANALYSIS = "analysis"


@dataclass
class IdentityProfile:
    """Core identity profile with values, traits, and preferences"""
    user_id: str
    name: str
    professional_title: str
    industry: str
    experience_level: str
    
    # Core Values (Immutable)
    core_values: List[str] = field(default_factory=list)
    fundamental_principles: List[str] = field(default_factory=list)
    life_philosophy: str = ""
    
    # Personality Traits
    decision_making_style: str = "analytical"  # analytical, intuitive, collaborative, decisive
    risk_tolerance: str = "moderate"  # conservative, moderate, aggressive
    communication_preference: str = "direct"  # direct, diplomatic, detailed, concise
    learning_style: str = "experiential"  # visual, auditory, kinesthetic, experiential
    
    # Preferences
    preferred_interaction_modes: List[str] = field(default_factory=list)
    timezone: str = "UTC"
    working_hours: Dict[str, str] = field(default_factory=dict)
    notification_preferences: Dict[str, bool] = field(default_factory=dict)
    
    # Evolution Tracking
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    version: int = 1
    
    def update_profile(self, updates: Dict):
        """Update profile with new information"""
        for key, value in updates.items():
            if hasattr(self, key) and key not in ['user_id', 'created_at', 'version']:
                setattr(self, key, value)
        
        self.last_updated = datetime.now()
        self.version += 1
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'name': self.name,
            'professional_title': self.professional_title,
            'industry': self.industry,
            'experience_level': self.experience_level,
            'core_values': self.core_values,
            'fundamental_principles': self.fundamental_principles,
            'life_philosophy': self.life_philosophy,
            'decision_making_style': self.decision_making_style,
            'risk_tolerance': self.risk_tolerance,
            'communication_preference': self.communication_preference,
            'learning_style': self.learning_style,
            'preferred_interaction_modes': self.preferred_interaction_modes,
            'timezone': self.timezone,
            'working_hours': self.working_hours,
            'notification_preferences': self.notification_preferences,
            'created_at': self.created_at.isoformat(),
            'last_updated': self.last_updated.isoformat(),
            'version': self.version
        }


@dataclass
class Goal:
    """Strategic goal with hierarchy and tracking"""
    goal_id: str
    title: str
    description: str
    category: str  # personal, professional, financial, health, etc.
    priority: str  # high, medium, low
    status: GoalStatus = GoalStatus.ACTIVE
    
    # Hierarchy
    parent_goal_id: Optional[str] = None
    child_goal_ids: List[str] = field(default_factory=list)
    
    # Timeline
    target_date: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    
    # Progress Tracking
    progress_percentage: float = 0.0
    milestones: List[Dict] = field(default_factory=list)
    obstacles: List[Dict] = field(default_factory=list)
    
    # Strategy
    key_actions: List[str] = field(default_factory=list)
    success_metrics: List[str] = field(default_factory=list)
    required_resources: List[str] = field(default_factory=list)
    
    # AI Assistance
    ai_recommendations: List[Dict] = field(default_factory=list)
    agent_assignments: List[str] = field(default_factory=list)
    
    def add_milestone(self, title: str, description: str, target_date: datetime = None):
        """Add milestone to goal"""
        milestone = {
            'id': str(uuid.uuid4()),
            'title': title,
            'description': description,
            'target_date': target_date.isoformat() if target_date else None,
            'completed': False,
            'created_at': datetime.now().isoformat()
        }
        self.milestones.append(milestone)
    
    def update_progress(self, new_progress: float, note: str = ""):
        """Update goal progress"""
        self.progress_percentage = max(0.0, min(100.0, new_progress))
        
        if self.progress_percentage == 100.0 and self.status == GoalStatus.ACTIVE:
            self.status = GoalStatus.COMPLETED
            self.completed_at = datetime.now()
    
    def to_dict(self):
        return {
            'goal_id': self.goal_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'status': self.status.value,
            'parent_goal_id': self.parent_goal_id,
            'child_goal_ids': self.child_goal_ids,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'progress_percentage': self.progress_percentage,
            'milestones': self.milestones,
            'obstacles': self.obstacles,
            'key_actions': self.key_actions,
            'success_metrics': self.success_metrics,
            'required_resources': self.required_resources,
            'ai_recommendations': self.ai_recommendations,
            'agent_assignments': self.agent_assignments
        }


@dataclass
class Decision:
    """Strategic decision record with context and outcomes"""
    decision_id: str
    title: str
    description: str
    decision_type: DecisionType
    context: str
    
    # Decision Process
    options_considered: List[Dict] = field(default_factory=list)
    decision_criteria: List[str] = field(default_factory=list)
    chosen_option: Dict = field(default_factory=dict)
    rationale: str = ""
    
    # Participants
    decision_maker: str = ""
    advisors_consulted: List[str] = field(default_factory=list)
    stakeholders_affected: List[str] = field(default_factory=list)
    
    # AI Involvement
    ai_analysis_used: bool = False
    ai_recommendations: List[Dict] = field(default_factory=list)
    confidence_score: float = 0.0
    
    # Timeline
    decided_at: datetime = field(default_factory=datetime.now)
    implementation_date: Optional[datetime] = None
    review_date: Optional[datetime] = None
    
    # Outcomes (filled in later)
    actual_outcome: str = ""
    success_score: Optional[float] = None
    lessons_learned: List[str] = field(default_factory=list)
    
    def add_option(self, title: str, description: str, pros: List[str], cons: List[str], estimated_outcome: str):
        """Add decision option"""
        option = {
            'id': str(uuid.uuid4()),
            'title': title,
            'description': description,
            'pros': pros,
            'cons': cons,
            'estimated_outcome': estimated_outcome,
            'score': 0.0
        }
        self.options_considered.append(option)
    
    def record_outcome(self, outcome: str, success_score: float, lessons: List[str]):
        """Record actual outcome and learnings"""
        self.actual_outcome = outcome
        self.success_score = success_score
        self.lessons_learned.extend(lessons)
    
    def to_dict(self):
        return {
            'decision_id': self.decision_id,
            'title': self.title,
            'description': self.description,
            'decision_type': self.decision_type.value,
            'context': self.context,
            'options_considered': self.options_considered,
            'decision_criteria': self.decision_criteria,
            'chosen_option': self.chosen_option,
            'rationale': self.rationale,
            'decision_maker': self.decision_maker,
            'advisors_consulted': self.advisors_consulted,
            'stakeholders_affected': self.stakeholders_affected,
            'ai_analysis_used': self.ai_analysis_used,
            'ai_recommendations': self.ai_recommendations,
            'confidence_score': self.confidence_score,
            'decided_at': self.decided_at.isoformat(),
            'implementation_date': self.implementation_date.isoformat() if self.implementation_date else None,
            'review_date': self.review_date.isoformat() if self.review_date else None,
            'actual_outcome': self.actual_outcome,
            'success_score': self.success_score,
            'lessons_learned': self.lessons_learned
        }


@dataclass
class IntelligenceAsset:
    """Knowledge, insights, and strategic assets accumulated over time"""
    asset_id: str
    title: str
    description: str
    asset_type: IntelligenceAssetType
    content: str
    
    # Metadata
    source: str  # ai_analysis, human_insight, external_research, etc.
    confidence_level: float = 0.0
    relevance_score: float = 0.0
    
    # Categorization
    tags: List[str] = field(default_factory=list)
    related_goals: List[str] = field(default_factory=list)
    related_decisions: List[str] = field(default_factory=list)
    
    # Lifecycle
    created_at: datetime = field(default_factory=datetime.now)
    last_accessed: datetime = field(default_factory=datetime.now)
    access_count: int = 0
    
    # Validation
    validated: bool = False
    validation_notes: str = ""
    expiration_date: Optional[datetime] = None
    
    def access_asset(self):
        """Record asset access"""
        self.last_accessed = datetime.now()
        self.access_count += 1
    
    def validate_asset(self, notes: str = ""):
        """Validate asset accuracy"""
        self.validated = True
        self.validation_notes = notes
    
    def to_dict(self):
        return {
            'asset_id': self.asset_id,
            'title': self.title,
            'description': self.description,
            'asset_type': self.asset_type.value,
            'content': self.content,
            'source': self.source,
            'confidence_level': self.confidence_level,
            'relevance_score': self.relevance_score,
            'tags': self.tags,
            'related_goals': self.related_goals,
            'related_decisions': self.related_decisions,
            'created_at': self.created_at.isoformat(),
            'last_accessed': self.last_accessed.isoformat(),
            'access_count': self.access_count,
            'validated': self.validated,
            'validation_notes': self.validation_notes,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None
        }


class PersonalSovereigntyDatabase:
    """
    Your personal sovereignty database - the core of your digital identity
    and strategic assets. This is where all your goals, decisions, and
    intelligence assets are stored and managed.
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.identity_profile: Optional[IdentityProfile] = None
        self.goals: Dict[str, Goal] = {}
        self.decisions: Dict[str, Decision] = {}
        self.intelligence_assets: Dict[str, IntelligenceAsset] = {}
        
        # Relationship Networks
        self.trusted_advisors: List[str] = []
        self.professional_network: Dict[str, Dict] = {}
        self.collaboration_history: List[Dict] = []
        
        # Analytics
        self.decision_patterns: Dict = {}
        self.goal_completion_stats: Dict = {}
        self.intelligence_usage_stats: Dict = {}
        
    def initialize_identity(self, name: str, professional_title: str, industry: str, 
                          experience_level: str, core_values: List[str] = None) -> IdentityProfile:
        """Initialize user identity profile"""
        self.identity_profile = IdentityProfile(
            user_id=self.user_id,
            name=name,
            professional_title=professional_title,
            industry=industry,
            experience_level=experience_level,
            core_values=core_values or []
        )
        return self.identity_profile
    
    def update_identity(self, updates: Dict) -> IdentityProfile:
        """Update identity profile"""
        if not self.identity_profile:
            raise ValueError("Identity profile not initialized")
        
        self.identity_profile.update_profile(updates)
        return self.identity_profile
    
    def add_goal(self, title: str, description: str, category: str, priority: str,
                target_date: datetime = None, parent_goal_id: str = None) -> Goal:
        """Add new goal to hierarchy"""
        goal_id = str(uuid.uuid4())
        goal = Goal(
            goal_id=goal_id,
            title=title,
            description=description,
            category=category,
            priority=priority,
            target_date=target_date,
            parent_goal_id=parent_goal_id
        )
        
        # Update parent goal's children if applicable
        if parent_goal_id and parent_goal_id in self.goals:
            self.goals[parent_goal_id].child_goal_ids.append(goal_id)
        
        self.goals[goal_id] = goal
        return goal
    
    def update_goal_progress(self, goal_id: str, progress: float, note: str = "") -> Goal:
        """Update goal progress"""
        if goal_id not in self.goals:
            raise ValueError(f"Goal {goal_id} not found")
        
        goal = self.goals[goal_id]
        goal.update_progress(progress, note)
        
        # Update goal completion stats
        if goal.status == GoalStatus.COMPLETED:
            self._update_goal_completion_stats(goal)
        
        return goal
    
    def record_decision(self, title: str, description: str, decision_type: DecisionType,
                       context: str, options: List[Dict], chosen_option: Dict,
                       rationale: str) -> Decision:
        """Record strategic decision"""
        decision_id = str(uuid.uuid4())
        decision = Decision(
            decision_id=decision_id,
            title=title,
            description=description,
            decision_type=decision_type,
            context=context,
            chosen_option=chosen_option,
            rationale=rationale,
            decision_maker=self.identity_profile.name if self.identity_profile else self.user_id
        )
        
        for option in options:
            decision.options_considered.append(option)
        
        self.decisions[decision_id] = decision
        self._update_decision_patterns(decision)
        
        return decision
    
    def add_intelligence_asset(self, title: str, description: str, asset_type: IntelligenceAssetType,
                             content: str, source: str, confidence_level: float = 0.0,
                             tags: List[str] = None) -> IntelligenceAsset:
        """Add intelligence asset to knowledge base"""
        asset_id = str(uuid.uuid4())
        asset = IntelligenceAsset(
            asset_id=asset_id,
            title=title,
            description=description,
            asset_type=asset_type,
            content=content,
            source=source,
            confidence_level=confidence_level,
            tags=tags or []
        )
        
        self.intelligence_assets[asset_id] = asset
        return asset
    
    def get_goal_hierarchy(self) -> Dict:
        """Get structured goal hierarchy"""
        root_goals = [goal for goal in self.goals.values() if goal.parent_goal_id is None]
        
        def build_hierarchy(goal: Goal) -> Dict:
            goal_dict = goal.to_dict()
            goal_dict['children'] = []
            
            for child_id in goal.child_goal_ids:
                if child_id in self.goals:
                    child_hierarchy = build_hierarchy(self.goals[child_id])
                    goal_dict['children'].append(child_hierarchy)
            
            return goal_dict
        
        return {
            'root_goals': [build_hierarchy(goal) for goal in root_goals],
            'total_goals': len(self.goals),
            'active_goals': len([g for g in self.goals.values() if g.status == GoalStatus.ACTIVE]),
            'completed_goals': len([g for g in self.goals.values() if g.status == GoalStatus.COMPLETED])
        }
    
    def search_intelligence_assets(self, query: str, asset_type: IntelligenceAssetType = None,
                                 tags: List[str] = None) -> List[IntelligenceAsset]:
        """Search intelligence assets"""
        results = []
        query_lower = query.lower()
        
        for asset in self.intelligence_assets.values():
            # Type filter
            if asset_type and asset.asset_type != asset_type:
                continue
            
            # Tag filter
            if tags and not any(tag in asset.tags for tag in tags):
                continue
            
            # Text search
            if (query_lower in asset.title.lower() or 
                query_lower in asset.description.lower() or 
                query_lower in asset.content.lower()):
                asset.access_asset()  # Record access
                results.append(asset)
        
        # Sort by relevance and access patterns
        results.sort(key=lambda x: (x.relevance_score, x.access_count), reverse=True)
        return results
    
    def get_decision_insights(self) -> Dict:
        """Analyze decision patterns and outcomes"""
        if not self.decisions:
            return {'message': 'No decisions recorded yet'}
        
        total_decisions = len(self.decisions)
        decisions_with_outcomes = [d for d in self.decisions.values() if d.success_score is not None]
        
        insights = {
            'total_decisions': total_decisions,
            'decisions_with_outcomes': len(decisions_with_outcomes),
            'average_success_score': 0.0,
            'decision_type_distribution': {},
            'common_decision_criteria': {},
            'lessons_learned': []
        }
        
        if decisions_with_outcomes:
            insights['average_success_score'] = sum(d.success_score for d in decisions_with_outcomes) / len(decisions_with_outcomes)
        
        # Decision type distribution
        for decision in self.decisions.values():
            dtype = decision.decision_type.value
            insights['decision_type_distribution'][dtype] = insights['decision_type_distribution'].get(dtype, 0) + 1
        
        # Collect all lessons learned
        for decision in self.decisions.values():
            insights['lessons_learned'].extend(decision.lessons_learned)
        
        return insights
    
    def get_strategic_summary(self) -> Dict:
        """Get comprehensive strategic summary"""
        return {
            'identity': self.identity_profile.to_dict() if self.identity_profile else None,
            'goals_summary': {
                'total_goals': len(self.goals),
                'active_goals': len([g for g in self.goals.values() if g.status == GoalStatus.ACTIVE]),
                'completed_goals': len([g for g in self.goals.values() if g.status == GoalStatus.COMPLETED]),
                'average_progress': self._calculate_average_progress()
            },
            'decisions_summary': {
                'total_decisions': len(self.decisions),
                'recent_decisions': len([d for d in self.decisions.values() 
                                       if (datetime.now() - d.decided_at).days <= 30])
            },
            'intelligence_summary': {
                'total_assets': len(self.intelligence_assets),
                'asset_types': self._get_asset_type_distribution(),
                'validated_assets': len([a for a in self.intelligence_assets.values() if a.validated])
            },
            'sovereignty_score': self._calculate_sovereignty_score()
        }
    
    def _update_goal_completion_stats(self, goal: Goal):
        """Update goal completion analytics"""
        if 'completed_goals' not in self.goal_completion_stats:
            self.goal_completion_stats['completed_goals'] = 0
        self.goal_completion_stats['completed_goals'] += 1
        
        # Track completion time
        if goal.created_at and goal.completed_at:
            completion_time = (goal.completed_at - goal.created_at).days
            if 'average_completion_days' not in self.goal_completion_stats:
                self.goal_completion_stats['average_completion_days'] = []
            self.goal_completion_stats['average_completion_days'].append(completion_time)
    
    def _update_decision_patterns(self, decision: Decision):
        """Analyze and update decision patterns"""
        # Track decision making speed
        if decision.decision_type.value not in self.decision_patterns:
            self.decision_patterns[decision.decision_type.value] = {'count': 0}
        self.decision_patterns[decision.decision_type.value]['count'] += 1
    
    def _calculate_average_progress(self) -> float:
        """Calculate average progress across all active goals"""
        active_goals = [g for g in self.goals.values() if g.status == GoalStatus.ACTIVE]
        if not active_goals:
            return 0.0
        return sum(g.progress_percentage for g in active_goals) / len(active_goals)
    
    def _get_asset_type_distribution(self) -> Dict:
        """Get distribution of intelligence asset types"""
        distribution = {}
        for asset in self.intelligence_assets.values():
            asset_type = asset.asset_type.value
            distribution[asset_type] = distribution.get(asset_type, 0) + 1
        return distribution
    
    def _calculate_sovereignty_score(self) -> float:
        """Calculate overall personal sovereignty score (0-100)"""
        score = 0.0
        
        # Identity completeness (20 points)
        if self.identity_profile:
            identity_score = 15 + (5 if len(self.identity_profile.core_values) > 0 else 0)
            score += identity_score
        
        # Goal management (30 points)
        if self.goals:
            active_goals = len([g for g in self.goals.values() if g.status == GoalStatus.ACTIVE])
            completed_goals = len([g for g in self.goals.values() if g.status == GoalStatus.COMPLETED])
            goal_score = min(30, (active_goals * 3) + (completed_goals * 5))
            score += goal_score
        
        # Decision tracking (25 points)
        if self.decisions:
            decision_score = min(25, len(self.decisions) * 2)
            score += decision_score
        
        # Intelligence assets (25 points)
        if self.intelligence_assets:
            asset_score = min(25, len(self.intelligence_assets) * 1.5)
            score += asset_score
        
        return min(100.0, score)
    
    def to_dict(self) -> Dict:
        """Serialize entire sovereignty database"""
        return {
            'user_id': self.user_id,
            'identity_profile': self.identity_profile.to_dict() if self.identity_profile else None,
            'goals': {k: v.to_dict() for k, v in self.goals.items()},
            'decisions': {k: v.to_dict() for k, v in self.decisions.items()},
            'intelligence_assets': {k: v.to_dict() for k, v in self.intelligence_assets.items()},
            'trusted_advisors': self.trusted_advisors,
            'professional_network': self.professional_network,
            'sovereignty_score': self._calculate_sovereignty_score(),
            'last_updated': datetime.now().isoformat()
        } 