#!/bin/sh
set -e

echo "=========================================="
echo "Starting NestJS Application"
echo "=========================================="

if [ -f .buildenv ]; then
    echo "Loading build info..."
    # shellcheck disable=SC2046
    export $(grep -v '^#' .buildenv | xargs)
fi

export PORT=${PORT:-3001}
export NODE_ENV=${NODE_ENV:-production}

if [ -f .env.sample ]; then
    echo "Creating .env from template..."
    envsubst < .env.sample > .env
    echo "Environment file created"
fi

echo "=========================================="
echo "Configuration:"
echo "   Environment:     ${NODE_ENV}"
echo "   Port:            ${PORT}"
echo "   Swagger Version: ${SWAGGER_VERSION:-N/A}"
echo "   Build Date:      ${BUILD_DATE:-N/A}"
echo "   VCS Ref:         ${VCS_REF:-N/A}"
echo "   Database Host:   ${DATABASE_HOST:-<unset>}"
echo "   Redis Host:      ${REDIS_HOST:-<unset>}"
echo "=========================================="

echo "Starting NestJS server..."
exec node dist/src/main.js
