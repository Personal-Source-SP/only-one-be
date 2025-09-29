import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFileTagTable1759137985443 implements MigrationInterface {
    name = 'CreateFileTagTable1759137985443';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_drive_files" DROP CONSTRAINT "FK_files_folder"`);
        await queryRunner.query(
            `CREATE TABLE "file_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, CONSTRAINT "UQ_5ba9bb4c11d528b2902d9563f6d" UNIQUE ("name"), CONSTRAINT "PK_5f1b56af7abb2e40727e6bedb81" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "google_drive_file_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "google_drive_file_id" uuid NOT NULL, "file_tag_id" uuid NOT NULL, CONSTRAINT "UQ_ef5928a87ac40f59cae7b6c7572" UNIQUE ("google_drive_file_id", "file_tag_id"), CONSTRAINT "PK_4d164676403862ff9f03b05cb14" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "google_drive_file_tags" ADD CONSTRAINT "FK_f1f406253840f41c1b2c430ac73" FOREIGN KEY ("google_drive_file_id") REFERENCES "google_drive_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "google_drive_file_tags" ADD CONSTRAINT "FK_08992b19d93543a5f3338d35900" FOREIGN KEY ("file_tag_id") REFERENCES "file_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "google_drive_files" ADD CONSTRAINT "FK_1a930d7f9d9ac2509cd8824af88" FOREIGN KEY ("google_drive_folder_id") REFERENCES "google_drive_folders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_drive_files" DROP CONSTRAINT "FK_1a930d7f9d9ac2509cd8824af88"`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" DROP CONSTRAINT "FK_08992b19d93543a5f3338d35900"`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" DROP CONSTRAINT "FK_f1f406253840f41c1b2c430ac73"`);
        await queryRunner.query(`DROP TABLE "google_drive_file_tags"`);
        await queryRunner.query(`DROP TABLE "file_tags"`);
        await queryRunner.query(
            `ALTER TABLE "google_drive_files" ADD CONSTRAINT "FK_files_folder" FOREIGN KEY ("google_drive_folder_id") REFERENCES "google_drive_folders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
    }
}
