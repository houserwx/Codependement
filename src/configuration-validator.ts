import * as vscode from 'vscode';

export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
}

/**
 * Service to validate CoDependement extension configuration
 */
export class ConfigurationValidator {
    
    /**
     * Validate the current extension configuration
     */
    public validateConfiguration(): ConfigValidationResult {
        const result: ConfigValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            recommendations: []
        };

        const config = vscode.workspace.getConfiguration('codependent');

        // Validate context buffer size vs max tokens
        const contextBufferSize = config.get<number>('contextBufferSize', 65536);
        const maxTokens = config.get<number>('maxTokens', 32768);

        if (contextBufferSize <= maxTokens) {
            result.isValid = false;
            result.errors.push(
                `Context buffer size (${contextBufferSize}) must be larger than max tokens (${maxTokens}). ` +
                `Recommended minimum: ${Math.ceil(maxTokens * 1.5)} tokens.`
            );
        } else if (contextBufferSize < maxTokens * 1.2) {
            result.warnings.push(
                `Context buffer size (${contextBufferSize}) is close to max tokens (${maxTokens}). ` +
                `Consider increasing to at least ${Math.ceil(maxTokens * 1.5)} tokens for better performance.`
            );
        }

        // Validate base URL format
        const baseUrl = config.get<string>('baseUrl', 'http://localhost:11434');
        if (!this.isValidUrl(baseUrl)) {
            result.errors.push(`Invalid base URL format: ${baseUrl}. Please use a valid HTTP/HTTPS URL.`);
            result.isValid = false;
        }

        // Validate temperature range
        const temperature = config.get<number>('temperature', 0.7);
        if (temperature < 0 || temperature > 2) {
            result.errors.push(`Temperature (${temperature}) must be between 0 and 2.`);
            result.isValid = false;
        } else if (temperature > 1.5) {
            result.warnings.push(`High temperature (${temperature}) may produce less coherent responses.`);
        }

        // Validate max tokens
        if (maxTokens < 256) {
            result.errors.push(`Max tokens (${maxTokens}) is too low. Minimum recommended: 256 tokens.`);
            result.isValid = false;
        } else if (maxTokens < 1024) {
            result.warnings.push(`Low max tokens (${maxTokens}) may truncate responses. Consider increasing to at least 1024.`);
        }

        // Check for optimal context buffer size
        if (contextBufferSize > 100000) {
            result.warnings.push(
                `Very large context buffer size (${contextBufferSize}) may impact performance. ` +
                `Consider reducing if you experience slowdowns.`
            );
        }

        // Add general recommendations
        if (result.errors.length === 0 && result.warnings.length === 0) {
            result.recommendations.push('Configuration looks good! Consider these optimizations:');
            
            if (contextBufferSize < 32768) {
                result.recommendations.push(`• Increase context buffer to 32768+ tokens for better context retention`);
            }
            
            if (maxTokens < 4096) {
                result.recommendations.push(`• Increase max tokens to 4096+ for longer responses`);
            }
            
            if (temperature === 0.7) {
                result.recommendations.push(`• Try temperature 0.3-0.5 for more focused responses, or 0.8-1.0 for more creative responses`);
            }
        }

        return result;
    }

    /**
     * Show configuration validation results to the user
     */
    public async showValidationResults(result: ConfigValidationResult): Promise<void> {
        if (result.errors.length > 0) {
            const message = `Configuration Errors:\n${result.errors.join('\n')}`;
            const action = await vscode.window.showErrorMessage(
                'CoDependement configuration has errors that need to be fixed.',
                { modal: true, detail: message },
                'Open Settings',
                'Fix Automatically'
            );

            if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'codependent');
            } else if (action === 'Fix Automatically') {
                await this.autoFixConfiguration();
            }
        } else if (result.warnings.length > 0) {
            const message = `Configuration Warnings:\n${result.warnings.join('\n')}`;
            const action = await vscode.window.showWarningMessage(
                'CoDependement configuration has some warnings.',
                { detail: message },
                'Open Settings',
                'Ignore'
            );

            if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'codependent');
            }
        } else {
            let message = 'CoDependement configuration is valid!';
            if (result.recommendations.length > 0) {
                message += `\n\n${result.recommendations.join('\n')}`;
            }
            
            vscode.window.showInformationMessage(
                message,
                { detail: 'Your configuration passed all validation checks.' }
            );
        }
    }

    /**
     * Automatically fix common configuration issues
     */
    public async autoFixConfiguration(): Promise<void> {
        const config = vscode.workspace.getConfiguration('codependent');
        const contextBufferSize = config.get<number>('contextBufferSize', 65536);
        const maxTokens = config.get<number>('maxTokens', 32768);

        let fixed = false;

        // Fix context buffer size if too small
        if (contextBufferSize <= maxTokens) {
            const newBufferSize = Math.ceil(maxTokens * 1.5);
            await config.update('contextBufferSize', newBufferSize, vscode.ConfigurationTarget.Global);
            fixed = true;
            console.log(`Auto-fixed: Context buffer size increased to ${newBufferSize}`);
        }

        // Fix temperature if out of range
        const temperature = config.get<number>('temperature', 0.7);
        if (temperature < 0 || temperature > 2) {
            const newTemperature = Math.max(0, Math.min(2, temperature));
            await config.update('temperature', newTemperature, vscode.ConfigurationTarget.Global);
            fixed = true;
            console.log(`Auto-fixed: Temperature adjusted to ${newTemperature}`);
        }

        // Fix max tokens if too low
        if (maxTokens < 256) {
            await config.update('maxTokens', 1024, vscode.ConfigurationTarget.Global);
            fixed = true;
            console.log(`Auto-fixed: Max tokens increased to 1024`);
        }

        if (fixed) {
            vscode.window.showInformationMessage(
                'Configuration automatically fixed! Changes will take effect immediately.',
                'View Settings'
            ).then(action => {
                if (action === 'View Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'codependent');
                }
            });
        } else {
            vscode.window.showInformationMessage('No automatic fixes were needed.');
        }
    }

    /**
     * Check if a string is a valid URL
     */
    private isValidUrl(urlString: string): boolean {
        try {
            const url = new URL(urlString);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Get configuration recommendations based on usage patterns
     */
    public getUsageBasedRecommendations(): string[] {
        const recommendations: string[] = [];
        const config = vscode.workspace.getConfiguration('codependent');

        // Check workspace type for contextual recommendations
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            // Add language-specific recommendations
            const openFiles = vscode.window.tabGroups.all.flatMap(group => 
                group.tabs.filter(tab => tab.input instanceof vscode.TabInputText)
                    .map(tab => (tab.input as vscode.TabInputText).uri.fsPath)
            );

            const hasLargeFiles = openFiles.some(file => {
                try {
                    const stats = require('fs').statSync(file);
                    return stats.size > 100000; // 100KB+
                } catch {
                    return false;
                }
            });

            if (hasLargeFiles) {
                recommendations.push('• Consider increasing context buffer size for large file analysis');
            }

            // Language-specific recommendations
            const hasPython = openFiles.some(file => file.endsWith('.py'));
            const hasJavaScript = openFiles.some(file => file.endsWith('.js') || file.endsWith('.ts'));
            const hasMarkdown = openFiles.some(file => file.endsWith('.md'));

            if (hasPython) {
                recommendations.push('• For Python development: Consider temperature 0.3-0.5 for precise code generation');
            }
            if (hasJavaScript) {
                recommendations.push('• For JavaScript/TypeScript: Increase max tokens to 4096+ for complex implementations');
            }
            if (hasMarkdown) {
                recommendations.push('• For documentation: Use temperature 0.6-0.8 for natural language generation');
            }
        }

        return recommendations;
    }
}
