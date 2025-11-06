# ---- Base Node ----
FROM public.ecr.aws/docker/library/node:20.1.0-slim AS base

# ---- Clean apt ----
RUN apt-get update && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ---- Workdir ----
WORKDIR /app
RUN mkdir src
RUN chown -R node:node /app
USER node

# ---- Dependencies ----
FROM base AS dependencies
COPY --chown=node:node ./package*.json ./
RUN npm ci

# ---- Build ----
FROM dependencies AS build
WORKDIR /app
COPY ./src /app/src
COPY ./ts*.json ./
COPY nest-cli.json ./
COPY ormconfig.ts ./
RUN npm run build

# ---- Polishing ----
FROM base AS polishing
COPY --chown=node:node ./package*.json ./
RUN npm install

# --- Release with Alpine ----
FROM base AS release

# ---- Arguments ----
ARG SWAGGER_VERSION
ENV SWAGGER_VERSION $SWAGGER_VERSION

# ---- Workdir ----
WORKDIR /app
RUN echo "SWAGGER_VERSION=$SWAGGER_VERSION" >> .buildenv
RUN mkdir -p dist node_modules
RUN chown -R node:node /app
RUN echo "Build with version:" ${SWAGGER_VERSION}

# ---- Copy dependencies ----
USER node
COPY --from=polishing app/node_modules node_modules/
COPY --from=build app/dist dist/
COPY --from=build app/ormconfig.ts ./

# ---- Copy entrypoint ----
COPY ./docker/entrypoint.sh ./entrypoint.sh
COPY .env.sample ./.env.sample
COPY package.json ./package.json

# ---- CMD ----
CMD ["/bin/sh", "/app/entrypoint.sh"]
EXPOSE 3001
