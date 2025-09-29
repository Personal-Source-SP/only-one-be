import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleAuthAndDriveFileTables1759121755581 implements MigrationInterface {
    name = 'CreateGoogleAuthAndDriveFileTables1759121755581';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "google_drive_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "google_auth_id" uuid NOT NULL, "google_drive_id" character varying NOT NULL, "name" character varying(500) NOT NULL, "mime_type" character varying(100), "size" bigint, "web_view_link" character varying(1000), "web_content_link" character varying(1000), "thumbnail_link" character varying(1000), "parent_folder_id" character varying(100), "last_modified" TIMESTAMP, "is_trashed" boolean, "is_starred" boolean, "metadata" jsonb, CONSTRAINT "PK_72eec54f715f96df307d888120c" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "google_auths" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "google_access_token" character varying(2000) NOT NULL, "google_expires_at" TIMESTAMP NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "google_refresh_token" character varying(2000), "google_scope" character varying(255), "google_token_type" character varying(100), CONSTRAINT "UQ_670ed6362ab09ea86d6293a6749" UNIQUE ("user_id"), CONSTRAINT "REL_670ed6362ab09ea86d6293a674" UNIQUE ("user_id"), CONSTRAINT "PK_1817a78b110d197b5e138347145" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "google_drive_files" ADD CONSTRAINT "FK_3b04233d04eafad42e66ea27b56" FOREIGN KEY ("google_auth_id") REFERENCES "google_auths"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "google_auths" ADD CONSTRAINT "FK_670ed6362ab09ea86d6293a6749" FOREIGN KEY ("user_id") REFERENCES "users "("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_auths" DROP CONSTRAINT "FK_670ed6362ab09ea86d6293a6749"`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" DROP CONSTRAINT "FK_3b04233d04eafad42e66ea27b56"`);
        await queryRunner.query(`DROP TABLE "google_auths"`);
        await queryRunner.query(`DROP TABLE "google_drive_files"`);
    }
}
