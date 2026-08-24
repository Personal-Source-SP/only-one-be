import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDraftItemsTable1765400000000 implements MigrationInterface {
    name = 'CreateDraftItemsTable1765400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "draft_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "data_provider_feature_id" uuid NOT NULL,
                "title" text NOT NULL,
                "url" text NOT NULL,
                "code" character varying(100),
                "search_query" character varying(255),
                "confidence" double precision NOT NULL DEFAULT 0,
                "status" character varying(50) NOT NULL DEFAULT 'NEW',
                "suggested_item_id" uuid,
                "mapped_item_id" uuid,
                "mapped_data_provider_item_id" uuid,
                "metadata" jsonb,
                CONSTRAINT "PK_draft_items_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_draft_items_data_provider_feature" FOREIGN KEY ("data_provider_feature_id") REFERENCES "data_provider_features"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_draft_items_suggested_item" FOREIGN KEY ("suggested_item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_draft_items_mapped_item" FOREIGN KEY ("mapped_item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE NO ACTION
            );
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_draft_items_feature_url" ON "draft_items" ("data_provider_feature_id", "url");
            CREATE INDEX "IDX_draft_items_status" ON "draft_items" ("status");
            CREATE INDEX "IDX_draft_items_code" ON "draft_items" ("code");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_draft_items_code"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_draft_items_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_draft_items_feature_url"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "draft_items"`);
    }
}
