import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromApiKey } from '@/lib/api-key-auth'
import { SOFIA_MCP_TOOLS, executeSofiaMcpTool } from '@/lib/mcp/server'

export async function POST(request: NextRequest) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized. Use Authorization: Bearer <api-key>' }, id: null },
      { status: 401 }
    )
  }

  let body: { jsonrpc: string; method: string; params?: Record<string, unknown>; id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
      { status: 400 }
    )
  }

  const { method, params, id } = body
  const reply = (result: unknown) => NextResponse.json({ jsonrpc: '2.0', result, id })
  const error = (code: number, message: string) =>
    NextResponse.json({ jsonrpc: '2.0', error: { code, message }, id })

  switch (method) {
    case 'initialize':
      return reply({
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'sofia-ai', version: '1.0.0' },
      })

    case 'tools/list':
      return reply({ tools: SOFIA_MCP_TOOLS })

    case 'tools/call': {
      const { name, arguments: args } = params as { name: string; arguments: Record<string, unknown> }
      if (!name) return error(-32602, 'Missing tool name')
      const result = await executeSofiaMcpTool(name, args || {}, auth.userId)
      return reply(result)
    }

    default:
      return error(-32601, `Method not found: ${method}`)
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Polaris IA — MCP Server',
    version: '1.0.0',
    protocol: '2024-11-05',
    tools: SOFIA_MCP_TOOLS.map(t => t.name),
  })
}
