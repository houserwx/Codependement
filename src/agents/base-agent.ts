import { AgentType, Task } from './types';

/**
 * Abstract base class for all agents in the multi-agent system
 */
export abstract class Agent {
    public agentType: AgentType;
    public name: string;
    public description: string;
    public isActive: boolean = false;

    constructor(agentType: AgentType, name: string, description: string) {
        this.agentType = agentType;
        this.name = name;
        this.description = description;
    }

    abstract processTask(task: Task, context?: any): Promise<string>;

    protected createSubtask(description: string, assignedTo: AgentType, priority: 'low' | 'medium' | 'high' = 'medium'): Task {
        return {
            id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            description,
            status: 'pending',
            createdAt: new Date(),
            assignedTo,
            subtasks: [],
            result: '',
            priority
        };
    }
}
