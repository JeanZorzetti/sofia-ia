import { PrismaClient } from '../node_modules/.prisma/client/index.js'
import pg from 'pg'
import { config } from 'dotenv'

config({ path: '.env.local' })

const { Pool } = pg
const prisma = new PrismaClient()
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })

const DOC_ID = '90a26e84-d410-46a9-84a4-b46c64f643be'

async function main() {
  const doc = await prisma.knowledgeDocument.findUnique({
    where: { id: DOC_ID },
    select: { title: true, status: true },
  })
  console.log('Documento:', doc?.title, '| Status:', doc?.status)

  const { rows } = await pool.query(
    `SELECT chunk_index, LEFT(chunk_text, 100) as preview,
     jsonb_array_length(embedding) as emb_dims
     FROM document_embeddings WHERE document_id = $1 ORDER BY chunk_index`,
    [DOC_ID]
  )
  console.log(`\nChunks (${rows.length}):`)
  rows.forEach(r => console.log(`  [${r.chunk_index}] dims=${r.emb_dims} | ${r.preview}...`))
}

main()
  .catch(e => console.error(e.message))
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
