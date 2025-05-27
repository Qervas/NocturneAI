from typing import Dict, Any, List, Optional
from ...core.agent import BaseAgent, AgentRole, AgentResponse
from ...core.tools import ToolRegistry
from ...core.memory import MemoryStore
import logging

logger = logging.getLogger(__name__)

class QualityAssuranceAgent(BaseAgent):
    """
    Quality Assurance Agent that handles code quality and testing.
    
    This agent is responsible for:
    1. Reviewing code for quality and standards
    2. Running automated tests
    3. Identifying potential bugs and vulnerabilities
    4. Ensuring documentation completeness
    5. Validating against requirements
    """
    
    def __init__(
        self,
        name: str = "qa_agent",
        tool_registry: Optional[ToolRegistry] = None,
        memory_store: Optional[MemoryStore] = None,
        llm_provider: Any = None
    ):
        super().__init__(role=AgentRole.REVIEWER, name=name)
        self.tool_registry = tool_registry or ToolRegistry()
        self.memory_store = memory_store or MemoryStore()
        self.llm_provider = llm_provider
    
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Process the input and perform quality assurance tasks"""
        try:
            # Add input to conversation history
            self.add_message("user", input_data.get("content", ""))
            
            # Extract code and plan information
            code = input_data.get("code", "")
            plan = input_data.get("plan", {})
            requirements = input_data.get("requirements", [])
            
            # In a real implementation, this would use an LLM to analyze code
            qa_results = await self._analyze_code(code, plan, requirements)
            
            # Store QA results in memory
            self._store_qa_results_in_memory(code, qa_results)
            
            # Determine next steps based on QA results
            next_agent = None
            if qa_results["issues_found"]:
                next_agent = "troubleshooting_agent"
            
            return AgentResponse(
                content=self._format_qa_response(qa_results),
                metadata={"qa_results": qa_results},
                next_agent=next_agent
            )
            
        except Exception as e:
            logger.error(f"Error in QA agent: {str(e)}", exc_info=True)
            return AgentResponse(
                content=f"Error performing quality assurance: {str(e)}",
                metadata={"error": True, "error_message": str(e)}
            )
    
    async def _analyze_code(
        self, 
        code: str, 
        plan: Dict[str, Any], 
        requirements: List[str]
    ) -> Dict[str, Any]:
        """Analyze code for quality and compliance with requirements"""
        # In a real implementation, this would use LLMs and static analysis tools
        
        # For demonstration, return a mock QA report
        return {
            "issues_found": len(code) > 0,  # Just a placeholder condition
            "code_quality": {
                "score": 85,  # Out of 100
                "complexity": "medium",
                "maintainability": "good",
                "test_coverage": 78  # Percentage
            },
            "issues": [
                {
                    "type": "potential_bug",
                    "severity": "medium",
                    "description": "Possible null reference exception",
                    "line": 42,
                    "suggestion": "Add null check before accessing property"
                },
                {
                    "type": "style",
                    "severity": "low",
                    "description": "Inconsistent naming convention",
                    "line": 56,
                    "suggestion": "Use camelCase for variable names"
                }
            ],
            "requirements_met": [
                {"requirement": "Feature X", "status": "complete"},
                {"requirement": "Performance Y", "status": "partial"}
            ],
            "summary": "Code meets most requirements but has some quality issues."
        }
    
    def _store_qa_results_in_memory(self, code_identifier: str, qa_results: Dict[str, Any]) -> None:
        """Store QA results in memory for future reference"""
        self.memory_store.add(
            f"QA results for {code_identifier}",
            {"type": "qa_report", "qa_results": qa_results, "code_id": code_identifier}
        )
    
    def _format_qa_response(self, qa_results: Dict[str, Any]) -> str:
        """Format QA results into a human-readable response"""
        issues = qa_results.get("issues", [])
        issues_count = len(issues)
        
        response = [
            "# Quality Assurance Report",
            "",
            f"**Overall Quality Score**: {qa_results.get('code_quality', {}).get('score', 'N/A')}/100",
            "",
            f"**Issues Found**: {issues_count}",
        ]
        
        if issues_count > 0:
            response.append("\n## Issues")
            for i, issue in enumerate(issues, 1):
                response.append(
                    f"\n{i}. **{issue['type'].title()}** (Severity: {issue['severity']})"
                    f"\n   - {issue['description']}"
                    f"\n   - Line: {issue['line']}"
                    f"\n   - Suggestion: {issue['suggestion']}"
                )
        
        response.append("\n## Requirements Analysis")
        for req in qa_results.get("requirements_met", []):
            response.append(
                f"\n- {req['requirement']}: {req['status'].title()}"
            )
        
        response.append(f"\n## Summary\n\n{qa_results.get('summary', '')}")
        
        return "\n".join(response)
