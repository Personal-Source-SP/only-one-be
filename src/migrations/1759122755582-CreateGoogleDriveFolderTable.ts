import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleDriveFolderTable1759122755582 implements MigrationInterface {
    name = 'CreateGoogleDriveFolderTable1759122755582';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "google_drive_folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "google_auth_id" uuid NOT NULL, "google_drive_id" character varying NOT NULL, "name" character varying(500) NOT NULL, "parent_folder_id" character varying(100), "last_modified" TIMESTAMP, "is_trashed" boolean, "is_starred" boolean, CONSTRAINT "PK_7b7c7d2a6d9a7b8e3a61a6fcb67" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "google_drive_folders" ADD CONSTRAINT "FK_folder_google_auth" FOREIGN KEY ("google_auth_id") REFERENCES "google_auths"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_drive_folders" DROP CONSTRAINT "FK_folder_google_auth"`);
        await queryRunner.query(`DROP TABLE "google_drive_folders"`);
    }
}
