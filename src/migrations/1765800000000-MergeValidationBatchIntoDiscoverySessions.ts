import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeValidationBatchIntoDiscoverySessions1765800000000 implements MigrationInterface {
    name = 'MergeValidationBatchIntoDiscoverySessions1765800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add validation metrics columns to discovery_sessions
        await queryRunner.query(`
            ALTER TABLE "discovery_sessions"
            ADD COLUMN IF NOT EXISTS "validation_status" character varying(20) NOT NULL DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS "matched_urls" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "no_match_urls" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "validation_started_at" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS "validation_completed_at" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS "validation_reason_cancelled" text;
        `);

        // 2. Drop validation_batch_id from discovery_validation_logs
        await queryRunner.query(`
            ALTER TABLE "discovery_validation_logs" DROP CONSTRAINT IF EXISTS "FK_discovery_validation_logs_validation_batch";
        `);
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_discovery_validation_logs_validation_batch_id";
        `);
        await queryRunner.query(`
            ALTER TABLE "discovery_validation_logs" DROP COLUMN IF EXISTS "validation_batch_id";
        `);

        // 3. Add FK from discovery_validation_logs to discovery_sessions
        await queryRunner.query(`
            ALTER TABLE "discovery_validation_logs"
            ADD CONSTRAINT "FK_discovery_validation_logs_session"
            FOREIGN KEY ("session_id") REFERENCES "discovery_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        `);

        // 4. Drop discovery_validation_batches table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "discovery_validation_batches";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate discovery_validation_batches table if reverted
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "discovery_validation_batches" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "session_id" uuid NOT NULL,
                "batch_number" character varying(50) NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'pending',
                "total_urls" integer NOT NULL DEFAULT 0,
                "processed_urls" integer NOT NULL DEFAULT 0,
                "matched_urls" integer NOT NULL DEFAULT 0,
                "no_match_urls" integer NOT NULL DEFAULT 0,
                "started_at" TIMESTAMP WITH TIME ZONE,
                "completed_at" TIMESTAMP WITH TIME ZONE,
                "reason_cancelled" text,
                CONSTRAINT "PK_discovery_validation_batches_id" PRIMARY KEY ("id")
            );
        `);

        await queryRunner.query(`
            ALTER TABLE "discovery_validation_logs"
            DROP CONSTRAINT IF EXISTS "FK_discovery_validation_logs_session",
            ADD COLUMN IF NOT EXISTS "validation_batch_id" uuid;
        `);

        await queryRunner.query(`
            ALTER TABLE "discovery_sessions"
            DROP COLUMN IF EXISTS "validation_status",
            DROP COLUMN IF EXISTS "matched_urls",
            DROP COLUMN IF EXISTS "no_match_urls",
            DROP COLUMN IF EXISTS "validation_started_at",
            DROP COLUMN IF EXISTS "validation_completed_at",
            DROP COLUMN IF EXISTS "validation_reason_cancelled";
        `);
    }
}
