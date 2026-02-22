# Contributing to Sofia AI

Thank you for your interest in contributing to Sofia AI! This guide helps you go from zero to your first merged PR.

## Table of Contents

- [First-Time Contributors](#first-time-contributors)
- [Good First Issues](#good-first-issues)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Community](#community)

---

## First-Time Contributors

Never contributed to an open-source project before? Start here.

### Step-by-step: your first contribution

**1. Fork and clone**

```bash
# Fork on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/sofia-ia.git
cd sofia-ia
git remote add upstream https://github.com/JeanZorzetti/sofia-ia.git
```

**2. Create a branch**

```bash
git checkout -b fix/your-description
# Examples:
# fix/login-error-message
# feat/agent-export-json
# docs/improve-readme
```

**3. Make your change, test it, commit**

```bash
git add src/app/...
git commit -m "fix: corrige mensagem de erro no login"
```

**4. Push and open a PR**

```bash
git push origin fix/your-description
# Then open a PR on GitHub pointing to main
```

**5. Respond to review comments**

We'll review within 2-3 business days. After approval, we merge and your name is in the history forever.

---

## Good First Issues

These are real tasks that don't require deep knowledge of the codebase:

| Label | Description | Where to look |
|---|---|---|
| `good first issue` | Curated beginner tasks | [GitHub Issues](https://github.com/JeanZorzetti/sofia-ia/issues?q=label%3A%22good+first+issue%22) |
| `docs` | Improve documentation, fix typos | `content/`, `README.md` |
| `UI bug` | Small visual fixes | `src/app/`, `src/components/` |
| `translation` | Improve EN translations | `src/app/en/` |
| `test` | Add unit or integration tests | `src/__tests__/` |

**Don't see a task you like?** Ask on [Discord](https://sofiaia.roilabs.com.br/comunidade) in **#contribute** and we'll find something for you.

---

## Development Setup

### Option A: Local setup (recommended for contributors)

**Prerequisites:** Node.js 20+, PostgreSQL 15+ with `pgvector`, Git

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
```

Minimum `.env.local` for development:

```env
# Database (PostgreSQL with pgvector)
DATABASE_URL="postgresql://user:password@localhost:5432/sofia_dev"

# Auth (any random 32+ char string)
JWT_SECRET="dev-secret-change-in-production"

# AI (get a free key at console.groq.com)
GROQ_API_KEY="gsk_..."

# Embeddings (get a free key at huggingface.co)
HUGGINGFACE_API_KEY="hf_..."
```

```bash
# 3. Set up database schema
npx prisma generate
npx prisma db push

# 4. Start development server
npm run dev
# → http://localhost:3000
```

### Option B: Docker Compose (fastest start)

```bash
# Clone the repo
git clone https://github.com/JeanZorzetti/sofia-ia.git
cd sofia-ia

# Copy and edit environment
cp .env.example .env.local
# Edit .env.local with your API keys (GROQ_API_KEY is the only required one)

# Start everything (app + postgres + pgvector)
docker compose up -d

# Run migrations
docker compose exec app npx prisma db push

# Open
open http://localhost:3000
```

> **Tip:** The Docker setup uses the `postgres:16-pgvector` image which comes with pgvector pre-installed.

### Verify setup

After `npm run dev` or Docker, open `http://localhost:3000`. You should see the landing page. Register an account and you'll be in the dashboard.

---

## Project Structure

```
sofia-next/
├── content/
│   └── blog/               # MDX blog articles (SEO content)
├── docs/
│   └── strategy/           # Roadmap and strategy documents
├── prisma/
│   └── schema.prisma       # Database schema
├── public/                 # Static assets
└── src/
    ├── app/
    │   ├── api/            # API routes (Next.js Route Handlers)
    │   │   ├── agents/     # CRUD for AI agents
    │   │   ├── auth/       # Login, register, session
    │   │   ├── billing/    # Subscription and plans
    │   │   ├── chat/       # Chat and IDE endpoints
    │   │   ├── kb/         # Knowledge Base + RAG
    │   │   └── orchestrations/ # Multi-agent orchestrations
    │   ├── dashboard/      # Dashboard pages (auth required)
    │   │   ├── agents/
    │   │   ├── ide/
    │   │   ├── kb/
    │   │   └── orchestrations/
    │   ├── blog/           # Blog with MDX SSG
    │   ├── comunidade/     # Public community page
    │   ├── preco/          # Pricing page
    │   └── whitelabel/     # White-label landing page
    ├── components/
    │   └── ui/             # shadcn/ui components
    ├── lib/
    │   ├── ai/
    │   │   ├── groq.ts     # Groq SDK (lazy init)
    │   │   └── embeddings.ts # HuggingFace embeddings
    │   ├── auth.ts         # JWT auth helpers
    │   └── prisma.ts       # Prisma singleton (always use this)
    └── hooks/              # Custom React hooks
```

### Key architectural decisions

- **Next.js App Router** — all pages use the new `/app` directory structure
- **Server Components by default** — use `'use client'` only when you need interactivity
- **Prisma singleton** — always `import { prisma } from '@/lib/prisma'`, never `new PrismaClient()`
- **Groq lazy init** — always `getGroqClient()`, never `new Groq()` at module level (breaks build)
- **Multi-tenant** — every DB query must filter by `userId` (middleware enforces this, but be careful)

---

## How to Contribute

### Bug reports

Use [GitHub Issues](https://github.com/JeanZorzetti/sofia-ia/issues) → **Bug Report** template. Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS
- Screenshot or screen recording (always helpful)

### Feature suggestions

Use [GitHub Issues](https://github.com/JeanZorzetti/sofia-ia/issues) → **Feature Request** template. For large features, open an issue first to discuss before writing code.

### Contributing code

1. Check [open issues](https://github.com/JeanZorzetti/sofia-ia/issues) — someone may already be working on it
2. Comment on the issue to claim it ("I'll work on this")
3. For small fixes (typos, obvious bugs), submit a PR directly without an issue

### Blog articles (MDX)

Anyone can contribute blog articles in `content/blog/`. Copy an existing `.mdx` file as a template, fill in the frontmatter, write in Portuguese (primary) or English, and submit a PR.

---

## Pull Request Process

### Branch naming

```
feat/agent-export-json       # New feature
fix/kb-upload-large-files    # Bug fix
docs/add-docker-guide        # Documentation
refactor/auth-middleware      # Code improvement
test/orchestrations-unit      # Tests
```

### Commit messages (Conventional Commits)

```
feat: adiciona export de orquestração em JSON
fix: corrige erro 500 ao fazer upload de PDF > 10MB
docs: adiciona seção de Docker no CONTRIBUTING
refactor: extrai lógica de auth para helper
test: adiciona testes unitários para lib/ai/groq
```

### Before submitting

```bash
# Check TypeScript
npx tsc --noEmit

# Check linting
npm run lint

# Build (make sure it compiles)
npm run build
```

### PR description template

```markdown
## What changed
- Brief description of what you did

## Why
- The problem this solves

## How to test
1. Step to reproduce before fix
2. Steps to verify the fix works

## Screenshots (for UI changes)
```

PRs require one maintainer approval. We aim to review within 2-3 business days.

---

## Coding Standards

### TypeScript

```typescript
// Good: explicit types
interface AgentConfig {
  role: string
  prompt: string
  model: string
}

// Avoid: any
const data: any = response.json() // ❌
const data: AgentConfig = response.json() // ✅
```

### Next.js 16 — async params (critical)

```typescript
// Route handlers MUST await params (Next.js 16+ requirement)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // ✅ always await
}

// This will cause a build error:
{ params }: { params: { id: string } } // ❌
```

### API response shape

```typescript
// Always use this shape
return NextResponse.json({ success: true, data: result })
return NextResponse.json({ success: false, error: 'Message' }, { status: 400 })
```

### Multi-tenancy (critical)

```typescript
// Every query must be scoped to the authenticated user
const agents = await prisma.agent.findMany({
  where: { userId: auth.userId }  // ✅ always include userId
})

// Never query without user scope
const agents = await prisma.agent.findMany() // ❌ data leak risk
```

### React components

```typescript
// Prefer server components (no 'use client')
export default async function PageName() {
  const data = await fetchData() // runs on server
  return <div>{data.name}</div>
}

// Use 'use client' only when you need useState, useEffect, event handlers
'use client'
export function InteractiveComponent() {
  const [open, setOpen] = useState(false)
  // ...
}
```

---

## Testing

### Running tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests (requires dev server running)
npm run test:e2e
```

### What to test

- `lib/ai/` utilities — unit tests with mocked API calls
- Critical API routes (auth, billing) — integration tests
- Complex UI flows — E2E with Playwright

### Where tests live

```
src/__tests__/           # Unit and integration tests
e2e/                     # Playwright E2E tests
```

We welcome PRs that add test coverage. The project target is 60%+ coverage for `lib/`.

---

## Community

- **Discord**: [sofiaia.roilabs.com.br/comunidade](https://sofiaia.roilabs.com.br/comunidade) — chat in **#contribute**
- **GitHub Discussions**: For longer-form technical discussions
- **Issues**: For bugs and feature requests
- **Email**: [contato@roilabs.com.br](mailto:contato@roilabs.com.br)

---

## Code of Conduct

Be respectful, constructive, and inclusive. We maintain a welcoming environment for contributors of all experience levels. Harassment or discrimination of any kind will not be tolerated.

---

Thank you for contributing to Sofia AI! Every PR, bug report, and suggestion makes the platform better for everyone.
