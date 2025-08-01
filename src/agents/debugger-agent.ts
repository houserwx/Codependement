import { Agent } from './base-agent';
import { AgentType, Task } from './types';

/**
 * DebuggerAgent - Identifies and fixes bugs and issues
 */
export class DebuggerAgent extends Agent {
    constructor() {
        super(AgentType.DEBUGGER, "Debugger", "Identifies and fixes bugs and issues");
    }

    async processTask(task: Task, context?: any): Promise<string> {
        console.log(`[Debugger] Processing task: ${task.description}`);
        
        // Simulate debugging process
        const issues = [];
        
        if (task.description.toLowerCase().includes('error')) {
            issues.push("Identified runtime error in execution flow");
        }
        if (task.description.toLowerCase().includes('performance')) {
            issues.push("Found performance bottleneck in algorithm");
        }
        if (task.description.toLowerCase().includes('memory')) {
            issues.push("Detected memory leak in resource management");
        }
        
        if (issues.length === 0) {
            return `Debugged: ${task.description} - No critical issues found`;
        } else {
            return `Debugged: ${task.description}\nIssues found:\n${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}`;
        }
    }
}
