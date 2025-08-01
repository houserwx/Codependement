import * as vscode from 'vscode';

export interface CopilotChatRequest {
    originalRequest: string;
    projectContext: string;
    expectedResponse: string;
    modifications: string[];
}

export interface CopilotChatResponse {
    success: boolean;
    response?: string;
    error?: string;
}

/**
 * Service to interact with GitHub Copilot Chat extension
 * This service requests that GitHub Copilot Chat modify the current project
 * to achieve the same results as our agent system would produce.
 */
export class CopilotChatService {
    private static readonly COPILOT_EXTENSION_ID = 'GitHub.copilot-chat';
    private static readonly COPILOT_COMMAND = 'github.copilot.interactiveEditor.explain';

    /**
     * Check if GitHub Copilot Chat extension is available
     */
    public isAvailable(): boolean {
        const copilotExtension = vscode.extensions.getExtension(CopilotChatService.COPILOT_EXTENSION_ID);
        return copilotExtension !== undefined && copilotExtension.isActive;
    }

    /**
     * Request GitHub Copilot Chat to modify the current project
     * to achieve the same results as our agent would produce
     */
    public async requestModification(request: CopilotChatRequest): Promise<CopilotChatResponse> {
        try {
            if (!this.isAvailable()) {
                return {
                    success: false,
                    error: 'GitHub Copilot Chat extension is not available or active'
                };
            }

            // Construct the request message for GitHub Copilot Chat
            const copilotMessage = this.constructCopilotMessage(request);

            // Try to interact with GitHub Copilot Chat
            const response = await this.sendToCopilotChat(copilotMessage);

            return {
                success: true,
                response: response
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Construct a message for GitHub Copilot Chat that requests it to modify
     * the current project to achieve the same results as our agent
     */
    private constructCopilotMessage(request: CopilotChatRequest): string {
        return `I have an AI agent system that processed the following user request and produced specific results. I need you to create a solution to the user request, and modify the current project code so that the agent achieves the same outcome.  Iteratively modify the agent, install the extension, and repeat the request until the result is the same as your solution.

**Original User Request:**
${request.originalRequest}

**Current Project Context:**
${request.projectContext}

**Expected Response/Outcome:**
${request.expectedResponse}

**Specific Modifications Needed:**
${request.modifications.map((mod, index) => `${index + 1}. ${mod}`).join('\n')}

**Instructions for GitHub Copilot:**
Please analyze the current project structure and modify the code to implement the changes described above. The goal is to achieve the same functionality and results that our agent system would produce. 

Focus on:
1. Understanding the existing code architecture
2. Making the necessary modifications to match the expected outcome
3. Ensuring code quality and consistency with existing patterns
4. Testing that the changes work as intended

Please proceed with implementing these modifications step by step, explaining each change you make.`;
    }

    /**
     * Send message to GitHub Copilot Chat
     */
    private async sendToCopilotChat(message: string): Promise<string> {
        try {
            // Method 1: Try to use the Copilot Chat API if available
            const copilotApi = await this.getCopilotChatApi();
            if (copilotApi) {
                return await copilotApi.sendMessage(message);
            }

            // Method 2: Use VS Code commands to interact with Copilot Chat
            await this.openCopilotChatWithMessage(message);
            return 'Message sent to GitHub Copilot Chat. Please check the Copilot Chat panel for the response.';

        } catch (error) {
            throw new Error(`Failed to communicate with GitHub Copilot Chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get GitHub Copilot Chat API if available
     */
    private async getCopilotChatApi(): Promise<any> {
        try {
            const copilotExtension = vscode.extensions.getExtension(CopilotChatService.COPILOT_EXTENSION_ID);
            if (!copilotExtension) {
                return null;
            }

            if (!copilotExtension.isActive) {
                await copilotExtension.activate();
            }

            // Check if the extension exports a chat API
            const api = copilotExtension.exports;
            if (api && api.chat) {
                return api.chat;
            }

            return null;

        } catch (error) {
            console.warn('Could not access Copilot Chat API:', error);
            return null;
        }
    }

    /**
     * Open GitHub Copilot Chat with a pre-filled message
     */
    private async openCopilotChatWithMessage(message: string): Promise<void> {
        try {
            // Try different commands that might open Copilot Chat
            const possibleCommands = [
                'github.copilot.chat.open',
                'github.copilot.openChat',
                'workbench.panel.chat.view.copilot.focus',
                'github.copilot.generate'
            ];

            for (const command of possibleCommands) {
                try {
                    await vscode.commands.executeCommand(command);
                    // If the command succeeds, try to insert the message
                    await this.insertMessageToCopilotChat(message);
                    return;
                } catch (error) {
                    // Continue to next command if this one fails
                    continue;
                }
            }

            // If none of the commands work, show the message to the user
            const action = await vscode.window.showInformationMessage(
                'Please open GitHub Copilot Chat manually and paste the following message:',
                'Copy Message',
                'Open Copilot Chat'
            );

            if (action === 'Copy Message') {
                await vscode.env.clipboard.writeText(message);
                vscode.window.showInformationMessage('Message copied to clipboard');
            } else if (action === 'Open Copilot Chat') {
                // Try to open command palette with copilot search
                await vscode.commands.executeCommand('workbench.action.quickOpen', '>GitHub Copilot');
            }

        } catch (error) {
            throw new Error(`Failed to open Copilot Chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Attempt to insert message into Copilot Chat input
     */
    private async insertMessageToCopilotChat(message: string): Promise<void> {
        try {
            // This is a best-effort attempt to insert text
            // The actual implementation depends on Copilot Chat's API
            
            // Try to use clipboard as a fallback
            await vscode.env.clipboard.writeText(message);
            
            // Simulate Ctrl+V to paste the message
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            
        } catch (error) {
            // Silently fail - the message will be shown to the user instead
            console.warn('Could not insert message to Copilot Chat:', error);
        }
    }

    /**
     * Create a request object from agent response data
     */
    public createRequest(
        originalRequest: string,
        projectContext: string,
        agentResponse: string,
        modifications: string[]
    ): CopilotChatRequest {
        return {
            originalRequest,
            projectContext,
            expectedResponse: agentResponse,
            modifications
        };
    }

    /**
     * Extract project context information
     */
    public async getProjectContext(): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return 'No workspace is currently open.';
        }

        const folder = workspaceFolders[0];
        let context = `Project: ${folder.name}\nPath: ${folder.uri.fsPath}\n\n`;

        // Get open files
        const openFiles = vscode.window.tabGroups.all.flatMap(group => 
            group.tabs.filter(tab => tab.input instanceof vscode.TabInputText)
                .map(tab => (tab.input as vscode.TabInputText).uri.fsPath)
        );

        if (openFiles.length > 0) {
            context += `Currently Open Files:\n${openFiles.map(file => 
                vscode.workspace.asRelativePath(file)
            ).join('\n')}\n\n`;
        }

        // Get active editor content if available
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const relativePath = vscode.workspace.asRelativePath(activeEditor.document.uri);
            context += `Active File: ${relativePath}\n`;
            
            // Get selected text if any
            const selection = activeEditor.selection;
            if (!selection.isEmpty) {
                const selectedText = activeEditor.document.getText(selection);
                context += `Selected Code:\n\`\`\`\n${selectedText}\n\`\`\`\n\n`;
            }
        }

        return context;
    }
}
