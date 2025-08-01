import { Agent } from './base-agent';
import { AgentType, Task } from './types';
import { McpService, McpTool, McpResource } from '../mcp-service';

/**
 * ResearchAgent - Leverages MCP servers to gather information relevant to tasks
 */
export class ResearchAgent extends Agent {
    private mcpService: McpService;
    private researchCache: Map<string, any> = new Map();

    constructor(mcpService: McpService) {
        super(AgentType.RESEARCHER, "Researcher", "Gathers information from MCP servers to support other agents");
        this.mcpService = mcpService;
    }

    async processTask(task: Task, context?: any): Promise<string> {
        console.log(`[Researcher] Processing research task: ${task.description}`);
        
        try {
            // Analyze the task to determine what information is needed
            const researchQueries = this.extractResearchQueries(task.description);
            const researchResults: Array<{ query: string; result: any }> = [];

            for (const query of researchQueries) {
                const cacheKey = this.generateCacheKey(query);
                
                // Check cache first
                if (this.researchCache.has(cacheKey)) {
                    console.log(`[Researcher] Using cached result for: ${query}`);
                    researchResults.push({
                        query,
                        result: this.researchCache.get(cacheKey)
                    });
                    continue;
                }

                // Gather information from MCP servers
                const result = await this.gatherInformation(query, context);
                
                // Cache the result
                this.researchCache.set(cacheKey, result);
                
                researchResults.push({ query, result });
            }

            // Compile research findings
            const researchReport = this.compileResearchReport(researchResults);
            
            // Store research findings in task context for other agents
            if (!task.context) {
                task.context = {};
            }
            task.context.researchFindings = researchResults;
            task.context.researchReport = researchReport;

            return researchReport;

        } catch (error) {
            console.error(`[Researcher] Error processing task:`, error);
            return `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }

    /**
     * Extract research queries from task description
     */
    private extractResearchQueries(taskDescription: string): string[] {
        const queries: string[] = [];
        const lowerDescription = taskDescription.toLowerCase();

        // Identify key research areas based on task content
        if (lowerDescription.includes('implement') || lowerDescription.includes('create') || lowerDescription.includes('build')) {
            queries.push('code examples');
            queries.push('best practices');
            queries.push('documentation');
        }

        if (lowerDescription.includes('api') || lowerDescription.includes('endpoint') || lowerDescription.includes('service')) {
            queries.push('api documentation');
            queries.push('api examples');
        }

        if (lowerDescription.includes('test') || lowerDescription.includes('testing')) {
            queries.push('test examples');
            queries.push('testing frameworks');
        }

        if (lowerDescription.includes('debug') || lowerDescription.includes('fix') || lowerDescription.includes('error')) {
            queries.push('error patterns');
            queries.push('debugging guides');
        }

        if (lowerDescription.includes('typescript') || lowerDescription.includes('javascript') || lowerDescription.includes('node')) {
            queries.push('typescript patterns');
            queries.push('node.js examples');
        }

        // If no specific queries identified, use generic research
        if (queries.length === 0) {
            queries.push('related documentation');
            queries.push('code examples');
        }

        return queries;
    }

    /**
     * Gather information from available MCP servers
     */
    private async gatherInformation(query: string, context?: any): Promise<any> {
        const results: any[] = [];
        const connectedServers = this.mcpService.getConnectedServers();

        console.log(`[Researcher] Gathering information for query: ${query}`);
        console.log(`[Researcher] Available servers: ${connectedServers.join(', ')}`);

        // Try to use available tools from MCP servers
        const availableTools = this.mcpService.getAllTools();
        
        for (const { server, tool } of availableTools) {
            try {
                const result = await this.useToolForResearch(server, tool, query, context);
                if (result) {
                    results.push({
                        server,
                        tool: tool.name,
                        query,
                        result
                    });
                }
            } catch (error) {
                console.log(`[Researcher] Error using tool ${tool.name} from ${server}:`, error);
            }
        }

        // Try to read relevant resources
        const availableResources = this.mcpService.getAllResources();
        
        for (const { server, resource } of availableResources) {
            try {
                if (this.isResourceRelevant(resource, query)) {
                    const resourceContent = await this.mcpService.readResource(server, resource.uri);
                    results.push({
                        server,
                        resource: resource.uri,
                        query,
                        result: resourceContent
                    });
                }
            } catch (error) {
                console.log(`[Researcher] Error reading resource ${resource.uri} from ${server}:`, error);
            }
        }

        return results;
    }

    /**
     * Use a specific tool for research
     */
    private async useToolForResearch(server: string, tool: McpTool, query: string, context?: any): Promise<any> {
        // Map research queries to appropriate tool calls
        if (tool.name === 'read_file' && query.includes('code examples')) {
            // Try to read relevant code files
            const codeFiles = this.findRelevantFiles(context, query);
            for (const file of codeFiles) {
                try {
                    return await this.mcpService.callTool(server, tool.name, { path: file });
                } catch (error) {
                    console.log(`[Researcher] Could not read file ${file}:`, error);
                }
            }
        }

        if (tool.name === 'search_files' && query.includes('documentation')) {
            // Search for documentation files
            try {
                return await this.mcpService.callTool(server, tool.name, { 
                    pattern: '*.md', 
                    query: query 
                });
            } catch (error) {
                console.log(`[Researcher] Search failed:`, error);
            }
        }

        return null;
    }

    /**
     * Check if a resource is relevant to the research query
     */
    private isResourceRelevant(resource: McpResource, query: string): boolean {
        const resourceName = resource.name?.toLowerCase() || resource.uri.toLowerCase();
        const queryLower = query.toLowerCase();

        // Check for relevant file types and names
        if (queryLower.includes('documentation') && (resourceName.includes('.md') || resourceName.includes('readme') || resourceName.includes('doc'))) {
            return true;
        }

        if (queryLower.includes('code examples') && (resourceName.includes('.ts') || resourceName.includes('.js') || resourceName.includes('.json'))) {
            return true;
        }

        if (queryLower.includes('test') && (resourceName.includes('test') || resourceName.includes('spec'))) {
            return true;
        }

        return false;
    }

    /**
     * Find relevant files based on context and query
     */
    private findRelevantFiles(context: any, query: string): string[] {
        const files: string[] = [];

        if (context?.currentFiles) {
            files.push(...context.currentFiles.filter((file: string) => 
                this.isFileRelevant(file, query)
            ));
        }

        // Add some default files to check
        const defaultFiles = [
            'package.json',
            'README.md',
            'tsconfig.json'
        ];

        files.push(...defaultFiles);

        return [...new Set(files)]; // Remove duplicates
    }

    /**
     * Check if a file is relevant to the research query
     */
    private isFileRelevant(filename: string, query: string): boolean {
        const lowerFilename = filename.toLowerCase();
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('typescript') && lowerFilename.endsWith('.ts')) {
            return true;
        }

        if (lowerQuery.includes('documentation') && lowerFilename.endsWith('.md')) {
            return true;
        }

        if (lowerQuery.includes('configuration') && (lowerFilename.includes('config') || lowerFilename.includes('.json'))) {
            return true;
        }

        return false;
    }

    /**
     * Compile research results into a comprehensive report
     */
    private compileResearchReport(researchResults: Array<{ query: string; result: any }>): string {
        let report = "## Research Findings\n\n";

        if (researchResults.length === 0) {
            report += "No research results found.\n";
            return report;
        }

        for (const { query, result } of researchResults) {
            report += `### ${query.charAt(0).toUpperCase() + query.slice(1)}\n\n`;
            
            if (Array.isArray(result) && result.length > 0) {
                for (const item of result) {
                    report += `**From ${item.server}** (${item.tool || item.resource}):\n`;
                    report += `${this.formatResultContent(item.result)}\n\n`;
                }
            } else if (result) {
                report += `${this.formatResultContent(result)}\n\n`;
            } else {
                report += "No information found.\n\n";
            }
        }

        return report;
    }

    /**
     * Format result content for display
     */
    private formatResultContent(content: any): string {
        if (typeof content === 'string') {
            // Truncate very long content
            return content.length > 500 ? content.substring(0, 500) + '...' : content;
        }

        if (typeof content === 'object') {
            try {
                return JSON.stringify(content, null, 2);
            } catch {
                return '[Complex object]';
            }
        }

        return String(content);
    }

    /**
     * Generate cache key for research query
     */
    private generateCacheKey(query: string): string {
        return `research_${query.toLowerCase().replace(/\s+/g, '_')}`;
    }

    /**
     * Clear research cache
     */
    public clearCache(): void {
        this.researchCache.clear();
        console.log('[Researcher] Research cache cleared');
    }

    /**
     * Get research findings for a specific query
     */
    public getCachedResearch(query: string): any {
        const cacheKey = this.generateCacheKey(query);
        return this.researchCache.get(cacheKey);
    }

    /**
     * Provide research support for a specific agent's task
     */
    public async supportAgent(agentType: AgentType, task: Task, context?: any): Promise<string> {
        console.log(`[Researcher] Providing research support for ${agentType} agent`);
        
        // Create a focused research query based on the target agent
        let focusedQuery = task.description;
        
        switch (agentType) {
            case AgentType.CODER:
                focusedQuery += ' code examples implementation patterns';
                break;
            case AgentType.TESTER:
                focusedQuery += ' testing examples test cases';
                break;
            case AgentType.DEBUGGER:
                focusedQuery += ' debugging error patterns solutions';
                break;
            case AgentType.DOCUMENTER:
                focusedQuery += ' documentation examples templates';
                break;
        }

        // Perform targeted research
        const researchTask: Task = {
            ...task,
            description: focusedQuery,
            assignedTo: AgentType.RESEARCHER
        };

        return await this.processTask(researchTask, context);
    }
}
