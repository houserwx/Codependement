import * as vscode from 'vscode';
import { BaseChatProvider } from './base-chat-provider';

export class AskModeChatProvider extends BaseChatProvider {
    constructor(context: vscode.ExtensionContext) {
        super(context, 'ollama-ask-mode', 'Ollama Ask Mode');
    }

    protected getSystemPrompt(): string {
        return `You are a helpful AI assistant. You provide clear, concise, and accurate answers to user questions. 
You should be friendly and professional in your responses. If you're unsure about something, say so rather than guessing.`;
    }

    protected async processUserMessage(message: string): Promise<void> {
        const ollamaMessages = this.convertToOllamaMessages();
        
        try {
            const response = await this.ollamaService.chat(ollamaMessages, this.currentModel);
            await this.sendAssistantMessage(response);
        } catch (error: any) {
            throw new Error(`Failed to get response: ${error.message}`);
        }
    }

    protected getQuickActions(): string {
        return `
            <div class="quick-action" onclick="handleQuickAction('Explain this code snippet')">Explain Code</div>
            <div class="quick-action" onclick="handleQuickAction('How do I...')">How-to Question</div>
            <div class="quick-action" onclick="handleQuickAction('What is the difference between...')">Compare Concepts</div>
            <div class="quick-action" onclick="handleQuickAction('Debug this error:')">Debug Help</div>
            <div class="quick-action" onclick="handleQuickAction('Best practices for...')">Best Practices</div>
        `;
    }
}
