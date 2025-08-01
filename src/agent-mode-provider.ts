import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BaseChatProvider } from './base-chat-provider';
import { McpService, McpTool } from './mcp-service';
import { MultiAgentOrchestrator, MultiAgentContext } from './multi-agent-orchestrator';
import { AgentType } from './agents';

export interface AgentTool {
    name: string;
    description: string;
    parameters?: any;
}

export class AgentModeChatProvider extends BaseChatProvider {
    private mcpService: McpService;
    private multiAgentOrchestrator: MultiAgentOrchestrator;
    private lastResponse: string = '';
    private lastRequest: string = '';
    private availableTools: AgentTool[] = [
        {
            name: 'read_file',
            description: 'Read the contents of a file',
            parameters: { type: 'object', properties: { filePath: { type: 'string' } } }
        },
        {
            name: 'write_file',
            description: 'Write content to a file',
            parameters: { 
                type: 'object', 
                properties: { 
                    filePath: { type: 'string' }, 
                    content: { type: 'string' } 
                } 
            }
        },
        {
            name: 'create_directory',
            description: 'Create a new directory/folder',
            parameters: { type: 'object', properties: { dirPath: { type: 'string' } } }
        },
        {
            name: 'list_files',
            description: 'List files in a directory',
            parameters: { type: 'object', properties: { dirPath: { type: 'string' } } }
        },
        {
            name: 'search_files',
            description: 'Search for text in files within the workspace',
            parameters: { 
                type: 'object', 
                properties: { 
                    query: { type: 'string' },
                    filePattern: { type: 'string' }
                } 
            }
        },
        {
            name: 'execute_command',
            description: 'Execute a terminal command',
            parameters: { type: 'object', properties: { command: { type: 'string' } } }
        },
        {
            name: 'get_workspace_info',
            description: 'Get information about the current workspace',
        },
        {
            name: 'create_file',
            description: 'Create a new file with content',
            parameters: { 
                type: 'object', 
                properties: { 
                    filePath: { type: 'string' }, 
                    content: { type: 'string' } 
                } 
            }
        },
        {
            name: 'get_git_status',
            description: 'Get git status of the workspace',
        },
        {
            name: 'get_open_editors',
            description: 'Get list of currently open editors/files',
        }
    ];

    constructor(context: vscode.ExtensionContext) {
        super(context, 'ollama-agent-mode', 'Ollama Agent Mode');
        this.mcpService = new McpService();
        this.multiAgentOrchestrator = new MultiAgentOrchestrator(this.mcpService);
        this.initializeMcpTools();
        this.initializeMultiAgentContext();
    }

    private async initializeMcpTools() {
        // Give MCP service time to initialize
        setTimeout(() => {
            this.refreshAvailableTools();
        }, 2000);
    }

    private initializeMultiAgentContext() {
        // Set up context for multi-agent system
        const workspaceInfo = this.getWorkspaceContext();
        const context: MultiAgentContext = {
            workspaceInfo,
            currentFiles: this.getCurrentOpenFiles(),
            projectType: this.detectProjectType(),
            userPreferences: this.getUserPreferences()
        };
        
        this.multiAgentOrchestrator.setContext(context);
        console.log('Multi-agent context initialized:', context);
    }

    private getCurrentOpenFiles(): string[] {
        return vscode.window.tabGroups.all.flatMap(group => 
            group.tabs.filter(tab => tab.input instanceof vscode.TabInputText)
                .map(tab => (tab.input as vscode.TabInputText).uri.fsPath)
        );
    }

    private detectProjectType(): string {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return 'unknown';
        }

        const rootPath = workspaceFolder.uri.fsPath;
        
        // Check for common project files
        if (fs.existsSync(path.join(rootPath, 'package.json'))) {
            return 'nodejs';
        } else if (fs.existsSync(path.join(rootPath, 'requirements.txt')) || fs.existsSync(path.join(rootPath, 'setup.py'))) {
            return 'python';
        } else if (fs.existsSync(path.join(rootPath, 'Cargo.toml'))) {
            return 'rust';
        } else if (fs.existsSync(path.join(rootPath, 'go.mod'))) {
            return 'go';
        } else if (fs.existsSync(path.join(rootPath, 'pom.xml'))) {
            return 'java';
        } else {
            return 'generic';
        }
    }

    private getUserPreferences(): any {
        const config = vscode.workspace.getConfiguration('codependent');
        return {
            preferredModel: config.get('defaultModel', 'llama2'),
            enableMultiAgent: config.get('enableMultiAgent', true),
            agentCollaboration: config.get('agentCollaboration', 'sequential')
        };
    }

    private refreshAvailableTools() {
        // Get MCP tools and add them to available tools
        const mcpTools = this.mcpService.getAllTools();
        
        for (const { server, tool } of mcpTools) {
            const agentTool: AgentTool = {
                name: `mcp_${server}_${tool.name}`,
                description: `[MCP ${server}] ${tool.description}`,
                parameters: tool.inputSchema
            };
            
            // Check if tool already exists
            const existingIndex = this.availableTools.findIndex(t => t.name === agentTool.name);
            if (existingIndex >= 0) {
                this.availableTools[existingIndex] = agentTool;
            } else {
                this.availableTools.push(agentTool);
            }
        }
        
        console.log(`Updated available tools: ${this.availableTools.length} total, ${mcpTools.length} from MCP`);
    }

    protected getSystemPrompt(): string {
        const workspaceInfo = this.getWorkspaceContext();
        const toolsDescription = this.availableTools.map(tool => 
            `- ${tool.name}: ${tool.description}`
        ).join('\\n');

        const config = vscode.workspace.getConfiguration('codependent');
        const enableMultiAgent = config.get<boolean>('enableMultiAgent', true);

        let systemPrompt = `You are an advanced AI coding assistant with access to powerful tools for workspace management and code analysis. 
You MUST use tools to perform actual file operations and workspace analysis when requested.

WORKSPACE CONTEXT:
${workspaceInfo}

AVAILABLE TOOLS:
${toolsDescription}`;

        if (enableMultiAgent) {
            systemPrompt += `

🤖 **MULTI-AGENT SYSTEM AVAILABLE**: For complex tasks involving multiple steps (like "implement a complete authentication system" or "create a full project"), the system will automatically coordinate specialized agents:
- **Planner**: Breaks down complex tasks into manageable subtasks
- **Coder**: Implements code solutions and writes functionality
- **Debugger**: Identifies and fixes issues in code
- **Tester**: Creates and runs tests to validate functionality  
- **Documenter**: Creates comprehensive documentation

The multi-agent system automatically activates for complex, multi-step requests.`;
        }

        systemPrompt += `

CRITICAL: When users ask you to perform actions like creating files/folders, reading files, listing directories, or searching, you MUST respond with the exact tool syntax below. Do not provide manual instructions or explanations - just use the tools.

EXACT TOOL SYNTAX TO USE:
[TOOL: tool_name]
Parameters: {"param1": "value1", "param2": "value2"}
[/TOOL]

MANDATORY RESPONSE PATTERNS:
If user says "create a folder called X" → You respond ONLY with:
[TOOL: create_directory]
Parameters: {"dirPath": "X"}
[/TOOL]

If user says "read file X" → You respond ONLY with:
[TOOL: read_file]
Parameters: {"filePath": "X"}
[/TOOL]

If user says "list files in X" → You respond ONLY with:
[TOOL: list_files]
Parameters: {"dirPath": "X"}
[/TOOL]

If user says "search for X" → You respond ONLY with:
[TOOL: search_files]
Parameters: {"query": "X", "filePattern": "**/*"}
[/TOOL]

COMPLEX ANALYSIS WORKFLOW:
For comprehensive code reviews, project summaries, or complete analysis tasks, follow this systematic approach:
1. Start with project structure ([TOOL: list_files])
2. Read configuration files ([TOOL: read_file] for package.json, etc.)
3. Analyze source code systematically 
4. Synthesize findings into comprehensive documentation
5. Create summary files using [TOOL: write_file]

IMPORTANT: You are a hands-on developer who USES TOOLS, not a chatbot who gives instructions. When asked to do something, DO IT with tools.`;

        return systemPrompt;
    }

    private getWorkspaceContext(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return 'No workspace is currently open.';
        }

        const folder = workspaceFolders[0];
        const workspaceName = folder.name;
        const workspacePath = folder.uri.fsPath;

        // Get basic workspace info
        let info = `Workspace: ${workspaceName}\\nPath: ${workspacePath}\\n`;

        // Try to detect project type
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                info += `Project Type: ${packageJson.name ? 'Node.js/JavaScript' : 'Unknown'}\\n`;
                if (packageJson.dependencies) {
                    const mainDeps = Object.keys(packageJson.dependencies).slice(0, 5).join(', ');
                    info += `Main Dependencies: ${mainDeps}\\n`;
                }
            } catch (error) {
                // Ignore JSON parse errors
            }
        }

        return info;
    }

    protected async processUserMessage(message: string): Promise<void> {
        console.log('=== AGENT MODE DEBUG START ===');
        console.log('processUserMessage called with:', message);
        
        // Store the request for potential Copilot Chat integration
        this.lastRequest = message;
        
        // Check if multi-agent processing is enabled and should be used
        const config = vscode.workspace.getConfiguration('codependent');
        const enableMultiAgent = config.get<boolean>('enableMultiAgent', true);
        const useMultiAgentForComplexTasks = this.shouldUseMultiAgent(message);
        
        if (enableMultiAgent && useMultiAgentForComplexTasks) {
            console.log('Using multi-agent processing for complex task');
            await this.processWithMultiAgent(message);
            console.log('=== AGENT MODE DEBUG END (MULTI-AGENT PROCESSED) ===');
            return;
        }
        
        // Check if this is an action request that should be handled directly
        const directAction = await this.handleDirectAction(message);
        if (directAction) {
            console.log('=== AGENT MODE DEBUG END (DIRECT ACTION HANDLED) ===');
            return;
        }
        
        // Continue with standard processing...
        await this.processWithStandardAgent(message);
        console.log('=== AGENT MODE DEBUG END ===');
    }

    private shouldUseMultiAgent(message: string): boolean {
        const multiAgentKeywords = [
            'implement', 'create project', 'build application', 'develop system',
            'complex task', 'multi-step', 'full implementation', 'end-to-end',
            'architecture', 'design and implement', 'complete solution',
            'test and debug', 'comprehensive', 'entire', 'whole project',
            'research and implement', 'analyze and create', 'investigate and build'
        ];
        
        const lowerMessage = message.toLowerCase();
        return multiAgentKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    private async processWithMultiAgent(message: string): Promise<void> {
        try {
            // Update context with current state
            this.multiAgentOrchestrator.setContext({
                workspaceInfo: this.getWorkspaceContext(),
                currentFiles: this.getCurrentOpenFiles(),
                projectType: this.detectProjectType(),
                userPreferences: this.getUserPreferences()
            });

            // Add a status message to show multi-agent processing is starting
            const statusMessage = {
                id: Date.now().toString(),
                role: 'assistant' as const,
                content: `🤖 **Multi-Agent Processing Initiated**\n\nAnalyzing your request with specialized agents...\n\n`,
                timestamp: new Date()
            };
            this.messages.push(statusMessage);
            if (this.panel) {
                this.panel.webview.postMessage({ 
                    type: 'addMessage', 
                    message: statusMessage 
                });
            }

            // Process the request with multi-agent system
            const result = await this.multiAgentOrchestrator.processUserRequest(message);
            
            const resultMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: result,
                timestamp: new Date()
            };
            this.messages.push(resultMessage);
            if (this.panel) {
                this.panel.webview.postMessage({ 
                    type: 'addMessage', 
                    message: resultMessage 
                });
            }
        } catch (error) {
            console.error('Multi-agent processing error:', error);
            const errorMessage = {
                id: (Date.now() + 2).toString(),  
                role: 'assistant' as const,
                content: `❌ Multi-agent processing failed: ${error}\n\nFalling back to standard processing...`,
                timestamp: new Date()
            };
            this.messages.push(errorMessage);
            if (this.panel) {
                this.panel.webview.postMessage({ 
                    type: 'addMessage', 
                    message: errorMessage 
                });
            }
            
            // Fall back to standard processing
            await this.processWithStandardAgent(message);
        }
    }

    private async processWithStandardAgent(message: string): Promise<void> {
        
        // Pre-process the message to force tool usage for common requests
        const enhancedMessage = this.enhanceMessageWithToolHints(message);
        
        console.log('Original message:', message);
        console.log('Enhanced message:', enhancedMessage);
        
        const ollamaMessages = this.convertToOllamaMessages();
        
        // Replace the last user message with the enhanced one
        if (ollamaMessages.length > 0 && ollamaMessages[ollamaMessages.length - 1].role === 'user') {
            ollamaMessages[ollamaMessages.length - 1].content = enhancedMessage;
        }
        
        console.log('Messages being sent to Ollama:', JSON.stringify(ollamaMessages, null, 2));
        
        try {
            const response = await this.ollamaService.chat(ollamaMessages, this.currentModel);
            
            console.log('Raw response from Ollama:', response);
            console.log('Checking for tool patterns...');
            
            // Check if the response contains tool usage - improved regex
            const toolMatches = response.match(/\[TOOL: \w+\][\s\S]*?\[\/TOOL\]/g);
            console.log('Tool regex matches:', toolMatches);
            
            // Also try a simpler pattern match
            const simpleToolCheck = response.includes('[TOOL:') && response.includes('[/TOOL]');
            console.log('Simple tool check (contains [TOOL: and [/TOOL]):', simpleToolCheck);
            
            if (toolMatches && toolMatches.length > 0) {
                console.log(`Found ${toolMatches.length} tool(s) to execute:`, toolMatches);
                let processedResponse = response;
                
                // Execute tools and replace in response
                for (const toolMatch of toolMatches) {
                    console.log('Executing tool:', toolMatch);
                    const toolResult = await this.executeTool(toolMatch);
                    console.log('Tool result:', toolResult);
                    processedResponse = processedResponse.replace(toolMatch, toolResult);
                }
                
                console.log('Final processed response:', processedResponse);
                await this.sendAssistantMessage(processedResponse);
            } else {
                console.log('No tools found in response, checking for fallback...');
                
                // Directory creation fallback
                if (message.toLowerCase().includes('create') && (message.toLowerCase().includes('folder') || message.toLowerCase().includes('directory'))) {
                    console.log('Detected directory creation request but no tool usage - forcing tool execution');
                    const dirName = this.extractDirectoryName(message);
                    console.log('Extracted directory name:', dirName);
                    if (dirName) {
                        console.log('Executing createDirectory fallback with:', dirName);
                        const toolResult = await this.createDirectory({ dirPath: dirName });
                        console.log('Fallback tool result:', toolResult);
                        await this.sendAssistantMessage(`I've created the directory for you:\n\n${toolResult}`);
                        console.log('=== AGENT MODE DEBUG END (FALLBACK EXECUTED) ===');
                        return;
                    }
                }
                
                // Project analysis fallback - force workspace exploration
                if (message.toLowerCase().includes('extend') || message.toLowerCase().includes('analyze') || 
                    message.toLowerCase().includes('project') || message.toLowerCase().includes('mcp')) {
                    console.log('Detected project analysis request but no tool usage - forcing exploration');
                    
                    let explorationResult = '';
                    
                    // List project structure
                    console.log('Executing listFiles fallback for project root');
                    const filesList = await this.listFiles({ dirPath: '.' });
                    explorationResult += `Project Structure:\n${filesList}\n\n`;
                    
                    // Read package.json if it exists
                    try {
                        console.log('Executing readFile fallback for package.json');
                        const packageContent = await this.readFile({ filePath: 'package.json' });
                        explorationResult += `Package.json Contents:\n${packageContent}\n\n`;
                    } catch (error) {
                        console.log('No package.json found or error reading it');
                    }
                    
                    // Search for MCP-related content
                    console.log('Executing searchFiles fallback for MCP-related content');
                    const mcpSearch = await this.searchFiles({ query: 'mcp', filePattern: '**/*' });
                    explorationResult += `MCP-related files/content:\n${mcpSearch}\n\n`;
                    
                    const analysisResponse = `I've analyzed your project to help with extending it for MCP servers:\n\n${explorationResult}Based on this analysis, I can help you integrate MCP servers. What specific MCP functionality would you like to add?`;
                    
                    await this.sendAssistantMessage(analysisResponse);
                    console.log('=== AGENT MODE DEBUG END (PROJECT ANALYSIS FALLBACK) ===');
                    return;
                }
                
                console.log('No fallback triggered, sending original response');
                await this.sendAssistantMessage(response);
            }
            console.log('=== AGENT MODE DEBUG END ===');
        } catch (error: any) {
            console.error('Error in processUserMessage:', error);
            console.log('=== AGENT MODE DEBUG END (ERROR) ===');
            throw new Error(`Failed to get response: ${error.message}`);
        }
    }

    private extractDirectoryName(message: string): string | null {
        // Try to extract directory name from various patterns
        const patterns = [
            /create\s+(?:a\s+)?(?:folder|directory)\s+(?:called|named)\s+(\w+)/i,
            /create\s+(\w+)\s+(?:folder|directory)/i,
            /(?:folder|directory)\s+(?:called|named)\s+(\w+)/i
        ];
        
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    private async handleDirectAction(message: string): Promise<boolean> {
        const lowerMessage = message.toLowerCase();
        
        // Research agent commands
        if (lowerMessage.includes('research') || lowerMessage.includes('gather information')) {
            console.log('=== HANDLING RESEARCH REQUEST ===');
            await this.handleResearchRequest(message);
            return true;
        }
        
        // MCP status command
        if (lowerMessage.includes('mcp status') || lowerMessage.includes('research status')) {
            console.log('=== HANDLING MCP STATUS REQUEST ===');
            await this.handleMcpStatusRequest();
            return true;
        }
        
        // Direct project analysis for MCP/extension requests
        if ((lowerMessage.includes('extend') && lowerMessage.includes('project')) || 
            lowerMessage.includes('mcp')) {
            
            console.log('=== HANDLING DIRECT PROJECT ANALYSIS ACTION ===');
            
            let analysisResult = 'I\'ve analyzed your project for MCP integration:\n\n';
            
            try {
                // 1. Examine project structure
                console.log('Analyzing project structure...');
                const projectFiles = await this.listFiles({ dirPath: '.' });
                analysisResult += `**Project Structure:**\n${projectFiles}\n\n`;
                
                // 2. Read package.json to understand current setup
                console.log('Reading package.json...');
                const packageContent = await this.readFile({ filePath: 'package.json' });
                analysisResult += `**Current Package Configuration:**\n\`\`\`json\n${packageContent}\n\`\`\`\n\n`;
                
                // 3. Check for existing MCP-related files
                console.log('Searching for MCP-related content...');
                const mcpSearch = await this.searchFiles({ query: 'mcp|MCP', filePattern: '**/*' });
                analysisResult += `**MCP-Related Content Found:**\n${mcpSearch}\n\n`;
                
                // 4. Check VS Code extension specific files
                console.log('Checking VS Code extension files...');
                const srcFiles = await this.listFiles({ dirPath: 'src' });
                analysisResult += `**Source Files:**\n${srcFiles}\n\n`;
                
                // 5. Provide specific recommendations
                analysisResult += `**Recommendations for MCP Integration:**\n\n`;
                analysisResult += `1. **Add MCP Dependencies**: Add MCP client libraries to package.json\n`;
                analysisResult += `2. **Create MCP Service**: Create a new service class to handle MCP server communication\n`;
                analysisResult += `3. **Update Extension Activation**: Modify extension.ts to initialize MCP connections\n`;
                analysisResult += `4. **Add Configuration**: Add MCP server settings to package.json configuration\n\n`;
                analysisResult += `Would you like me to implement any of these specific steps?`;
                
                await this.sendAssistantMessage(analysisResult);
                return true;
                
            } catch (error) {
                console.error('Error in direct action analysis:', error);
                await this.sendAssistantMessage(`I tried to analyze your project but encountered an error: ${error}. Let me try a different approach.`);
                return true;
            }
        }
        
        return false;
    }

    private enhanceMessageWithToolHints(message: string): string {
        const lowerMessage = message.toLowerCase();
        
        // PowerShell script creation (high priority check)
        if (this.isPowerShellScriptRequest(lowerMessage)) {
            return `${message}

IMPORTANT: The user wants you to create a PowerShell script. You MUST use the create_file tool to create the .ps1 file:
[TOOL: create_file]
Parameters: {"filePath": "script-name.ps1", "content": "PowerShell script content here"}
[/TOOL]

Extract the script name from the user's request and generate appropriate PowerShell code for their requirements.`;
        }

        // Code generation and creation requests
        if (this.isCodeGenerationRequest(lowerMessage)) {
            return `${message}

IMPORTANT: The user wants you to generate/create code or files. Follow this systematic approach:

1. ANALYZE CONTEXT - First understand the existing codebase:
[TOOL: list_files]
Parameters: {"dirPath": "."}
[/TOOL]

2. READ CONFIGURATION - Understand project setup and dependencies:
[TOOL: read_file]
Parameters: {"filePath": "package.json"}
[/TOOL]

3. EXAMINE EXISTING CODE - Read relevant source files to understand patterns:
[TOOL: list_files]
Parameters: {"dirPath": "src"}
[/TOOL]

4. SEARCH FOR SIMILAR PATTERNS - Find existing implementations to follow:
[TOOL: search_files]
Parameters: {"query": "class|interface|function", "filePattern": "**/*.ts"}
[/TOOL]

5. CREATE THE CODE - Generate the requested code/files using write_file or create_file tools

You MUST use tools to understand the codebase before generating code that fits the project structure and patterns.`;
        }

        // Code enhancement and improvement requests
        if (this.isCodeEnhancementRequest(lowerMessage)) {
            return `${message}

IMPORTANT: The user wants to enhance/improve existing code. Follow this workflow:

1. READ CURRENT IMPLEMENTATION - First examine the code to be enhanced:
[TOOL: read_file]
Parameters: {"filePath": "target-file-path"}
[/TOOL]

2. UNDERSTAND PROJECT CONTEXT - Check related files and dependencies:
[TOOL: search_files]
Parameters: {"query": "import|require|export", "filePattern": "**/*.{ts,js}"}
[/TOOL]

3. ANALYZE PATTERNS - Look for existing patterns and best practices:
[TOOL: search_files]
Parameters: {"query": "similar-functionality", "filePattern": "**/*.{ts,js}"}
[/TOOL]

4. IMPLEMENT IMPROVEMENTS - Create enhanced version using write_file tool

You MUST read and understand the existing code before making improvements to ensure compatibility and consistency.`;
        }

        // Directory/folder creation - but NOT script creation
        if (lowerMessage.includes('create') && (lowerMessage.includes('folder') || lowerMessage.includes('directory')) && 
            !lowerMessage.includes('script') && !lowerMessage.includes('file') && !lowerMessage.includes('.ps') && 
            !lowerMessage.includes('.sh') && !lowerMessage.includes('.bat') && !lowerMessage.includes('powershell')) {
            return `${message}

IMPORTANT: The user wants you to actually create a directory. You MUST use the create_directory tool. Do not give instructions - actually create it using:
[TOOL: create_directory]
Parameters: {"dirPath": "directory-name-here"}
[/TOOL]`;
        }

        // Script and file creation requests
        if (lowerMessage.includes('create') && (lowerMessage.includes('script') || lowerMessage.includes('file') || 
            lowerMessage.includes('.ps1') || lowerMessage.includes('.ps') || lowerMessage.includes('.sh') || 
            lowerMessage.includes('.bat') || lowerMessage.includes('powershell') || lowerMessage.includes('bash'))) {
            return `${message}

IMPORTANT: The user wants you to create a script or file. You MUST use the create_file or write_file tool. Do not give instructions - actually create it:
[TOOL: create_file]
Parameters: {"filePath": "script-name-with-extension", "content": "script-content-here"}
[/TOOL]`;
        }
        
        // File reading requests
        if ((lowerMessage.includes('read') || lowerMessage.includes('show') || lowerMessage.includes('view')) && lowerMessage.includes('file')) {
            return `${message}

IMPORTANT: The user wants you to actually read a file. You MUST use the read_file tool. Do not give suggestions - actually read it using the tool.`;
        }
        
        // File listing requests
        if (lowerMessage.includes('list') && (lowerMessage.includes('files') || lowerMessage.includes('directory'))) {
            return `${message}

IMPORTANT: The user wants you to actually list files. You MUST use the list_files tool. Do not give suggestions - actually list them using the tool.`;
        }
        
        // Search requests
        if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
            return `${message}

IMPORTANT: The user wants you to actually search. You MUST use the search_files tool. Do not give suggestions - actually search using the tool.`;
        }
        
        // Feature implementation requests
        if (this.isFeatureImplementationRequest(lowerMessage)) {
            return `${message}

IMPORTANT: The user wants to implement a new feature. Follow this comprehensive approach:

1. UNDERSTAND PROJECT ARCHITECTURE:
[TOOL: list_files]
Parameters: {"dirPath": "."}
[/TOOL]

2. READ PROJECT CONFIGURATION:
[TOOL: read_file]
Parameters: {"filePath": "package.json"}
[/TOOL]

3. EXAMINE SOURCE STRUCTURE:
[TOOL: list_files]
Parameters: {"dirPath": "src"}
[/TOOL]

4. FIND SIMILAR IMPLEMENTATIONS:
[TOOL: search_files]
Parameters: {"query": "class|service|provider", "filePattern": "**/*.ts"}
[/TOOL]

5. READ KEY ARCHITECTURAL FILES:
[TOOL: read_file]
Parameters: {"filePath": "src/extension.ts"}
[/TOOL]

6. IMPLEMENT THE FEATURE - Create necessary files and modify existing ones using write_file/create_file tools

You must understand the existing architecture before implementing new features to ensure proper integration.`;
        }
        
        // Project analysis/extension requests
        if (lowerMessage.includes('extend') || lowerMessage.includes('analyze') || lowerMessage.includes('project') || lowerMessage.includes('mcp')) {
            return `${message}

IMPORTANT: The user wants you to analyze and work with the actual project files. You MUST:
1. First examine the project structure with list_files
2. Read relevant configuration files (package.json, etc.)
3. Search for existing patterns or dependencies
4. Then provide specific implementation steps

Start by using these tools to understand the current project:
[TOOL: list_files]
Parameters: {"dirPath": "."}
[/TOOL]

[TOOL: read_file]
Parameters: {"filePath": "package.json"}
[/TOOL]`;
        }
        
        // Code review and comprehensive analysis requests
        if ((lowerMessage.includes('review') && lowerMessage.includes('code')) || 
            (lowerMessage.includes('create') && lowerMessage.includes('summary')) ||
            (lowerMessage.includes('summarize') && lowerMessage.includes('project')) ||
            (lowerMessage.includes('comprehensive') && lowerMessage.includes('analysis'))) {
            return `${message}

IMPORTANT: The user wants a comprehensive code review and project analysis. You MUST follow this systematic approach:

1. FIRST - List all files and directories to understand project structure:
[TOOL: list_files]
Parameters: {"dirPath": "."}
[/TOOL]

2. THEN - Read core configuration files:
[TOOL: read_file]
Parameters: {"filePath": "package.json"}
[/TOOL]

3. NEXT - List source code directory:
[TOOL: list_files]
Parameters: {"dirPath": "src"}
[/TOOL]

4. THEN - Read key implementation files (extension.ts, main components):
[TOOL: read_file]
Parameters: {"filePath": "src/extension.ts"}
[/TOOL]

5. ANALYZE - Read agent system files:
[TOOL: list_files]
Parameters: {"dirPath": "src/agents"}
[/TOOL]

6. DOCUMENT - After analyzing all components, create the comprehensive summary file using write_file tool.

You must execute each tool step systematically and then synthesize all findings into a comprehensive project summary.`;
        }

        // Refactoring and optimization requests
        if (this.isRefactoringRequest(lowerMessage)) {
            return `${message}

IMPORTANT: The user wants to refactor or optimize code. Follow this systematic approach:

1. READ TARGET CODE - Examine the code to be refactored:
[TOOL: read_file]
Parameters: {"filePath": "target-file"}
[/TOOL]

2. UNDERSTAND DEPENDENCIES - Find all files that use this code:
[TOOL: search_files]
Parameters: {"query": "import.*target|require.*target", "filePattern": "**/*.{ts,js}"}
[/TOOL]

3. ANALYZE USAGE PATTERNS - See how the code is currently used:
[TOOL: search_files]
Parameters: {"query": "function-name|class-name", "filePattern": "**/*.{ts,js}"}
[/TOOL]

4. IMPLEMENT REFACTORING - Create improved version while maintaining compatibility

You must understand all usage patterns before refactoring to ensure no breaking changes.`;
        }

        // Bug fixing and debugging requests
        if (this.isBugFixRequest(lowerMessage)) {
            return `${message}

IMPORTANT: The user wants to fix bugs or debug code. Follow this diagnostic approach:

1. READ PROBLEMATIC CODE - Examine the code with issues:
[TOOL: read_file]
Parameters: {"filePath": "problematic-file"}
[/TOOL]

2. SEARCH FOR ERROR PATTERNS - Look for common error sources:
[TOOL: search_files]
Parameters: {"query": "error|exception|try|catch", "filePattern": "**/*.{ts,js}"}
[/TOOL]

3. CHECK RELATED FILES - Examine dependencies and imports:
[TOOL: search_files]
Parameters: {"query": "import.*problematic-module", "filePattern": "**/*.{ts,js}"}
[/TOOL]

4. IMPLEMENT FIX - Apply the necessary corrections using write_file tool

You must analyze the code thoroughly to identify the root cause before applying fixes.`;
        }
        
        // Workspace exploration requests
        if (lowerMessage.includes('what') && (lowerMessage.includes('files') || lowerMessage.includes('structure') || lowerMessage.includes('project'))) {
            return `${message}

IMPORTANT: The user wants to explore the workspace. You MUST use tools to examine the actual files:
[TOOL: list_files]
Parameters: {"dirPath": "."}
[/TOOL]`;
        }
        
        return message;
    }

    /**
     * Detect if the message is requesting PowerShell script creation
     */
    private isPowerShellScriptRequest(message: string): boolean {
        const powershellKeywords = [
            'powershell script', 'create powershell', '.ps1', '.ps',
            'pwsh script', 'powershell file', 'ps1 script',
            'write powershell', 'generate powershell'
        ];
        
        return powershellKeywords.some(keyword => message.includes(keyword)) ||
               (message.includes('create') && message.includes('script') && 
                (message.includes('powershell') || message.includes('.ps')));
    }

    /**
     * Detect if the message is requesting code generation
     */
    private isCodeGenerationRequest(message: string): boolean {
        const codeGenKeywords = [
            'generate code', 'create class', 'create function', 'create method',
            'write code', 'implement class', 'implement function', 'build component',
            'create component', 'generate component', 'write implementation',
            'create service', 'implement service', 'build service', 'scaffold',
            'create new file', 'generate new', 'write new', 'build new'
        ];
        
        return codeGenKeywords.some(keyword => message.includes(keyword));
    }

    /**
     * Detect if the message is requesting code enhancement/improvement
     */
    private isCodeEnhancementRequest(message: string): boolean {
        const enhancementKeywords = [
            'improve', 'enhance', 'optimize', 'better', 'upgrade',
            'modernize', 'update', 'strengthen', 'polish', 'clean up',
            'make better', 'add features', 'extend functionality',
            'performance', 'efficiency', 'best practices'
        ];
        
        return enhancementKeywords.some(keyword => message.includes(keyword)) &&
               (message.includes('code') || message.includes('function') || message.includes('class'));
    }

    /**
     * Detect if the message is requesting feature implementation
     */
    private isFeatureImplementationRequest(message: string): boolean {
        const featureKeywords = [
            'implement feature', 'add feature', 'build feature', 'create feature',
            'new functionality', 'add functionality', 'implement system',
            'build system', 'add capability', 'implement support',
            'add integration', 'implement integration', 'add authentication',
            'implement authentication', 'add api', 'implement api'
        ];
        
        return featureKeywords.some(keyword => message.includes(keyword));
    }

    /**
     * Detect if the message is requesting refactoring
     */
    private isRefactoringRequest(message: string): boolean {
        const refactorKeywords = [
            'refactor', 'restructure', 'reorganize', 'redesign',
            'clean up', 'simplify', 'modularize', 'extract',
            'split', 'separate', 'consolidate', 'merge'
        ];
        
        return refactorKeywords.some(keyword => message.includes(keyword));
    }

    /**
     * Detect if the message is requesting bug fixes
     */
    private isBugFixRequest(message: string): boolean {
        const bugFixKeywords = [
            'fix bug', 'fix error', 'fix issue', 'debug', 'troubleshoot',
            'resolve error', 'solve problem', 'fix problem', 'repair',
            'correct', 'address issue', 'handle error', 'exception',
            'not working', 'broken', 'failing', 'crash'
        ];
        
        return bugFixKeywords.some(keyword => message.includes(keyword));
    }

    private async executeTool(toolMatch: string): Promise<string> {
        try {
            console.log('Processing tool match:', toolMatch);
            
            const toolNameMatch = toolMatch.match(/\[TOOL: (\w+)\]/);
            if (!toolNameMatch) {
                return '[Error: Invalid tool format - could not extract tool name]';
            }
            
            const toolName = toolNameMatch[1];
            console.log('Tool name:', toolName);
            
            // Extract parameters - improved regex to handle multiline JSON
            const paramMatch = toolMatch.match(/Parameters:\s*(\{[\s\S]*?\})/);
            let params = {};
            
            if (paramMatch) {
                try {
                    // Clean up the JSON string
                    const jsonStr = paramMatch[1].trim();
                    console.log('Raw JSON string:', jsonStr);
                    params = JSON.parse(jsonStr);
                    console.log('Parsed parameters:', params);
                } catch (error) {
                    console.log('JSON parsing failed, trying simple extraction');
                    // Try to extract simple key-value pairs if JSON parsing fails
                    const lines = toolMatch.split('\n');
                    params = {};
                    
                    for (const line of lines) {
                        // Look for patterns like: key: "value" or key: value
                        const keyValueMatch = line.match(/(\w+):\s*["']?([^"',\n]+)["']?/);
                        if (keyValueMatch) {
                            const [, key, value] = keyValueMatch;
                            (params as any)[key] = value.trim();
                        }
                    }
                    
                    if (Object.keys(params).length === 0) {
                        return `[Error: Could not parse parameters - ${error}]`;
                    }
                    console.log('Extracted parameters:', params);
                }
            } else {
                console.log('No parameters found');
            }

            switch (toolName) {
                case 'read_file':
                    return await this.readFile(params as { filePath: string });
                    
                case 'write_file':
                    return await this.writeFile(params as { filePath: string, content: string });
                    
                case 'create_directory':
                    return await this.createDirectory(params as { dirPath: string });
                    
                case 'list_files':
                    return await this.listFiles(params as { dirPath: string });
                    
                case 'search_files':
                    return await this.searchFiles(params as { query: string, filePattern?: string });
                    
                case 'execute_command':
                    return await this.executeCommand(params as { command: string });
                    
                case 'get_workspace_info':
                    return this.getDetailedWorkspaceInfo();
                    
                case 'create_file':
                    return await this.createFile(params as { filePath: string, content: string });
                    
                case 'get_git_status':
                    return await this.getGitStatus();
                    
                case 'get_open_editors':
                    return this.getOpenEditors();
                    
                default:
                    // Check if it's an MCP tool
                    if (toolName.startsWith('mcp_')) {
                        return await this.executeMcpTool(toolName, params);
                    }
                    return `[Error: Unknown tool '${toolName}']`;
            }
        } catch (error: any) {
            return `[Error executing tool: ${error.message}]`;
        }
    }

    private async readFile(params: { filePath: string }): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return '[Error: No workspace open]';
            }

            const fullPath = path.isAbsolute(params.filePath) 
                ? params.filePath 
                : path.join(workspaceFolders[0].uri.fsPath, params.filePath);

            if (!fs.existsSync(fullPath)) {
                return `[Error: File not found: ${params.filePath}]`;
            }

            const content = fs.readFileSync(fullPath, 'utf8');
            return `[File Contents: ${params.filePath}]\\n\`\`\`\\n${content}\\n\`\`\``;
        } catch (error: any) {
            return `[Error reading file: ${error.message}]`;
        }
    }

    private async writeFile(params: { filePath: string, content: string }): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return '[Error: No workspace open]';
            }

            const fullPath = path.isAbsolute(params.filePath) 
                ? params.filePath 
                : path.join(workspaceFolders[0].uri.fsPath, params.filePath);

            // Create directory if it doesn't exist
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(fullPath, params.content, 'utf8');
            return `[Success: File written to ${params.filePath}]`;
        } catch (error: any) {
            return `[Error writing file: ${error.message}]`;
        }
    }

    private async createDirectory(params: { dirPath: string }): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return '[Error: No workspace open]';
            }

            const fullPath = path.isAbsolute(params.dirPath) 
                ? params.dirPath 
                : path.join(workspaceFolders[0].uri.fsPath, params.dirPath);

            if (fs.existsSync(fullPath)) {
                return `[Directory already exists: ${params.dirPath}]`;
            }

            fs.mkdirSync(fullPath, { recursive: true });
            return `[Successfully created directory: ${params.dirPath}]`;
        } catch (error: any) {
            return `[Error creating directory: ${error.message}]`;
        }
    }

    private async listFiles(params: { dirPath: string }): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return '[Error: No workspace open]';
            }

            const fullPath = path.isAbsolute(params.dirPath) 
                ? params.dirPath 
                : path.join(workspaceFolders[0].uri.fsPath, params.dirPath);

            if (!fs.existsSync(fullPath)) {
                return `[Error: Directory not found: ${params.dirPath}]`;
            }

            const files = fs.readdirSync(fullPath);
            const fileList = files.map(file => {
                const filePath = path.join(fullPath, file);
                const stats = fs.statSync(filePath);
                return `${stats.isDirectory() ? '[DIR]' : '[FILE]'} ${file}`;
            }).join('\\n');

            return `[Directory Contents: ${params.dirPath}]\\n${fileList}`;
        } catch (error: any) {
            return `[Error listing files: ${error.message}]`;
        }
    }

    private async searchFiles(params: { query: string, filePattern?: string }): Promise<string> {
        try {
            // Use findFiles to get files matching pattern, then search content
            const filePattern = params.filePattern || '**/*.{js,ts,jsx,tsx,py,java,c,cpp,h,cs,go,rs,php,rb}';
            const files = await vscode.workspace.findFiles(filePattern, '**/node_modules/**', 100);
            
            let searchResults = `[Search Results for "${params.query}"]\\n`;
            let foundMatches = false;

            for (const file of files) {
                try {
                    const content = fs.readFileSync(file.fsPath, 'utf8');
                    const lines = content.split('\\n');
                    
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].toLowerCase().includes(params.query.toLowerCase())) {
                            if (!foundMatches) {
                                searchResults += `\\nFile: ${vscode.workspace.asRelativePath(file)}\\n`;
                                foundMatches = true;
                            }
                            searchResults += `  Line ${i + 1}: ${lines[i].trim()}\\n`;
                        }
                    }
                } catch (error) {
                    // Skip files that can't be read
                    continue;
                }
            }

            if (!foundMatches) {
                return `[No results found for query: "${params.query}"]`;
            }

            return searchResults;
        } catch (error: any) {
            return `[Error searching files: ${error.message}]`;
        }
    }

    private async executeCommand(params: { command: string }): Promise<string> {
        try {
            // For security, we'll show what would be executed but not actually execute
            // In a production extension, you'd want to ask for user confirmation
            return `[Command Simulation: "${params.command}"]\\n[Note: For security reasons, commands are not actually executed. This shows what would be run.]`;
        } catch (error: any) {
            return `[Error: ${error.message}]`;
        }
    }

    private getDetailedWorkspaceInfo(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return '[No workspace is currently open]';
        }

        let info = `[Detailed Workspace Information]\\n`;
        
        for (const folder of workspaceFolders) {
            info += `\\nWorkspace Folder: ${folder.name}\\n`;
            info += `Path: ${folder.uri.fsPath}\\n`;
            
            // Check for common project files
            const commonFiles = ['package.json', 'tsconfig.json', 'README.md', '.gitignore', 'Cargo.toml', 'requirements.txt'];
            const existingFiles = commonFiles.filter(file => 
                fs.existsSync(path.join(folder.uri.fsPath, file))
            );
            
            if (existingFiles.length > 0) {
                info += `Project Files: ${existingFiles.join(', ')}\\n`;
            }
        }

        return info;
    }

    private async createFile(params: { filePath: string, content: string }): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return '[Error: No workspace open]';
            }

            const fullPath = path.isAbsolute(params.filePath) 
                ? params.filePath 
                : path.join(workspaceFolders[0].uri.fsPath, params.filePath);

            if (fs.existsSync(fullPath)) {
                return `[Error: File already exists: ${params.filePath}]`;
            }

            // Create directory if it doesn't exist
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(fullPath, params.content, 'utf8');
            return `[Success: File created at ${params.filePath}]`;
        } catch (error: any) {
            return `[Error creating file: ${error.message}]`;
        }
    }

    private async getGitStatus(): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return '[Error: No workspace open]';
            }

            const gitDir = path.join(workspaceFolders[0].uri.fsPath, '.git');
            if (!fs.existsSync(gitDir)) {
                return '[This workspace is not a Git repository]';
            }

            // For now, just indicate it's a git repo
            // In a full implementation, you'd use git commands or a git library
            return '[Git repository detected - full git status would require additional implementation]';
        } catch (error: any) {
            return `[Error checking git status: ${error.message}]`;
        }
    }

    private getOpenEditors(): string {
        const openEditors = vscode.window.tabGroups.all.flatMap(group => 
            group.tabs.filter(tab => tab.input instanceof vscode.TabInputText)
                .map(tab => (tab.input as vscode.TabInputText).uri.fsPath)
        );

        if (openEditors.length === 0) {
            return '[No files are currently open in editors]';
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const relativePaths = openEditors.map(filePath => 
            workspaceFolders ? vscode.workspace.asRelativePath(filePath) : filePath
        );

        return `[Currently Open Files]\\n${relativePaths.join('\\n')}`;
    }

    private async executeMcpTool(toolName: string, params: any): Promise<string> {
        try {
            // Parse MCP tool name: mcp_<server>_<tool>
            const parts = toolName.split('_');
            if (parts.length < 3) {
                return `[Error: Invalid MCP tool name format: ${toolName}]`;
            }
            
            const serverName = parts[1];
            const actualToolName = parts.slice(2).join('_');
            
            console.log(`Executing MCP tool: ${actualToolName} on server: ${serverName}`);
            
            // Check if server is connected
            if (!this.mcpService.isServerConnected(serverName)) {
                return `[Error: MCP server '${serverName}' is not connected]`;
            }
            
            // Call the MCP tool
            const result = await this.mcpService.callTool(serverName, actualToolName, params);
            
            return `[MCP Tool Result from ${serverName}]\\n${JSON.stringify(result, null, 2)}`;
        } catch (error: any) {
            return `[Error executing MCP tool ${toolName}: ${error.message}]`;
        }
    }

    /**
     * Handle research requests
     */
    private async handleResearchRequest(message: string): Promise<void> {
        try {
            // Create a research task
            const task = this.multiAgentOrchestrator.createTask(message, 'high');
            task.assignedTo = AgentType.RESEARCHER;
            
            // Execute the research task
            const results = await this.multiAgentOrchestrator.executeTask(task);
            
            // Format and send the response
            let response = `## Research Results\n\n`;
            
            for (const result of results) {
                if (result.agent === AgentType.RESEARCHER) {
                    response += result.result;
                    break;
                }
            }
            
            await this.sendAssistantMessage(response);
            
        } catch (error) {
            console.error('Error handling research request:', error);
            await this.sendAssistantMessage(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Handle MCP status requests
     */
    private async handleMcpStatusRequest(): Promise<void> {
        try {
            const mcpStatus = this.multiAgentOrchestrator.getMcpStatus();
            
            let response = `## MCP Service Status\n\n`;
            response += `**Connection Status:** ${mcpStatus.connected ? '✅ Connected' : '❌ Disconnected'}\n\n`;
            response += `**Connected Servers:** ${mcpStatus.servers.length}\n`;
            
            if (mcpStatus.servers.length > 0) {
                response += mcpStatus.servers.map(server => `- ${server}`).join('\n') + '\n\n';
            }
            
            response += `**Available Tools:** ${mcpStatus.tools}\n`;
            response += `**Available Resources:** ${mcpStatus.resources}\n\n`;
            
            if (mcpStatus.tools > 0) {
                const tools = this.mcpService.getAllTools();
                response += `**Tool Details:**\n`;
                for (const { server, tool } of tools) {
                    response += `- \`${tool.name}\` (${server}): ${tool.description}\n`;
                }
                response += '\n';
            }
            
            if (mcpStatus.resources > 0) {
                const resources = this.mcpService.getAllResources();
                response += `**Resource Details:**\n`;
                for (const { server, resource } of resources) {
                    response += `- \`${resource.uri}\` (${server})\n`;
                }
            }
            
            await this.sendAssistantMessage(response);
            
        } catch (error) {
            console.error('Error getting MCP status:', error);
            await this.sendAssistantMessage(`Error getting MCP status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public async dispose() {
        // Clean up MCP service when provider is disposed
        if (this.mcpService) {
            await this.mcpService.disconnect();
        }
        
        // Clean up multi-agent orchestrator
        if (this.multiAgentOrchestrator) {
            this.multiAgentOrchestrator.dispose();
        }
    }

    protected getQuickActions(): string {
        return `
            <div class="quick-action" onclick="handleQuickAction('Analyze the current project structure')">Analyze Project</div>
            <div class="quick-action" onclick="handleQuickAction('Review the code in the current file')">Review Code</div>
            <div class="quick-action" onclick="handleQuickAction('Find all TODO comments in the project')">Find TODOs</div>
            <div class="quick-action" onclick="handleQuickAction('Generate unit tests for the selected code')">Generate Tests</div>
            <div class="quick-action" onclick="handleQuickAction('Refactor this code to improve readability')">Refactor Code</div>
            <div class="quick-action" onclick="handleQuickAction('Check for potential security issues')">Security Audit</div>
        `;
    }

    /**
     * Get the last processed request and response for Copilot Chat integration
     */
    public getLastInteraction(): { request: string; response: string } {
        return {
            request: this.lastRequest,
            response: this.lastResponse
        };
    }

    /**
     * Process a request and return the response for Copilot Chat integration
     */
    public async processRequestForCopilot(request: string): Promise<string> {
        try {
            // Store the request
            this.lastRequest = request;
            
            // Process with our agent system
            await this.processUserMessage(request);
            
            // Return the last response
            return this.lastResponse;
            
        } catch (error) {
            const errorMessage = `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`;
            this.lastResponse = errorMessage;
            return errorMessage;
        }
    }

    protected async sendAssistantMessage(content: string): Promise<void> {
        // Store the response for potential Copilot Chat integration
        this.lastResponse = content;
        
        // Call the parent method to actually send the message
        await super.sendAssistantMessage(content);
    }
}
