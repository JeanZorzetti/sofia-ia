import { executePlugin } from '@/lib/plugins/executor'

export interface SkillExecutionResult {
  success: boolean
  output?: unknown
  error?: string
}

export async function executeToolSkill(
  toolCode: string,
  input: Record<string, unknown>
): Promise<SkillExecutionResult> {
  return executePlugin(toolCode, input)
}
