import axios, { AxiosResponse } from 'axios';
import * as vscode from 'vscode';

export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface OllamaResponse {
    model: string;
    message: OllamaMessage;
    done: boolean;
    created_at: string;
    response?: string;
}

export interface OllamaModel {
    name: string;
    modified_at: string;
    digest: string;
    size: number;
}

export class OllamaService {
    private baseUrl: string;
    private timeout: number = 30000;

    constructor() {
        this.baseUrl = this.getBaseUrl();
    }

    private getBaseUrl(): string {
        const config = vscode.workspace.getConfiguration('codependent');
        return config.get<string>('baseUrl', 'http://localhost:11434');
    }

    private getDefaultModel(): string {
        const config = vscode.workspace.getConfiguration('codependent');
        return config.get<string>('defaultModel', 'llama2');
    }

    private getTemperature(): number {
        const config = vscode.workspace.getConfiguration('codependent');
        return config.get<number>('temperature', 0.7);
    }

    private getMaxTokens(): number {
        const config = vscode.workspace.getConfiguration('codependent');
        return config.get<number>('maxTokens', 2048);
    }

    async isOllamaAvailable(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/version`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            console.error('Ollama not available:', error);
            return false;
        }
    }

    async getModels(): Promise<OllamaModel[]> {
        try {
            const response: AxiosResponse<{ models: OllamaModel[] }> = await axios.get(
                `${this.baseUrl}/api/tags`,
                { timeout: this.timeout }
            );
            return response.data.models || [];
        } catch (error) {
            console.error('Error fetching models:', error);
            throw new Error('Failed to fetch Ollama models. Make sure Ollama is running.');
        }
    }

    async chat(messages: OllamaMessage[], model?: string): Promise<string> {
        const selectedModel = model || this.getDefaultModel();
        
        try {
            const response: AxiosResponse<OllamaResponse> = await axios.post(
                `${this.baseUrl}/api/chat`,
                {
                    model: selectedModel,
                    messages: messages,
                    stream: false,
                    options: {
                        temperature: this.getTemperature(),
                        num_predict: this.getMaxTokens()
                    }
                },
                { timeout: this.timeout }
            );

            return response.data.message.content;
        } catch (error: any) {
            console.error('Error during chat:', error);
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Ollama. Make sure Ollama is running on ' + this.baseUrl);
            }
            throw new Error(`Chat request failed: ${error.message}`);
        }
    }

    async generate(prompt: string, model?: string): Promise<string> {
        const selectedModel = model || this.getDefaultModel();
        
        try {
            const response: AxiosResponse<OllamaResponse> = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: this.getTemperature(),
                        num_predict: this.getMaxTokens()
                    }
                },
                { timeout: this.timeout }
            );

            return response.data.response || '';
        } catch (error: any) {
            console.error('Error during generation:', error);
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Ollama. Make sure Ollama is running on ' + this.baseUrl);
            }
            throw new Error(`Generation request failed: ${error.message}`);
        }
    }

    updateConfiguration() {
        this.baseUrl = this.getBaseUrl();
    }
}
