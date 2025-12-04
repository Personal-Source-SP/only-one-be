import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDisplayTypeAtDataProviderItemTable1764860560172 implements MigrationInterface {
    name = 'AddDisplayTypeAtDataProviderItemTable1764860560172'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD "display_type" character varying(50) NOT NULL DEFAULT 'image'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP COLUMN "display_type"`);
    }

}
