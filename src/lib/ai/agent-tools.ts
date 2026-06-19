// src/lib/ai/agent-tools.ts
// Teams V2.1 — fatia S1.1 (Tema A'): shared tool plumbing extracted from the OpenRouter
// path of chatWithAgent so the Groq-native path can run the SAME tool loop.
//
// V2 S1 delivered the per-member capability policy, but tool EXECUTION lived ONLY inside
// the OpenRouter branch. S1.1 extracts the two reusable pieces — building the tool defs
// and executing a single tool call — so both providers share one implementation:
//   - buildAgentToolDefs:   PURE transform of the already-fetched agentSkills/agentMcpServers
//                           into OpenAI-format tool defs (testable without DB/network).
//   - executeAgentToolCall: the MCP / tool-skill / filesystem dispatch (has I/O via lazy
//                           imports). Byte-faithful to the former inline OpenRouter logic.
//
// The OpenRouter path was refactored to call these too, so its behavior is unchanged.
import type { FunctionToolDef, TaggedMcpDef } from '@/lib/ai/model-capabilities'

/** Build the tool-skill defs + tagged MCP defs from the agent's enabled skills/servers.
 *  Pure: no I/O — it only reshapes records the caller already fetched from Prisma. The
 *  MCP tool NAME keeps the legacy wire format (`mcp__<sliced McpServer.id>__<tool>`); the
 *  per-member policy filters by `amsId` (the AgentMcpServer join-row id) in selectApiTools. */
export function buildAgentToolDefs(input: {
  agentSkills: any[]
  agentMcpServers: any[]
}): { toolSkillDefinitions: FunctionToolDef[]; mcpDefsTagged: TaggedMcpDef[] } {
  const { agentSkills, agentMcpServers } = input

  const toolSkillDefinitions: FunctionToolDef[] = agentSkills
    .filter((as: any) => (as.skill as any).type === 'tool' && (as.skill as any).toolDefinition)
    .map((as: any) => ({
      type: 'function' as const,
      function: (as.skill as any).toolDefinition as {
        name: string
        description: string
        parameters: Record<string, unknown>
      },
    }))

  const mcpDefsTagged: TaggedMcpDef[] = agentMcpServers.flatMap((ams: any) =>
    ((ams.mcpServer as any).tools as any[]).map((tool: any) => ({
      amsId: ams.id as string,
      def: {
        type: 'function' as const,
        function: {
          name: `mcp__${(ams.mcpServer as any).id.slice(0, 8)}__${tool.name}`,
          description: `[MCP: ${(ams.mcpServer as any).name}] ${tool.description || tool.name}`,
          parameters: tool.inputSchema as Record<string, unknown>,
        },
      },
    }))
  )

  return { toolSkillDefinitions, mcpDefsTagged }
}

/** Execute a single model-requested tool call and return the textual result fed back to
 *  the model. Order matches the legacy OpenRouter dispatch: MCP → tool-skill → filesystem.
 *  Errors are returned as strings (never thrown) so the tool loop keeps going. */
export async function executeAgentToolCall(input: {
  fnName: string
  fnArgs: any
  agentMcpServers: any[]
  agentSkills: any[]
  toolSkillDefinitions: FunctionToolDef[]
}): Promise<string> {
  const { fnName, fnArgs, agentMcpServers, agentSkills, toolSkillDefinitions } = input

  // Handle MCP tool calls
  if (fnName.startsWith('mcp__')) {
    const parts = fnName.split('__')
    const serverIdPrefix = parts[1]
    const toolName = parts.slice(2).join('__')
    const ams = agentMcpServers.find((s: any) => (s.mcpServer as any).id.startsWith(serverIdPrefix))
    if (ams) {
      try {
        const { mcpClient } = await import('@/lib/mcp/client')
        const mcpResult = await mcpClient.callTool(
          (ams.mcpServer as any).url,
          toolName,
          fnArgs,
          (ams.mcpServer as any).headers as Record<string, string>
        )
        return mcpResult.content.map((c: any) => c.text || '').join('\n')
      } catch (mcpErr) {
        return `MCP error: ${String(mcpErr)}`
      }
    }
    return `MCP server not found for tool: ${fnName}`
  }

  // Handle skill tool calls
  if (toolSkillDefinitions.some((t) => t.function.name === fnName)) {
    const matchedSkill = agentSkills.find(
      (as: any) => ((as.skill as any).toolDefinition as any)?.name === fnName
    )
    if (matchedSkill && (matchedSkill.skill as any).toolCode) {
      try {
        const { executeToolSkill } = await import('@/lib/skills/executor')
        const skillResult = await executeToolSkill((matchedSkill.skill as any).toolCode, fnArgs)
        return skillResult.success ? JSON.stringify(skillResult.output) : `Erro: ${skillResult.error}`
      } catch (skillErr) {
        return `Skill error: ${String(skillErr)}`
      }
    }
    return `Skill not found or has no code: ${fnName}`
  }

  // Default: filesystem tools (read-only — list_files / read_file)
  const { filesystemTools } = await import('@/lib/tools/filesystem')
  const result = await filesystemTools.execute(fnName, fnArgs)
  return typeof result === 'string' ? result : JSON.stringify(result)
}
