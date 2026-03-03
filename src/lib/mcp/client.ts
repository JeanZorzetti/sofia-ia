/**
 * MCP Client — connects to external MCP servers via HTTP JSON-RPC 2.0
 * Protocol: https://spec.modelcontextprotocol.io/specification/2024-11-05/
 */

export interface McpTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
}

export interface McpToolResult {
  content: Array<{ type: string; text?: string }>
  isError?: boolean
}

export class McpClient {
  private async rpc(
    url: string,
    method: string,
    params?: unknown,
    headers?: Record<string, string>
  ): Promise<unknown> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params ?? {},
      }),
    })

    if (!res.ok) {
      throw new Error(`MCP server error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()

    if (data.error) {
      throw new Error(`MCP error [${data.error.code}]: ${data.error.message}`)
    }

    return data.result
  }

  async initialize(url: string, headers?: Record<string, string>): Promise<void> {
    await this.rpc(url, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'sofia-ai', version: '1.0.0' },
    }, headers)
  }

  async listTools(url: string, headers?: Record<string, string>): Promise<McpTool[]> {
    try {
      await this.initialize(url, headers)
    } catch {
      // Some servers skip initialize
    }

    const result = await this.rpc(url, 'tools/list', {}, headers) as { tools?: McpTool[] }
    return result.tools ?? []
  }

  async callTool(
    url: string,
    name: string,
    args: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<McpToolResult> {
    const result = await this.rpc(url, 'tools/call', { name, arguments: args }, headers) as McpToolResult
    return result
  }
}

export const mcpClient = new McpClient()
