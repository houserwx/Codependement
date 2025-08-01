import * as vscode from 'vscode';
import { OllamaService, OllamaMessage } from './ollama-service';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isError?: boolean;
}

export abstract class BaseChatProvider {
    protected panel: vscode.WebviewPanel | undefined;
    protected ollamaService: OllamaService;
    protected messages: ChatMessage[] = [];
    protected currentModel: string = '';
    protected extensionContext: vscode.ExtensionContext;

    constructor(
        protected context: vscode.ExtensionContext,
        protected viewType: string,
        protected title: string
    ) {
        this.extensionContext = context;
        this.ollamaService = new OllamaService();
        this.initializeModel();
    }

    private async initializeModel() {
        try {
            const models = await this.ollamaService.getModels();
            if (models.length > 0) {
                this.currentModel = models[0].name;
            }
        } catch (error) {
            console.error('Failed to initialize model:', error);
        }
    }

    protected abstract getSystemPrompt(): string;
    protected abstract processUserMessage(message: string): Promise<void>;

    public async show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two);
            return;
        }

        // Check if Ollama is available
        const isAvailable = await this.ollamaService.isOllamaAvailable();
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

        this.panel = vscode.window.createWebviewPanel(
            this.viewType,
            this.title,
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.context.extensionUri]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        this.setupWebviewMessageHandling();

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, this.context.subscriptions);

        // Send initial model information
        this.sendMessageToWebview({
            type: 'modelUpdate',
            model: this.currentModel
        });
    }

    private setupWebviewMessageHandling() {
        if (!this.panel) {return;}

        this.panel.webview.onDidReceiveMessage(
            async (data) => {
                switch (data.type) {
                    case 'userMessage':
                        await this.handleUserMessage(data.message);
                        break;
                    case 'selectModel':
                        await this.handleModelSelection();
                        break;
                    case 'clearChat':
                        this.clearChat();
                        break;
                    case 'exportChat':
                        await this.exportChat();
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private async handleUserMessage(message: string) {
        console.log('BaseChatProvider.handleUserMessage called with:', message);
        
        if (!message.trim()) {
            console.log('Empty message, returning');
            return;
        }

        const userMessage: ChatMessage = {
            id: this.generateId(),
            role: 'user',
            content: message,
            timestamp: new Date()
        };

        this.messages.push(userMessage);
        this.sendMessageToWebview({
            type: 'message',
            message: userMessage
        });

        try {
            await this.processUserMessage(message);
        } catch (error: any) {
            const errorMessage: ChatMessage = {
                id: this.generateId(),
                role: 'assistant',
                content: `Error: ${error.message}`,
                timestamp: new Date(),
                isError: true
            };

            this.messages.push(errorMessage);
            this.sendMessageToWebview({
                type: 'message',
                message: errorMessage
            });
        }
    }

    protected async sendAssistantMessage(content: string) {
        const assistantMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: content,
            timestamp: new Date()
        };

        this.messages.push(assistantMessage);
        this.sendMessageToWebview({
            type: 'message',
            message: assistantMessage
        });
    }

    private async handleModelSelection() {
        try {
            const models = await this.ollamaService.getModels();
            const modelNames = models.map(m => m.name);
            
            const selected = await vscode.window.showQuickPick(modelNames, {
                placeHolder: 'Select an Ollama model'
            });

            if (selected) {
                this.currentModel = selected;
                this.sendMessageToWebview({
                    type: 'modelUpdate',
                    model: this.currentModel
                });
                vscode.window.showInformationMessage(`Model changed to: ${selected}`);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load models: ${error.message}`);
        }
    }

    private clearChat() {
        this.messages = [];
        this.sendMessageToWebview({
            type: 'clearChat'
        });
    }

    private async exportChat() {
        if (this.messages.length === 0) {
            vscode.window.showInformationMessage('No messages to export');
            return;
        }

        const exportContent = this.messages.map(msg => 
            `[${msg.timestamp.toLocaleString()}] ${msg.role.toUpperCase()}: ${msg.content}`
        ).join('\\n\\n');

        const doc = await vscode.workspace.openTextDocument({
            content: exportContent,
            language: 'markdown'
        });

        await vscode.window.showTextDocument(doc);
    }

    protected sendMessageToWebview(data: any) {
        if (this.panel) {
            this.panel.webview.postMessage(data);
        }
    }

    protected generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    protected convertToOllamaMessages(): OllamaMessage[] {
        const systemPrompt = this.getSystemPrompt();
        const messages: OllamaMessage[] = [];
        
        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        // Add conversation messages (excluding error messages)
        this.messages
            .filter(msg => !msg.isError)
            .forEach(msg => {
                messages.push({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                });
            });

        return messages;
    }

    protected getWebviewContent(): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${this.title}</title>
            <style>
                * {
                    box-sizing: border-box;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                    margin: 0;
                    padding: 0;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }

                .header {
                    padding: 10px 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: var(--vscode-titleBar-activeBackground);
                }

                .model-info {
                    font-size: 14px;
                    color: var(--vscode-descriptionForeground);
                }

                .controls {
                    display: flex;
                    gap: 10px;
                }

                .btn {
                    padding: 4px 8px;
                    border: 1px solid var(--vscode-button-border);
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    border-radius: 2px;
                    font-size: 12px;
                }

                .btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }

                .chat-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .message {
                    max-width: 80%;
                    padding: 12px 16px;
                    border-radius: 8px;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                }

                .message.user {
                    align-self: flex-end;
                    background-color: var(--vscode-inputValidation-infoBorder);
                    color: var(--vscode-input-foreground);
                }

                .message.assistant {
                    align-self: flex-start;
                    background-color: var(--vscode-editor-selectionBackground);
                    border: 1px solid var(--vscode-panel-border);
                }

                .message.error {
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    color: var(--vscode-errorForeground);
                }

                .message-meta {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }

                .input-container {
                    padding: 20px;
                    border-top: 1px solid var(--vscode-panel-border);
                    display: flex;
                    gap: 10px;
                    background-color: var(--vscode-editor-background);
                }

                .input-field {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 2px;
                    font-family: inherit;
                    font-size: 14px;
                    resize: vertical;
                    min-height: 20px;
                    max-height: 100px;
                }

                .input-field:focus {
                    outline: 1px solid var(--vscode-focusBorder);
                    border-color: var(--vscode-focusBorder);
                }

                .send-btn {
                    padding: 8px 16px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-size: 14px;
                }

                .send-btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }

                .send-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .loading {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid var(--vscode-panel-border);
                    border-top: 2px solid var(--vscode-progressBar-background);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .empty-state {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    color: var(--vscode-descriptionForeground);
                    text-align: center;
                    gap: 10px;
                }

                .welcome-message {
                    font-size: 18px;
                    margin-bottom: 10px;
                }

                .quick-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 20px;
                }

                .quick-action {
                    padding: 6px 12px;
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-border);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .quick-action:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="model-info">
                    Model: <span id="current-model">Loading...</span>
                </div>
                <div class="controls">
                    <button class="btn" onclick="selectModel()">Change Model</button>
                    <button class="btn" onclick="clearChat()">Clear</button>
                    <button class="btn" onclick="exportChat()">Export</button>
                </div>
            </div>

            <div class="chat-container" id="chat-container">
                <div class="empty-state" id="empty-state">
                    <div class="welcome-message">Welcome to ${this.title}</div>
                    <div>Start a conversation by typing a message below</div>
                    <div class="quick-actions">
                        ${this.getQuickActions()}
                    </div>
                </div>
            </div>

            <div class="input-container">
                <textarea 
                    class="input-field" 
                    id="message-input" 
                    placeholder="Type your message here..."
                    rows="1"
                ></textarea>
                <button class="send-btn" id="send-btn" onclick="sendMessage()">Send</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let isLoading = false;

                // Auto-resize textarea
                const messageInput = document.getElementById('message-input');
                messageInput.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
                });

                // Send message on Enter (but allow Shift+Enter for new lines)
                messageInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });

                function sendMessage() {
                    const input = document.getElementById('message-input');
                    const message = input.value.trim();
                    
                    if (!message || isLoading) return;
                    
                    input.value = '';
                    input.style.height = 'auto';
                    setLoading(true);
                    
                    vscode.postMessage({
                        type: 'userMessage',
                        message: message
                    });
                }

                function selectModel() {
                    vscode.postMessage({ type: 'selectModel' });
                }

                function clearChat() {
                    vscode.postMessage({ type: 'clearChat' });
                }

                function exportChat() {
                    vscode.postMessage({ type: 'exportChat' });
                }

                function setLoading(loading) {
                    isLoading = loading;
                    const sendBtn = document.getElementById('send-btn');
                    const input = document.getElementById('message-input');
                    
                    sendBtn.disabled = loading;
                    input.disabled = loading;
                    
                    if (loading) {
                        sendBtn.innerHTML = '<div class="spinner"></div>';
                    } else {
                        sendBtn.innerHTML = 'Send';
                    }
                }

                function addMessage(message) {
                    const chatContainer = document.getElementById('chat-container');
                    const emptyState = document.getElementById('empty-state');
                    
                    if (emptyState) {
                        emptyState.remove();
                    }
                    
                    const messageDiv = document.createElement('div');
                    messageDiv.className = \`message \${message.role}\${message.isError ? ' error' : ''}\`;
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.textContent = message.content;
                    messageDiv.appendChild(contentDiv);
                    
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'message-meta';
                    metaDiv.textContent = new Date(message.timestamp).toLocaleTimeString();
                    messageDiv.appendChild(metaDiv);
                    
                    chatContainer.appendChild(messageDiv);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }

                function updateModel(model) {
                    document.getElementById('current-model').textContent = model;
                }

                function clearChatUI() {
                    const chatContainer = document.getElementById('chat-container');
                    chatContainer.innerHTML = \`
                        <div class="empty-state" id="empty-state">
                            <div class="welcome-message">Welcome to ${this.title}</div>
                            <div>Start a conversation by typing a message below</div>
                            <div class="quick-actions">
                                ${this.getQuickActions()}
                            </div>
                        </div>
                    \`;
                }

                function handleQuickAction(action) {
                    const input = document.getElementById('message-input');
                    input.value = action;
                    input.focus();
                    input.style.height = 'auto';
                    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
                }

                // Handle messages from extension
                window.addEventListener('message', event => {
                    const data = event.data;
                    
                    switch (data.type) {
                        case 'message':
                            addMessage(data.message);
                            if (data.message.role === 'assistant') {
                                setLoading(false);
                            }
                            break;
                        case 'modelUpdate':
                            updateModel(data.model);
                            break;
                        case 'clearChat':
                            clearChatUI();
                            break;
                    }
                });

                // Focus input on load
                window.addEventListener('load', () => {
                    document.getElementById('message-input').focus();
                });
            </script>
        </body>
        </html>
        `;
    }

    protected getQuickActions(): string {
        return '';
    }
}
