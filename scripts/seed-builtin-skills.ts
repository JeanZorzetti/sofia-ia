import { PrismaClient } from '@prisma/client'
import { BUILTIN_SKILLS } from '../src/lib/skills/registry'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding builtin skills...\n')

  for (const skill of BUILTIN_SKILLS) {
    const existing = await prisma.skill.findFirst({
      where: { name: skill.name, isBuiltin: true },
    })

    if (existing) {
      await prisma.skill.update({
        where: { id: existing.id },
        data: {
          description: skill.description,
          type: skill.type,
          category: skill.category,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toolDefinition: (skill.toolDefinition as any) ?? {},
          toolCode: skill.toolCode ?? null,
          promptBlock: skill.promptBlock ?? null,
        },
      })
      console.log(`  Updated: ${skill.name}`)
    } else {
      await prisma.skill.create({
        data: {
          name: skill.name,
          description: skill.description,
          type: skill.type,
          category: skill.category,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toolDefinition: (skill.toolDefinition as any) ?? {},
          toolCode: skill.toolCode ?? null,
          promptBlock: skill.promptBlock ?? null,
          isBuiltin: true,
          createdBy: null,
        },
      })
      console.log(`  Created: ${skill.name}`)
    }
  }

  console.log('\nBuiltin skills ready!')
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
