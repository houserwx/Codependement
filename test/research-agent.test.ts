/**
 * Test file to verify the research agent functionality
 */

import { ResearchAgent } from '../src/agents/research-agent';
import { McpService } from '../src/mcp-service';
import { AgentType, Task } from '../src/agents/types';

// Mock MCP service for testing
class MockMcpService extends McpService {
    getConnectedServers(): string[] {
        return ['filesystem', 'web-search'];
    }

    getAllTools() {
        return [
            {
                server: 'filesystem',
                tool: {
                    name: 'read_file',
                    description: 'Read a file from the filesystem',
                    inputSchema: { type: 'object', properties: { path: { type: 'string' } } }
                }
            },
            {
                server: 'web-search',
                tool: {
                    name: 'search',
                    description: 'Search the web for information',
                    inputSchema: { type: 'object', properties: { query: { type: 'string' } } }
                }
            }
        ];
    }

    getAllResources() {
        return [
            {
                server: 'filesystem',
                resource: {
                    uri: 'file:///README.md',
                    name: 'README.md',
                    mimeType: 'text/markdown'
                }
            }
        ];
    }

    async callTool(server: string, toolName: string, args: any): Promise<any> {
        // Mock tool call responses
        if (toolName === 'read_file' && args.path === 'package.json') {
            return JSON.stringify({
                name: 'test-project',
                version: '1.0.0',
                description: 'A test project for research agent'
            }, null, 2);
        }
        
        if (toolName === 'search') {
            return {
                results: [
                    {
                        title: 'TypeScript Best Practices',
                        url: 'https://example.com/typescript-best-practices',
                        snippet: 'Follow these patterns for better TypeScript code...'
                    }
                ]
            };
        }

        return { message: 'Mock response for testing' };
    }

    async readResource(server: string, uri: string): Promise<any> {
        if (uri === 'file:///README.md') {
            return '# Test Project\n\nThis is a test project for research agent functionality.';
        }
        return 'Mock resource content';
    }
}

async function testResearchAgent() {
    console.log('🔬 Testing Research Agent Functionality');
    console.log('=====================================');

    const mockMcpService = new MockMcpService();
    const researchAgent = new ResearchAgent(mockMcpService);

    // Test 1: Basic research task
    console.log('\n📋 Test 1: Basic Implementation Research');
    const implementationTask: Task = {
        id: 'test-1',
        description: 'implement a new TypeScript class with error handling',
        status: 'pending',
        createdAt: new Date(),
        assignedTo: AgentType.RESEARCHER,
        subtasks: [],
        result: '',
        priority: 'high'
    };

    try {
        const result1 = await researchAgent.processTask(implementationTask);
        console.log('✅ Implementation research completed');
        console.log('Result preview:', result1.substring(0, 200) + '...');
    } catch (error) {
        console.error('❌ Implementation research failed:', error);
    }

    // Test 2: Support for specific agent
    console.log('\n🤖 Test 2: Agent-Specific Research Support');
    const debugTask: Task = {
        id: 'test-2',
        description: 'fix memory leak in JavaScript application',
        status: 'pending',
        createdAt: new Date(),
        assignedTo: AgentType.DEBUGGER,
        subtasks: [],
        result: '',
        priority: 'high'
    };

    try {
        const result2 = await researchAgent.supportAgent(AgentType.DEBUGGER, debugTask);
        console.log('✅ Debugger support research completed');
        console.log('Result preview:', result2.substring(0, 200) + '...');
    } catch (error) {
        console.error('❌ Debugger support research failed:', error);
    }

    // Test 3: Cache functionality
    console.log('\n💾 Test 3: Research Cache Test');
    const cachedResult = researchAgent.getCachedResearch('code examples');
    console.log('Cached result found:', cachedResult ? '✅ Yes' : '❌ No');

    // Test 4: Clear cache
    console.log('\n🧹 Test 4: Cache Management');
    researchAgent.clearCache();
    const clearedCache = researchAgent.getCachedResearch('code examples');
    console.log('Cache cleared successfully:', !clearedCache ? '✅ Yes' : '❌ No');

    console.log('\n🎉 Research Agent Testing Complete!');
}

// Run the test if this file is executed directly
if (require.main === module) {
    testResearchAgent().catch(console.error);
}

export { testResearchAgent };
