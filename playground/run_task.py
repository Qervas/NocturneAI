"""
Run Task - Helper script to run the code agent on a specific task

This script simplifies the process of running the code agent on a task.
"""

import os
import sys
import asyncio
import argparse
from code_agent import CodeAgent

async def run_task(task_file, output_name, language="python", model=None):
    """Run the code agent on a specific task"""
    # Read the task description
    with open(task_file, "r") as f:
        task_description = f.read()
    
    # Create and run the code agent
    agent = CodeAgent(model_name=model)
    solution_path = await agent.solve_task(
        task_description=task_description,
        output_name=output_name,
        language=language
    )
    
    print(f"\n=== Solution generated at {solution_path} ===\n")
    
    # List the files in the solution directory
    print("Generated files:")
    for file in os.listdir(solution_path):
        print(f"- {file}")
    
    return solution_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the code agent on a task")
    parser.add_argument("--task", type=str, default="tasks/weather_task.txt", 
                        help="Path to task description file")
    parser.add_argument("--output", type=str, default="weather_app", 
                        help="Name for the output directory")
    parser.add_argument("--language", type=str, default="python", 
                        help="Programming language to use")
    parser.add_argument("--model", type=str, help="Model name to use")
    
    args = parser.parse_args()
    
    # Run the task
    asyncio.run(run_task(args.task, args.output, args.language, args.model))
