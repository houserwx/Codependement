# MCP Integration Test

This document outlines how to test the MCP (Model Context Protocol) integration in the CoDependement VS Code extension.

## Testing Steps

### 1. Basic MCP Service Test
- Open VS Code with the CoDependement extension
- Open the Agent Mode chat
- Check the VS Code Developer Console (Help > Toggle Developer Tools) for MCP initialization logs
- Look for messages like:
  ```
  Discovering MCP servers...
  Connecting to MCP server: filesystem
  ```

### 2. MCP Tool Availability Test  
- In the Agent Mode chat, ask: "What tools are available?"
- The response should include both built-in tools and MCP tools (prefixed with `[MCP filesystem]`)
- You should see tools like:
  - `mcp_filesystem_read_file`: [MCP filesystem] Read a file from the filesystem
  - `mcp_filesystem_write_file`: [MCP filesystem] Write content to a file

### 3. MCP Tool Execution Test
- Test MCP file reading: "Use the MCP filesystem tool to read package.json"
- The agent should respond with:
  ```
  [TOOL: mcp_filesystem_read_file]
  Parameters: {"path": "package.json"}
  [/TOOL]
  ```

### 4. Command Palette Test
- Open Command Palette (Ctrl+Shift+P)
- Search for "CoDependement: Refresh MCP Tools"
- Execute the command to refresh MCP server connections

## Expected MCP Servers

By default, the extension will try to discover and connect to:
- **filesystem**: Provides file system operations via MCP
- Other common MCP servers if available

## Configuration

MCP integration can be configured in VS Code settings:
- `codependent.enableMcp`: Enable/disable MCP integration (default: true)
- `codependent.mcpServers`: Array of custom MCP server configurations

Example custom MCP server configuration:
```json
{
  "codependent.mcpServers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"]
    }
  ]
}
```

## Troubleshooting

If MCP integration isn't working:
1. Check the Developer Console for error messages
2. Ensure npx and Node.js are available in PATH
3. Try the "Refresh MCP Tools" command
4. Check that MCP packages are available globally or can be installed via npx

## Success Indicators

- MCP servers connect without errors
- MCP tools appear in the available tools list with `[MCP servername]` prefix
- MCP tools can be executed and return results
- No TypeScript compilation errors
- Extension activates and MCP service initializes properly
