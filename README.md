# Ollama Chat - VS Code Extension

A powerful VS Code extension that enables seamless chat interactions with locally hosted Ollama LLM models. Features both simple Ask Mode and advanced Agent Mode with comprehensive workspace management capabilities.

## 🚀 Features

### 🤖 Multiple Chat Modes
- **Ask Mode**: Simple question-answer interactions for general queries
- **Agent Mode**: Advanced AI assistant with file operations, code analysis, and workspace management
- **General Chat**: Intelligent mode switching based on query context

### 🔧 Agent Mode Capabilities
- **File Operations**: Read, write, create, and search files in your workspace
- **Code Analysis**: Analyze project structure, review code, and provide insights
- **Workspace Management**: Get project information, list files, and navigate directories
- **Terminal Integration**: Execute commands and get system information
- **Git Integration**: Check repository status and version control information
- **Smart Context**: Understands your codebase and provides relevant suggestions

### 🎨 User Experience
- Clean, modern chat interface with VS Code theming
- Real-time model switching
- Chat history export
- Quick action buttons for common tasks
- Status bar integration
- Persistent chat sessions

## 📋 Requirements

- **Ollama**: Must be installed and running locally
  - Download from [ollama.ai](https://ollama.ai/)
  - At least one language model pulled (e.g., `ollama pull llama2`)
- **VS Code**: Version 1.102.0 or higher
- **Node.js**: For development (if building from source)

## ⚙️ Extension Settings

This extension contributes the following settings:

- `ollama-chat.baseUrl`: Base URL for Ollama API (default: `http://localhost:11434`)
- `ollama-chat.defaultModel`: Default model to use for chat (default: `llama2`)
- `ollama-chat.temperature`: Temperature for model responses (default: `0.7`)
- `ollama-chat.maxTokens`: Maximum tokens for model responses (default: `2048`)

## 🚦 Getting Started

1. **Install Ollama** if you haven't already:
   ```bash
   # Download and install from https://ollama.ai/
   # Then pull a model:
   ollama pull llama2
   ```

2. **Start Ollama**:
   ```bash
   ollama serve
   ```

3. **Open VS Code** and install this extension

4. **Start Chatting**:
   - Use `Ctrl+Shift+P` → "Ollama: Open Chat"
   - Or click the "Ollama Chat" button in the status bar
   - Or use specific modes: "Ollama: Open Ask Mode" or "Ollama: Open Agent Mode"

## 📖 Usage Examples

### Ask Mode
Perfect for general questions and explanations:
- "Explain how async/await works in JavaScript"
- "What are the best practices for error handling?"
- "How do I optimize database queries?"

### Agent Mode
Ideal for development tasks and code assistance:
- "Analyze the current project structure"
- "Review the code in the current file and suggest improvements"
- "Generate unit tests for the selected function"
- "Find all TODO comments in the project"
- "Refactor this code to improve readability"

## 🔧 Commands

- `Ollama: Open Chat` - Open the general chat interface
- `Ollama: Open Ask Mode` - Open Ask Mode for simple Q&A
- `Ollama: Open Agent Mode` - Open Agent Mode for development tasks
- `Ollama: Select Model` - Choose your default Ollama model

## 🐛 Known Issues

- File operations in Agent Mode require appropriate permissions
- Large files may take time to process
- Some models may have slower response times depending on hardware

## 🛠️ Development

To set up the development environment:

```bash
# Clone the repository
git clone <repository-url>
cd ollama-chat-extension

# Install dependencies
npm install

# Compile and watch for changes
npm run watch

# Run in Extension Development Host
# Press F5 in VS Code
```

## 📝 Release Notes

### 0.0.1

- Initial release
- Ask Mode and Agent Mode functionality
- Ollama API integration
- File operations and workspace management
- Modern chat interface with VS Code theming
- Model selection and configuration options

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) for providing the local LLM infrastructure
- VS Code team for the excellent extension API
- The open-source community for inspiration and tools

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
