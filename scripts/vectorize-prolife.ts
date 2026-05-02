import { processDocumentVectorization } from '../src/lib/knowledge-context-v2'
import { prisma } from '../src/lib/prisma'

const DOC_ID = '90a26e84-d410-46a9-84a4-b46c64f643be'

async function main() {
  const doc = await prisma.knowledgeDocument.findUnique({
    where: { id: DOC_ID },
    select: { id: true, title: true, content: true },
  })

  if (!doc) {
    console.error('Documento não encontrado')
    process.exit(1)
  }

  console.log(`Vetorizando: "${doc.title}"`)
  console.log(`Conteúdo: ${doc.content.length} chars`)

  await processDocumentVectorization(doc.id, doc.content)

  const updated = await prisma.knowledgeDocument.findUnique({
    where: { id: DOC_ID },
    select: { status: true, chunks: true },
  })

  console.log('Status final:', updated?.status)
  console.log('Chunks gerados:', Array.isArray(updated?.chunks) ? updated.chunks.length : 'N/A')

  await prisma.$disconnect()
}

main().catch(e => {
  console.error('Erro:', e.message)
  prisma.$disconnect()
  process.exit(1)
})
