# syntax=docker/dockerfile:1.4
# ==========================================
# Stage 1: Base (build + runtime tooling)
# ==========================================
FROM public.ecr.aws/docker/library/node:20.18.1-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    gettext \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app
RUN chown -R node:node /app

# ==========================================
# Stage 2: Dependencies (all deps for build)
# ==========================================
FROM base AS dependencies
USER node

ENV HUSKY=0 \
    PUPPETEER_SKIP_DOWNLOAD=true

COPY --chown=node:node package*.json ./
# BuildKit cache mount: npm cache is reused across builds (no re-download)
RUN --mount=type=cache,target=/home/node/.npm,uid=1000 \
    npm ci --prefer-offline

# ==========================================
# Stage 3: Build
# ==========================================
FROM dependencies AS build

# Config files first (change less frequently) → better cache hit rate
COPY --chown=node:node nest-cli.json ./
COPY --chown=node:node ts*.json ./
COPY --chown=node:node ormconfig.ts ./
# Source code last (changes most frequently)
COPY --chown=node:node ./src ./src

RUN npm run build
RUN npm prune --omit=dev

# ==========================================
# Stage 4: Runner (production)
# ==========================================
FROM base AS runner

# Install ca-certificates and curl for healthcheck/HTTPS calls
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ARG SWAGGER_VERSION
ARG BUILD_DATE
ARG VCS_REF

LABEL maintainer="admin@oo.com" \
      version="${SWAGGER_VERSION}" \
      build-date="${BUILD_DATE}" \
      vcs-ref="${VCS_REF}" \
      description="NestJS Application"

USER node
WORKDIR /app

ENV PORT=3001 \
    NODE_ENV=production \
    SWAGGER_VERSION=${SWAGGER_VERSION} \
    # Limit Node.js heap; tune this value to match container memory limits
    NODE_OPTIONS="--max-old-space-size=512"

RUN echo "SWAGGER_VERSION=${SWAGGER_VERSION}" >> .buildenv && \
    echo "BUILD_DATE=${BUILD_DATE}" >> .buildenv && \
    echo "VCS_REF=${VCS_REF}" >> .buildenv

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
# --chmod=755 sets executable bit at copy time — no need for a separate USER root chmod step
COPY --chown=node:node --chmod=755 ./docker/entrypoint.sh ./entrypoint.sh

EXPOSE 3001

# Uses curl (lightweight) instead of spawning a new node process every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3001}/api/health/live || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/bin/sh", "entrypoint.sh"]

# ==========================================
# Stage 5: Migration (CLI only — NOT deployed to production)
# Build target: docker build --target migration -t app:migration .
# ==========================================
FROM runner AS migration
# TypeScript source required for TypeORM CLI (ts-node) migration commands
COPY --from=build --chown=node:node /app/ormconfig.ts ./ormconfig.ts
