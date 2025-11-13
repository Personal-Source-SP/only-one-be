import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationTable1763002189202 implements MigrationInterface {
    name = 'CreateNotificationTable1763002189202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "title" character varying(255) NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'info', "is_read" boolean NOT NULL DEFAULT false, "description" character varying(1000), "user_id" character varying, "path" character varying(1000), "data" jsonb, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "notifications"`);
    }

}
