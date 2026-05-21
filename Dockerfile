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
WORKDIR /app

ENV HUSKY=0 \
    PUPPETEER_SKIP_DOWNLOAD=true

COPY --chown=node:node package*.json ./
RUN npm ci

# ==========================================
# Stage 3: Build
# ==========================================
FROM dependencies AS build
USER node
WORKDIR /app

COPY --chown=node:node ./src ./src
COPY --chown=node:node ./ts*.json ./
COPY --chown=node:node package*.json ./
COPY --chown=node:node nest-cli.json ./
COPY --chown=node:node ormconfig.ts ./

RUN npm run build
RUN npm prune --omit=dev

# ==========================================
# Stage 4: Runner (production)
# ==========================================
FROM base AS runner

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

USER node
WORKDIR /app

ARG SWAGGER_VERSION
ARG BUILD_DATE
ARG VCS_REF

ENV PORT=3001 \
    NODE_ENV=production \
    SWAGGER_VERSION=${SWAGGER_VERSION} \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_HEADLESS=true \
    PUPPETEER_SKIP_DOWNLOAD=true

LABEL maintainer="admin@oo.com" \
      version="${SWAGGER_VERSION}" \
      build-date="${BUILD_DATE}" \
      vcs-ref="${VCS_REF}" \
      description="NestJS Application"

RUN echo "SWAGGER_VERSION=${SWAGGER_VERSION}" >> .buildenv && \
    echo "BUILD_DATE=${BUILD_DATE}" >> .buildenv && \
    echo "VCS_REF=${VCS_REF}" >> .buildenv

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/ormconfig.ts ./ormconfig.ts

COPY --chown=node:node package.json ./
COPY --chown=node:node .env.sample ./
COPY --chown=node:node ./docker/entrypoint.sh ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health/live', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

USER root
RUN sed -i 's/\r$//' ./entrypoint.sh && \
    chmod +x ./entrypoint.sh && \
    chown node:node ./entrypoint.sh
USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/bin/sh", "entrypoint.sh"]
