// ─────────────────────────────────────────────────────────
// LEGACY: seed-workflows.ts — Disabled (old Workflow model removed)
// Flow seeds should be added to a new seed-flows.ts file
// ─────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedFlows(userId: string) {
  console.log('⚠️  seed-workflows.ts: Legacy seed skipped. Use seed-flows.ts for new flows.')
  // Flows are created via the builder UI now
}

// Keep default export for backward compatibility
export default seedFlows
