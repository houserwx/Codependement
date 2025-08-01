import * as vscode from 'vscode';
import { OllamaService } from './ollama-service';
import { AskModeChatProvider } from './ask-mode-provider';
import { AgentModeChatProvider } from './agent-mode-provider';
import { GeneralChatProvider } from './general-chat-provider';

let ollamaService: OllamaService;
let askModeProvider: AskModeChatProvider;
let agentModeProvider: AgentModeChatProvider;
let generalChatProvider: GeneralChatProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('=== CoDependement extension ACTIVATION START ===');
    console.log('Extension context:', context);
    console.log('=== CoDependement extension is now active! ===');

    // Initialize services
    ollamaService = new OllamaService();
    askModeProvider = new AskModeChatProvider(context);
    agentModeProvider = new AgentModeChatProvider(context);
    generalChatProvider = new GeneralChatProvider(context);

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

    // Register all disposables
    context.subscriptions.push(
        openChatCommand,
        openAskModeCommand,
        openAgentModeCommand,
        testDirectoryCreationCommand,
        selectModelCommand,
        refreshMcpCommand,
        showMultiAgentStatusCommand,
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

export function deactivate() {
    console.log('=== CoDependement extension DEACTIVATION ===');
    // Cleanup MCP service and other resources
    if (agentModeProvider) {
        agentModeProvider.dispose();
    }
}
