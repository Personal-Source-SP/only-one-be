import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCloudDataTables1764855783685 implements MigrationInterface {
    name = 'CreateCloudDataTables1764855783685';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "cloud_data_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "cloud_data_provider_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "path_id" character varying(100) NOT NULL, "path_url" character varying(1000) NOT NULL, "file_name" character varying(255), "mime_type" character varying(100), "file_size" bigint, "mapping_id" uuid, "metadata" jsonb, CONSTRAINT "PK_6be8e6cde94e8902070bb3088c4" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE INDEX "IDX_40eb69fd69ffce9d0dc01fd617" ON "cloud_data_items" ("path_id") `);
        await queryRunner.query(
            `CREATE TABLE "cloud_data_providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "type" character varying(50) NOT NULL DEFAULT 'telegram', "is_active" boolean NOT NULL DEFAULT true, "total_items" bigint NOT NULL DEFAULT '0', "total_size" bigint NOT NULL DEFAULT '0', "config" jsonb, CONSTRAINT "PK_b740f0d179de889146fc1160fe6" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "cloud_data_items" ADD CONSTRAINT "FK_1f71813974d8d0120c5ffe8c6ae" FOREIGN KEY ("cloud_data_provider_id") REFERENCES "cloud_data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cloud_data_items" DROP CONSTRAINT "FK_1f71813974d8d0120c5ffe8c6ae"`);
        await queryRunner.query(`DROP TABLE "cloud_data_providers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40eb69fd69ffce9d0dc01fd617"`);
        await queryRunner.query(`DROP TABLE "cloud_data_items"`);
    }
}
