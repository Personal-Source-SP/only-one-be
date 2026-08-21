import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditAndSoftDeleteColumnsToDataProviderFeatures1765300000000 implements MigrationInterface {
    name = 'AddAuditAndSoftDeleteColumnsToDataProviderFeatures1765300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "data_provider_features"
            ADD COLUMN IF NOT EXISTS "created_by" uuid,
            ADD COLUMN IF NOT EXISTS "updated_by" uuid,
            ADD COLUMN IF NOT EXISTS "deleted_by" uuid,
            ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "data_provider_features"
            DROP COLUMN IF EXISTS "created_by",
            DROP COLUMN IF EXISTS "updated_by",
            DROP COLUMN IF EXISTS "deleted_by",
            DROP COLUMN IF EXISTS "deleted_at";
        `);
    }
}
