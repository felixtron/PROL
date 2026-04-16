# ─────────────────────────────────────────────────────────────────────────────
# PROL - Multi-stage Docker build for Next.js monorepo (Turborepo + pnpm)
# Produces an optimized standalone image for apps/web
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Base image with pnpm ───────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ─── Stage 2: Install dependencies ───────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/ai/package.json ./packages/ai/
COPY packages/email/package.json ./packages/email/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/content-factory/package.json ./packages/content-factory/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN pnpm install --frozen-lockfile

# ─── Stage 3: Build ──────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN pnpm --filter @prol/db exec prisma generate

# Build web app (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @prol/web build

# ─── Stage 4: Runtime image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (includes server.js + minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy Prisma schema + generated client (needed at runtime for migrations)
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0 ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm/prisma@5.22.0 ./node_modules/.pnpm/prisma@5.22.0

USER nextjs

EXPOSE 3000

# Run Next.js server (apps/web/server.js is the standalone entry point)
CMD ["node", "apps/web/server.js"]
