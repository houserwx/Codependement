```python
# multi_agent_ai_assistant.py

import json
import os
import sys
from typing import List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import openai
from datetime import datetime
import threading
import time

class AgentType(Enum):
    PLANNER = "planner"
    CODER = "coder"
    DEBUGGER = "debugger"
    TESTER = "tester"
    DOCUMENTER = "documenter"

@dataclass
class Task:
    id: str
    description: str
    status: str  # pending, in_progress, completed, failed
    created_at: datetime
    assigned_to: AgentType
    subtasks: List['Task']
    result: str = ""

class Agent:
    def __init__(self, agent_type: AgentType, name: str, description: str):
        self.agent_type = agent_type
        self.name = name
        self.description = description
        self.is_active = False

    def process_task(self, task: Task) -> str:
        """Process a task and return the result"""
        raise NotImplementedError

class PlannerAgent(Agent):
    def __init__(self):
        super().__init__(AgentType.PLANNER, "Planner", "Breaks down complex tasks into subtasks")

    def process_task(self, task: Task) -> str:
        # Simulate task breakdown
        subtasks = [
            Task("subtask1", "Identify key components", "completed", datetime.now(), AgentType.CODER),
            Task("subtask2", "Design architecture", "in_progress", datetime.now(), AgentType.CODER),
            Task("subtask3", "Create implementation plan", "pending", datetime.now(), AgentType.CODER)
        ]
        task.subtasks = subtasks
        return f"Task broken down into {len(subtasks)} subtasks"

class CoderAgent(Agent):
    def __init__(self):
        super().__init__(AgentType.CODER, "Coder", "Writes code for implementation")

    def process_task(self, task: Task) -> str:
        # Simulate code generation
        return f"Generated code for: {task.description}"

class DebuggerAgent(Agent):
    def __init__(self):
        super().__init__(AgentType.DEBUGGER, "Debugger", "Identifies and fixes issues")

    def process_task(self, task: Task) -> str:
        # Simulate debugging
        return f"Debugged: {task.description} - No issues found"

class TesterAgent(Agent):
    def __init__(self):
        super().__init__(AgentType.TESTER, "Tester", "Tests functionality and edge cases")

    def process_task(self, task: Task) -> str:
        # Simulate testing
        return f"Tested: {task.description} - All tests passed"

class DocumenterAgent(Agent):
    def __init__(self):
        super().__init__(AgentType.DOCUMENTER, "Documenter", "Creates documentation for tasks")

    def process_task(self, task: Task) -> str:
        # Simulate documentation
        return f"Created documentation for: {task.description}"

class MultiAgentSystem:
    def __init__(self):
        self.agents = [
            PlannerAgent(),
            CoderAgent(),
            DebuggerAgent(),
            TesterAgent(),
            DocumenterAgent()
        ]
        self.tasks: List[Task] = []
        self.active_task = None
        self.lock = threading.Lock()

    def assign_agent(self, task: Task) -> Agent:
        """Assign an appropriate agent to a task"""
        # Simple assignment logic - in real implementation would be more sophisticated
        if task.assigned_to == AgentType.PLANNER:
            return next(a for a in self.agents if a.agent_type == AgentType.PLANNER)
        elif task.assigned_to == AgentType.CODER:
            return next(a for a in self.agents if a.agent_type == AgentType.CODER)
        elif task.assigned_to == AgentType.DEBUGGER:
            return next(a for a in self.agents if a.agent_type == AgentType.DEBUGGER)
        elif task.assigned_to == AgentType.TESTER:
            return next(a for a in self.agents if a.agent_type == AgentType.TESTER)
        elif task.assigned_to == AgentType.DOCUMENTER:
            return next(a for a in self.agents if a.agent_type == AgentType.DOCUMENTER)
        else:
            # Default to planner for new tasks
            return next(a for a in self.agents if a.agent_type == AgentType.PLANNER)

    def create_task(self, description: str) -> Task:
        """Create a new task and add it to the system"""
        task = Task(
            id=f"task_{len(self.tasks) + 1}",
            description=description,
            status="pending",
            created_at=datetime.now(),
            assigned_to=AgentType.PLANNER
        )
        self.tasks.append(task)
        return task

    def process_task(self, task: Task) -> str:
        """Process a task through the multi-agent system"""
        with self.lock:
            agent = self.assign_agent(task)
            task.status = "in_progress"

        result = agent.process_task(task)

        with self.lock:
            task.status = "completed"
            task.result = result

        return result

# VS Code Extension Interface
class VSCodeExtension:
    def __init__(self):
        self.agent_system = MultiAgentSystem()
        self.active_tasks = []

    def start_new_task(self, description: str) -> str:
        """Start a new task using the multi-agent system"""
        task = self.agent_system.create_task(description)
        result = self.agent_system.process_task(task)

        # Display in VS Code UI
        self.display_task_status(task)
        return f"Task '{description}' started. Result: {result}"

    def display_task_status(self, task: Task):
        """Display task status in VS Code UI"""
        print(f"Task ID: {task.id}")
        print(f"Description: {task.description}")
        print(f"Status: {task.status}")
        print(f"Assigned to: {task.assigned_to.value}")
        print(f"Result: {task.result}")

    def get_task_history(self) -> List[Dict]:
        """Get history of completed tasks"""
        return [
            {
                "id": task.id,
                "description": task.description,
                "status": task.status,
                "created_at": task.created_at.isoformat(),
                "result": task.result
            }
            for task in self.agent_system.tasks
        ]

# Example usage
if __name__ == "__main__":
    # Initialize the extension
    extension = VSCodeExtension()

    print("Multi-Agent AI Assistant for VS Code")
    print("=" * 40)

    # Start a complex task
    task1 = "Implement authentication system with JWT tokens"
    result1 = extension.start_new_task(task1)
    print(f"\nResult: {result1}")

    # Another task
    task2 = "Create REST API for user management"
    result2 = extension.start_new_task(task2)
    print(f"\nResult: {result2}")

    # Show task history
    print("\nTask History:")
    print("-" * 30)
    for task in extension.get_task_history():
        print(f"ID: {task['id']}")
        print(f"Description: {task['description']}")
        print(f"Status: {task['status']}")
        print(f"Result: {task['result']}")
        print()
```
