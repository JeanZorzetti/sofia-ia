import { PrismaClient } from '../node_modules/.prisma/client/index.js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const prisma = new PrismaClient()
const AGENT_ID = '171e5abc-ba58-450b-9377-c6dcf4caed39'

async function main() {
  const agent = await prisma.agent.findUnique({
    where: { id: AGENT_ID },
    select: { id: true, name: true, status: true, model: true, knowledgeBaseId: true },
  })
  console.log('Agent:', agent)
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
