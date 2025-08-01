import * as vscode from 'vscode';
import { BaseChatProvider } from './base-chat-provider';

export class GeneralChatProvider extends BaseChatProvider {
    private mode: 'ask' | 'agent' = 'ask';

    constructor(context: vscode.ExtensionContext) {
        super(context, 'ollama-general-chat', 'Ollama Chat');
    }

    protected getSystemPrompt(): string {
        if (this.mode === 'agent') {
            return `You are an advanced AI coding assistant with access to file operations and workspace management capabilities.
You can help with code analysis, debugging, refactoring, and development tasks. Be proactive and suggest improvements.
When you need to perform file operations or workspace analysis, describe what you would do step by step.`;
        } else {
            return `You are a helpful AI assistant. Provide clear, concise, and accurate answers to user questions.
Be friendly and professional. If unsure about something, say so rather than guessing.`;
        }
    }

    protected async processUserMessage(message: string): Promise<void> {
        // Auto-detect if user wants agent mode based on message content
        const agentKeywords = [
            'file', 'code', 'project', 'workspace', 'analyze', 'refactor', 
            'debug', 'test', 'review', 'implement', 'create', 'search'
        ];
        
        const hasAgentKeywords = agentKeywords.some(keyword => 
            message.toLowerCase().includes(keyword)
        );

        if (hasAgentKeywords && this.mode === 'ask') {
            this.mode = 'agent';
            await this.sendAssistantMessage(
                '🔧 Switching to Agent Mode for development tasks...'
            );
        }

        const ollamaMessages = this.convertToOllamaMessages();
        
        try {
            const response = await this.ollamaService.chat(ollamaMessages, this.currentModel);
            await this.sendAssistantMessage(response);
        } catch (error: any) {
            throw new Error(`Failed to get response: ${error.message}`);
        }
    }

    protected getQuickActions(): string {
        if (this.mode === 'agent') {
            return `
                <div class="quick-action" onclick="handleQuickAction('Analyze the current project structure')">Analyze Project</div>
                <div class="quick-action" onclick="handleQuickAction('Review the code in the current file')">Review Code</div>
                <div class="quick-action" onclick="handleQuickAction('Generate unit tests')">Generate Tests</div>
                <div class="quick-action" onclick="handleQuickAction('Refactor selected code')">Refactor Code</div>
                <div class="quick-action" onclick="switchToAskMode()">Switch to Ask Mode</div>
            `;
        } else {
            return `
                <div class="quick-action" onclick="handleQuickAction('Explain this concept')">Explain Concept</div>
                <div class="quick-action" onclick="handleQuickAction('How do I...')">How-to Question</div>
                <div class="quick-action" onclick="handleQuickAction('Best practices for...')">Best Practices</div>
                <div class="quick-action" onclick="handleQuickAction('Debug this error:')">Debug Help</div>
                <div class="quick-action" onclick="switchToAgentMode()">Switch to Agent Mode</div>
            `;
        }
    }

    // Override the webview content to include mode switching
    protected getWebviewContent(): string {
        const baseContent = super.getWebviewContent();
        
        // Add mode switching functions to the script
        const additionalScript = `
            function switchToAgentMode() {
                vscode.postMessage({ type: 'switchMode', mode: 'agent' });
            }

            function switchToAskMode() {
                vscode.postMessage({ type: 'switchMode', mode: 'ask' });
            }
        `;

        return baseContent.replace('</script>', additionalScript + '</script>');
    }

    // Override setupWebviewMessageHandling to handle mode switching
    public async show() {
        await super.show();
        
        // Add additional message handling for mode switching
        if (this.panel) {
            this.panel.webview.onDidReceiveMessage(
                async (data) => {
                    if (data.type === 'switchMode') {
                        this.mode = data.mode;
                        await this.sendAssistantMessage(
                            `🔄 Switched to ${data.mode === 'agent' ? 'Agent' : 'Ask'} Mode`
                        );
                    }
                },
                undefined,
                this.extensionContext.subscriptions
            );
        }
    }
}
