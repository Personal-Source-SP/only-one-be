import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScrapingDataTables1763040738863 implements MigrationInterface {
    name = 'CreateScrapingDataTables1763040738863';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "data_history"`);

        await queryRunner.query(
            `CREATE TABLE "scraping_data" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "data_provider_id" uuid NOT NULL, "data_provider_item_id" uuid NOT NULL, "item_id" uuid NOT NULL, "scrape_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "data_id" character varying(255) NOT NULL, "type" character varying(255) NOT NULL, "url" character varying(255) NOT NULL, "last_modified" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, CONSTRAINT "PK_7d63c59698cea102b5c660987ea" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "scraping_data" ADD CONSTRAINT "FK_bf6b5f98f24f77ee7825ff2448a" FOREIGN KEY ("data_provider_id") REFERENCES "data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "scraping_data" ADD CONSTRAINT "FK_9f77a7a2ee4b5f178e2d548f640" FOREIGN KEY ("data_provider_item_id") REFERENCES "data_provider_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "scraping_data" ADD CONSTRAINT "FK_bacb6c4cc3f120c0cf0018f261d" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "scraping_data" DROP CONSTRAINT "FK_bacb6c4cc3f120c0cf0018f261d"`);
        await queryRunner.query(`ALTER TABLE "scraping_data" DROP CONSTRAINT "FK_9f77a7a2ee4b5f178e2d548f640"`);
        await queryRunner.query(`ALTER TABLE "scraping_data" DROP CONSTRAINT "FK_bf6b5f98f24f77ee7825ff2448a"`);
        await queryRunner.query(`DROP TABLE "scraping_data"`);
    }
}
