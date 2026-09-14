import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorDiscoveryUrlAndItemMetadataAndRelations1766200000000 implements MigrationInterface {
    name = 'RefactorDiscoveryUrlAndItemMetadataAndRelations1766200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Discovery URLs table updates
        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP COLUMN IF EXISTS "description";`);
        await queryRunner.query(`ALTER TABLE "discovery_urls" ADD COLUMN IF NOT EXISTS "code" character varying(100) NOT NULL DEFAULT '';`);
        await queryRunner.query(`ALTER TABLE "discovery_urls" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}';`);
        await queryRunner.query(`ALTER TABLE "discovery_urls" ADD COLUMN IF NOT EXISTS "item_id" uuid;`);
        await queryRunner.query(`
            ALTER TABLE "discovery_urls"
            ADD CONSTRAINT "FK_discovery_urls_item"
            FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_discovery_urls_code" ON "discovery_urls" ("code");`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_discovery_urls_item_id" ON "discovery_urls" ("item_id");`);

        // 2. Items table updates
        await queryRunner.query(`ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}';`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "code" TYPE character varying(100);`);
        await queryRunner.query(`UPDATE "items" SET "code" = id::text WHERE "code" IS NULL;`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "code" SET NOT NULL;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "code" DROP NOT NULL;`);
        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN IF EXISTS "metadata";`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_discovery_urls_item_id";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_discovery_urls_code";`);
        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP CONSTRAINT IF EXISTS "FK_discovery_urls_item";`);
        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP COLUMN IF EXISTS "item_id";`);
        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP COLUMN IF EXISTS "metadata";`);
        await queryRunner.query(`ALTER TABLE "discovery_urls" DROP COLUMN IF EXISTS "code";`);
        await queryRunner.query(`ALTER TABLE "discovery_urls" ADD COLUMN "description" text;`);
    }
}
