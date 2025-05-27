from typing import Dict, Any, List, Optional
from ...core.agent import BaseAgent, AgentRole, AgentResponse
from ...core.tools import ToolRegistry
from ...core.memory import MemoryStore
import logging

logger = logging.getLogger(__name__)

class TroubleshootingAgent(BaseAgent):
    """
    Troubleshooting Agent that diagnoses and resolves issues.
    
    This agent is responsible for:
    1. Diagnosing issues identified by the QA agent
    2. Suggesting solutions for bugs and errors
    3. Prioritizing fixes based on severity
    4. Implementing critical fixes
    5. Documenting resolution strategies
    """
    
    def __init__(
        self,
        name: str = "troubleshooting_agent",
        tool_registry: Optional[ToolRegistry] = None,
        memory_store: Optional[MemoryStore] = None,
        llm_provider: Any = None
    ):
        super().__init__(role=AgentRole.EXECUTOR, name=name)
        self.tool_registry = tool_registry or ToolRegistry()
        self.memory_store = memory_store or MemoryStore()
        self.llm_provider = llm_provider
    
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Process the input and troubleshoot issues"""
        try:
            # Add input to conversation history
            self.add_message("user", input_data.get("content", ""))
            
            # Extract relevant information
            qa_results = input_data.get("qa_results", {})
            code = input_data.get("code", "")
            context = input_data.get("context", {})
            
            # Generate solutions for identified issues
            solutions = await self._generate_solutions(qa_results, code, context)
            
            # Store solutions in memory
            self._store_solutions_in_memory(solutions)
            
            # Determine next steps
            next_agent = None
            if solutions.get("requires_research", False):
                next_agent = "research_agent"
            
            return AgentResponse(
                content=self._format_troubleshooting_response(solutions),
                metadata={"solutions": solutions},
                next_agent=next_agent
            )
            
        except Exception as e:
            logger.error(f"Error in troubleshooting agent: {str(e)}", exc_info=True)
            return AgentResponse(
                content=f"Error generating solutions: {str(e)}",
                metadata={"error": True, "error_message": str(e)}
            )
    
    async def _generate_solutions(
        self, 
        qa_results: Dict[str, Any], 
        code: str, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate solutions for identified issues"""
        # In a real implementation, this would use LLMs to suggest fixes
        
        # For demonstration, return mock solutions
        issues = qa_results.get("issues", [])
        solutions = {
            "fixes": [],
            "requires_research": False,
            "estimated_effort": "medium",
            "summary": "Several issues have straightforward fixes, but some require more investigation."
        }
        
        for issue in issues:
            fix = {
                "issue_type": issue.get("type", "unknown"),
                "severity": issue.get("severity", "low"),
                "line": issue.get("line", 0),
                "original_code": "// Example problematic code",  # Would extract from real code
                "suggested_fix": "// Example fixed code",  # Would generate with LLM
                "explanation": f"This fix addresses {issue.get('description', 'the issue')} by implementing {issue.get('suggestion', 'a solution')}.",
                "confidence": 0.85  # Confidence score from 0 to 1
            }
            
            # Some issues might require research
            if issue.get("type") == "complex_bug" or issue.get("severity") == "critical":
                fix["requires_research"] = True
                solutions["requires_research"] = True
            
            solutions["fixes"].append(fix)
        
        return solutions
    
    def _store_solutions_in_memory(self, solutions: Dict[str, Any]) -> None:
        """Store troubleshooting solutions in memory"""
        self.memory_store.add(
            f"Troubleshooting solutions",
            {"type": "solutions", "solutions": solutions}
        )
    
    def _format_troubleshooting_response(self, solutions: Dict[str, Any]) -> str:
        """Format troubleshooting solutions into a readable response"""
        fixes = solutions.get("fixes", [])
        fixes_count = len(fixes)
        
        response = [
            "# Troubleshooting Report",
            "",
            f"**Issues Addressed**: {fixes_count}",
            f"**Estimated Effort**: {solutions.get('estimated_effort', 'unknown').title()}",
            ""
        ]
        
        if fixes_count > 0:
            response.append("## Proposed Fixes")
            for i, fix in enumerate(fixes, 1):
                response.append(
                    f"\n### {i}. {fix['issue_type'].replace('_', ' ').title()} (Severity: {fix['severity']})"
                    f"\n**Line**: {fix['line']}"
                    f"\n\n**Original Code**:\n```\n{fix['original_code']}\n```"
                    f"\n\n**Suggested Fix**:\n```\n{fix['suggested_fix']}\n```"
                    f"\n\n**Explanation**:\n{fix['explanation']}"
                    f"\n\n**Confidence**: {int(fix['confidence'] * 100)}%"
                )
        
        if solutions.get("requires_research", False):
            response.append("\n## Further Research Required")
            response.append("\nSome issues require additional investigation. Forwarding to Research Agent.")
            
        response.append(f"\n## Summary\n\n{solutions.get('summary', '')}")
        
        return "\n".join(response)
