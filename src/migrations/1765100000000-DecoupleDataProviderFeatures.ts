import { MigrationInterface, QueryRunner } from 'typeorm';

export class DecoupleDataProviderFeatures1765100000000 implements MigrationInterface {
    name = 'DecoupleDataProviderFeatures1765100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create data_provider_features table
        await queryRunner.query(`
            CREATE TABLE "data_provider_features" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "data_provider_id" uuid NOT NULL,
                "type" character varying(50) NOT NULL,
                "service" character varying(50) NOT NULL DEFAULT 'generic',
                "status" character varying(50) NOT NULL DEFAULT 'UNCONFIGURED',
                "config" jsonb,
                "last_successful_run_at" TIMESTAMP,
                CONSTRAINT "PK_data_provider_features_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_data_provider_features_provider_type" UNIQUE ("data_provider_id", "type"),
                CONSTRAINT "FK_data_provider_features_data_provider" FOREIGN KEY ("data_provider_id") REFERENCES "data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            );
        `);

        // 2. Migrate existing SCRAPING features
        await queryRunner.query(`
            INSERT INTO "data_provider_features" ("data_provider_id", "type", "service", "status", "config", "last_successful_run_at", "created_at", "updated_at")
            SELECT 
                "id",
                'SCRAPING',
                COALESCE("scraper_service", 'generic'),
                COALESCE("status", 'UNCONFIGURED'),
                "target_config",
                "last_successful_scrape_at",
                "created_at",
                "updated_at"
            FROM "data_providers";
        `);

        // 3. Migrate existing SEARCH features
        await queryRunner.query(`
            INSERT INTO "data_provider_features" ("data_provider_id", "type", "service", "status", "config", "created_at", "updated_at")
            SELECT 
                "id",
                'SEARCH',
                COALESCE("search_service", 'generic'),
                COALESCE("search_status", 'UNCONFIGURED'),
                "search_config",
                "created_at",
                "updated_at"
            FROM "data_providers";
        `);

        // 4. Update data_provider_config_versions to link to feature_id
        await queryRunner.query(`
            ALTER TABLE "data_provider_config_versions" ADD "feature_id" uuid;
        `);

        await queryRunner.query(`
            UPDATE "data_provider_config_versions" cv
            SET "feature_id" = f."id"
            FROM "data_provider_features" f
            WHERE f."data_provider_id" = cv."data_provider_id" AND f."type" = 'SCRAPING';
        `);

        // If any orphans exist without feature_id, delete or assign fallback
        await queryRunner.query(`
            DELETE FROM "data_provider_config_versions" WHERE "feature_id" IS NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE "data_provider_config_versions" ALTER COLUMN "feature_id" SET NOT NULL;
            ALTER TABLE "data_provider_config_versions" ADD CONSTRAINT "FK_data_provider_config_versions_feature" FOREIGN KEY ("feature_id") REFERENCES "data_provider_features"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            ALTER TABLE "data_provider_config_versions" DROP CONSTRAINT IF EXISTS "FK_1c82821df26be9f55e0a6d0c268";
            ALTER TABLE "data_provider_config_versions" DROP COLUMN IF EXISTS "data_provider_id";
        `);

        // Rename target_config column in config_versions to config if desired or alias
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'data_provider_config_versions' AND column_name = 'target_config'
                ) THEN
                    ALTER TABLE "data_provider_config_versions" RENAME COLUMN "target_config" TO "config";
                END IF;
            END $$;
        `);

        // 5. Drop legacy columns from data_providers
        await queryRunner.query(`
            ALTER TABLE "data_providers"
            DROP COLUMN IF EXISTS "scraper_service",
            DROP COLUMN IF EXISTS "status",
            DROP COLUMN IF EXISTS "search_service",
            DROP COLUMN IF EXISTS "search_status",
            DROP COLUMN IF EXISTS "target_config",
            DROP COLUMN IF EXISTS "search_config",
            DROP COLUMN IF EXISTS "last_successful_scrape_at";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add columns to data_providers
        await queryRunner.query(`
            ALTER TABLE "data_providers"
            ADD "scraper_service" character varying(100) DEFAULT 'generic',
            ADD "status" character varying(100) DEFAULT 'UNCONFIGURED',
            ADD "search_service" character varying(50) DEFAULT 'generic',
            ADD "search_status" character varying(100) DEFAULT 'UNCONFIGURED',
            ADD "target_config" jsonb,
            ADD "search_config" jsonb,
            ADD "last_successful_scrape_at" TIMESTAMP;
        `);

        // Restore data_provider_config_versions data_provider_id
        await queryRunner.query(`
            ALTER TABLE "data_provider_config_versions" ADD "data_provider_id" uuid;
        `);

        await queryRunner.query(`
            UPDATE "data_provider_config_versions" cv
            SET "data_provider_id" = f."data_provider_id"
            FROM "data_provider_features" f
            WHERE f."id" = cv."feature_id";
        `);

        await queryRunner.query(`
            ALTER TABLE "data_provider_config_versions" DROP CONSTRAINT IF EXISTS "FK_data_provider_config_versions_feature";
            ALTER TABLE "data_provider_config_versions" DROP COLUMN IF EXISTS "feature_id";
            ALTER TABLE "data_provider_config_versions" RENAME COLUMN "config" TO "target_config";
        `);

        // Drop data_provider_features table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "data_provider_features";
        `);
    }
}
