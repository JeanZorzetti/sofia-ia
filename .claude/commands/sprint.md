Implemente APENAS o sprint/feature especificado: $ARGUMENTS

## Regras de execução

1. **Escopo fixo**: implemente somente o que foi pedido. Não avance para o próximo sprint automaticamente.
2. **Leia o spec primeiro**: antes de qualquer código, ler a seção correspondente do roadmap em `docs/strategy_V3/` ou o arquivo indicado.
3. **Execute, não analise**: após ler o spec, implemente diretamente. Não explore o codebase além do necessário para a feature.

## Checklist de qualidade antes de commitar

- [ ] Params assíncronos corretos: `await params` nos route handlers (Next.js 16)
- [ ] Auth: usa `auth.id`, não `auth.userId`
- [ ] Groq SDK: lazy init (não instancia no top-level)
- [ ] Prisma: `import { prisma } from '@/lib/prisma'` (não `new PrismaClient()`)
- [ ] TypeScript: sem erros (`npm run build` ou `tsc --noEmit`)
- [ ] Env vars: nenhuma nova env var hardcoded — documentar no `.env.example` se necessário

## Ao finalizar

1. Rodar `npm run build` e corrigir qualquer erro
2. Fazer commit com mensagem descritiva: `feat: [nome do sprint/feature]`
3. Reportar o que foi implementado e o que ficou de fora (se houver)
4. **Parar aqui** — não iniciar o próximo sprint sem instrução explícita
