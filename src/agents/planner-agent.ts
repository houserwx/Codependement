import { Agent } from './base-agent';
import { AgentType, Task } from './types';

/**
 * PlannerAgent - Breaks down complex tasks into subtasks and creates execution plans
 */
export class PlannerAgent extends Agent {
    constructor() {
        super(AgentType.PLANNER, "Planner", "Breaks down complex tasks into subtasks and creates execution plans");
    }

    async processTask(task: Task, context?: any): Promise<string> {
        console.log(`[Planner] Processing task: ${task.description}`);
        
        // Analyze the task and break it down into subtasks
        const subtasks: Task[] = [];
        
        // Use context to make intelligent decisions about task breakdown
        if (task.description.toLowerCase().includes('implement') || task.description.toLowerCase().includes('create')) {
            subtasks.push(this.createSubtask("Research implementation patterns and best practices", AgentType.RESEARCHER, 'high'));
            subtasks.push(this.createSubtask("Analyze requirements and design architecture", AgentType.CODER, 'high'));
            subtasks.push(this.createSubtask("Implement core functionality", AgentType.CODER, 'high'));
            subtasks.push(this.createSubtask("Create unit tests", AgentType.TESTER, 'medium'));
            subtasks.push(this.createSubtask("Debug and fix issues", AgentType.DEBUGGER, 'medium'));
            subtasks.push(this.createSubtask("Create documentation", AgentType.DOCUMENTER, 'low'));
        } else if (task.description.toLowerCase().includes('debug') || task.description.toLowerCase().includes('fix')) {
            subtasks.push(this.createSubtask("Research similar error patterns and solutions", AgentType.RESEARCHER, 'high'));
            subtasks.push(this.createSubtask("Identify root cause", AgentType.DEBUGGER, 'high'));
            subtasks.push(this.createSubtask("Implement fix", AgentType.CODER, 'high'));
            subtasks.push(this.createSubtask("Test the fix", AgentType.TESTER, 'high'));
            subtasks.push(this.createSubtask("Update documentation", AgentType.DOCUMENTER, 'low'));
        } else if (task.description.toLowerCase().includes('test')) {
            subtasks.push(this.createSubtask("Research testing frameworks and examples", AgentType.RESEARCHER, 'medium'));
            subtasks.push(this.createSubtask("Design test cases", AgentType.TESTER, 'high'));
            subtasks.push(this.createSubtask("Implement tests", AgentType.TESTER, 'high'));
            subtasks.push(this.createSubtask("Run and validate tests", AgentType.TESTER, 'medium'));
        } else {
            // Generic task breakdown
            subtasks.push(this.createSubtask("Research relevant information and context", AgentType.RESEARCHER, 'medium'));
            subtasks.push(this.createSubtask("Analyze task requirements", AgentType.CODER, 'medium'));
            subtasks.push(this.createSubtask("Execute main task", AgentType.CODER, 'high'));
            subtasks.push(this.createSubtask("Validate results", AgentType.TESTER, 'medium'));
        }
        
        task.subtasks = subtasks;
        
        return `Task broken down into ${subtasks.length} subtasks:\n${subtasks.map((st, i) => `${i + 1}. ${st.description} (${st.assignedTo})`).join('\n')}`;
    }
}
