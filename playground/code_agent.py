"""
Code Agent - A specialized agent for solving programming tasks

This agent uses the Ollama integration to generate code solutions for programming tasks.
It works within a segregated playground folder to avoid affecting the main codebase.
"""

import os
import sys
import json
import asyncio
import argparse
import logging
from typing import Dict, List, Any, Optional

# Add the src directory to the path so we can import the agent modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.llm import LocalLLMProvider, LLMResponse
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class CodeAgent:
    """A specialized agent for solving programming tasks using Ollama"""
    
    def __init__(
        self,
        model_name: str = None,
        base_url: str = None,
        task_dir: str = None,
        temperature: float = 0.2  # Lower temperature for more precise code generation
    ):
        """Initialize the code agent with Ollama settings"""
        self.model_name = model_name or os.getenv("MODEL_NAME", "gemma3:latest").split('#')[0].strip()
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.task_dir = task_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), "tasks")
        self.temperature = temperature
        
        # Create the LLM provider
        self.llm = LocalLLMProvider(
            model_name=self.model_name,
            base_url=self.base_url,
            options={"temperature": self.temperature}
        )
        
        # Create task directory if it doesn't exist
        os.makedirs(self.task_dir, exist_ok=True)
        
        logger.info(f"CodeAgent initialized with model {self.model_name} and task dir {self.task_dir}")
    
    async def solve_task(
        self,
        task_description: str,
        output_name: str,
        language: str = "python",
        example_code: Optional[str] = None,
        context: Optional[str] = None
    ) -> str:
        """
        Solve a programming task and save the solution
        
        Args:
            task_description: Description of the programming task to solve
            output_name: Name of the output file/directory
            language: Programming language to use
            example_code: Optional example code to guide the solution
            context: Optional additional context for the task
            
        Returns:
            Path to the generated solution
        """
        # Create a task-specific directory
        task_path = os.path.join(self.task_dir, output_name)
        os.makedirs(task_path, exist_ok=True)
        
        # Create system prompt for code generation
        system_prompt = f"""You are an expert {language} developer. Your task is to create code that solves the following problem.
        Follow these guidelines:
        1. Write clean, efficient, and well-documented code
        2. Include docstrings and comments to explain your approach
        3. Handle edge cases and potential errors
        4. Include a requirements.txt file if needed
        5. Provide a README.md explaining how to use the code
        6. Include example usage
        
        Think step by step and explain your solution before writing the code.
        """
        
        # Format the user message with the task description
        user_message = f"""
        # Task Description
        {task_description}
        
        # Output Requirements
        - Programming Language: {language}
        - Output should be complete and runnable
        """
        
        # Add example code if provided
        if example_code:
            user_message += f"\n\n# Example Code for Reference\n```{language}\n{example_code}\n```"
        
        # Add context if provided
        if context:
            user_message += f"\n\n# Additional Context\n{context}"
        
        # Generate the solution
        logger.info(f"Generating solution for task: {output_name}")
        messages = [{"role": "user", "content": user_message}]
        
        response = await self.llm.generate(
            messages=messages,
            system_prompt=system_prompt,
            temperature=self.temperature
        )
        
        # Extract code blocks from the response
        solution = self._extract_solution(response, language)
        
        # Save files to the task directory
        file_paths = await self._save_solution(solution, task_path, language)
        
        # Save the original response for reference
        with open(os.path.join(task_path, "full_solution.md"), "w") as f:
            f.write(response.content)
        
        return task_path
    
    def _extract_solution(self, response: LLMResponse, language: str) -> Dict[str, str]:
        """
        Extract code blocks and file content from the response
        
        Args:
            response: LLM response containing the solution
            language: Programming language used
            
        Returns:
            Dictionary mapping filenames to content
        """
        solution = {}
        content = response.content
        
        # Try to find markdown code blocks
        import re
        code_blocks = re.findall(r'```(?:\w+)?\s*(.+?)\s*```', content, re.DOTALL)
        
        # Check for file markers like "filename.py"
        file_markers = re.findall(r'(?:^|\n)(?:#+\s*)?([a-zA-Z0-9_\-.]+\.[a-zA-Z0-9]+)(?:\s*[:;]|\n+```)', content)
        
        if file_markers and code_blocks and len(file_markers) <= len(code_blocks):
            # Match file markers with code blocks
            for i, filename in enumerate(file_markers):
                if i < len(code_blocks):
                    solution[filename] = code_blocks[i]
        else:
            # If no clear file markers, make a best guess
            if language == "python":
                main_file = "main.py"
            elif language == "javascript":
                main_file = "index.js"
            else:
                main_file = f"main.{language}"
                
            if code_blocks:
                solution[main_file] = code_blocks[0]
            
            # Check for README.md content
            readme_match = re.search(r'(?:#+\s*)?README\.md.*?\n(.*?)(?:\n#+|$)', content, re.DOTALL)
            if readme_match:
                solution["README.md"] = readme_match.group(1).strip()
            else:
                # Create a simple README from the task description
                solution["README.md"] = f"# Solution\n\n{content.split('```')[0].strip()}"
        
        return solution
    
    async def _save_solution(self, solution: Dict[str, str], task_path: str, language: str) -> List[str]:
        """
        Save the solution files to the task directory
        
        Args:
            solution: Dictionary mapping filenames to content
            task_path: Path to save the files
            language: Programming language used
            
        Returns:
            List of file paths created
        """
        file_paths = []
        
        # Make sure there's at least a main file
        if not solution:
            if language == "python":
                solution["main.py"] = "# Solution placeholder\nprint('Solution not generated correctly')"
            elif language == "javascript":
                solution["index.js"] = "// Solution placeholder\nconsole.log('Solution not generated correctly');"
        
        # Save each file
        for filename, content in solution.items():
            file_path = os.path.join(task_path, filename)
            with open(file_path, "w") as f:
                f.write(content)
            file_paths.append(file_path)
            logger.info(f"Saved solution file: {file_path}")
        
        return file_paths
    
    async def test_solution(self, task_path: str, language: str = "python") -> bool:
        """
        Test the generated solution
        
        Args:
            task_path: Path to the task directory
            language: Programming language of the solution
            
        Returns:
            True if the solution works, False otherwise
        """
        # This is a simplified implementation - in a real system you'd have more robust testing
        logger.info(f"Testing solution in {task_path}")
        
        try:
            if language == "python":
                main_file = os.path.join(task_path, "main.py")
                if os.path.exists(main_file):
                    # Run the Python script
                    import subprocess
                    result = subprocess.run(
                        [sys.executable, main_file], 
                        capture_output=True,
                        text=True,
                        cwd=task_path
                    )
                    logger.info(f"Test output: {result.stdout}")
                    if result.returncode != 0:
                        logger.error(f"Test error: {result.stderr}")
                        return False
                    return True
                
            # Add implementations for other languages as needed
            
            return False
            
        except Exception as e:
            logger.error(f"Error testing solution: {e}")
            return False

async def main():
    """Main entry point for the code agent"""
    parser = argparse.ArgumentParser(description="Code Agent for solving programming tasks")
    parser.add_argument("--task", type=str, help="Task description or file containing the task", required=True)
    parser.add_argument("--output", type=str, help="Name for the output directory", required=True)
    parser.add_argument("--language", type=str, default="python", help="Programming language to use")
    parser.add_argument("--example", type=str, help="Example code file path")
    parser.add_argument("--context", type=str, help="Additional context file path")
    parser.add_argument("--model", type=str, help="Model name to use")
    
    args = parser.parse_args()
    
    # Read task description from file if it's a file path
    task_description = args.task
    if os.path.exists(args.task):
        with open(args.task, "r") as f:
            task_description = f.read()
    
    # Read example code if provided
    example_code = None
    if args.example and os.path.exists(args.example):
        with open(args.example, "r") as f:
            example_code = f.read()
    
    # Read context if provided
    context = None
    if args.context and os.path.exists(args.context):
        with open(args.context, "r") as f:
            context = f.read()
    
    # Create and run the code agent
    agent = CodeAgent(model_name=args.model)
    solution_path = await agent.solve_task(
        task_description=task_description,
        output_name=args.output,
        language=args.language,
        example_code=example_code,
        context=context
    )
    
    print(f"\n=== Solution generated at {solution_path} ===\n")
    
    # Test the solution
    if await agent.test_solution(solution_path, args.language):
        print("✅ Solution test passed!")
    else:
        print("❌ Solution test failed or not implemented for this language.")

if __name__ == "__main__":
    asyncio.run(main())
