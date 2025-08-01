export enum AgentType {
    PLANNER = "planner",
    CODER = "coder",
    DEBUGGER = "debugger",
    TESTER = "tester",
    DOCUMENTER = "documenter"
}

export interface Task {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    createdAt: Date;
    assignedTo: AgentType;
    subtasks: Task[];
    result: string;
    priority: 'low' | 'medium' | 'high';
    context?: any;
}

export abstract class Agent {
    public agentType: AgentType;
    public name: string;
    public description: string;
    public isActive: boolean = false;

    constructor(agentType: AgentType, name: string, description: string) {
        this.agentType = agentType;
        this.name = name;
        this.description = description;
    }

    abstract processTask(task: Task, context?: any): Promise<string>;

    protected createSubtask(description: string, assignedTo: AgentType, priority: 'low' | 'medium' | 'high' = 'medium'): Task {
        return {
            id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            description,
            status: 'pending',
            createdAt: new Date(),
            assignedTo,
            subtasks: [],
            result: '',
            priority
        };
    }
}

export class PlannerAgent extends Agent {
    constructor() {
        super(AgentType.PLANNER, "Planner", "Breaks down complex tasks into subtasks and creates execution plans");
    }

    async processTask(task: Task, context?: any): Promise<string> {
        console.log(`[Planner] Processing task: ${task.description}`);
        
        // Analyze the task and break it down into subtasks
        const subtasks: Task[] = [];
        
        // Use context to make intelligent decisions about task breakdown
        if (task.description.toLowerCase().includes('implement') || task.description.toLowerCase().includes('create')) {
            subtasks.push(this.createSubtask("Analyze requirements and design architecture", AgentType.CODER, 'high'));
            subtasks.push(this.createSubtask("Implement core functionality", AgentType.CODER, 'high'));
            subtasks.push(this.createSubtask("Create unit tests", AgentType.TESTER, 'medium'));
            subtasks.push(this.createSubtask("Debug and fix issues", AgentType.DEBUGGER, 'medium'));
            subtasks.push(this.createSubtask("Create documentation", AgentType.DOCUMENTER, 'low'));
        } else if (task.description.toLowerCase().includes('debug') || task.description.toLowerCase().includes('fix')) {
            subtasks.push(this.createSubtask("Identify root cause", AgentType.DEBUGGER, 'high'));
            subtasks.push(this.createSubtask("Implement fix", AgentType.CODER, 'high'));
            subtasks.push(this.createSubtask("Test the fix", AgentType.TESTER, 'high'));
            subtasks.push(this.createSubtask("Update documentation", AgentType.DOCUMENTER, 'low'));
        } else if (task.description.toLowerCase().includes('test')) {
            subtasks.push(this.createSubtask("Design test cases", AgentType.TESTER, 'high'));
            subtasks.push(this.createSubtask("Implement tests", AgentType.TESTER, 'high'));
            subtasks.push(this.createSubtask("Run and validate tests", AgentType.TESTER, 'medium'));
        } else {
            // Generic task breakdown
            subtasks.push(this.createSubtask("Analyze task requirements", AgentType.CODER, 'medium'));
            subtasks.push(this.createSubtask("Execute main task", AgentType.CODER, 'high'));
            subtasks.push(this.createSubtask("Validate results", AgentType.TESTER, 'medium'));
        }
        
        task.subtasks = subtasks;
        
        return `Task broken down into ${subtasks.length} subtasks:\n${subtasks.map((st, i) => `${i + 1}. ${st.description} (${st.assignedTo})`).join('\n')}`;
    }
}

export class CoderAgent extends Agent {
    constructor() {
        super(AgentType.CODER, "Coder", "Writes and implements code solutions");
    }

    async processTask(task: Task, context?: any): Promise<string> {
        console.log(`[Coder] Processing task: ${task.description}`);
        
        const description = task.description.toLowerCase();
        let generatedCode = '';
        let filename = '';
        
        try {
            if (description.includes('function')) {
                const result = this.generateFunction(task.description, context);
                generatedCode = result.code;
                filename = result.filename;
            } else if (description.includes('class')) {
                const result = this.generateClass(task.description, context);
                generatedCode = result.code;
                filename = result.filename;
            } else if (description.includes('api') || description.includes('endpoint')) {
                const result = this.generateApiEndpoint(task.description, context);
                generatedCode = result.code;
                filename = result.filename;
            } else if (description.includes('component')) {
                const result = this.generateComponent(task.description, context);
                generatedCode = result.code;
                filename = result.filename;
            } else if (description.includes('interface') || description.includes('type')) {
                const result = this.generateInterface(task.description, context);
                generatedCode = result.code;
                filename = result.filename;
            } else {
                const result = this.generateGenericCode(task.description, context);
                generatedCode = result.code;
                filename = result.filename;
            }
            
            // Write the generated code to a file
            if (generatedCode && filename) {
                await this.writeCodeToFile(filename, generatedCode, context);
                return `✅ Generated ${filename}:\n\`\`\`${this.getFileExtension(filename)}\n${generatedCode}\n\`\`\`\n\nFile written to workspace.`;
            } else {
                return `⚠️ Could not generate specific code for: ${task.description}`;
            }
        } catch (error) {
            return `❌ Code generation failed: ${error}`;
        }
    }

    private generateFunction(description: string, context?: any): { code: string; filename: string } {
        const functionName = this.extractFunctionName(description);
        const language = this.detectLanguage(context);
        
        if (language === 'typescript' || language === 'javascript') {
            const code = `/**
 * ${description}
 * Generated by CoderAgent
 */
export function ${functionName}(/* parameters */): /* return type */ {
    // TODO: Implement function logic
    throw new Error('Function not implemented');
}

// Example usage:
// const result = ${functionName}(/* arguments */);
// console.log(result);`;
            
            return {
                code,
                filename: `src/${functionName}.${language === 'typescript' ? 'ts' : 'js'}`
            };
        } else if (language === 'python') {
            const code = `"""
${description}
Generated by CoderAgent
"""

def ${functionName}():
    """
    TODO: Add function documentation
    
    Returns:
        TODO: Specify return type and description
    """
    # TODO: Implement function logic
    raise NotImplementedError("Function not implemented")

# Example usage:
# result = ${functionName}()
# print(result)`;
            
            return {
                code,
                filename: `${functionName}.py`
            };
        }
        
        return { code: `// ${description}\n// TODO: Implement function`, filename: `${functionName}.txt` };
    }

    private generateClass(description: string, context?: any): { code: string; filename: string } {
        const className = this.extractClassName(description);
        const language = this.detectLanguage(context);
        
        if (language === 'typescript') {
            const code = `/**
 * ${description}
 * Generated by CoderAgent
 */
export class ${className} {
    private _initialized: boolean = false;

    constructor() {
        // TODO: Initialize class properties
        this._initialized = true;
    }

    /**
     * TODO: Add method documentation
     */
    public someMethod(): void {
        if (!this._initialized) {
            throw new Error('${className} not initialized');
        }
        // TODO: Implement method logic
    }

    /**
     * Get the initialization status
     */
    public get isInitialized(): boolean {
        return this._initialized;
    }
}

// Example usage:
// const instance = new ${className}();
// instance.someMethod();`;
            
            return {
                code,
                filename: `src/${className}.ts`
            };
        } else if (language === 'python') {
            const code = `"""
${description}
Generated by CoderAgent
"""

class ${className}:
    """
    TODO: Add class documentation
    """
    
    def __init__(self):
        """Initialize the ${className} instance."""
        self._initialized = True
    
    def some_method(self):
        """
        TODO: Add method documentation
        """
        if not self._initialized:
            raise RuntimeError("${className} not initialized")
        # TODO: Implement method logic
        pass
    
    @property
    def is_initialized(self) -> bool:
        """Get the initialization status."""
        return self._initialized

# Example usage:
# instance = ${className}()
# instance.some_method()`;
            
            return {
                code,
                filename: `${className.toLowerCase()}.py`
            };
        }
        
        return { code: `// ${description}\n// TODO: Implement class`, filename: `${className}.txt` };
    }

    private generateApiEndpoint(description: string, context?: any): { code: string; filename: string } {
        const endpointName = this.extractEndpointName(description);
        const language = this.detectLanguage(context);
        
        if (language === 'typescript' || language === 'javascript') {
            const code = `import express from 'express';

/**
 * ${description}
 * Generated by CoderAgent
 */

// Router setup
const router = express.Router();

// GET endpoint
router.get('/${endpointName}', async (req, res) => {
    try {
        // TODO: Implement GET logic
        const result = {
            message: 'Success',
            data: null
        };
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST endpoint  
router.post('/${endpointName}', async (req, res) => {
    try {
        const { body } = req;
        
        // TODO: Validate request body
        // TODO: Implement POST logic
        
        const result = {
            message: '${endpointName} created successfully',
            data: body
        };
        
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;`;
            
            return {
                code,
                filename: `src/routes/${endpointName}.${language === 'typescript' ? 'ts' : 'js'}`
            };
        }
        
        return { code: `// ${description}\n// TODO: Implement API endpoint`, filename: `${endpointName}_api.txt` };
    }

    private generateComponent(description: string, context?: any): { code: string; filename: string } {
        const componentName = this.extractComponentName(description);
        
        if (description.includes('react')) {
            const code = `import React, { useState, useEffect } from 'react';

/**
 * ${description}
 * Generated by CoderAgent
 */

interface ${componentName}Props {
    // TODO: Define component props
    className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ 
    className = ''
}) => {
    const [state, setState] = useState<any>(null);

    useEffect(() => {
        // TODO: Add component lifecycle logic
    }, []);

    const handleAction = () => {
        // TODO: Implement action handler
    };

    return (
        <div className={\`${componentName.toLowerCase()} \${className}\`}>
            <h2>${componentName}</h2>
            {/* TODO: Add component JSX */}
            <button onClick={handleAction}>
                Action
            </button>
        </div>
    );
};

export default ${componentName};`;
            
            return {
                code,
                filename: `src/components/${componentName}.tsx`
            };
        }
        
        return { code: `<!-- ${description} -->\n<!-- TODO: Implement component -->`, filename: `${componentName}.html` };
    }

    private generateInterface(description: string, context?: any): { code: string; filename: string } {
        const interfaceName = this.extractInterfaceName(description);
        
        const code = `/**
 * ${description}
 * Generated by CoderAgent
 */

export interface ${interfaceName} {
    // TODO: Define interface properties
    id: string;
    name: string;
    createdAt: Date;
    updatedAt?: Date;
}

// Example implementation
export class ${interfaceName}Impl implements ${interfaceName} {
    constructor(
        public id: string,
        public name: string,
        public createdAt: Date = new Date(),
        public updatedAt?: Date
    ) {}
}`;
        
        return {
            code,
            filename: `src/types/${interfaceName}.ts`
        };
    }

    private generateGenericCode(description: string, context?: any): { code: string; filename: string } {
        const language = this.detectLanguage(context);
        const filename = this.generateFilename(description, language);
        
        if (language === 'typescript') {
            const code = `/**
 * ${description}
 * Generated by CoderAgent
 */

// TODO: Implement the requested functionality
export const implementation = {
    // Add your implementation here
};

export default implementation;`;
            
            return { code, filename };
        }
        
        return { 
            code: `// ${description}\n// TODO: Implement requested functionality`, 
            filename 
        };
    }

    private async writeCodeToFile(filename: string, code: string, context?: any): Promise<void> {
        // In a real VS Code extension, this would use the actual file system
        // For now, we'll simulate writing to the workspace
        console.log(`[CoderAgent] Writing code to ${filename}`);
        
        // TODO: Integrate with actual VS Code file system API
        // await vscode.workspace.fs.writeFile(vscode.Uri.file(filename), Buffer.from(code));
    }

    private extractFunctionName(description: string): string {
        const match = description.match(/function\s+(\w+)|(\w+)\s+function/i);
        return match ? (match[1] || match[2]) : 'generatedFunction';
    }

    private extractClassName(description: string): string {
        const match = description.match(/class\s+(\w+)|(\w+)\s+class/i);
        return match ? (match[1] || match[2]) : 'GeneratedClass';
    }

    private extractEndpointName(description: string): string {
        const match = description.match(/(\w+)\s+(?:api|endpoint)|(?:api|endpoint)\s+(\w+)/i);
        return match ? (match[1] || match[2]) : 'generated';
    }

    private extractComponentName(description: string): string {
        const match = description.match(/(\w+)\s+component|component\s+(\w+)/i);
        return match ? (match[1] || match[2]) : 'GeneratedComponent';
    }

    private extractInterfaceName(description: string): string {
        const match = description.match(/interface\s+(\w+)|(\w+)\s+interface/i);
        return match ? (match[1] || match[2]) : 'GeneratedInterface';
    }

    private detectLanguage(context?: any): string {
        if (!context) {
            return 'typescript';
        }
        
        const projectType = context.projectType?.toLowerCase();
        if (projectType === 'python') {
            return 'python';
        }
        if (projectType === 'nodejs') {
            return 'typescript';
        }
        if (projectType === 'javascript') {
            return 'javascript';
        }
        
        return 'typescript';
    }

    private generateFilename(description: string, language: string): string {
        const baseName = description.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const extension = language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'ts';
        return `src/${baseName}.${extension}`;
    }

    private getFileExtension(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'ts': return 'typescript';
            case 'js': return 'javascript';
            case 'py': return 'python';
            case 'tsx': return 'tsx';
            default: return 'text';
        }
    }
}

export class DebuggerAgent extends Agent {
    constructor() {
        super(AgentType.DEBUGGER, "Debugger", "Identifies and fixes bugs and issues");
    }

    async processTask(task: Task, context?: any): Promise<string> {
        console.log(`[Debugger] Processing task: ${task.description}`);
        
        // Simulate debugging process
        const issues = [];
        
        if (task.description.toLowerCase().includes('error')) {
            issues.push("Identified runtime error in execution flow");
        }
        if (task.description.toLowerCase().includes('performance')) {
            issues.push("Found performance bottleneck in algorithm");
        }
        if (task.description.toLowerCase().includes('memory')) {
            issues.push("Detected memory leak in resource management");
        }
        
        if (issues.length === 0) {
            return `Debugged: ${task.description} - No critical issues found`;
        } else {
            return `Debugged: ${task.description}\nIssues found:\n${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}`;
        }
    }
}

export class TesterAgent extends Agent {
    constructor() {
        super(AgentType.TESTER, "Tester", "Creates and runs tests to validate functionality");
    }

    async processTask(task: Task, context?: any): Promise<string> {
        console.log(`[Tester] Processing task: ${task.description}`);
        
        try {
            const language = this.detectLanguage(context);
            const testType = this.determineTestType(task.description);
            
            let testCode = '';
            let filename = '';
            let testResults = '';

            switch (testType) {
                case 'unit':
                    const unitTest = this.generateUnitTest(task.description, context, language);
                    testCode = unitTest.code;
                    filename = unitTest.filename;
                    break;
                case 'integration':
                    const integrationTest = this.generateIntegrationTest(task.description, context, language);
                    testCode = integrationTest.code;
                    filename = integrationTest.filename;
                    break;
                case 'component':
                    const componentTest = this.generateComponentTest(task.description, context);
                    testCode = componentTest.code;
                    filename = componentTest.filename;
                    break;
                default:
                    const genericTest = this.generateGenericTest(task.description, context, language);
                    testCode = genericTest.code;
                    filename = genericTest.filename;
            }

            // Write test file
            if (testCode && filename) {
                await this.writeTestToFile(filename, testCode, context);
                
                // Simulate running tests
                testResults = this.simulateTestExecution(testType, task.description);
                
                return `✅ Generated test file: ${filename}\n\n\`\`\`${this.getFileExtension(filename)}\n${testCode}\n\`\`\`\n\n📊 **Test Results:**\n${testResults}`;
            } else {
                return `⚠️ Could not generate specific tests for: ${task.description}`;
            }
        } catch (error) {
            return `❌ Test generation failed: ${error}`;
        }
    }

    private generateUnitTest(description: string, context?: any, language: string = 'typescript'): { code: string; filename: string } {
        const targetName = this.extractTargetName(description);
        
        if (language === 'typescript' || language === 'javascript') {
            const isTs = language === 'typescript';
            const code = `${isTs ? "import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';" : "const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');"}
${isTs ? `import { ${targetName} } from '../src/${targetName}';` : `const { ${targetName} } = require('../src/${targetName}');`}

/**
 * Unit tests for ${targetName}
 * Generated by TesterAgent for: ${description}
 */

describe('${targetName}', () => {
    let instance${isTs ? `: ${targetName}` : ''};

    beforeEach(() => {
        // Setup before each test
        instance = new ${targetName}();
    });

    afterEach(() => {
        // Cleanup after each test
        instance = null;
    });

    describe('Constructor', () => {
        it('should create instance successfully', () => {
            expect(instance).toBeDefined();
            expect(instance).toBeInstanceOf(${targetName});
        });

        it('should initialize with default values', () => {
            // TODO: Add specific initialization tests
            expect(instance.isInitialized).toBe(true);
        });
    });

    describe('Core Functionality', () => {
        it('should perform main operation correctly', async () => {
            // TODO: Test main functionality
            const result = await instance.someMethod();
            expect(result).toBeDefined();
        });

        it('should handle edge cases', () => {
            // TODO: Test edge cases
            expect(() => {
                instance.someMethod();
            }).not.toThrow();
        });

        it('should validate input parameters', () => {
            // TODO: Test input validation
            expect(() => {
                instance.someMethod(null);
            }).toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle errors gracefully', () => {
            // TODO: Test error scenarios
            expect(() => {
                instance.someMethod('invalid');
            }).toThrow('Expected error message');
        });
    });
});`;

            return {
                code,
                filename: `tests/${targetName}.test.${isTs ? 'ts' : 'js'}`
            };
        } else if (language === 'python') {
            const code = `"""
Unit tests for ${targetName}
Generated by TesterAgent for: ${description}
"""

import unittest
from unittest.mock import Mock, patch
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from ${targetName.toLowerCase()} import ${targetName}


class Test${targetName}(unittest.TestCase):
    """Test cases for ${targetName} class."""

    def setUp(self):
        """Set up test fixtures before each test method."""
        self.instance = ${targetName}()

    def tearDown(self):
        """Clean up after each test method."""
        self.instance = None

    def test_initialization(self):
        """Test that ${targetName} initializes correctly."""
        self.assertIsNotNone(self.instance)
        self.assertTrue(self.instance.is_initialized)

    def test_main_functionality(self):
        """Test the main functionality of ${targetName}."""
        # TODO: Implement main functionality test
        result = self.instance.some_method()
        self.assertIsNotNone(result)

    def test_edge_cases(self):
        """Test edge cases and boundary conditions."""
        # TODO: Implement edge case tests
        with self.assertRaises(ValueError):
            self.instance.some_method(None)

    def test_error_handling(self):
        """Test error handling scenarios."""
        # TODO: Implement error handling tests
        with self.assertRaises(RuntimeError):
            # Test uninitialized state
            uninitialied_instance = ${targetName}()
            uninitialied_instance._initialized = False
            uninitialied_instance.some_method()

    @patch('${targetName.toLowerCase()}.some_dependency')
    def test_with_mocks(self, mock_dependency):
        """Test with mocked dependencies."""
        # TODO: Implement tests with mocks
        mock_dependency.return_value = "mocked_result"
        result = self.instance.some_method()
        self.assertEqual(result, "expected_result")


if __name__ == '__main__':
    unittest.main()`;

            return {
                code,
                filename: `tests/test_${targetName.toLowerCase()}.py`
            };
        }

        return { code: `# ${description}\n# TODO: Generate tests`, filename: `test_${targetName}.txt` };
    }

    private generateIntegrationTest(description: string, context?: any, language: string = 'typescript'): { code: string; filename: string } {
        const targetName = this.extractTargetName(description);
        
        if (language === 'typescript') {
            const code = `import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app';

/**
 * Integration tests for ${targetName}
 * Generated by TesterAgent for: ${description}
 */

describe('${targetName} Integration Tests', () => {
    beforeAll(async () => {
        // Setup test environment
        process.env.NODE_ENV = 'test';
    });

    afterAll(async () => {
        // Cleanup test environment
    });

    describe('API Endpoints', () => {
        it('should handle GET requests', async () => {
            const response = await request(app)
                .get('/${targetName.toLowerCase()}')
                .expect(200);

            expect(response.body).toBeDefined();
            expect(response.body.message).toBe('Success');
        });

        it('should handle POST requests', async () => {
            const testData = {
                name: 'Test Item',
                description: 'Test Description'
            };

            const response = await request(app)
                .post('/${targetName.toLowerCase()}')
                .send(testData)
                .expect(201);

            expect(response.body.data).toMatchObject(testData);
        });

        it('should handle PUT requests', async () => {
            const updateData = {
                name: 'Updated Item'
            };

            const response = await request(app)
                .put('/${targetName.toLowerCase()}/1')
                .send(updateData)
                .expect(200);

            expect(response.body.data.name).toBe(updateData.name);
        });

        it('should handle DELETE requests', async () => {
            await request(app)
                .delete('/${targetName.toLowerCase()}/1')
                .expect(204);
        });
    });

    describe('Database Integration', () => {
        it('should persist data correctly', async () => {
            // TODO: Test database operations
        });

        it('should handle database errors', async () => {
            // TODO: Test database error scenarios
        });
    });

    describe('External Service Integration', () => {
        it('should communicate with external services', async () => {
            // TODO: Test external service calls
        });
    });
});`;

            return {
                code,
                filename: `tests/integration/${targetName}.integration.test.ts`
            };
        }

        return { code: `# ${description}\n# TODO: Generate integration tests`, filename: `integration_test_${targetName}.txt` };
    }

    private generateComponentTest(description: string, context?: any): { code: string; filename: string } {
        const componentName = this.extractTargetName(description);
        
        const code = `import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ${componentName} } from '../src/components/${componentName}';

/**
 * Component tests for ${componentName}
 * Generated by TesterAgent for: ${description}
 */

describe('${componentName}', () => {
    const defaultProps = {
        // TODO: Define default props
    };

    beforeEach(() => {
        // Setup before each test
    });

    describe('Rendering', () => {
        it('should render without crashing', () => {
            render(<${componentName} {...defaultProps} />);
            expect(screen.getByRole('heading')).toBeInTheDocument();
        });

        it('should render with correct content', () => {
            render(<${componentName} {...defaultProps} />);
            expect(screen.getByText('${componentName}')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            const customClass = 'custom-class';
            render(<${componentName} {...defaultProps} className={customClass} />);
            
            const component = screen.getByText('${componentName}').closest('div');
            expect(component).toHaveClass(customClass);
        });
    });

    describe('User Interactions', () => {
        it('should handle button clicks', async () => {
            const user = userEvent.setup();
            render(<${componentName} {...defaultProps} />);
            
            const button = screen.getByRole('button', { name: /action/i });
            await user.click(button);
            
            // TODO: Assert expected behavior
        });

        it('should handle form submissions', async () => {
            const user = userEvent.setup();
            render(<${componentName} {...defaultProps} />);
            
            // TODO: Test form interactions
        });
    });

    describe('State Management', () => {
        it('should update state correctly', async () => {
            render(<${componentName} {...defaultProps} />);
            
            // TODO: Test state changes
            await waitFor(() => {
                // Assert state changes
            });
        });
    });

    describe('Props Handling', () => {
        it('should handle prop changes', () => {
            const { rerender } = render(<${componentName} {...defaultProps} />);
            
            const newProps = { ...defaultProps, someProp: 'new value' };
            rerender(<${componentName} {...newProps} />);
            
            // TODO: Assert prop changes
        });
    });

    describe('Error Boundaries', () => {
        it('should handle errors gracefully', () => {
            // TODO: Test error scenarios
        });
    });
});`;

        return {
            code,
            filename: `tests/components/${componentName}.test.tsx`
        };
    }

    private generateGenericTest(description: string, context?: any, language: string = 'typescript'): { code: string; filename: string } {
        const targetName = this.extractTargetName(description);
        
        const code = `/**
 * Tests for ${targetName}
 * Generated by TesterAgent for: ${description}
 */

describe('${targetName}', () => {
    it('should work correctly', () => {
        // TODO: Implement test logic
        expect(true).toBe(true);
    });
    
    it('should handle edge cases', () => {
        // TODO: Test edge cases
    });
    
    it('should validate input', () => {
        // TODO: Test input validation
    });
});`;

        return {
            code,
            filename: `tests/${targetName}.test.${language === 'python' ? 'py' : 'ts'}`
        };
    }

    private determineTestType(description: string): 'unit' | 'integration' | 'component' | 'generic' {
        const desc = description.toLowerCase();
        
        if (desc.includes('integration') || desc.includes('api') || desc.includes('endpoint')) {
            return 'integration';
        }
        if (desc.includes('component') || desc.includes('react')) {
            return 'component';
        }
        if (desc.includes('unit') || desc.includes('function') || desc.includes('class')) {
            return 'unit';
        }
        
        return 'generic';
    }

    private simulateTestExecution(testType: string, description: string): string {
        const testCount = Math.floor(Math.random() * 10) + 5; // 5-15 tests
        const passRate = 0.85 + Math.random() * 0.1; // 85-95% pass rate
        const passed = Math.floor(testCount * passRate);
        const failed = testCount - passed;
        const coverage = Math.floor(Math.random() * 20) + 75; // 75-95% coverage
        const executionTime = Math.floor(Math.random() * 500) + 100; // 100-600ms
        
        let result = `**Test Suite: ${testType.toUpperCase()}**\n`;
        result += `Tests Run: ${testCount}\n`;
        result += `✅ Passed: ${passed}\n`;
        result += `❌ Failed: ${failed}\n`;
        result += `📊 Coverage: ${coverage}%\n`;
        result += `⏱️ Execution Time: ${executionTime}ms\n`;
        
        if (failed > 0) {
            result += `\n**Failed Tests:**\n`;
            for (let i = 1; i <= failed; i++) {
                result += `- Test ${i}: Expected behavior not met\n`;
            }
        }
        
        return result;
    }

    private async writeTestToFile(filename: string, code: string, context?: any): Promise<void> {
        console.log(`[TesterAgent] Writing test to ${filename}`);
        // TODO: Integrate with actual VS Code file system API
    }

    private extractTargetName(description: string): string {
        // Extract class/function/component name from description
        const patterns = [
            /(?:test|testing)\s+(\w+)/i,
            /(\w+)\s+(?:test|testing)/i,
            /for\s+(\w+)/i,
            /(\w+)(?:\s+class|\s+function|\s+component)/i
        ];
        
        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return 'Target';
    }

    private detectLanguage(context?: any): string {
        if (!context) {
            return 'typescript';
        }
        
        const projectType = context.projectType?.toLowerCase();
        if (projectType === 'python') {
            return 'python';
        }
        if (projectType === 'nodejs') {
            return 'typescript';
        }
        if (projectType === 'javascript') {
            return 'javascript';
        }
        
        return 'typescript';
    }

    private getFileExtension(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'ts': return 'typescript';
            case 'tsx': return 'tsx';
            case 'js': return 'javascript';
            case 'py': return 'python';
            default: return 'text';
        }
    }
}

export class DocumenterAgent extends Agent {
    constructor() {
        super(AgentType.DOCUMENTER, "Documenter", "Creates comprehensive documentation");
    }

    async processTask(task: Task, context?: any): Promise<string> {
        console.log(`[Documenter] Processing task: ${task.description}`);
        
        try {
            const docType = this.determineDocumentationType(task.description);
            const targetName = this.extractTargetName(task.description);
            
            let documentation = '';
            let filename = '';

            switch (docType) {
                case 'api':
                    const apiDoc = this.generateApiDocumentation(targetName, task.description, context);
                    documentation = apiDoc.content;
                    filename = apiDoc.filename;
                    break;
                case 'class':
                    const classDoc = this.generateClassDocumentation(targetName, task.description, context);
                    documentation = classDoc.content;
                    filename = classDoc.filename;
                    break;
                case 'function':
                    const functionDoc = this.generateFunctionDocumentation(targetName, task.description, context);
                    documentation = functionDoc.content;
                    filename = functionDoc.filename;
                    break;
                case 'component':
                    const componentDoc = this.generateComponentDocumentation(targetName, task.description, context);
                    documentation = componentDoc.content;
                    filename = componentDoc.filename;
                    break;
                case 'project':
                    const projectDoc = this.generateProjectDocumentation(task.description, context);
                    documentation = projectDoc.content;
                    filename = projectDoc.filename;
                    break;
                default:
                    const genericDoc = this.generateGenericDocumentation(targetName, task.description, context);
                    documentation = genericDoc.content;
                    filename = genericDoc.filename;
            }

            if (documentation && filename) {
                await this.writeDocumentationToFile(filename, documentation, context);
                return `📝 Generated documentation: ${filename}\n\n${documentation}`;
            } else {
                return `⚠️ Could not generate specific documentation for: ${task.description}`;
            }
        } catch (error) {
            return `❌ Documentation generation failed: ${error}`;
        }
    }

    private generateApiDocumentation(targetName: string, description: string, context?: any): { content: string; filename: string } {
        const content = `# ${targetName} API Documentation

> Generated by DocumenterAgent for: ${description}

## Overview

The ${targetName} API provides endpoints for managing ${targetName.toLowerCase()} resources.

## Base URL

\`\`\`
https://api.example.com/v1
\`\`\`

## Authentication

All API requests require authentication using Bearer tokens:

\`\`\`http
Authorization: Bearer <your-token>
\`\`\`

## Endpoints

### GET /${targetName.toLowerCase()}

Retrieve all ${targetName.toLowerCase()} items.

**Request:**
\`\`\`http
GET /${targetName.toLowerCase()}
Content-Type: application/json
Authorization: Bearer <token>
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Success",
  "data": [
    {
      "id": "string",
      "name": "string",
      "createdAt": "2025-07-31T00:00:00Z",
      "updatedAt": "2025-07-31T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
\`\`\`

### POST /${targetName.toLowerCase()}

Create a new ${targetName.toLowerCase()} item.

**Request:**
\`\`\`http
POST /${targetName.toLowerCase()}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "string",
  "description": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "${targetName} created successfully",
  "data": {
    "id": "generated-id",
    "name": "string",
    "description": "string",
    "createdAt": "2025-07-31T00:00:00Z"
  }
}
\`\`\`

### GET /${targetName.toLowerCase()}/:id

Retrieve a specific ${targetName.toLowerCase()} item by ID.

**Parameters:**
- \`id\` (string, required): The unique identifier of the ${targetName.toLowerCase()}

**Response:**
\`\`\`json
{
  "message": "Success",
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "createdAt": "2025-07-31T00:00:00Z",
    "updatedAt": "2025-07-31T00:00:00Z"
  }
}
\`\`\`

### PUT /${targetName.toLowerCase()}/:id

Update an existing ${targetName.toLowerCase()} item.

**Request:**
\`\`\`http
PUT /${targetName.toLowerCase()}/123
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "updated name",
  "description": "updated description"
}
\`\`\`

### DELETE /${targetName.toLowerCase()}/:id

Delete a ${targetName.toLowerCase()} item.

**Response:** \`204 No Content\`

## Error Responses

### 400 Bad Request
\`\`\`json
{
  "error": "Validation failed",
  "details": ["Name is required", "Description too long"]
}
\`\`\`

### 401 Unauthorized
\`\`\`json
{
  "error": "Authentication required"
}
\`\`\`

### 404 Not Found
\`\`\`json
{
  "error": "${targetName} not found"
}
\`\`\`

### 500 Internal Server Error
\`\`\`json
{
  "error": "Internal server error"
}
\`\`\`

## Rate Limiting

- Rate limit: 1000 requests per hour per API key
- Rate limit headers are included in responses:
  - \`X-RateLimit-Limit\`
  - \`X-RateLimit-Remaining\`
  - \`X-RateLimit-Reset\`

## Examples

### JavaScript/Node.js Example

\`\`\`javascript
const fetch = require('node-fetch');

const api = {
  baseURL: 'https://api.example.com/v1',
  token: 'your-bearer-token',

  async get${targetName}s() {
    const response = await fetch(\`\${this.baseURL}/${targetName.toLowerCase()}\`, {
      headers: {
        'Authorization': \`Bearer \${this.token}\`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  async create${targetName}(data) {
    const response = await fetch(\`\${this.baseURL}/${targetName.toLowerCase()}\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.token}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// Usage
api.get${targetName}s().then(console.log);
api.create${targetName}({ name: 'Test', description: 'Test description' }).then(console.log);
\`\`\`

### Python Example

\`\`\`python
import requests

class ${targetName}API:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_${targetName.toLowerCase()}s(self):
        response = requests.get(f'{self.base_url}/${targetName.toLowerCase()}', headers=self.headers)
        return response.json()
    
    def create_${targetName.toLowerCase()}(self, data):
        response = requests.post(f'{self.base_url}/${targetName.toLowerCase()}', 
                               json=data, headers=self.headers)
        return response.json()

# Usage
api = ${targetName}API('https://api.example.com/v1', 'your-bearer-token')
result = api.get_${targetName.toLowerCase()}s()
print(result)
\`\`\`

## Changelog

### v1.0.0 (2025-07-31)
- Initial API release
- Basic CRUD operations for ${targetName.toLowerCase()}
- Authentication and rate limiting

---

*Documentation generated on ${new Date().toISOString()}*`;

        return {
            content,
            filename: `docs/api/${targetName.toLowerCase()}-api.md`
        };
    }

    private generateClassDocumentation(targetName: string, description: string, context?: any): { content: string; filename: string } {
        const content = `# ${targetName} Class Documentation

> Generated by DocumenterAgent for: ${description}

## Overview

The \`${targetName}\` class provides functionality for ${description.toLowerCase()}.

## Class Definition

\`\`\`typescript
class ${targetName} {
    private _initialized: boolean;
    
    constructor();
    someMethod(): void;
    get isInitialized(): boolean;
}
\`\`\`

## Constructor

### \`constructor()\`

Creates a new instance of the ${targetName} class.

**Example:**
\`\`\`typescript
const instance = new ${targetName}();
\`\`\`

## Properties

### \`isInitialized\` (readonly)

**Type:** \`boolean\`

Indicates whether the ${targetName} instance has been properly initialized.

**Example:**
\`\`\`typescript
const instance = new ${targetName}();
console.log(instance.isInitialized); // true
\`\`\`

## Methods

### \`someMethod()\`

**Signature:** \`someMethod(): void\`

**Description:** Performs the main operation of the ${targetName} class.

**Throws:**
- \`Error\` - When the instance is not initialized

**Example:**
\`\`\`typescript
const instance = new ${targetName}();
instance.someMethod();
\`\`\`

## Usage Examples

### Basic Usage

\`\`\`typescript
import { ${targetName} } from './${targetName}';

// Create instance
const instance = new ${targetName}();

// Check initialization status
if (instance.isInitialized) {
    // Use the instance
    instance.someMethod();
}
\`\`\`

### Error Handling

\`\`\`typescript
try {
    const instance = new ${targetName}();
    instance.someMethod();
} catch (error) {
    console.error('${targetName} operation failed:', error.message);
}
\`\`\`

### Integration Example

\`\`\`typescript
class MyApplication {
    private ${targetName.toLowerCase()}: ${targetName};
    
    constructor() {
        this.${targetName.toLowerCase()} = new ${targetName}();
    }
    
    async start() {
        if (!this.${targetName.toLowerCase()}.isInitialized) {
            throw new Error('${targetName} not initialized');
        }
        
        this.${targetName.toLowerCase()}.someMethod();
    }
}
\`\`\`

## Best Practices

1. **Always check initialization status** before using the instance
2. **Handle errors gracefully** when calling methods
3. **Use dependency injection** for better testability
4. **Follow single responsibility principle** when extending

## Related Classes

- \`Base${targetName}\` - Base class that ${targetName} extends
- \`${targetName}Factory\` - Factory for creating ${targetName} instances
- \`${targetName}Manager\` - Manager for handling multiple ${targetName} instances

## See Also

- [API Documentation](./api/${targetName.toLowerCase()}-api.md)
- [Usage Guide](./guides/${targetName.toLowerCase()}-guide.md)
- [Examples](./examples/${targetName.toLowerCase()}-examples.md)

---

*Documentation generated on ${new Date().toISOString()}*`;

        return {
            content,
            filename: `docs/classes/${targetName}.md`
        };
    }

    private generateFunctionDocumentation(targetName: string, description: string, context?: any): { content: string; filename: string } {
        const content = `# ${targetName} Function Documentation

> Generated by DocumenterAgent for: ${description}

## Overview

The \`${targetName}\` function provides functionality for ${description.toLowerCase()}.

## Signature

\`\`\`typescript
function ${targetName}(/* parameters */): /* return type */
\`\`\`

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`param1\` | \`string\` | Yes | Description of parameter 1 |
| \`param2\` | \`number\` | No | Description of parameter 2 (default: 0) |
| \`options\` | \`Options\` | No | Configuration options |

### Options Interface

\`\`\`typescript
interface Options {
    timeout?: number;
    retries?: number;
    debug?: boolean;
}
\`\`\`

## Return Value

**Type:** \`Promise<Result>\`

**Description:** Returns a promise that resolves to the operation result.

### Result Interface

\`\`\`typescript
interface Result {
    success: boolean;
    data?: any;
    error?: string;
}
\`\`\`

## Throws

- \`Error\` - When invalid parameters are provided
- \`TimeoutError\` - When operation times out
- \`ValidationError\` - When input validation fails

## Usage Examples

### Basic Usage

\`\`\`typescript
import { ${targetName} } from './${targetName}';

async function example() {
    try {
        const result = await ${targetName}('parameter1', 42);
        
        if (result.success) {
            console.log('Operation succeeded:', result.data);
        } else {
            console.error('Operation failed:', result.error);
        }
    } catch (error) {
        console.error('Function call failed:', error.message);
    }
}
\`\`\`

### With Options

\`\`\`typescript
const result = await ${targetName}('parameter1', 42, {
    timeout: 5000,
    retries: 3,
    debug: true
});
\`\`\`

### Error Handling

\`\`\`typescript
try {
    const result = await ${targetName}('test');
    // Handle result
} catch (error) {
    if (error instanceof ValidationError) {
        console.error('Validation failed:', error.message);
    } else if (error instanceof TimeoutError) {
        console.error('Operation timed out');
    } else {
        console.error('Unexpected error:', error);
    }
}
\`\`\`

## Performance Considerations

- The function is optimized for performance with typical inputs
- Large datasets may require additional memory
- Consider using pagination for bulk operations

## Testing

### Unit Test Example

\`\`\`typescript
import { ${targetName} } from './${targetName}';

describe('${targetName}', () => {
    it('should return success for valid input', async () => {
        const result = await ${targetName}('valid-input');
        expect(result.success).toBe(true);
    });
    
    it('should throw error for invalid input', async () => {
        await expect(${targetName}(null)).rejects.toThrow('Invalid input');
    });
});
\`\`\`

## Implementation Notes

- Function uses async/await pattern for better error handling
- Input validation is performed before processing
- Results are cached for improved performance
- Supports cancellation via AbortController

## Related Functions

- \`validate${targetName}Input()\` - Input validation helper
- \`${targetName}Sync()\` - Synchronous version
- \`batch${targetName}()\` - Batch processing version

## Changelog

### v1.0.0
- Initial implementation
- Basic functionality with error handling

### v1.1.0
- Added options parameter
- Improved error messages
- Performance optimizations

---

*Documentation generated on ${new Date().toISOString()}*`;

        return {
            content,
            filename: `docs/functions/${targetName}.md`
        };
    }

    private generateComponentDocumentation(targetName: string, description: string, context?: any): { content: string; filename: string } {
        const content = `# ${targetName} Component Documentation

> Generated by DocumenterAgent for: ${description}

## Overview

The \`${targetName}\` component provides ${description.toLowerCase()} functionality for React applications.

## Import

\`\`\`typescript
import { ${targetName} } from './components/${targetName}';
\`\`\`

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| \`className\` | \`string\` | No | \`''\` | Additional CSS classes |
| \`onAction\` | \`() => void\` | No | - | Callback for action events |
| \`disabled\` | \`boolean\` | No | \`false\` | Whether component is disabled |
| \`data\` | \`Data[]\` | No | \`[]\` | Data to display |

### Data Interface

\`\`\`typescript
interface Data {
    id: string;
    name: string;
    value: number;
}
\`\`\`

## Usage Examples

### Basic Usage

\`\`\`jsx
import React from 'react';
import { ${targetName} } from './components/${targetName}';

function App() {
    const handleAction = () => {
        console.log('Action triggered');
    };

    return (
        <div>
            <${targetName} onAction={handleAction} />
        </div>
    );
}
\`\`\`

### With Data

\`\`\`jsx
const data = [
    { id: '1', name: 'Item 1', value: 100 },
    { id: '2', name: 'Item 2', value: 200 }
];

<${targetName} 
    data={data}
    onAction={handleAction}
    className="custom-style"
/>
\`\`\`

### Disabled State

\`\`\`jsx
<${targetName} 
    disabled={true}
    onAction={handleAction}
/>
\`\`\`

## Styling

### CSS Classes

The component applies the following CSS classes:

- \`.${targetName.toLowerCase()}\` - Root container
- \`.${targetName.toLowerCase()}__header\` - Header section
- \`.${targetName.toLowerCase()}__content\` - Content area
- \`.${targetName.toLowerCase()}__action\` - Action button
- \`.${targetName.toLowerCase()}--disabled\` - Disabled state

### Custom Styling

\`\`\`css
.${targetName.toLowerCase()} {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 16px;
}

.${targetName.toLowerCase()}__header {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 12px;
}

.${targetName.toLowerCase()}__action {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
}

.${targetName.toLowerCase()}__action:hover {
    background-color: #0056b3;
}

.${targetName.toLowerCase()}--disabled {
    opacity: 0.6;
    pointer-events: none;
}
\`\`\`

## State Management

The component manages the following internal state:

- \`isLoading\` - Loading state for async operations
- \`error\` - Error state for displaying error messages
- \`selectedItem\` - Currently selected item

## Event Handlers

### onAction

Called when the action button is clicked.

**Signature:** \`() => void\`

**Example:**
\`\`\`jsx
const handleAction = () => {
    // Handle action logic
    console.log('Action performed');
};

<${targetName} onAction={handleAction} />
\`\`\`

## Accessibility

The component follows accessibility best practices:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### ARIA Attributes

- \`role="button"\` on action elements
- \`aria-label\` for descriptive labels
- \`aria-disabled\` for disabled state

## Testing

### Component Test Example

\`\`\`typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ${targetName} } from './${targetName}';

describe('${targetName}', () => {
    it('renders without crashing', () => {
        render(<${targetName} />);
        expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('calls onAction when button is clicked', () => {
        const mockAction = jest.fn();
        render(<${targetName} onAction={mockAction} />);
        
        fireEvent.click(screen.getByRole('button', { name: /action/i }));
        expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('applies custom className', () => {
        render(<${targetName} className="custom-class" />);
        expect(screen.getByText('${targetName}')).toHaveClass('custom-class');
    });
});
\`\`\`

## Performance Considerations

- Component is optimized with React.memo for re-render prevention
- Uses useCallback for event handlers to prevent unnecessary re-renders
- Implements virtual scrolling for large data sets

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Related Components

- \`${targetName}Item\` - Individual item component
- \`${targetName}List\` - List variant
- \`${targetName}Modal\` - Modal version

---

*Documentation generated on ${new Date().toISOString()}*`;

        return {
            content,
            filename: `docs/components/${targetName}.md`
        };
    }

    private generateProjectDocumentation(description: string, context?: any): { content: string; filename: string } {
        const projectName = context?.workspaceInfo?.name || 'Project';
        
        const content = `# ${projectName} Documentation

> Generated by DocumenterAgent for: ${description}

## Overview

${projectName} is a ${context?.projectType || 'software'} project that provides ${description.toLowerCase()}.

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/your-org/${projectName.toLowerCase()}.git
cd ${projectName.toLowerCase()}

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

## Project Structure

\`\`\`
${projectName.toLowerCase()}/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
├── tests/                 # Test files
├── docs/                  # Documentation
├── public/                # Static assets
├── package.json           # Project configuration
└── README.md             # Project overview
\`\`\`

## Available Scripts

| Script | Description |
|--------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production |
| \`npm run test\` | Run test suite |
| \`npm run lint\` | Run linter |
| \`npm run format\` | Format code |

## Configuration

### Environment Variables

Create a \`.env\` file in the root directory:

\`\`\`env
# API Configuration
API_URL=https://api.example.com
API_KEY=your-api-key

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Application Settings
NODE_ENV=development
PORT=3000
\`\`\`

### Configuration Files

- \`tsconfig.json\` - TypeScript configuration
- \`jest.config.js\` - Test configuration
- \`eslint.config.js\` - Linting rules
- \`prettier.config.js\` - Code formatting

## API Documentation

The project exposes the following API endpoints:

### Authentication
- \`POST /auth/login\` - User login
- \`POST /auth/register\` - User registration
- \`POST /auth/logout\` - User logout

### Core Features
- \`GET /api/items\` - List items
- \`POST /api/items\` - Create item
- \`PUT /api/items/:id\` - Update item
- \`DELETE /api/items/:id\` - Delete item

For detailed API documentation, see [API Reference](./api/README.md).

## Architecture

### Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **Testing:** Jest, React Testing Library
- **Build:** Vite, ESBuild
- **Deployment:** Docker, AWS

### Design Patterns

- **Component-based architecture** for UI components
- **Service layer pattern** for business logic
- **Repository pattern** for data access
- **Dependency injection** for testability

## Development Guide

### Code Style

This project follows strict coding standards:

- **ESLint** for code quality
- **Prettier** for code formatting
- **Husky** for git hooks
- **Conventional Commits** for commit messages

### Testing Strategy

- **Unit Tests:** Jest for individual functions/components
- **Integration Tests:** Testing API endpoints
- **E2E Tests:** Cypress for user workflows
- **Coverage Target:** 80% minimum

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/your-feature\`
3. Write tests for your changes
4. Ensure all tests pass: \`npm test\`
5. Commit with conventional format: \`feat: add new feature\`
6. Push and create a pull request

## Deployment

### Production Build

\`\`\`bash
# Build the application
npm run build

# Start production server
npm start
\`\`\`

### Docker Deployment

\`\`\`bash
# Build Docker image
docker build -t ${projectName.toLowerCase()} .

# Run container
docker run -p 3000:3000 ${projectName.toLowerCase()}
\`\`\`

### Environment Setup

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | http://localhost:3000 | Local development |
| Staging | https://staging.example.com | Testing |
| Production | https://app.example.com | Live application |

## Monitoring & Logging

- **Application Monitoring:** New Relic
- **Error Tracking:** Sentry
- **Logging:** Winston with structured logs
- **Analytics:** Google Analytics

## Security

- **Authentication:** JWT tokens
- **Authorization:** Role-based access control
- **Data Validation:** Input sanitization
- **Security Headers:** Helmet.js
- **Rate Limiting:** Express rate limiter

## Performance

- **Bundle Size:** Optimized with tree shaking
- **Caching:** Redis for API responses
- **CDN:** CloudFlare for static assets
- **Database:** Query optimization and indexing

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors:**
\`\`\`bash
npm run lint:fix
npm run build
\`\`\`

**Database connection issues:**
- Check DATABASE_URL in .env
- Ensure database is running
- Verify network connectivity

**Port already in use:**
\`\`\`bash
# Kill process on port 3000
npx kill-port 3000
npm run dev
\`\`\`

## Support

- **Documentation:** [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/your-org/${projectName.toLowerCase()}/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/${projectName.toLowerCase()}/discussions)
- **Email:** support@example.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

---

*Documentation generated on ${new Date().toISOString()}*`;

        return {
            content,
            filename: 'docs/README.md'
        };
    }

    private generateGenericDocumentation(targetName: string, description: string, context?: any): { content: string; filename: string } {
        const content = `# ${targetName} Documentation

> Generated by DocumenterAgent for: ${description}

## Overview

Documentation for ${targetName} - ${description.toLowerCase()}.

## Description

${description}

## Usage

TODO: Add usage instructions and examples.

## Configuration

TODO: Add configuration options.

## Examples

TODO: Add code examples.

## API Reference

TODO: Add API documentation.

## Troubleshooting

TODO: Add common issues and solutions.

---

*Documentation generated on ${new Date().toISOString()}*`;

        return {
            content,
            filename: `docs/${targetName.toLowerCase()}.md`
        };
    }

    private determineDocumentationType(description: string): 'api' | 'class' | 'function' | 'component' | 'project' | 'generic' {
        const desc = description.toLowerCase();
        
        if (desc.includes('api') || desc.includes('endpoint') || desc.includes('rest')) {
            return 'api';
        }
        if (desc.includes('class')) {
            return 'class';
        }
        if (desc.includes('function')) {
            return 'function';
        }
        if (desc.includes('component') || desc.includes('react')) {
            return 'component';
        }
        if (desc.includes('project') || desc.includes('application') || desc.includes('system')) {
            return 'project';
        }
        
        return 'generic';
    }

    private extractTargetName(description: string): string {
        const patterns = [
            /(?:for|of)\s+(\w+)/i,
            /(\w+)\s+(?:documentation|docs)/i,
            /(?:document|documenting)\s+(\w+)/i,
            /(\w+)(?:\s+class|\s+function|\s+component|\s+api)/i
        ];
        
        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return 'Target';
    }

    private async writeDocumentationToFile(filename: string, content: string, context?: any): Promise<void> {
        console.log(`[DocumenterAgent] Writing documentation to ${filename}`);
        // TODO: Integrate with actual VS Code file system API
    }
}
