FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# ── Claude Code CLI (subscription-billed agent models) ──────────────────────────
# Members whose model is `claude-*` are routed through ClaudeCliService, which
# spawns this CLI. Auth is via the CLAUDE_CODE_OAUTH_TOKEN env var (generate it
# locally with `claude setup-token` and set it on the EasyPanel service). Do NOT
# set ANTHROPIC_API_KEY here — that would switch the CLI to pay-per-token billing.
RUN apk add --no-cache git ripgrep libstdc++ libgcc && \
    npm i -g @anthropic-ai/claude-code
# Use the apk ripgrep (the bundled one is glibc and breaks on Alpine/musl).
ENV USE_BUILTIN_RIPGREP=0
# The `nextjs` user's HOME may be read-only; give the CLI a writable config dir.
ENV CLAUDE_CONFIG_DIR=/tmp/.claude

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate || echo 'DB push skipped'; node server.js"]
