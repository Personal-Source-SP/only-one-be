# ==========================================
# Stage 0: Base
# Cài đặt tools và tạo user CHỈ MỘT LẦN
# ==========================================
FROM public.ecr.aws/docker/library/node:20.1.0-slim AS base

# Cài đặt các công cụ cần thiết
RUN apt-get update && apt-get install -y \
    git \
    gettext \
    python3 \
    make \
    g++ \
    dumb-init \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set working directory
WORKDIR /app

# Sử dụng user 'node' có sẵn trong base image và cấp quyền thư mục làm việc
RUN chown -R node:node /app

# ==========================================
# Stage 1: Dependencies
# Cài đặt ALL dependencies
# ==========================================
FROM base AS dependencies

USER node

# Copy package files
COPY --chown=node:node package*.json ./

# Cài tất cả dependencies (bao gồm devDependencies để build)
RUN npm ci

# ==========================================
# Stage 2: Build
# Build ứng dụng NestJS
# ==========================================
FROM base AS build

USER node

# Copy node_modules từ dependencies stage
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

# Copy package files
COPY --chown=node:node package*.json ./

# Copy source code và config files
COPY --chown=node:node src ./src
COPY --chown=node:node tsconfig*.json ./
COPY --chown=node:node nest-cli.json ./
COPY --chown=node:node ormconfig.ts ./

# Set build environment
ENV NODE_ENV=production

# Build application
RUN npm run build

# Remove devDependencies sau khi build (optional, tối ưu size)
RUN npm prune --production

# ==========================================
# Stage 3: Production Dependencies
# Cài CHỈ production dependencies
# ==========================================
FROM base AS prod-deps

USER node

COPY --chown=node:nodejs package*.json ./

# Chỉ cài production dependencies
RUN npm ci && \
    npm cache clean --force

# ==========================================
# Stage 4: Runner (Final Image)
# Image cuối cùng - production ready
# ==========================================
FROM base AS runner

# Build arguments
ARG SWAGGER_VERSION
ARG BUILD_DATE
ARG VCS_REF

# Environment variables
ENV NODE_ENV=production
ENV SWAGGER_VERSION=${SWAGGER_VERSION}
ENV PORT=3001

# Labels (metadata)
LABEL maintainer="admin@oo.com" \
      version="${SWAGGER_VERSION}" \
      build-date="${BUILD_DATE}" \
      vcs-ref="${VCS_REF}" \
      description="NestJS Application"

USER node

# Tạo .buildenv file với build info
RUN echo "SWAGGER_VERSION=${SWAGGER_VERSION}" >> .buildenv && \
    echo "BUILD_DATE=${BUILD_DATE}" >> .buildenv && \
    echo "VCS_REF=${VCS_REF}" >> .buildenv

# Copy production dependencies
COPY --from=prod-deps --chown=node:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=node:nodejs /app/dist ./dist
COPY --from=build --chown=node:nodejs /app/ormconfig.ts ./

# Copy configuration files
COPY --chown=node:nodejs package.json ./
COPY --chown=node:nodejs .env.sample ./

# Copy và set permission cho entrypoint
COPY --chown=node:nodejs docker/entrypoint.sh ./entrypoint.sh
# Normalize line endings (fix CRLF issues from Windows)
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Sử dụng dumb-init để handle signals
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["/bin/sh", "/app/entrypoint.sh"]