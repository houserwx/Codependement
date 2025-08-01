/**
 * Multi-Agent System - Barrel exports for all agents
 */

// Types and base classes
export { AgentType, Task } from './types';
export { Agent } from './base-agent';

// Individual agents
export { PlannerAgent } from './planner-agent';
export { CoderAgent } from './coder-agent';
export { DebuggerAgent } from './debugger-agent';
export { TesterAgent } from './tester-agent';
export { DocumenterAgent } from './documenter-agent';

// Import for factory function
import { AgentType } from './types';
import { Agent } from './base-agent';
import { PlannerAgent } from './planner-agent';
import { CoderAgent } from './coder-agent';
import { DebuggerAgent } from './debugger-agent';
import { TesterAgent } from './tester-agent';
import { DocumenterAgent } from './documenter-agent';

// Agent factory function
export function createAgent(type: AgentType): Agent {
    switch (type) {
        case AgentType.PLANNER:
            return new PlannerAgent();
        case AgentType.CODER:
            return new CoderAgent();
        case AgentType.DEBUGGER:
            return new DebuggerAgent();
        case AgentType.TESTER:
            return new TesterAgent();
        case AgentType.DOCUMENTER:
            return new DocumenterAgent();
        default:
            throw new Error(`Unknown agent type: ${type}`);
    }
}
