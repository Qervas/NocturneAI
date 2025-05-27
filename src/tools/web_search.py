from typing import Dict, Any, List, Optional
from ..core.tools import Tool, ToolExecutionResult, ToolResultStatus
import aiohttp
import json

class WebSearchTool(Tool):
    """Tool for performing web searches"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="web_search",
            description="Search the web for information"
        )
        self.api_key = api_key
        self.base_url = "https://api.search.brave.com/res/v1/web/search"
    
    async def execute(self, query: str, count: int = 5) -> ToolExecutionResult:
        """
        Execute a web search
        
        Args:
            query: The search query
            count: Number of results to return (1-20)
        """
        if not self.api_key:
            return ToolExecutionResult(
                status=ToolResultStatus.ERROR,
                result=None,
                error="API key not configured"
            )
            
        headers = {
            "X-Subscription-Token": self.api_key,
            "Accept": "application/json"
        }
        
        params = {
            "q": query,
            "count": min(max(1, count), 20)  # Ensure count is between 1 and 20
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.base_url, 
                    headers=headers, 
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = [
                            {
                                "title": r.get("title", ""),
                                "url": r.get("url", ""),
                                "description": r.get("description", "")
                            }
                            for r in data.get("web", {}).get("results", [])[:count]
                        ]
                        return ToolExecutionResult(
                            status=ToolResultStatus.SUCCESS,
                            result=results,
                            metadata={"count": len(results)}
                        )
                    else:
                        error_text = await response.text()
                        return ToolExecutionResult(
                            status=ToolResultStatus.ERROR,
                            result=None,
                            error=f"API error: {response.status} - {error_text}"
                        )
        except Exception as e:
            return ToolExecutionResult(
                status=ToolResultStatus.ERROR,
                result=None,
                error=f"Search failed: {str(e)}"
            )

class CalculatorTool(Tool):
    """Tool for performing calculations"""
    
    def __init__(self):
        super().__init__(
            name="calculator",
            description="Perform mathematical calculations"
        )
    
    async def execute(self, expression: str) -> ToolExecutionResult:
        """
        Evaluate a mathematical expression
        
        Args:
            expression: Mathematical expression to evaluate
        """
        try:
            # WARNING: Using eval can be dangerous with untrusted input
            # In production, use a safe evaluation library
            result = eval(expression, {"__builtins__": None}, {
                "abs": abs,
                "round": round,
                "pow": pow,
                "min": min,
                "max": max,
                "sum": sum
            })
            return ToolExecutionResult(
                status=ToolResultStatus.SUCCESS,
                result=result,
                metadata={"expression": expression}
            )
        except Exception as e:
            return ToolExecutionResult(
                status=ToolResultStatus.INVALID_INPUT,
                result=None,
                error=f"Calculation error: {str(e)}"
            )

class TimeTool(Tool):
    """Tool for getting the current time"""
    
    def __init__(self):
        super().__init__(
            name="get_current_time",
            description="Get the current date and time"
        )
    
    async def execute(self, timezone: str = "UTC") -> ToolExecutionResult:
        """
        Get the current time
        
        Args:
            timezone: Timezone to get time for (default: UTC)
        """
        from datetime import datetime
        import pytz
        
        try:
            tz = pytz.timezone(timezone)
            current_time = datetime.now(tz)
            return ToolExecutionResult(
                status=ToolResultStatus.SUCCESS,
                result={
                    "time": current_time.isoformat(),
                    "timezone": str(tz),
                    "utc_offset": current_time.utcoffset().total_seconds() / 3600
                },
                metadata={"timezone": timezone}
            )
        except pytz.exceptions.UnknownTimeZoneError:
            return ToolExecutionResult(
                status=ToolResultStatus.INVALID_INPUT,
                result=None,
                error=f"Unknown timezone: {timezone}"
            )
