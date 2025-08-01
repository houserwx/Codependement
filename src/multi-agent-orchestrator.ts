import { Agent, AgentType, Task, PlannerAgent, CoderAgent, DebuggerAgent, TesterAgent, DocumenterAgent, ResearchAgent } from './agents';
import { McpService } from './mcp-service';

export interface AgentExecutionResult {
    success: boolean;
    result: string;
    agent: AgentType;
    task: Task;
    executionTime: number;
}

export interface MultiAgentContext {
    workspaceInfo?: any;
    currentFiles?: string[];
    projectType?: string;
    userPreferences?: any;
}

export class MultiAgentOrchestrator {
    private agents: Map<AgentType, Agent> = new Map();
    private taskQueue: Task[] = [];
    private activeTasks: Map<string, Task> = new Map();
    private executionHistory: AgentExecutionResult[] = [];
    private context: MultiAgentContext = {};
    private mcpService: McpService;

    constructor(mcpService?: McpService) {
        this.mcpService = mcpService || new McpService();
        this.initializeAgents();
    }

    private initializeAgents(): void {
        const agents = [
            new PlannerAgent(),
            new CoderAgent(),
            new DebuggerAgent(),
            new TesterAgent(),
            new DocumenterAgent(),
            new ResearchAgent(this.mcpService)
        ];

        for (const agent of agents) {
            this.agents.set(agent.agentType, agent);
        }

        console.log(`Initialized ${this.agents.size} agents with MCP service`);
    }

    public setContext(context: MultiAgentContext): void {
        this.context = { ...this.context, ...context };
    }

    public createTask(description: string, priority: 'low' | 'medium' | 'high' = 'medium'): Task {
        const task: Task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            description,
            status: 'pending',
            createdAt: new Date(),
            assignedTo: AgentType.PLANNER, // Always start with planner
            subtasks: [],
            result: '',
            priority,
            context: this.context
        };

        this.taskQueue.push(task);
        console.log(`Created task: ${task.id} - ${task.description}`);
        return task;
    }

    public async executeTask(task: Task): Promise<AgentExecutionResult[]> {
        const results: AgentExecutionResult[] = [];
        
        // First, have the planner break down the task
        if (task.assignedTo === AgentType.PLANNER) {
            const plannerResult = await this.executeAgentTask(task, AgentType.PLANNER);
            results.push(plannerResult);
            
            // If planning was successful, execute subtasks
            if (plannerResult.success && task.subtasks.length > 0) {
                const subtaskResults = await this.executeSubtasks(task.subtasks);
                results.push(...subtaskResults);
            }
        } else {
            // Execute single task with specific agent
            const result = await this.executeAgentTask(task, task.assignedTo);
            results.push(result);
        }

        // Store execution history
        this.executionHistory.push(...results);
        
        return results;
    }

    private async executeSubtasks(subtasks: Task[]): Promise<AgentExecutionResult[]> {
        const results: AgentExecutionResult[] = [];
        
        // Sort subtasks by priority (high -> medium -> low)
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        const sortedSubtasks = subtasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        
        for (const subtask of sortedSubtasks) {
            try {
                // Use research enhancement for non-research tasks
                const result = subtask.assignedTo === AgentType.RESEARCHER 
                    ? await this.executeAgentTask(subtask, subtask.assignedTo)
                    : await this.executeAgentTaskWithResearch(subtask, subtask.assignedTo);
                results.push(result);
                
                // If a high-priority task fails, consider stopping execution
                if (!result.success && subtask.priority === 'high') {
                    console.log(`High-priority subtask failed: ${subtask.description}`);
                    // In a real implementation, you might want to trigger error handling
                }
            } catch (error) {
                console.error(`Error executing subtask ${subtask.id}:`, error);
                results.push({
                    success: false,
                    result: `Error: ${error}`,
                    agent: subtask.assignedTo,
                    task: subtask,
                    executionTime: 0
                });
            }
        }
        
        return results;
    }

    private async executeAgentTask(task: Task, agentType: AgentType): Promise<AgentExecutionResult> {
        const startTime = Date.now();
        const agent = this.agents.get(agentType);
        
        if (!agent) {
            return {
                success: false,
                result: `Agent ${agentType} not found`,
                agent: agentType,
                task,
                executionTime: 0
            };
        }

        try {
            task.status = 'in_progress';
            this.activeTasks.set(task.id, task);
            
            console.log(`[${agent.name}] Starting task: ${task.description}`);
            
            const result = await agent.processTask(task, this.context);
            const executionTime = Date.now() - startTime;
            
            task.status = 'completed';
            task.result = result;
            this.activeTasks.delete(task.id);
            
            console.log(`[${agent.name}] Completed task in ${executionTime}ms`);
            
            return {
                success: true,
                result,
                agent: agentType,
                task,
                executionTime
            };
        } catch (error) {
            const executionTime = Date.now() - startTime;
            task.status = 'failed';
            task.result = `Error: ${error}`;
            this.activeTasks.delete(task.id);
            
            console.error(`[${agent.name}] Task failed:`, error);
            
            return {
                success: false,
                result: `Error: ${error}`,
                agent: agentType,
                task,
                executionTime
            };
        }
    }

    public async processQueue(): Promise<AgentExecutionResult[]> {
        const allResults: AgentExecutionResult[] = [];
        
        while (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift()!;
            const results = await this.executeTask(task);
            allResults.push(...results);
        }
        
        return allResults;
    }

    public getTaskStatus(taskId: string): Task | undefined {
        // Check active tasks first
        const activeTask = this.activeTasks.get(taskId);
        if (activeTask) {
            return activeTask;
        }
        
        // Check execution history
        const historyEntry = this.executionHistory.find(h => h.task.id === taskId);
        return historyEntry?.task;
    }

    public getActiveTasks(): Task[] {
        return Array.from(this.activeTasks.values());
    }

    public getExecutionHistory(): AgentExecutionResult[] {
        return [...this.executionHistory];
    }

    public getAgentStatus(): Map<AgentType, boolean> {
        const status = new Map<AgentType, boolean>();
        for (const [type, agent] of this.agents) {
            status.set(type, agent.isActive);
        }
        return status;
    }

    public async processUserRequest(request: string): Promise<string> {
        // Create a task from the user request
        const task = this.createTask(request, 'high');
        
        // Execute the task
        const results = await this.executeTask(task);
        
        // Format the results for the user
        let response = `Multi-agent processing completed for: "${request}"\n\n`;
        
        for (const result of results) {
            response += `[${result.agent.toUpperCase()}] ${result.success ? '✅' : '❌'}\n`;
            response += `${result.result}\n`;
            response += `Execution time: ${result.executionTime}ms\n\n`;
        }
        
        return response;
    }

    /**
     * Get research findings for a task
     */
    public async getResearchFindings(task: Task): Promise<string> {
        const researchAgent = this.agents.get(AgentType.RESEARCHER) as ResearchAgent;
        if (!researchAgent) {
            return 'Research agent not available';
        }

        return await researchAgent.processTask(task, this.context);
    }

    /**
     * Enhance an agent's task with research findings
     */
    public async enhanceTaskWithResearch(task: Task, targetAgent: AgentType): Promise<Task> {
        const researchAgent = this.agents.get(AgentType.RESEARCHER) as ResearchAgent;
        if (!researchAgent) {
            console.log('Research agent not available, proceeding without research enhancement');
            return task;
        }

        try {
            console.log(`[Orchestrator] Enhancing task for ${targetAgent} with research findings`);
            
            // Get targeted research for the specific agent
            const researchFindings = await researchAgent.supportAgent(targetAgent, task, this.context);
            
            // Add research findings to task context
            if (!task.context) {
                task.context = {};
            }
            task.context.researchFindings = researchFindings;
            task.context.researchEnhanced = true;
            
            console.log(`[Orchestrator] Task enhanced with research findings for ${targetAgent}`);
            return task;
            
        } catch (error) {
            console.error(`[Orchestrator] Error enhancing task with research:`, error);
            return task;
        }
    }

    /**
     * Execute task with research enhancement
     */
    private async executeAgentTaskWithResearch(task: Task, agentType: AgentType): Promise<AgentExecutionResult> {
        // Skip research enhancement for the research agent itself
        if (agentType === AgentType.RESEARCHER) {
            return this.executeAgentTask(task, agentType);
        }

        // Enhance task with research if available
        const enhancedTask = await this.enhanceTaskWithResearch(task, agentType);
        
        // Execute the enhanced task
        return this.executeAgentTask(enhancedTask, agentType);
    }

    /**
     * Get MCP service status
     */
    public getMcpStatus(): { connected: boolean; servers: string[]; tools: number; resources: number } {
        const connectedServers = this.mcpService.getConnectedServers();
        const tools = this.mcpService.getAllTools();
        const resources = this.mcpService.getAllResources();

        return {
            connected: connectedServers.length > 0,
            servers: connectedServers,
            tools: tools.length,
            resources: resources.length
        };
    }

    /**
     * Refresh MCP capabilities
     */
    public async refreshMcpCapabilities(): Promise<void> {
        await this.mcpService.refreshAllCapabilities();
        console.log('[Orchestrator] MCP capabilities refreshed');
    }

    public dispose(): void {
        this.taskQueue.length = 0;
        this.activeTasks.clear();
        this.executionHistory.length = 0;
        
        // Disconnect from MCP service
        this.mcpService.disconnect();
        console.log('Multi-agent orchestrator disposed');
    }
}
