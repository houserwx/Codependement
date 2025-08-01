# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a VS Code extension project. Please use the get_vscode_api with a query as input to fetch the latest VS Code API references.

## Project Context

This extension provides chat functionality with locally hosted Ollama LLM models, featuring:

- **Ask Mode**: Simple question-answer interactions with the LLM
- **Agent Mode**: Advanced capabilities including file operations, terminal commands, workspace management, and code analysis similar to Claude Sonnet in GitHub Copilot

## Key Features to Implement

- Webview-based chat interface
- Ollama API integration for local LLM communication
- File system operations (read, write, search, edit files)
- Terminal command execution
- Workspace analysis and code understanding
- Code generation and refactoring capabilities
- Git integration
- Extension management
- Project structure analysis

## Technical Stack

- TypeScript
- VS Code Extension API
- Ollama REST API
- esbuild for bundling
- ESLint for code quality

## Development Guidelines

- Use VS Code extension best practices
- Implement proper error handling for network requests
- Ensure secure handling of file operations
- Follow TypeScript strict mode conventions
- Use proper disposal patterns for resources
- Implement comprehensive logging for debugging
