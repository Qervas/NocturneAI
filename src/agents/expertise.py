"""
Expertise adaptation for intelligent agents.

This module provides mechanisms for agents to adapt their expertise
based on task performance, learning from experience, and receiving feedback.
"""

from typing import Dict, List, Any, Optional, Set, Tuple, Union
from enum import Enum, auto
import logging
import json
from datetime import datetime, timezone
import math
import random

logger = logging.getLogger(__name__)

class ExpertiseLevel(Enum):
    """Levels of expertise an agent can have in a domain"""
    NOVICE = auto()          # Basic understanding, limited experience
    APPRENTICE = auto()      # Growing understanding, some experience
    PRACTITIONER = auto()    # Solid understanding, regular experience
    EXPERT = auto()          # Deep understanding, extensive experience
    MASTER = auto()          # Comprehensive understanding, authoritative
    
    @staticmethod
    def from_score(score: float) -> 'ExpertiseLevel':
        """Convert a numeric score (0-1) to an expertise level"""
        if score < 0.2:
            return ExpertiseLevel.NOVICE
        elif score < 0.4:
            return ExpertiseLevel.APPRENTICE
        elif score < 0.7:
            return ExpertiseLevel.PRACTITIONER
        elif score < 0.9:
            return ExpertiseLevel.EXPERT
        else:
            return ExpertiseLevel.MASTER
    
    @staticmethod
    def to_score(level: 'ExpertiseLevel') -> float:
        """Convert an expertise level to a numeric score (0-1)"""
        if level == ExpertiseLevel.NOVICE:
            return 0.1
        elif level == ExpertiseLevel.APPRENTICE:
            return 0.3
        elif level == ExpertiseLevel.PRACTITIONER:
            return 0.6
        elif level == ExpertiseLevel.EXPERT:
            return 0.8
        elif level == ExpertiseLevel.MASTER:
            return 0.95
        else:
            return 0.0

class TaskFeedback(Enum):
    """Types of feedback that can be given on a task"""
    EXCELLENT = auto()       # Task completed exceptionally well
    GOOD = auto()            # Task completed well
    SATISFACTORY = auto()    # Task completed adequately
    NEEDS_IMPROVEMENT = auto()  # Task completed but with issues
    POOR = auto()            # Task completed poorly
    FAILED = auto()          # Task not completed successfully
    
    @staticmethod
    def to_adjustment(feedback: 'TaskFeedback') -> float:
        """Convert feedback to an expertise adjustment value"""
        if feedback == TaskFeedback.EXCELLENT:
            return 0.05
        elif feedback == TaskFeedback.GOOD:
            return 0.03
        elif feedback == TaskFeedback.SATISFACTORY:
            return 0.01
        elif feedback == TaskFeedback.NEEDS_IMPROVEMENT:
            return -0.01
        elif feedback == TaskFeedback.POOR:
            return -0.03
        elif feedback == TaskFeedback.FAILED:
            return -0.05
        else:
            return 0.0

class ExpertiseRecord:
    """A record of an agent's expertise in a specific domain"""
    
    def __init__(self, 
                domain: str, 
                initial_score: float = 0.5,
                confidence: float = 0.5,
                history: Optional[List[Dict[str, Any]]] = None):
        """Initialize an expertise record"""
        self.domain = domain
        self.score = max(0.0, min(1.0, initial_score))  # Clamp between 0 and 1
        self.confidence = max(0.0, min(1.0, confidence))  # Clamp between 0 and 1
        self.history = history or []
        self.last_updated = datetime.now(timezone.utc)
    
    @property
    def level(self) -> ExpertiseLevel:
        """Get the expertise level based on the score"""
        return ExpertiseLevel.from_score(self.score)
    
    def adjust(self, 
              amount: float, 
              reason: str, 
              evidence: Optional[str] = None,
              confidence_adjustment: Optional[float] = None) -> None:
        """
        Adjust the expertise score.
        
        Args:
            amount: The amount to adjust the score by
            reason: The reason for the adjustment
            evidence: Evidence supporting the adjustment
            confidence_adjustment: Optional adjustment to confidence
        """
        old_score = self.score
        old_level = self.level
        
        # Apply confidence-weighted adjustment
        weighted_adjustment = amount * self.confidence
        self.score = max(0.0, min(1.0, self.score + weighted_adjustment))
        
        # Adjust confidence if specified
        if confidence_adjustment is not None:
            self.confidence = max(0.0, min(1.0, self.confidence + confidence_adjustment))
        
        # Record the adjustment in history
        self.history.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "previous_score": old_score,
            "adjustment": amount,
            "weighted_adjustment": weighted_adjustment,
            "new_score": self.score,
            "previous_level": old_level.name,
            "new_level": self.level.name,
            "reason": reason,
            "evidence": evidence,
            "confidence": self.confidence
        })
        
        self.last_updated = datetime.now(timezone.utc)
        
        # Log level changes
        if old_level != self.level:
            logger.info(f"Expertise level changed in {self.domain}: {old_level.name} -> {self.level.name}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the expertise record to a dictionary"""
        return {
            "domain": self.domain,
            "score": self.score,
            "level": self.level.name,
            "confidence": self.confidence,
            "history": self.history,
            "last_updated": self.last_updated.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExpertiseRecord':
        """Create an expertise record from a dictionary"""
        return cls(
            domain=data["domain"],
            initial_score=data["score"],
            confidence=data["confidence"],
            history=data["history"]
        )

class ExpertiseModel:
    """
    A model of an agent's expertise across multiple domains.
    
    This class manages an agent's expertise in various domains,
    tracks changes over time, and provides methods for expertise
    adaptation based on task performance and feedback.
    """
    
    def __init__(self, agent_id: str, agent_name: str):
        """Initialize an expertise model"""
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.domains: Dict[str, ExpertiseRecord] = {}
        self.created_at = datetime.now(timezone.utc)
        self.last_updated = self.created_at
    
    def add_domain(self, 
                  domain: str, 
                  initial_score: float = 0.5,
                  confidence: float = 0.5) -> ExpertiseRecord:
        """
        Add a new expertise domain.
        
        Args:
            domain: The name of the domain
            initial_score: The initial expertise score (0-1)
            confidence: Confidence in the initial score (0-1)
            
        Returns:
            The created expertise record
        """
        if domain in self.domains:
            logger.warning(f"Domain {domain} already exists for agent {self.agent_name}")
            return self.domains[domain]
            
        record = ExpertiseRecord(
            domain=domain,
            initial_score=initial_score,
            confidence=confidence
        )
        
        self.domains[domain] = record
        self.last_updated = datetime.now(timezone.utc)
        
        logger.info(f"Added domain {domain} for agent {self.agent_name} with initial level {record.level.name}")
        return record
    
    def get_domain(self, domain: str) -> Optional[ExpertiseRecord]:
        """Get an expertise record for a specific domain"""
        return self.domains.get(domain)
    
    def get_level(self, domain: str) -> ExpertiseLevel:
        """Get the expertise level for a specific domain"""
        record = self.get_domain(domain)
        if record:
            return record.level
        return ExpertiseLevel.NOVICE
    
    def get_score(self, domain: str) -> float:
        """Get the expertise score for a specific domain"""
        record = self.get_domain(domain)
        if record:
            return record.score
        return 0.0
    
    def has_expertise(self, domain: str, minimum_level: ExpertiseLevel = ExpertiseLevel.PRACTITIONER) -> bool:
        """Check if the agent has sufficient expertise in a domain"""
        record = self.get_domain(domain)
        if record:
            return record.level.value >= minimum_level.value
        return False
    
    def adjust_expertise(self,
                        domain: str,
                        adjustment: float,
                        reason: str,
                        evidence: Optional[str] = None,
                        confidence_adjustment: Optional[float] = None) -> None:
        """
        Adjust expertise in a specific domain.
        
        Args:
            domain: The domain to adjust
            adjustment: The amount to adjust the score by
            reason: The reason for the adjustment
            evidence: Evidence supporting the adjustment
            confidence_adjustment: Optional adjustment to confidence
        """
        record = self.get_domain(domain)
        if not record:
            # Create the domain if it doesn't exist
            record = self.add_domain(domain)
            
        record.adjust(
            amount=adjustment,
            reason=reason,
            evidence=evidence,
            confidence_adjustment=confidence_adjustment
        )
        
        self.last_updated = datetime.now(timezone.utc)
    
    def provide_task_feedback(self,
                            domain: str,
                            feedback: TaskFeedback,
                            task_description: str,
                            performance_notes: Optional[str] = None) -> None:
        """
        Provide feedback on task performance to adjust expertise.
        
        Args:
            domain: The domain the task belongs to
            feedback: The feedback on the task
            task_description: Description of the task
            performance_notes: Additional notes on performance
        """
        adjustment = TaskFeedback.to_adjustment(feedback)
        
        # Adjust confidence based on feedback consistency
        confidence_adjustment = 0.01 if feedback.value >= TaskFeedback.SATISFACTORY.value else -0.01
        
        self.adjust_expertise(
            domain=domain,
            adjustment=adjustment,
            reason=f"Task feedback: {feedback.name}",
            evidence=f"Task: {task_description}\nNotes: {performance_notes or 'None'}",
            confidence_adjustment=confidence_adjustment
        )
    
    def learn_from_observation(self,
                             domain: str,
                             observation: str,
                             impact: float = 0.01) -> None:
        """
        Learn from observing related activities or information.
        
        Args:
            domain: The domain to learn about
            observation: The observation
            impact: The impact on expertise (typically small)
        """
        self.adjust_expertise(
            domain=domain,
            adjustment=impact,
            reason="Learning from observation",
            evidence=observation
        )
    
    def transfer_knowledge(self,
                         source_domain: str,
                         target_domain: str,
                         transfer_factor: float = 0.2) -> bool:
        """
        Transfer knowledge from one domain to another.
        
        Args:
            source_domain: The source domain to transfer from
            target_domain: The target domain to transfer to
            transfer_factor: How much knowledge transfers (0-1)
            
        Returns:
            True if knowledge was transferred, False otherwise
        """
        source_record = self.get_domain(source_domain)
        if not source_record or source_record.score < 0.4:
            # Need sufficient expertise to transfer knowledge
            return False
            
        target_record = self.get_domain(target_domain)
        if not target_record:
            # Create the target domain
            target_record = self.add_domain(target_domain, initial_score=0.1)
            
        # Calculate transfer amount (higher expertise transfers more)
        transfer_amount = source_record.score * transfer_factor
        
        # Expertise transfer diminishes as target expertise grows
        diminishing_factor = 1.0 - (target_record.score * 0.5)
        final_adjustment = transfer_amount * diminishing_factor
        
        target_record.adjust(
            amount=final_adjustment,
            reason=f"Knowledge transfer from {source_domain}",
            evidence=f"Source expertise: {source_record.score:.2f}, Transfer factor: {transfer_factor}",
            confidence_adjustment=0.01  # Small confidence boost from knowledge transfer
        )
        
        return True
    
    def adapt_to_problem_domain(self, problem_domains: List[str], adaptation_strength: float = 0.3) -> None:
        """
        Adapt expertise based on a new problem's domains.
        
        This method automatically adjusts expertise across domains based on the
        agent's existing knowledge and the demands of a new problem.
        
        Args:
            problem_domains: List of domains relevant to the problem
            adaptation_strength: How strongly to adapt (0-1)
        """
        # Ensure all problem domains exist in the model
        for domain in problem_domains:
            if domain not in self.domains:
                self.add_domain(domain, initial_score=0.2, confidence=0.3)
        
        # Try to transfer knowledge between related domains
        for source_domain, source_record in self.domains.items():
            if source_record.score > 0.5:  # Only transfer from domains with good expertise
                for target_domain in problem_domains:
                    if source_domain != target_domain and self.domains[target_domain].score < 0.5:
                        self.transfer_knowledge(
                            source_domain=source_domain,
                            target_domain=target_domain,
                            transfer_factor=adaptation_strength * 0.5
                        )
        
        # Slightly boost expertise in problem domains to represent focus
        for domain in problem_domains:
            self.adjust_expertise(
                domain=domain,
                adjustment=0.02 * adaptation_strength,
                reason="Focusing on problem domain",
                evidence=f"Adapting to problem requiring {domain} expertise"
            )
    
    def identify_expertise_gaps(self, required_domains: Dict[str, float]) -> List[Dict[str, Any]]:
        """
        Identify gaps between required expertise and current expertise.
        
        Args:
            required_domains: Dictionary mapping domain names to required expertise scores
            
        Returns:
            List of identified gaps with domain, current level, and required level
        """
        gaps = []
        
        for domain, required_score in required_domains.items():
            current_score = self.get_score(domain)
            
            if current_score < required_score:
                gaps.append({
                    "domain": domain,
                    "current_score": current_score,
                    "current_level": self.get_level(domain).name,
                    "required_score": required_score,
                    "required_level": ExpertiseLevel.from_score(required_score).name,
                    "gap": required_score - current_score
                })
        
        # Sort by gap size (largest first)
        gaps.sort(key=lambda x: x["gap"], reverse=True)
        
        return gaps
    
    def get_learning_recommendations(self, gaps: List[Dict[str, Any]], max_recommendations: int = 3) -> List[Dict[str, Any]]:
        """
        Generate learning recommendations based on expertise gaps.
        
        Args:
            gaps: List of expertise gaps
            max_recommendations: Maximum number of recommendations to generate
            
        Returns:
            List of learning recommendations
        """
        recommendations = []
        
        for gap in gaps[:max_recommendations]:
            domain = gap["domain"]
            current_level = gap["current_level"]
            required_level = gap["required_level"]
            
            recommendations.append({
                "domain": domain,
                "focus_areas": self._generate_focus_areas(domain, current_level, required_level),
                "resources": self._generate_resources(domain, current_level, required_level),
                "priority": "High" if gap["gap"] > 0.4 else "Medium" if gap["gap"] > 0.2 else "Low"
            })
        
        return recommendations
    
    def _generate_focus_areas(self, domain: str, current_level: str, required_level: str) -> List[str]:
        """Generate focus areas for learning a domain"""
        # This would be more sophisticated in a real implementation
        focus_areas = []
        
        if current_level == "NOVICE":
            focus_areas.append(f"Fundamentals of {domain}")
            focus_areas.append(f"Basic terminology in {domain}")
            focus_areas.append(f"Common patterns in {domain}")
        elif current_level == "APPRENTICE":
            focus_areas.append(f"Intermediate concepts in {domain}")
            focus_areas.append(f"Practical applications of {domain}")
            focus_areas.append(f"Case studies in {domain}")
        elif current_level == "PRACTITIONER":
            focus_areas.append(f"Advanced techniques in {domain}")
            focus_areas.append(f"Best practices in {domain}")
            focus_areas.append(f"Recent developments in {domain}")
        elif current_level == "EXPERT":
            focus_areas.append(f"Cutting-edge research in {domain}")
            focus_areas.append(f"Innovation opportunities in {domain}")
            focus_areas.append(f"Teaching and mentoring in {domain}")
        
        return focus_areas
    
    def _generate_resources(self, domain: str, current_level: str, required_level: str) -> List[str]:
        """Generate learning resources for a domain"""
        # This would be more sophisticated in a real implementation
        resources = []
        
        if current_level == "NOVICE":
            resources.append(f"Introductory tutorials on {domain}")
            resources.append(f"Beginner courses in {domain}")
            resources.append(f"Foundational reading materials about {domain}")
        elif current_level == "APPRENTICE":
            resources.append(f"Practice exercises in {domain}")
            resources.append(f"Intermediate workshops on {domain}")
            resources.append(f"Mentoring from a {domain} practitioner")
        elif current_level == "PRACTITIONER":
            resources.append(f"Advanced courses in {domain}")
            resources.append(f"Specialized projects involving {domain}")
            resources.append(f"Professional communities focused on {domain}")
        elif current_level == "EXPERT":
            resources.append(f"Research papers in {domain}")
            resources.append(f"Conferences about {domain}")
            resources.append(f"Contributing to open-source projects related to {domain}")
        
        return resources
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the expertise model to a dictionary"""
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "domains": {name: record.to_dict() for name, record in self.domains.items()},
            "created_at": self.created_at.isoformat(),
            "last_updated": self.last_updated.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExpertiseModel':
        """Create an expertise model from a dictionary"""
        model = cls(
            agent_id=data["agent_id"],
            agent_name=data["agent_name"]
        )
        
        # Load domains
        for domain_name, domain_data in data["domains"].items():
            model.domains[domain_name] = ExpertiseRecord.from_dict(domain_data)
        
        return model
    
    def get_expertise_profile(self) -> Dict[str, Any]:
        """
        Get a summary of the agent's expertise profile.
        
        Returns:
            Dictionary with expertise summary
        """
        domains_by_level = {level.name: [] for level in ExpertiseLevel}
        
        for domain, record in self.domains.items():
            domains_by_level[record.level.name].append({
                "domain": domain,
                "score": record.score,
                "confidence": record.confidence
            })
        
        # Filter out empty levels
        domains_by_level = {k: v for k, v in domains_by_level.items() if v}
        
        # Sort domains within each level by score
        for level, domains in domains_by_level.items():
            domains.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "expertise_by_level": domains_by_level,
            "top_domains": sorted(
                [{"domain": k, "score": v.score} for k, v in self.domains.items()],
                key=lambda x: x["score"],
                reverse=True
            )[:5],
            "last_updated": self.last_updated.isoformat()
        }

class ExpertiseDevelopmentManager:
    """
    Manager for coordinating expertise development across multiple agents.
    
    This class provides methods for tracking expertise across a team of agents,
    identifying team strengths and weaknesses, and coordinating learning and
    knowledge sharing.
    """
    
    def __init__(self):
        """Initialize the expertise development manager"""
        self.agent_models: Dict[str, ExpertiseModel] = {}
        self.team_required_domains: Dict[str, float] = {}
    
    def register_agent(self, agent_id: str, agent_name: str) -> ExpertiseModel:
        """Register an agent with the manager"""
        if agent_id in self.agent_models:
            return self.agent_models[agent_id]
            
        model = ExpertiseModel(agent_id=agent_id, agent_name=agent_name)
        self.agent_models[agent_id] = model
        
        return model
    
    def get_agent_model(self, agent_id: str) -> Optional[ExpertiseModel]:
        """Get an agent's expertise model"""
        return self.agent_models.get(agent_id)
    
    def set_team_requirements(self, required_domains: Dict[str, float]) -> None:
        """Set the expertise domains required for the team"""
        self.team_required_domains = required_domains
    
    def analyze_team_capabilities(self) -> Dict[str, Any]:
        """
        Analyze the team's collective expertise capabilities.
        
        Returns:
            Dictionary with team expertise analysis
        """
        if not self.agent_models:
            return {"error": "No agents registered"}
            
        # Collect all domains across all agents
        all_domains = set()
        for model in self.agent_models.values():
            all_domains.update(model.domains.keys())
        
        # Analyze each domain
        domain_analysis = {}
        for domain in all_domains:
            agents_with_domain = []
            for agent_id, model in self.agent_models.items():
                record = model.get_domain(domain)
                if record:
                    agents_with_domain.append({
                        "agent_id": agent_id,
                        "agent_name": model.agent_name,
                        "score": record.score,
                        "level": record.level.name,
                        "confidence": record.confidence
                    })
            
            # Sort agents by expertise score
            agents_with_domain.sort(key=lambda x: x["score"], reverse=True)
            
            # Calculate team capability in this domain
            if agents_with_domain:
                # Use the top 3 agents' scores with diminishing weights
                weights = [0.6, 0.3, 0.1]
                top_agents = agents_with_domain[:3]
                
                team_score = sum(
                    agent["score"] * weights[i] 
                    for i, agent in enumerate(top_agents)
                ) / sum(weights[:len(top_agents)])
                
                team_level = ExpertiseLevel.from_score(team_score)
            else:
                team_score = 0.0
                team_level = ExpertiseLevel.NOVICE
            
            # Check if this is a required domain
            required_score = self.team_required_domains.get(domain, 0.0)
            gap = max(0, required_score - team_score)
            
            domain_analysis[domain] = {
                "team_score": team_score,
                "team_level": team_level.name,
                "agents": agents_with_domain,
                "required_score": required_score,
                "gap": gap,
                "status": "Adequate" if gap <= 0.1 else "Needs improvement" if gap <= 0.3 else "Significant gap"
            }
        
        # Overall team analysis
        overall_gaps = [
            {"domain": domain, "gap": data["gap"]}
            for domain, data in domain_analysis.items()
            if data["gap"] > 0.1
        ]
        
        overall_gaps.sort(key=lambda x: x["gap"], reverse=True)
        
        team_strengths = [
            {"domain": domain, "score": data["team_score"]}
            for domain, data in domain_analysis.items()
            if data["team_score"] >= 0.7
        ]
        
        team_strengths.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "domain_analysis": domain_analysis,
            "team_gaps": overall_gaps,
            "team_strengths": team_strengths,
            "agent_count": len(self.agent_models),
            "domain_count": len(domain_analysis)
        }
    
    def get_expertise_development_plan(self) -> Dict[str, Any]:
        """
        Generate a plan for developing the team's expertise.
        
        Returns:
            Dictionary with expertise development plan
        """
        team_analysis = self.analyze_team_capabilities()
        
        if "error" in team_analysis:
            return {"error": team_analysis["error"]}
            
        # Focus on the top 3 gaps
        focus_domains = [gap["domain"] for gap in team_analysis["team_gaps"][:3]]
        
        development_plan = {
            "focus_domains": focus_domains,
            "agent_assignments": {},
            "knowledge_sharing": []
        }
        
        if not focus_domains:
            development_plan["status"] = "Team expertise is adequate across all required domains"
            return development_plan
        
        # Assign agents to learn specific domains
        for domain in focus_domains:
            domain_data = team_analysis["domain_analysis"][domain]
            
            # Find agents who should develop this expertise
            potential_learners = []
            for agent_id, model in self.agent_models.items():
                # Check if agent already has expertise in this domain
                has_expertise = False
                for agent_data in domain_data["agents"]:
                    if agent_data["agent_id"] == agent_id and agent_data["score"] >= 0.7:
                        has_expertise = True
                        break
                
                if not has_expertise:
                    # Check if agent has expertise in related domains
                    # (in a real implementation, we would have a domain relationship model)
                    related_score = 0.0
                    for agent_domain, record in model.domains.items():
                        if agent_domain != domain and record.score >= 0.6:
                            related_score = max(related_score, record.score * 0.5)
                    
                    potential_learners.append({
                        "agent_id": agent_id,
                        "agent_name": model.agent_name,
                        "current_score": model.get_score(domain),
                        "related_expertise": related_score,
                        "learning_potential": related_score + 0.2  # Base learning potential
                    })
            
            # Sort by learning potential
            potential_learners.sort(key=lambda x: x["learning_potential"], reverse=True)
            
            # Assign the top 2 learners
            assigned_learners = potential_learners[:2]
            
            development_plan["agent_assignments"][domain] = [
                {
                    "agent_id": learner["agent_id"],
                    "agent_name": learner["agent_name"],
                    "current_level": ExpertiseLevel.from_score(learner["current_score"]).name,
                    "target_level": ExpertiseLevel.from_score(min(learner["current_score"] + 0.3, 0.9)).name,
                    "learning_methods": self._generate_learning_methods(domain, learner["current_score"])
                }
                for learner in assigned_learners
            ]
            
            # Find mentors for knowledge sharing
            mentors = [
                agent_data for agent_data in domain_data["agents"]
                if agent_data["score"] >= 0.7
            ]
            
            if mentors and assigned_learners:
                for mentor in mentors:
                    for learner in assigned_learners:
                        development_plan["knowledge_sharing"].append({
                            "mentor_id": mentor["agent_id"],
                            "mentor_name": mentor["agent_name"],
                            "mentor_level": mentor["level"],
                            "learner_id": learner["agent_id"],
                            "learner_name": learner["agent_name"],
                            "domain": domain,
                            "methods": ["Pair work", "Mentoring sessions", "Knowledge transfer activities"]
                        })
        
        return development_plan
    
    def _generate_learning_methods(self, domain: str, current_score: float) -> List[str]:
        """Generate appropriate learning methods based on current expertise"""
        methods = []
        
        if current_score < 0.3:
            methods.extend([
                f"Structured learning program for {domain}",
                f"Foundational training in {domain}",
                f"Guided practice with {domain} tasks"
            ])
        elif current_score < 0.6:
            methods.extend([
                f"Intermediate projects involving {domain}",
                f"Collaborative work with {domain} experts",
                f"Specialized training in advanced {domain} topics"
            ])
        else:
            methods.extend([
                f"Leading {domain} initiatives",
                f"Research and development in {domain}",
                f"Teaching and mentoring others in {domain}"
            ])
        
        return methods
