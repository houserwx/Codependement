import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

export interface McpServer {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
}

export interface McpTool {
    name: string;
    description: string;
    inputSchema: any;
}

export interface McpResource {
    uri: string;
    name: string;
    mimeType?: string;
}

// Simplified MCP Service that focuses on process management and communication
export class McpService {
    private processes: Map<string, ChildProcess> = new Map();
    private availableTools: Map<string, McpTool[]> = new Map();
    private availableResources: Map<string, McpResource[]> = new Map();

    constructor() {
        this.initializeFromConfig();
    }

    private async initializeFromConfig() {
        const config = vscode.workspace.getConfiguration('codependent');
        const mcpEnabled = config.get<boolean>('enableMcp', true);
        
        if (!mcpEnabled) {
            console.log('MCP integration is disabled');
            return;
        }

        const servers = config.get<McpServer[]>('mcpServers', []);
        
        // Add some default MCP servers if none configured
        if (servers.length === 0) {
            await this.discoverMcpServers();
        } else {
            for (const server of servers) {
                await this.connectToServer(server);
            }
        }
    }

    private async discoverMcpServers(): Promise<void> {
        console.log('Discovering MCP servers...');
        
        // Try to discover common MCP servers
        const commonServers: McpServer[] = [
            {
                name: 'filesystem',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()]
            }
        ];

        for (const server of commonServers) {
            try {
                await this.connectToServer(server);
            } catch (error) {
                console.log(`Failed to connect to ${server.name} MCP server:`, error);
            }
        }
    }

    private async connectToServer(server: McpServer): Promise<void> {
        try {
            console.log(`Connecting to MCP server: ${server.name}`);
            
            // Spawn the server process
            const childProcess: ChildProcess = spawn(server.command, server.args || [], {
                env: { ...process.env, ...server.env },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.processes.set(server.name, childProcess);

            // Set up error handling
            childProcess.on('error', (error) => {
                console.error(`MCP server ${server.name} error:`, error);
            });

            childProcess.on('exit', (code) => {
                console.log(`MCP server ${server.name} exited with code ${code}`);
                this.processes.delete(server.name);
            });

            // Initialize with some mock capabilities for now
            this.availableTools.set(server.name, [
                {
                    name: 'read_file',
                    description: 'Read a file from the filesystem',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string' }
                        }
                    }
                },
                {
                    name: 'write_file',
                    description: 'Write content to a file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string' },
                            content: { type: 'string' }
                        }
                    }
                }
            ]);

            console.log(`Successfully connected to MCP server: ${server.name}`);
        } catch (error) {
            console.error(`Failed to connect to MCP server ${server.name}:`, error);
            throw error;
        }
    }

    public async callTool(serverName: string, toolName: string, args: any): Promise<any> {
        const childProcess = this.processes.get(serverName);
        if (!childProcess) {
            throw new Error(`MCP server ${serverName} not connected`);
        }

        try {
            // Send JSON-RPC message to the MCP server
            const message = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args
                }
            };

            return new Promise((resolve, reject) => {
                const messageStr = JSON.stringify(message) + '\n';
                
                if (childProcess.stdin) {
                    childProcess.stdin.write(messageStr);
                }

                // Listen for response
                const timeout = setTimeout(() => {
                    reject(new Error(`Timeout waiting for response from ${serverName}`));
                }, 5000);

                if (childProcess.stdout) {
                    childProcess.stdout.once('data', (data) => {
                        clearTimeout(timeout);
                        try {
                            const response = JSON.parse(data.toString());
                            resolve(response.result);
                        } catch (error) {
                            reject(new Error(`Invalid response from ${serverName}: ${error}`));
                        }
                    });
                }
            });
        } catch (error) {
            console.error(`Error calling tool ${toolName} on server ${serverName}:`, error);
            throw error;
        }
    }

    public async readResource(serverName: string, uri: string): Promise<any> {
        const childProcess = this.processes.get(serverName);
        if (!childProcess) {
            throw new Error(`MCP server ${serverName} not connected`);
        }

        try {
            const message = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'resources/read',
                params: { uri }
            };

            return new Promise((resolve, reject) => {
                const messageStr = JSON.stringify(message) + '\n';
                
                if (childProcess.stdin) {
                    childProcess.stdin.write(messageStr);
                }

                const timeout = setTimeout(() => {
                    reject(new Error(`Timeout waiting for resource from ${serverName}`));
                }, 5000);

                if (childProcess.stdout) {
                    childProcess.stdout.once('data', (data) => {
                        clearTimeout(timeout);
                        try {
                            const response = JSON.parse(data.toString());
                            resolve(response.result);
                        } catch (error) {
                            reject(new Error(`Invalid response from ${serverName}: ${error}`));
                        }
                    });
                }
            });
        } catch (error) {
            console.error(`Error reading resource ${uri} from server ${serverName}:`, error);
            throw error;
        }
    }

    public getAllTools(): Array<{ server: string; tool: McpTool }> {
        const allTools: Array<{ server: string; tool: McpTool }> = [];
        
        for (const [serverName, tools] of this.availableTools.entries()) {
            for (const tool of tools) {
                allTools.push({ server: serverName, tool });
            }
        }
        
        return allTools;
    }

    public getAllResources(): Array<{ server: string; resource: McpResource }> {
        const allResources: Array<{ server: string; resource: McpResource }> = [];
        
        for (const [serverName, resources] of this.availableResources.entries()) {
            for (const resource of resources) {
                allResources.push({ server: serverName, resource });
            }
        }
        
        return allResources;
    }

    public getConnectedServers(): string[] {
        return Array.from(this.processes.keys());
    }

    public async disconnect(): Promise<void> {
        // Kill all server processes
        for (const [serverName, childProcess] of this.processes.entries()) {
            try {
                childProcess.kill();
            } catch (error) {
                console.error(`Error killing process for ${serverName}:`, error);
            }
        }

        this.processes.clear();
        this.availableTools.clear();
        this.availableResources.clear();
    }

    public isServerConnected(serverName: string): boolean {
        return this.processes.has(serverName);
    }

    public async refreshAllCapabilities(): Promise<void> {
        // For now, just log that we're refreshing
        console.log('Refreshing MCP server capabilities...');
    }
}
