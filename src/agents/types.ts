/**
 * Shared types and interfaces for the multi-agent system
 */

export enum AgentType {
    PLANNER = "planner",
    CODER = "coder",
    DEBUGGER = "debugger",
    TESTER = "tester",
    DOCUMENTER = "documenter",
    RESEARCHER = "researcher"
}

export interface Task {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    createdAt: Date;
    assignedTo: AgentType;
    subtasks: Task[];
    result: string;
    priority: 'low' | 'medium' | 'high';
    context?: any;
}
