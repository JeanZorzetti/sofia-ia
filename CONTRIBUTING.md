# Contributing to Sofia AI

Thank you for your interest in contributing to Sofia AI! We welcome contributions of all kinds.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)

---

## Code of Conduct

Be respectful, constructive, and inclusive. We expect all contributors to maintain a welcoming environment.

---

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sofia-ia.git
   cd sofia-ia
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/JeanZorzetti/sofia-ia.git
   ```
4. Follow the [Development Setup](#development-setup) instructions

---

## How to Contribute

### Reporting Bugs

Use [GitHub Issues](https://github.com/JeanZorzetti/sofia-ia/issues) with the **Bug Report** template. Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node.js version, browser)
- Screenshots if applicable

### Suggesting Features

Use [GitHub Issues](https://github.com/JeanZorzetti/sofia-ia/issues) with the **Feature Request** template. Describe:
- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered

### Contributing Code

1. Check existing issues to avoid duplicating work
2. For major changes, open an issue first to discuss
3. For small fixes (typos, bugs), go ahead and PR directly

---

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with `pgvector` extension
- Redis (optional but recommended)
- Git

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Edit .env.local with your credentials:
# - DATABASE_URL (PostgreSQL)
# - JWT_SECRET (any random string)
# - GROQ_API_KEY (from console.groq.com)
# - HUGGINGFACE_API_KEY (from huggingface.co)

# Set up database
npx prisma generate
npx prisma db push

# Start development
npm run dev
```

### Project Structure

```
src/
├── app/
│   ├── api/          # API routes (Next.js Route Handlers)
│   └── dashboard/    # Dashboard pages
├── components/        # Reusable React components
├── lib/
│   ├── ai/           # AI providers and utilities
│   └── prisma.ts     # Prisma client singleton
└── hooks/            # Custom React hooks
```

---

## Pull Request Process

1. **Branch naming**: Use `feat/description`, `fix/description`, `docs/description`

2. **Commit messages**: Follow [Conventional Commits](https://conventionalcommits.org):
   - `feat:` — new feature
   - `fix:` — bug fix
   - `docs:` — documentation
   - `refactor:` — code refactoring
   - `test:` — tests

3. **Before submitting**:
   - Run `npx tsc --noEmit` to check TypeScript
   - Test your changes manually
   - Update documentation if needed

4. **PR description**: Include:
   - What changed and why
   - Screenshots for UI changes
   - Related issue number (if applicable)

5. **Review**: PRs require at least one approval from a maintainer

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types when possible
- Always define interfaces for complex objects

### Next.js Patterns (Critical)

```typescript
// Route handlers MUST use async params (Next.js 16+)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // Always await params!
  // ...
}

// Always use the Prisma singleton
import { prisma } from '@/lib/prisma'
// NEVER: new PrismaClient() in route handlers
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Use `'use client'` only when needed (prefer server components)

### API Responses

```typescript
// Success
return NextResponse.json({ success: true, data: result })

// Error
return NextResponse.json(
  { success: false, error: 'Message' },
  { status: 400 }
)
```

---

## Testing

Currently the project uses manual testing. We welcome contributions to add:
- Unit tests with Jest/Vitest for `lib/ai/` utilities
- Integration tests for critical API routes
- E2E tests with Playwright

---

## Questions?

- Open a [GitHub Discussion](https://github.com/JeanZorzetti/sofia-ia/discussions)
- Email: [contato@roilabs.com.br](mailto:contato@roilabs.com.br)

Thank you for contributing to Sofia AI!
