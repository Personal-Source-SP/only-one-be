#!/bin/sh
set -e

echo "=========================================="
echo "Starting NestJS Application"
echo "=========================================="

if [ -f .buildenv ]; then
    echo "Loading build info..."
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
echo "=========================================="

echo "Environment variables (full):"
printenv | while IFS='=' read -r name value; do
    echo "   $name=$value"
done
echo "=========================================="

echo "Starting NestJS server..."
exec node dist/src/main.js
