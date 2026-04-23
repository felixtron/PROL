# ─────────────────────────────────────────────────────────────────────────────
# PROL - Multi-stage Docker build for Next.js monorepo (Turborepo + pnpm)
# Produces an optimized standalone image for apps/web
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Base image with pnpm ───────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ─── Stage 2: Build (install + generate + build) ─────────────────────────────
FROM base AS builder
# Copy everything first so pnpm can resolve workspace packages
COPY . .

# Install all deps (including dev) for the full workspace
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm --filter @prol/db exec prisma generate

# Build web app with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @prol/web build

# ─── Stage 3: Runtime image (minimal) ────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone output (includes server.js + minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy Prisma artifacts needed at runtime (for db push and client)
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma

# Pre-create the uploads dir with proper ownership so the volume mount
# from docker-compose can be written to by the nextjs user.
RUN mkdir -p apps/web/public/uploads/pdfs \
            apps/web/public/uploads/thumbnails \
            apps/web/public/uploads/assignments \
    && chown -R nextjs:nodejs apps/web/public/uploads

USER nextjs

EXPOSE 3000

# Standalone server.js is placed at apps/web/server.js
CMD ["node", "apps/web/server.js"]
