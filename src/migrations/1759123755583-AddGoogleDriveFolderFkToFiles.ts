import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleDriveFolderFkToFiles1759123755583 implements MigrationInterface {
    name = 'AddGoogleDriveFolderFkToFiles1759123755583';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_drive_files" ADD "google_drive_folder_id" uuid`);
        await queryRunner.query(
            `ALTER TABLE "google_drive_files" ADD CONSTRAINT "FK_files_folder" FOREIGN KEY ("google_drive_folder_id") REFERENCES "google_drive_folders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_drive_files" DROP CONSTRAINT "FK_files_folder"`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" DROP COLUMN "google_drive_folder_id"`);
    }
}
