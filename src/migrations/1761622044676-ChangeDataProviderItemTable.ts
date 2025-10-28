import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeDataProviderItemTable1761622044676 implements MigrationInterface {
    name = 'ChangeDataProviderItemTable1761622044676'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP COLUMN "target_config"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD "target_config" jsonb`);
    }

}
