# Multi-Agent System

This directory contains the modular multi-agent system implementation, split into individual files for better maintainability.

## Structure

```
agents/
├── types.ts              # Shared types and enums (AgentType, Task)
├── base-agent.ts          # Abstract Agent base class
├── planner-agent.ts       # PlannerAgent - Task breakdown and planning
├── coder-agent.ts         # CoderAgent - Code generation and implementation
├── debugger-agent.ts      # DebuggerAgent - Bug identification and fixing
├── tester-agent.ts        # TesterAgent - Test creation and execution
├── documenter-agent.ts    # DocumenterAgent - Documentation generation
└── index.ts              # Barrel exports and agent factory
```

## Usage

### Import all agents
```typescript
import { AgentType, Task, Agent, PlannerAgent, CoderAgent } from './agents';
```

### Import specific agents
```typescript
import { CoderAgent } from './agents/coder-agent';
import { TesterAgent } from './agents/tester-agent';
```

### Use the agent factory
```typescript
import { createAgent, AgentType } from './agents';

const coder = createAgent(AgentType.CODER);
const tester = createAgent(AgentType.TESTER);
```

## Agent Capabilities

### 🎯 PlannerAgent
- Breaks down complex tasks into subtasks
- Creates execution plans with priorities
- Coordinates multi-step workflows

### 💻 CoderAgent
- Generates functions, classes, APIs, components
- Supports TypeScript, JavaScript, Python
- Creates complete implementations with examples

### 🐛 DebuggerAgent
- Identifies runtime errors and performance issues
- Analyzes memory leaks and bottlenecks
- Provides debugging recommendations

### 🧪 TesterAgent
- Creates unit, integration, and component tests
- Supports Jest, React Testing Library
- Generates comprehensive test suites with mocks

### 📝 DocumenterAgent
- Generates API, class, function, component docs
- Creates project documentation and guides
- Supports multiple documentation formats

## Real Functionality

All agents have been enhanced with **actual implementation** instead of simulations:

- **CoderAgent**: Generates real code files with proper syntax
- **TesterAgent**: Creates complete test suites with assertions
- **DocumenterAgent**: Produces comprehensive documentation
- **Integration**: Ready for VS Code file system integration

## Backward Compatibility

The original `multi-agent-system.ts` file now re-exports from this modular structure, maintaining compatibility with existing code.

## Migration Guide

For new code, prefer the modular imports:

```typescript
// Old (still works)
import { CoderAgent } from './multi-agent-system';

// New (recommended)
import { CoderAgent } from './agents';
// or
import { CoderAgent } from './agents/coder-agent';
```
