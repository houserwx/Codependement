/**
 * Multi-Agent System - Backward compatibility exports
 * 
 * This file provides backward compatibility for existing imports.
 * For new code, prefer importing directly from './agents'
 */

// Re-export everything from the agents module
export * from './agents';

// Legacy compatibility exports
import { 
    AgentType, 
    Task, 
    Agent, 
    PlannerAgent, 
    CoderAgent, 
    DebuggerAgent, 
    TesterAgent, 
    DocumenterAgent 
} from './agents';

// Make sure all the main classes are available as named exports
export {
    AgentType,
    Task,
    Agent,
    PlannerAgent,
    CoderAgent,
    DebuggerAgent,
    TesterAgent,
    DocumenterAgent
};
