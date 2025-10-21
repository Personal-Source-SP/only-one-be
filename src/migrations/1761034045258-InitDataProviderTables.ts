import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDataProviderTables1761034045258 implements MigrationInterface {
    name = 'InitDataProviderTables1761034045258';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "data_provider_config_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "data_provider_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "version_id" integer NOT NULL, "target_config" jsonb NOT NULL, "change_type" character varying(100) NOT NULL, "change_description" text, "created_by" uuid, CONSTRAINT "PK_ad12e40eff3d533f51b35995929" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "data_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "data_provider_item_id" uuid NOT NULL, "scrape_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" character varying(20) DEFAULT 'success', "metadata" jsonb, "error_message" text, CONSTRAINT "PK_f2191e6059b061c95cacb32c598" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "mapping_status" character varying(100) NOT NULL DEFAULT 'unmapped', "code" character varying(20), "tags" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "data_provider_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "item_id" uuid NOT NULL, "data_provider_id" uuid NOT NULL, "item_url" text NOT NULL, "target_config" jsonb, "last_scrape_status" character varying(20), "last_scraped_timestamp" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_4c1e215909dbfc5166ff6ac6e8f" UNIQUE ("item_id", "data_provider_id"), CONSTRAINT "PK_00a988476f36c4d7b9724a7fa4a" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "data_providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "identifier" character varying(255), "name" character varying(255) NOT NULL, "scraper_service" character varying(100) NOT NULL DEFAULT 'generic', "base_url" character varying(255) NOT NULL, "status" character varying(100) NOT NULL DEFAULT 'unconfigured', "target_config" jsonb, "last_successful_scrape_at" TIMESTAMP, "last_failed_scrape_at" TIMESTAMP, "search_config" jsonb, "search_service" character varying(50) NOT NULL DEFAULT 'generic', "search_status" character varying(100) NOT NULL DEFAULT 'unconfigured', CONSTRAINT "UQ_27f2444198d55d14a2b28b40d42" UNIQUE ("base_url"), CONSTRAINT "CHK_54d0c3b58d8178f6d3883a4068" CHECK ("identifier" is null OR "identifier" ~ '^[a-z0-9-]+$'), CONSTRAINT "CHK_abeeb8986f216226b3f333edde" CHECK ("base_url" NOT LIKE '%/'), CONSTRAINT "PK_06eb0f56f2355eb4a1db576e617" PRIMARY KEY ("id")); COMMENT ON COLUMN "data_providers"."identifier" IS 'Group identifier for region-specific providers'`,
        );
        await queryRunner.query(
            `ALTER TABLE "data_provider_config_versions" ADD CONSTRAINT "FK_06d734a48166cc51a6c5a3de805" FOREIGN KEY ("created_by") REFERENCES "users "("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "data_provider_config_versions" ADD CONSTRAINT "FK_a04d4acc90b0b568184eee62f1c" FOREIGN KEY ("data_provider_id") REFERENCES "data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "data_history" ADD CONSTRAINT "FK_13f683dca07a8d6a6925b7cdac0" FOREIGN KEY ("data_provider_item_id") REFERENCES "data_provider_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "data_provider_items" ADD CONSTRAINT "FK_b97dea5dd4fe3f3a1fe86311ab0" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "data_provider_items" ADD CONSTRAINT "FK_ded9cde8d47120107005b82ed1f" FOREIGN KEY ("data_provider_id") REFERENCES "data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP CONSTRAINT "FK_ded9cde8d47120107005b82ed1f"`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP CONSTRAINT "FK_b97dea5dd4fe3f3a1fe86311ab0"`);
        await queryRunner.query(`ALTER TABLE "data_history" DROP CONSTRAINT "FK_13f683dca07a8d6a6925b7cdac0"`);
        await queryRunner.query(`ALTER TABLE "data_provider_config_versions" DROP CONSTRAINT "FK_a04d4acc90b0b568184eee62f1c"`);
        await queryRunner.query(`ALTER TABLE "data_provider_config_versions" DROP CONSTRAINT "FK_06d734a48166cc51a6c5a3de805"`);
        await queryRunner.query(`DROP TABLE "data_providers"`);
        await queryRunner.query(`DROP TABLE "data_provider_items"`);
        await queryRunner.query(`DROP TABLE "items"`);
        await queryRunner.query(`DROP TABLE "data_history"`);
        await queryRunner.query(`DROP TABLE "data_provider_config_versions"`);
    }
}
