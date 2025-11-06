#!/bin/sh
set -e  # Exit on error

echo "=========================================="
echo "Starting NestJS Application"
echo "=========================================="

# Load build environment
if [ -f .buildenv ]; then
    echo "📦 Loading build info..."
    export $(grep -v '^#' .buildenv | xargs)
fi

# Set default values
export PORT=${PORT:-3001}
export NODE_ENV=${NODE_ENV:-production}

# Tạo .env từ template
if [ -f .env.sample ]; then
    echo "📝 Creating .env from template..."
    envsubst < .env.sample > .env
    echo "✅ Environment file created"
fi

# Log configuration
echo "=========================================="
echo "🚀 Configuration:"
echo "   Environment:     ${NODE_ENV}"
echo "   Port:            ${PORT}"
echo "   Swagger Version: ${SWAGGER_VERSION:-N/A}"
echo "=========================================="

# Database migration (nếu cần)
# echo "🔄 Running database migrations..."
# npm run migration:run || echo "⚠️  Migration skipped or failed"

# Start NestJS application
echo "🎯 Starting NestJS server..."
exec node dist/main.js