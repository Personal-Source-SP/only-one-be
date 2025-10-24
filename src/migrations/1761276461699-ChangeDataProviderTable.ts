import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeDataProviderTable1761276461699 implements MigrationInterface {
    name = 'ChangeDataProviderTable1761276461699';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_providers" DROP COLUMN "last_failed_scrape_at"`);
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP COLUMN "last_scrape_status"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD "last_scrape_status" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "data_providers" ADD "last_failed_scrape_at" TIMESTAMP`);
    }
}
