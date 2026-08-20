import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddErrorTrackingColumnsToDataProviderFeatures1765200000000 implements MigrationInterface {
    name = 'AddErrorTrackingColumnsToDataProviderFeatures1765200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "data_provider_features"
            ADD COLUMN "consecutive_failures" integer NOT NULL DEFAULT 0,
            ADD COLUMN "last_error_message" text,
            ADD COLUMN "last_error_type" character varying(50),
            ADD COLUMN "last_failed_run_at" TIMESTAMP;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "data_provider_features"
            DROP COLUMN IF EXISTS "consecutive_failures",
            DROP COLUMN IF EXISTS "last_error_message",
            DROP COLUMN IF EXISTS "last_error_type",
            DROP COLUMN IF EXISTS "last_failed_run_at";
        `);
    }
}
