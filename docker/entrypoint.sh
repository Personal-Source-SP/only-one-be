#!/bin/sh

# ---- Substitute environment variables from .buildenv ----
export $(grep -v '^#' .buildenv | xargs)

# ---- Set default values ----
export NODE_PORT=${NODE_PORT:-'3001'}
export NODE_ENV=${NODE_ENV:-'development'}

# ---- Substitute environment variables ----
envsubst < .env.sample > .env

# ---- Start the application ----
node dist/src/main.js