import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActiveColumnAtDataProviderItemTable1762228055013 implements MigrationInterface {
    name = 'AddActiveColumnAtDataProviderItemTable1762228055013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD "is_active" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP COLUMN "is_active"`);
    }

}
