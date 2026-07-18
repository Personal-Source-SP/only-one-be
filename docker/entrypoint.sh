#!/bin/sh
set -e

echo "=========================================="
echo "Starting NestJS Application"
echo "=========================================="

if [ -f .buildenv ]; then
    echo "Loading build info..."
    # Use set -a / . (source) instead of export $() to avoid word-splitting issues
    # shellcheck source=/dev/null
    set -a; . ./.buildenv; set +a
fi

export PORT=${PORT:-3001}
export NODE_ENV=${NODE_ENV:-production}

if [ -f .env.sample ]; then
    echo "Creating .env from template..."
    envsubst < .env.sample > .env
    echo "Environment file created"
fi

# Mask sensitive values — do NOT print actual host/credentials to logs
_mask_value() {
    if [ -n "$1" ]; then printf '[SET]'; else printf '<unset>'; fi
}

echo "=========================================="
echo "Configuration:"
echo "   Environment:     ${NODE_ENV}"
echo "   Port:            ${PORT}"
echo "   Swagger Version: ${SWAGGER_VERSION:-N/A}"
echo "   Build Date:      ${BUILD_DATE:-N/A}"
echo "   VCS Ref:         ${VCS_REF:-N/A}"
echo "   Database Host:   $(_mask_value "${DATABASE_HOST}")"
echo "   Redis Host:      $(_mask_value "${REDIS_HOST}")"
echo "=========================================="

echo "Starting NestJS server..."
exec node dist/src/main.js
