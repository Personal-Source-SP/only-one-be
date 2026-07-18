import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { SnakeNamingStrategy } from './src/shared/typeorm/strategies/snake-naming.strategy';

dotenv.config({
    path: `.env`,
});

// Replace \\n with \n to support multiline strings in AWS
for (const envName of Object.keys(process.env)) {
    process.env[envName] = process.env[envName].replace(/\\n/g, '\n');
}

export const connectionSource = new DataSource({
    type: 'postgres',
    // schema: 'public',
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    namingStrategy: new SnakeNamingStrategy(),
    entities: ['src/**/**/*.entity{.ts,.js}'],
    migrations: ['src/migrations/*{.ts,.js}'],
    extra:
        process.env.DATABASE_SSL == 'true'
            ? {
                  ssl: {
                      // Default: true (reject untrusted certs) — prevents MITM attacks.
                      // Set DATABASE_SSL_REJECT_UNAUTHORIZED=false only for dev environments
                      // with self-signed certificates; never disable in production.
                      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
                      // Optional: provide a custom CA certificate (e.g. AWS RDS CA bundle)
                      ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA } : {}),
                  },
              }
            : {},
});
