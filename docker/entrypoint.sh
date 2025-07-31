#!/bin/sh
export $(grep -v '^#' .buildenv | xargs)

export NODE_PORT=${NODE_PORT:-'3000'}
export NODE_ENV=${NODE_ENV:-'development'}
export GLOBAL_PREFIX=${GLOBAL_PREFIX:-''}
envsubst < .env.sample > .env

node dist/src/main.js