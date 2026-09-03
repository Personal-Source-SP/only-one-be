import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDiscoveryTables1765600000000 implements MigrationInterface {
    name = 'CreateDiscoveryTables1765600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create discovery_sessions table
        await queryRunner.query(`
            CREATE TABLE "discovery_sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "session_code" character varying(50) NOT NULL,
                "data_provider_id" uuid NOT NULL,
                "target_url" character varying(2000) NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'PENDING',
                "depth" integer NOT NULL DEFAULT 1,
                "max_urls" integer DEFAULT NULL,
                "auto_validate" boolean NOT NULL DEFAULT true,
                "total_discovered" integer NOT NULL DEFAULT 0,
                "total_queued" integer NOT NULL DEFAULT 0,
                "total_validated" integer NOT NULL DEFAULT 0,
                "duration_seconds" integer,
                "error_message" text,
                "notes" text,
                CONSTRAINT "UQ_discovery_sessions_session_code" UNIQUE ("session_code"),
                CONSTRAINT "PK_discovery_sessions_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_discovery_sessions_data_provider" FOREIGN KEY ("data_provider_id") REFERENCES "data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            );
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_discovery_sessions_data_provider_id" ON "discovery_sessions" ("data_provider_id");
        `);

        // 2. Create discovery_urls table
        await queryRunner.query(`
            CREATE TABLE "discovery_urls" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "session_id" uuid NOT NULL,
                "data_provider_id" uuid NOT NULL,
                "url" character varying(2000) NOT NULL,
                "domain" character varying(500) NOT NULL,
                "title" character varying(1000),
                "description" text,
                "status" character varying(20) NOT NULL DEFAULT 'DISCOVERED',
                "found_at_depth" integer NOT NULL DEFAULT 1,
                "confidence_score" numeric(3,2) NOT NULL DEFAULT 0,
                "validation_status" character varying(20) NOT NULL DEFAULT 'PENDING',
                "match_result" character varying(20) NOT NULL DEFAULT 'UNCERTAIN',
                "user_action" character varying(20),
                "user_action_date" TIMESTAMP WITH TIME ZONE,
                "user_action_reason" text,
                "final_validation_status" character varying(20) NOT NULL DEFAULT 'PENDING_REVIEW',
                CONSTRAINT "UQ_discovery_urls_session_id_url" UNIQUE ("session_id", "url"),
                CONSTRAINT "PK_discovery_urls_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_discovery_urls_session" FOREIGN KEY ("session_id") REFERENCES "discovery_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_discovery_urls_data_provider" FOREIGN KEY ("data_provider_id") REFERENCES "data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            );
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_discovery_urls_session_id" ON "discovery_urls" ("session_id");
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_discovery_urls_data_provider_id" ON "discovery_urls" ("data_provider_id");
        `);

        // 3. Create discovery_validation_batches table
        await queryRunner.query(`
            CREATE TABLE "discovery_validation_batches" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "session_id" uuid NOT NULL,
                "batch_number" character varying(50) NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'PENDING',
                "total_urls" integer NOT NULL DEFAULT 0,
                "processed_urls" integer NOT NULL DEFAULT 0,
                "matched_urls" integer NOT NULL DEFAULT 0,
                "no_match_urls" integer NOT NULL DEFAULT 0,
                "started_at" TIMESTAMP WITH TIME ZONE,
                "completed_at" TIMESTAMP WITH TIME ZONE,
                "reason_cancelled" text,
                CONSTRAINT "PK_discovery_validation_batches_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_discovery_validation_batches_session" FOREIGN KEY ("session_id") REFERENCES "discovery_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            );
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_discovery_validation_batches_session_id" ON "discovery_validation_batches" ("session_id");
        `);

        // 4. Create discovery_validation_logs table
        await queryRunner.query(`
            CREATE TABLE "discovery_validation_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "session_id" uuid NOT NULL,
                "discovery_url_id" uuid NOT NULL,
                "validation_batch_id" uuid NOT NULL,
                "operation_status" character varying(20) NOT NULL DEFAULT 'completed',
                "match_result" character varying(20) NOT NULL DEFAULT 'UNCERTAIN',
                "confidence_score" numeric(3,2) NOT NULL DEFAULT 0,
                "reason" text,
                "matched_criteria" jsonb,
                "processing_duration" integer NOT NULL DEFAULT 0,
                "is_latest_log" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_discovery_validation_logs_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_discovery_validation_logs_discovery_url" FOREIGN KEY ("discovery_url_id") REFERENCES "discovery_urls"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_discovery_validation_logs_validation_batch" FOREIGN KEY ("validation_batch_id") REFERENCES "discovery_validation_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            );
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_discovery_validation_logs_session_id" ON "discovery_validation_logs" ("session_id");
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_discovery_validation_logs_discovery_url_id" ON "discovery_validation_logs" ("discovery_url_id");
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_discovery_validation_logs_validation_batch_id" ON "discovery_validation_logs" ("validation_batch_id");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "discovery_validation_logs";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "discovery_validation_batches";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "discovery_urls";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "discovery_sessions";`);
    }
}
