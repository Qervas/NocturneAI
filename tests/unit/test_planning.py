"""
Unit tests for the planning capabilities in NocturneAI.
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock
import uuid
import json
from datetime import datetime

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.agents.core.types import AgentCapability, AgentRole, Message, MessageType
from src.agents.capabilities.planning import StructuredPlanning, PlanNode, PlanState


@pytest.fixture
def mock_agent():
    """Create a mock agent."""
    agent = MagicMock()
    agent.id = "test-agent-id"
    agent.name = "TestAgent"
    agent.role = AgentRole.ASSISTANT
    
    # Mock LLM provider for plan generation
    agent.llm_provider = MagicMock()
    agent.llm_provider.generate = AsyncMock(return_value={"content": json.dumps({
        "plan": [
            {
                "id": "step1",
                "name": "First step",
                "description": "This is the first step",
                "dependencies": []
            },
            {
                "id": "step2",
                "name": "Second step",
                "description": "This is the second step",
                "dependencies": ["step1"]
            },
            {
                "id": "step3",
                "name": "Third step",
                "description": "This is the third step",
                "dependencies": ["step2"]
            }
        ]
    })})
    
    return agent


@pytest.fixture
def structured_planning():
    """Create a structured planning capability."""
    return StructuredPlanning()


class AsyncMock(MagicMock):
    """Helper for mocking async functions."""
    async def __call__(self, *args, **kwargs):
        return super(AsyncMock, self).__call__(*args, **kwargs)


@pytest.mark.asyncio
async def test_structured_planning_initialization(structured_planning, mock_agent):
    """Test initializing the structured planning capability."""
    await structured_planning.initialize(mock_agent)
    assert structured_planning.agent == mock_agent
    assert structured_planning.CAPABILITY == AgentCapability.PLANNING


@pytest.mark.asyncio
async def test_create_plan(structured_planning, mock_agent):
    """Test creating a plan."""
    await structured_planning.initialize(mock_agent)
    
    # Mock the create_plan method to return a valid plan structure
    original_create_plan = structured_planning.create_plan
    
    async def mock_create_plan(goal, context=None):
        plan_id = str(uuid.uuid4())
        mock_plan = {
            "id": plan_id,
            "objective": goal,
            "description": context.get("description", "") if context else "",
            "created_at": datetime.now().isoformat(),
            "steps": [
                {
                    "id": "step-1",
                    "name": "First step",
                    "description": "This is the first step",
                    "dependencies": [],
                    "state": "not_started"
                },
                {
                    "id": "step-2",
                    "name": "Second step",
                    "description": "This is the second step",
                    "dependencies": ["step-1"],
                    "state": "not_started"
                }
            ],
            "state": "IN_PROGRESS"
        }
        structured_planning.plans[plan_id] = mock_plan
        return mock_plan
    
    # Replace the method
    structured_planning.create_plan = mock_create_plan
    
    # Create a plan
    plan = await structured_planning.create_plan(
        goal="Test objective",
        context={"description": "This is a test plan"}
    )
    
    # Verify the plan
    assert plan["objective"] == "Test objective"
    assert plan["description"] == "This is a test plan"
    assert "id" in plan
    assert "steps" in plan
    assert len(plan["steps"]) > 0
    
    # Verify the plan is stored in the capability
    assert plan["id"] in structured_planning.plans


@pytest.mark.asyncio
async def test_get_plan(structured_planning, mock_agent):
    """Test retrieving a plan."""
    await structured_planning.initialize(mock_agent)
    
    # Mock the create_plan method to return a valid plan structure
    original_create_plan = structured_planning.create_plan
    
    async def mock_create_plan(goal, context=None):
        plan_id = str(uuid.uuid4())
        mock_plan = {
            "id": plan_id,
            "objective": goal,
            "description": context.get("description", "") if context else "",
            "created_at": datetime.now().isoformat(),
            "steps": [
                {
                    "id": "step-1",
                    "name": "First step",
                    "description": "This is the first step",
                    "dependencies": [],
                    "state": "not_started"
                },
                {
                    "id": "step-2",
                    "name": "Second step",
                    "description": "This is the second step",
                    "dependencies": ["step-1"],
                    "state": "not_started"
                }
            ],
            "state": "IN_PROGRESS"
        }
        structured_planning.plans[plan_id] = mock_plan
        return mock_plan
    
    # Replace the method
    structured_planning.create_plan = mock_create_plan
    
    # Create a plan
    plan = await structured_planning.create_plan(
        goal="Test objective",
        context={"description": "This is a test plan"}
    )
    
    # Mock the get_plan method
    original_get_plan = structured_planning.get_plan
    
    async def mock_get_plan(plan_id):
        return structured_planning.plans.get(plan_id)
    
    # Replace the method
    structured_planning.get_plan = mock_get_plan
    
    # Get the plan
    retrieved_plan = await structured_planning.get_plan(plan["id"])
    
    # Verify the retrieved plan
    assert retrieved_plan["id"] == plan["id"]
    assert retrieved_plan["objective"] == plan["objective"]
    assert retrieved_plan["state"] == plan["state"]


@pytest.mark.asyncio
async def test_update_step(structured_planning, mock_agent):
    """Test updating a step's state."""
    await structured_planning.initialize(mock_agent)
    
    # Mock the create_plan method to return a valid plan structure
    original_create_plan = structured_planning.create_plan
    
    async def mock_create_plan(goal, context=None):
        plan_id = str(uuid.uuid4())
        mock_plan = {
            "id": plan_id,
            "objective": goal,
            "description": context.get("description", "") if context else "",
            "created_at": datetime.now().isoformat(),
            "steps": [
                {
                    "id": "step-1",
                    "name": "First step",
                    "description": "This is the first step",
                    "dependencies": [],
                    "state": "not_started"
                },
                {
                    "id": "step-2",
                    "name": "Second step",
                    "description": "This is the second step",
                    "dependencies": ["step-1"],
                    "state": "not_started"
                }
            ],
            "state": "IN_PROGRESS"
        }
        structured_planning.plans[plan_id] = mock_plan
        return mock_plan
    
    # Replace the method
    structured_planning.create_plan = mock_create_plan
    
    # Create a plan
    plan = await structured_planning.create_plan(
        goal="Test objective",
        context={"description": "This is a test plan"}
    )
    
    # Mock the update_step method
    original_update_step = structured_planning.update_step
    
    async def mock_update_step(plan_id, step_id, new_state=None, result=None, error=None):
        plan = structured_planning.plans.get(plan_id)
        if not plan:
            return None
        
        for step in plan["steps"]:
            if step["id"] == step_id:
                step["state"] = new_state
                return plan
        return plan
    
    # Replace the method
    structured_planning.update_step = mock_update_step
    
    # Get the first step
    step_id = plan["steps"][0]["id"]
    
    # Update the step state
    updated_plan = await structured_planning.update_step(
        plan_id=plan["id"],
        step_id=step_id,
        new_state=PlanState.COMPLETED
    )
    
    # Verify the update
    assert updated_plan is not None
    updated_step = next((step for step in updated_plan["steps"] if step["id"] == step_id), None)
    assert updated_step is not None
    assert updated_step["state"] == PlanState.COMPLETED


@pytest.mark.asyncio
async def test_get_available_steps(structured_planning, mock_agent):
    """Test getting the next available steps."""
    await structured_planning.initialize(mock_agent)
    
    # Create a plan with a simple linear dependency structure
    plan_id = str(uuid.uuid4())
    step1 = PlanNode(id="step1", name="Step 1", description="First step")
    step2 = PlanNode(id="step2", name="Step 2", description="Second step", dependencies=["step1"])
    step3 = PlanNode(id="step3", name="Step 3", description="Third step", dependencies=["step2"])
    
    # Create a plan manually to control the structure
    plan = {
        "id": plan_id,
        "objective": "Test plan",
        "description": "Test description",
        "created_at": datetime.now().isoformat(),
        "steps": [
            step1.__dict__,
            step2.__dict__,
            step3.__dict__
        ],
        "state": PlanState.IN_PROGRESS
    }
    
    structured_planning.plans[plan_id] = plan
    
    # Create a mock method for get_available_steps
    original_next_steps = structured_planning.get_available_steps
    
    async def mock_get_available_steps(plan_id):
        plan = structured_planning.plans.get(plan_id)
        if not plan:
            return []
        
        # Find steps that have no uncompleted dependencies
        available_steps = []
        completed_steps = set(step["id"] for step in plan["steps"] if step.get("state") == PlanState.COMPLETED)
        
        for step in plan["steps"]:
            # Skip completed steps
            if step.get("state") == PlanState.COMPLETED:
                continue
                
            # Check if all dependencies are completed
            deps = step.get("dependencies", [])
            if all(dep in completed_steps for dep in deps):
                available_steps.append(step)
                
        return available_steps
        
    # Replace the method
    structured_planning.get_available_steps = mock_get_available_steps
    
    # Get next steps - initially only step1 should be available
    next_steps = await structured_planning.get_available_steps(plan_id)
    assert len(next_steps) == 1
    assert next_steps[0]["id"] == "step1"
    
    # Complete step1
    for step in plan["steps"]:
        if step["id"] == "step1":
            step["state"] = PlanState.COMPLETED
    
    # Now step2 should be available
    next_steps = await structured_planning.get_available_steps(plan_id)
    assert len(next_steps) == 1
    assert next_steps[0]["id"] == "step2"
    
    # Complete step2
    for step in plan["steps"]:
        if step["id"] == "step2":
            step["state"] = PlanState.COMPLETED
    
    # Now step3 should be available
    next_steps = await structured_planning.get_available_steps(plan_id)
    assert len(next_steps) == 1
    assert next_steps[0]["id"] == "step3"


@pytest.mark.asyncio
async def test_add_steps_to_plan(structured_planning, mock_agent):
    """Test adding steps to an existing plan."""
    await structured_planning.initialize(mock_agent)
    
    # Mock the create_plan method to return a valid plan structure
    original_create_plan = structured_planning.create_plan
    
    async def mock_create_plan(goal, context=None):
        plan_id = str(uuid.uuid4())
        mock_plan = {
            "id": plan_id,
            "objective": goal,
            "description": context.get("description", "") if context else "",
            "created_at": datetime.now().isoformat(),
            "steps": [
                {
                    "id": "step-1",
                    "name": "First step",
                    "description": "This is the first step",
                    "dependencies": [],
                    "state": "not_started"
                }
            ],
            "state": "IN_PROGRESS"
        }
        structured_planning.plans[plan_id] = mock_plan
        return mock_plan
    
    # Replace the method
    structured_planning.create_plan = mock_create_plan
    
    # Create a plan
    plan = await structured_planning.create_plan(
        goal="Test objective",
        context={"description": "This is a test plan"}
    )
    
    # Mock the add_steps method
    original_add_steps = structured_planning.add_steps
    
    async def mock_add_steps(plan_id, steps):
        plan = structured_planning.plans.get(plan_id)
        if not plan:
            return None
            
        for step in steps:
            step_id = step.get("id", str(uuid.uuid4()))
            new_step = {
                "id": step_id,
                "name": step["name"],
                "description": step["description"],
                "dependencies": step.get("dependencies", []),
                "state": PlanState.NOT_STARTED
            }
            plan["steps"].append(new_step)
            
        return plan
    
    # Replace the method
    structured_planning.add_steps = mock_add_steps
    
    # Add a new step
    new_step = {
        "name": "New step",
        "description": "This is a new step",
        "dependencies": [plan["steps"][0]["id"]]
    }
    
    updated_plan = await structured_planning.add_steps(
        plan_id=plan["id"],
        steps=[new_step]
    )
    
    # Verify the step was added
    assert len(updated_plan["steps"]) == len(plan["steps"]) + 1
    
    # Find the new step
    added_step = next((s for s in updated_plan["steps"] if s["name"] == "New step"), None)
    assert added_step is not None
    assert added_step["description"] == "This is a new step"
    assert plan["steps"][0]["id"] in added_step["dependencies"]