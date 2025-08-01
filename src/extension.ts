import * as vscode from 'vscode';
import { OllamaService } from './ollama-service';
import { AskModeChatProvider } from './ask-mode-provider';
import { AgentModeChatProvider } from './agent-mode-provider';
import { GeneralChatProvider } from './general-chat-provider';
import { CopilotChatService } from './copilot-chat-service';
import { ConfigurationValidator } from './configuration-validator';

let ollamaService: OllamaService;
let askModeProvider: AskModeChatProvider;
let agentModeProvider: AgentModeChatProvider;
let generalChatProvider: GeneralChatProvider;
let copilotChatService: CopilotChatService;
let configValidator: ConfigurationValidator;

export function activate(context: vscode.ExtensionContext) {
    console.log('=== CoDependement extension ACTIVATION START ===');
    console.log('Extension context:', context);
    console.log('=== CoDependement extension is now active! ===');

    // Initialize services
    ollamaService = new OllamaService();
    askModeProvider = new AskModeChatProvider(context);
    agentModeProvider = new AgentModeChatProvider(context);
    generalChatProvider = new GeneralChatProvider(context);
    copilotChatService = new CopilotChatService();
    configValidator = new ConfigurationValidator();

    // Register commands
    const openChatCommand = vscode.commands.registerCommand('codependent.openChat', () => {
        console.log('=== OPEN CHAT COMMAND TRIGGERED ===');
        generalChatProvider.show();
    });

    const openAskModeCommand = vscode.commands.registerCommand('codependent.openAskMode', () => {
        console.log('=== OPEN ASK MODE COMMAND TRIGGERED ===');
        askModeProvider.show();
    });

    const openAgentModeCommand = vscode.commands.registerCommand('codependent.openAgentMode', () => {
        console.log('=== OPEN AGENT MODE COMMAND TRIGGERED ===');
        agentModeProvider.show();
    });

    // Add a test command for debugging
    const testDirectoryCreationCommand = vscode.commands.registerCommand('codependent.testDirectoryCreation', async () => {
        console.log('=== TESTING DIRECTORY CREATION ===');
        try {
            // Test the agent mode processing directly
            const testMessage = 'create a folder called subagents';
            console.log('Testing with message:', testMessage);
            
            // Create a temporary message to test the processing
            await agentModeProvider.show();
            
            vscode.window.showInformationMessage('Check the console for debug logs, then try creating "subagents" folder in the Agent Mode webview.');
        } catch (error) {
            console.error('Test failed:', error);
            vscode.window.showErrorMessage(`Test failed: ${error}`);
        }
    });

    const selectModelCommand = vscode.commands.registerCommand('codependent.selectModel', async () => {
        try {
            // Check if Ollama is available
            const isAvailable = await ollamaService.isOllamaAvailable();
            if (!isAvailable) {
                vscode.window.showErrorMessage(
                    'Ollama is not available. Please make sure Ollama is installed and running.',
                    'Open Settings'
                ).then(selection => {
                    if (selection === 'Open Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'codependent');
                    }
                });
                return;
            }

            // Get available models
            const models = await ollamaService.getModels();
            if (models.length === 0) {
                vscode.window.showInformationMessage(
                    'No models found. Please install models using Ollama CLI.',
                    'Learn More'
                ).then(selection => {
                    if (selection === 'Learn More') {
                        vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai/library'));
                    }
                });
                return;
            }

            // Show model selection
            const modelNames = models.map(m => ({
                label: m.name,
                description: `Size: ${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB`,
                detail: `Modified: ${new Date(m.modified_at).toLocaleDateString()}`
            }));

            const selected = await vscode.window.showQuickPick(modelNames, {
                placeHolder: 'Select an Ollama model to use as default',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                // Update configuration
                const config = vscode.workspace.getConfiguration('codependent');
                await config.update('defaultModel', selected.label, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Default model set to: ${selected.label}`);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load models: ${error.message}`);
        }
    });

    const refreshMcpCommand = vscode.commands.registerCommand('codependent.refreshMcp', async () => {
        console.log('=== REFRESH MCP COMMAND TRIGGERED ===');
        try {
            if (agentModeProvider) {
                await (agentModeProvider as any).refreshAvailableTools();
                vscode.window.showInformationMessage('MCP tools refreshed successfully');
            }
        } catch (error) {
            console.error('Error refreshing MCP tools:', error);
            vscode.window.showErrorMessage('Failed to refresh MCP tools');
        }
    });

    const showMultiAgentStatusCommand = vscode.commands.registerCommand('codependent.showMultiAgentStatus', async () => {
        console.log('=== SHOW MULTI-AGENT STATUS COMMAND TRIGGERED ===');
        try {
            if (agentModeProvider) {
                const orchestrator = (agentModeProvider as any).multiAgentOrchestrator;
                if (orchestrator) {
                    const activeTasks = orchestrator.getActiveTasks();
                    const history = orchestrator.getExecutionHistory();
                    const agentStatus = orchestrator.getAgentStatus();
                    
                    let statusMessage = '🤖 **Multi-Agent System Status**\n\n';
                    
                    // Active tasks
                    statusMessage += `**Active Tasks:** ${activeTasks.length}\n`;
                    activeTasks.forEach((task: any) => {
                        statusMessage += `- ${task.description} (${task.status})\n`;
                    });
                    
                    // Agent status
                    statusMessage += '\n**Agents:**\n';
                    agentStatus.forEach((isActive: boolean, agentType: string) => {
                        statusMessage += `- ${agentType}: ${isActive ? '🟢 Active' : '⚪ Idle'}\n`;
                    });
                    
                    // Recent history
                    statusMessage += `\n**Recent Executions:** ${history.slice(-5).length}\n`;
                    history.slice(-5).forEach((result: any) => {
                        statusMessage += `- [${result.agent}] ${result.success ? '✅' : '❌'} ${result.task.description.substring(0, 50)}...\n`;
                    });
                    
                    vscode.window.showInformationMessage(statusMessage, { modal: true });
                } else {
                    vscode.window.showWarningMessage('Multi-agent orchestrator not initialized');
                }
            }
        } catch (error) {
            console.error('Error showing multi-agent status:', error);
            vscode.window.showErrorMessage('Failed to get multi-agent status');
        }
    });

    const requestCopilotModificationCommand = vscode.commands.registerCommand('codependent.requestCopilotModification', async () => {
        console.log('=== REQUEST COPILOT MODIFICATION COMMAND TRIGGERED ===');
        try {
            if (!copilotChatService.isAvailable()) {
                vscode.window.showWarningMessage('GitHub Copilot Chat extension is not available or active. Please install and activate GitHub Copilot Chat first.');
                return;
            }

            // Get user input for the request
            const userRequest = await vscode.window.showInputBox({
                prompt: 'Enter the request you want GitHub Copilot Chat to implement',
                placeHolder: 'e.g., Create a new authentication service',
                ignoreFocusOut: true
            });

            if (!userRequest) {
                return;
            }

            // Show progress indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Processing request with CoDependement agent...',
                cancellable: false
            }, async (progress) => {
                try {
                    // Step 1: Process the request with our agent system first
                    progress.report({ message: 'Processing with CoDependement agents...' });
                    
                    if (!agentModeProvider) {
                        throw new Error('Agent mode provider not initialized');
                    }

                    // Get our agent's actual response
                    const agentResponse = await (agentModeProvider as any).processRequestForCopilot(userRequest);
                    
                    // Step 2: Get project context
                    progress.report({ message: 'Gathering project context...' });
                    const projectContext = await copilotChatService.getProjectContext();

                    // Step 3: Extract modifications from agent response
                    const modifications = extractModificationsFromResponse(agentResponse);

                    // Step 4: Create the request for GitHub Copilot Chat
                    const copilotRequest = copilotChatService.createRequest(
                        userRequest,
                        projectContext,
                        agentResponse,
                        modifications
                    );

                    // Step 5: Send to GitHub Copilot Chat
                    progress.report({ message: 'Sending request to GitHub Copilot Chat...' });
                    const response = await copilotChatService.requestModification(copilotRequest);

                    if (response.success) {
                        vscode.window.showInformationMessage(
                            `Successfully sent request to GitHub Copilot Chat: ${response.response}`,
                            'View Copilot Chat'
                        ).then(selection => {
                            if (selection === 'View Copilot Chat') {
                                vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                            }
                        });
                    } else {
                        vscode.window.showErrorMessage(`Failed to send request to GitHub Copilot Chat: ${response.error}`);
                    }

                } catch (error) {
                    vscode.window.showErrorMessage(`Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            });

        } catch (error) {
            console.error('Error in requestCopilotModification:', error);
            vscode.window.showErrorMessage('Failed to process Copilot modification request');
        }
    });

    const validateConfigurationCommand = vscode.commands.registerCommand('codependent.validateConfiguration', async () => {
        console.log('=== VALIDATE CONFIGURATION COMMAND TRIGGERED ===');
        try {
            const result = configValidator.validateConfiguration();
            await configValidator.showValidationResults(result);
        } catch (error) {
            console.error('Error validating configuration:', error);
            vscode.window.showErrorMessage('Failed to validate configuration');
        }
    });

    // Register configuration change handler
    const configChangeHandler = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('codependent')) {
            ollamaService.updateConfiguration();
        }
    });

    // Add status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(comment-discussion) CoDependement";
    statusBarItem.tooltip = "Open CoDependement Chat";
    statusBarItem.command = 'codependent.openChat';
    statusBarItem.show();

    // Check Ollama availability on startup
    checkOllamaStatus();

    // Validate configuration on startup
    setTimeout(() => {
        const result = configValidator.validateConfiguration();
        if (!result.isValid) {
            vscode.window.showWarningMessage(
                'CoDependement configuration has issues that may affect performance.',
                'Validate Configuration',
                'Ignore'
            ).then(selection => {
                if (selection === 'Validate Configuration') {
                    vscode.commands.executeCommand('codependent.validateConfiguration');
                }
            });
        }
    }, 2000); // Wait 2 seconds after activation

    // Register all disposables
    context.subscriptions.push(
        openChatCommand,
        openAskModeCommand,
        openAgentModeCommand,
        testDirectoryCreationCommand,
        selectModelCommand,
        refreshMcpCommand,
        showMultiAgentStatusCommand,
        requestCopilotModificationCommand,
        validateConfigurationCommand,
        configChangeHandler,
        statusBarItem
    );

    // Show welcome message on first install
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        showWelcomeMessage();
        context.globalState.update('hasShownWelcome', true);
    }
}

async function checkOllamaStatus() {
    try {
        const isAvailable = await ollamaService.isOllamaAvailable();
        if (!isAvailable) {
            vscode.window.showWarningMessage(
                'Ollama is not running. Please start Ollama to use the chat features.',
                'Learn More',
                'Settings'
            ).then(selection => {
                if (selection === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai/'));
                } else if (selection === 'Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'codependent');
                }
            });
        }
    } catch (error) {
        console.error('Error checking Ollama status:', error);
    }
}

function showWelcomeMessage() {
    vscode.window.showInformationMessage(
        'Welcome to CoDependement! 🚀 Start chatting with your local LLM models.',
        'Open Chat',
        'Select Model',
        'Settings'
    ).then(selection => {
        switch (selection) {
            case 'Open Chat':
                vscode.commands.executeCommand('codependent.openChat');
                break;
            case 'Select Model':
                vscode.commands.executeCommand('codependent.selectModel');
                break;
            case 'Settings':
                vscode.commands.executeCommand('workbench.action.openSettings', 'codependent');
                break;
        }
    });
}

/**
 * Simulate processing a request with our agent system to get the expected response
 */
async function simulateAgentProcessing(userRequest: string): Promise<string> {
    try {
        // This simulates what our agent would do
        // In a real implementation, you might actually process the request with the agent
        
        let simulatedResponse = `CoDependement Agent Response for: "${userRequest}"\n\n`;
        
        // Analyze the request type and provide a simulated response
        const lowerRequest = userRequest.toLowerCase();
        
        if (lowerRequest.includes('create') && lowerRequest.includes('service')) {
            simulatedResponse += `I would create a service class with the following structure:
1. Create a new TypeScript service class
2. Implement proper dependency injection
3. Add error handling and logging
4. Create corresponding interfaces
5. Add unit tests
6. Update module exports`;
            
        } else if (lowerRequest.includes('implement') && lowerRequest.includes('authentication')) {
            simulatedResponse += `I would implement authentication with:
1. JWT token management
2. User authentication middleware
3. Route protection
4. Token refresh mechanisms
5. Logout functionality
6. Security best practices`;
            
        } else if (lowerRequest.includes('add') && lowerRequest.includes('api')) {
            simulatedResponse += `I would add API endpoints with:
1. RESTful route definitions
2. Request validation middleware
3. Response formatting
4. Error handling
5. API documentation
6. Integration tests`;
            
        } else if (lowerRequest.includes('create') && lowerRequest.includes('component')) {
            simulatedResponse += `I would create a component with:
1. Component class definition
2. Template/JSX structure
3. Styling (CSS/SCSS)
4. Props/state management
5. Event handlers
6. Component tests`;
            
        } else {
            simulatedResponse += `I would analyze the request and:
1. Understand the requirements
2. Plan the implementation approach
3. Create necessary files and folders
4. Implement the functionality
5. Add appropriate tests
6. Update documentation`;
        }
        
        return simulatedResponse;
        
    } catch (error) {
        console.error('Error simulating agent processing:', error);
        return `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}

/**
 * Extract specific modifications from the agent response
 */
function extractModificationsFromResponse(agentResponse: string): string[] {
    const modifications: string[] = [];
    
    // Look for numbered lists or bullet points that indicate actions
    const lines = agentResponse.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Match numbered items (1. 2. 3. etc.)
        if (/^\d+\.\s/.test(trimmedLine)) {
            modifications.push(trimmedLine.replace(/^\d+\.\s/, ''));
        }
        // Match bullet points (- * etc.)
        else if (/^[-*]\s/.test(trimmedLine)) {
            modifications.push(trimmedLine.replace(/^[-*]\s/, ''));
        }
        // Match action words at start of lines
        else if (/^(create|add|implement|update|modify|delete|remove|install|configure)\s/i.test(trimmedLine)) {
            modifications.push(trimmedLine);
        }
    }
    
    // If no specific modifications found, create generic ones based on the response
    if (modifications.length === 0) {
        modifications.push('Analyze the current project structure');
        modifications.push('Implement the requested functionality');
        modifications.push('Update existing code as needed');
        modifications.push('Add appropriate tests');
        modifications.push('Update documentation');
    }
    
    return modifications;
}

export function deactivate() {
    console.log('=== CoDependement extension DEACTIVATION ===');
    // Cleanup MCP service and other resources
    if (agentModeProvider) {
        agentModeProvider.dispose();
    }
}
