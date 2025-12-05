import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCloudDataPropertyAtDataProviderItemTable1764904183219 implements MigrationInterface {
    name = 'AddCloudDataPropertyAtDataProviderItemTable1764904183219'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD "is_saved_to_cloud_data" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD "cloud_data_provider_id" uuid`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD CONSTRAINT "FK_25e807ac8b235b2c8690b89a5f6" FOREIGN KEY ("cloud_data_provider_id") REFERENCES "cloud_data_providers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP CONSTRAINT "FK_25e807ac8b235b2c8690b89a5f6"`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP COLUMN "cloud_data_provider_id"`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP COLUMN "is_saved_to_cloud_data"`);
    }

}
