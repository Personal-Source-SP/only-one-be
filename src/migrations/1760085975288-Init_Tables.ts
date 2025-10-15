import { MigrationInterface, QueryRunner } from "typeorm";

export class InitTables1760085975288 implements MigrationInterface {
    name = 'InitTables1760085975288'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "file_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(100) NOT NULL, CONSTRAINT "UQ_5ba9bb4c11d528b2902d9563f6d" UNIQUE ("name"), CONSTRAINT "PK_5f1b56af7abb2e40727e6bedb81" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "google_drive_file_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "google_drive_file_id" uuid NOT NULL, "file_tag_id" uuid NOT NULL, CONSTRAINT "UQ_ef5928a87ac40f59cae7b6c7572" UNIQUE ("google_drive_file_id", "file_tag_id"), CONSTRAINT "PK_4d164676403862ff9f03b05cb14" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "google_drive_folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "google_auth_id" uuid NOT NULL, "google_drive_id" character varying NOT NULL, "name" character varying(500) NOT NULL, "parent_folder_id" character varying(100), "last_modified" TIMESTAMP, "is_trashed" boolean, "is_starred" boolean, CONSTRAINT "PK_153937fa9ec3095fc213606d96f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "google_drive_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "google_auth_id" uuid NOT NULL, "google_drive_id" character varying NOT NULL, "name" character varying(500) NOT NULL, "mime_type" character varying(100), "size" bigint, "web_view_link" character varying(1000), "web_content_link" character varying(1000), "thumbnail_link" character varying(1000), "parent_folder_id" character varying(100), "google_drive_folder_id" uuid, "last_modified" TIMESTAMP, "is_trashed" boolean, "is_starred" boolean, "metadata" jsonb, CONSTRAINT "PK_72eec54f715f96df307d888120c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "google_auths" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "google_access_token" character varying(2000) NOT NULL, "google_expires_at" TIMESTAMP NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "google_refresh_token" character varying(2000), "google_scope" character varying(255), "google_token_type" character varying(100), CONSTRAINT "UQ_670ed6362ab09ea86d6293a6749" UNIQUE ("user_id"), CONSTRAINT "REL_670ed6362ab09ea86d6293a674" UNIQUE ("user_id"), CONSTRAINT "PK_1817a78b110d197b5e138347145" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users " ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "email" character varying(200) NOT NULL, "user_name" character varying(200) NOT NULL, "password" character varying(200) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "first_name" character varying(100), "last_name" character varying(100), "phone_number" character varying, CONSTRAINT "UQ_45f52e54f6052f96adb21bdf650" UNIQUE ("user_name"), CONSTRAINT "UQ_0fb77e465edebc92c4aa86c548a" UNIQUE ("email"), CONSTRAINT "PK_4ab1c54e07add7286bfd0c510c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "key" character varying(200) NOT NULL, "value" jsonb NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "type" character varying(200) NOT NULL DEFAULT 'global', CONSTRAINT "UQ_c8639b7626fa94ba8265628f214" UNIQUE ("key"), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" ADD CONSTRAINT "FK_f1f406253840f41c1b2c430ac73" FOREIGN KEY ("google_drive_file_id") REFERENCES "google_drive_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" ADD CONSTRAINT "FK_08992b19d93543a5f3338d35900" FOREIGN KEY ("file_tag_id") REFERENCES "file_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "google_drive_folders" ADD CONSTRAINT "FK_71e00288e18521a7443893d21b6" FOREIGN KEY ("google_auth_id") REFERENCES "google_auths"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" ADD CONSTRAINT "FK_3b04233d04eafad42e66ea27b56" FOREIGN KEY ("google_auth_id") REFERENCES "google_auths"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" ADD CONSTRAINT "FK_1a930d7f9d9ac2509cd8824af88" FOREIGN KEY ("google_drive_folder_id") REFERENCES "google_drive_folders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "google_auths" ADD CONSTRAINT "FK_670ed6362ab09ea86d6293a6749" FOREIGN KEY ("user_id") REFERENCES "users "("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_auths" DROP CONSTRAINT "FK_670ed6362ab09ea86d6293a6749"`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" DROP CONSTRAINT "FK_1a930d7f9d9ac2509cd8824af88"`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" DROP CONSTRAINT "FK_3b04233d04eafad42e66ea27b56"`);
        await queryRunner.query(`ALTER TABLE "google_drive_folders" DROP CONSTRAINT "FK_71e00288e18521a7443893d21b6"`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" DROP CONSTRAINT "FK_08992b19d93543a5f3338d35900"`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" DROP CONSTRAINT "FK_f1f406253840f41c1b2c430ac73"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP TABLE "users "`);
        await queryRunner.query(`DROP TABLE "google_auths"`);
        await queryRunner.query(`DROP TABLE "google_drive_files"`);
        await queryRunner.query(`DROP TABLE "google_drive_folders"`);
        await queryRunner.query(`DROP TABLE "google_drive_file_tags"`);
        await queryRunner.query(`DROP TABLE "file_tags"`);
    }

}
