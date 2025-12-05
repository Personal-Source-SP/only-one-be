import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCloudDataPropertyAtScrapingDataTable1764906956750 implements MigrationInterface {
    name = 'AddCloudDataPropertyAtScrapingDataTable1764906956750'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "scraping_data" ADD "cloud_data_item_id" uuid`);
        await queryRunner.query(`ALTER TABLE "scraping_data" ADD "cloud_data_url" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "scraping_data" DROP COLUMN "cloud_data_url"`);
        await queryRunner.query(`ALTER TABLE "scraping_data" DROP COLUMN "cloud_data_item_id"`);
    }

}
