# ==========================================
# Stage 1: Base (Minimal)
# Chỉ cài tools cần thiết cho runtime
# ==========================================
FROM public.ecr.aws/docker/library/node:20.1.0-slim AS base

RUN apt-get update && apt-get install -y \
    dumb-init \
    gettext \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app
RUN chown -R node:node /app

# ==========================================
# Stage 2: Dependencies
# Cài đặt ALL dependencies
# ==========================================
FROM base AS dependencies
USER node
WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci

# ==========================================
# Stage 3: Build
# Build ứng dụng NestJS
# ==========================================
FROM dependencies AS build
USER node
WORKDIR /app

COPY --chown=node:node ./src ./src
COPY --chown=node:node ./ts*.json ./
COPY --chown=node:node package*.json ./
COPY --chown=node:node nest-cli.json ./
COPY --chown=node:node ormconfig.ts ./

ENV NODE_ENV=production

RUN npm run build
RUN npm prune --production

# ==========================================
# Stage 4: Runner (Final Image)
# Image cuối cùng - production ready
# ==========================================
FROM base AS runner
USER node
WORKDIR /app

# Build arguments
ARG SWAGGER_VERSION
ARG BUILD_DATE
ARG VCS_REF

# Environment variables
ENV PORT=3001
ENV NODE_ENV=production
ENV SWAGGER_VERSION=${SWAGGER_VERSION}

# Labels (metadata)
LABEL maintainer="admin@oo.com" \
      version="${SWAGGER_VERSION}" \
      build-date="${BUILD_DATE}" \
      vcs-ref="${VCS_REF}" \
      description="NestJS Application"

RUN echo "SWAGGER_VERSION=${SWAGGER_VERSION}" >> .buildenv && \
    echo "BUILD_DATE=${BUILD_DATE}" >> .buildenv && \
    echo "VCS_REF=${VCS_REF}" >> .buildenv

COPY --from=dependencies --chown=node:node app/node_modules ./node_modules

COPY --from=build --chown=node:node app/dist ./dist
COPY --from=build --chown=node:node app/ormconfig.ts ./ormconfig.ts

COPY --chown=node:node package.json ./
COPY --chown=node:node .env.sample ./
COPY --chown=node:node ./docker/entrypoint.sh ./

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start application
RUN sed -i 's/\r$//' ./entrypoint.sh && \
    chmod +x ./entrypoint.sh && \
    chown node:node ./entrypoint.sh

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/bin/sh", "entrypoint.sh"]