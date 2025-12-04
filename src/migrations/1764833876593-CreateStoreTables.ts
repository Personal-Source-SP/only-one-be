import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStoreTables1764833876593 implements MigrationInterface {
    name = 'CreateStoreTables1764833876593'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "stores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "type" character varying(50) NOT NULL DEFAULT 'telegram', "is_active" boolean NOT NULL DEFAULT true, "total_items" bigint NOT NULL DEFAULT '0', "total_size" bigint NOT NULL DEFAULT '0', "config" jsonb, CONSTRAINT "PK_7aa6e7d71fa7acdd7ca43d7c9cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "store_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "store_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "path_id" character varying(100) NOT NULL, "path_url" character varying(1000) NOT NULL, "file_name" character varying(255), "mime_type" character varying(100), "file_size" bigint, "metadata" jsonb, CONSTRAINT "PK_0d47463134b9663b18d7df22282" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5680806e7e0b1e9ba8929f1071" ON "store_items" ("path_id") `);
        await queryRunner.query(`ALTER TABLE "store_items" ADD CONSTRAINT "FK_e74a7a060ae79072d332cb72a86" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_items" DROP CONSTRAINT "FK_e74a7a060ae79072d332cb72a86"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5680806e7e0b1e9ba8929f1071"`);
        await queryRunner.query(`DROP TABLE "store_items"`);
        await queryRunner.query(`DROP TABLE "stores"`);
    }

}
