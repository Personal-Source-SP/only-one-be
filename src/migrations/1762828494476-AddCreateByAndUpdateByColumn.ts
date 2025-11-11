import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreateByAndUpdateByColumn1762828494476 implements MigrationInterface {
    name = 'AddCreateByAndUpdateByColumn1762828494476'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_tags" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "file_tags" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "google_drive_folders" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "google_drive_folders" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "google_auths" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "google_auths" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "users " ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "users " ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "data_provider_config_versions" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "data_providers" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "data_providers" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "data_history" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "data_history" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD "updated_by" uuid`);
        await queryRunner.query(`ALTER TABLE "items" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "items" ADD "updated_by" uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "data_history" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "data_history" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "data_providers" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "data_providers" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "data_provider_config_versions" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "users " DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "users " DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "google_auths" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "google_auths" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "google_drive_files" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "google_drive_folders" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "google_drive_folders" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "google_drive_file_tags" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "file_tags" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "file_tags" DROP COLUMN "created_by"`);
    }

}
