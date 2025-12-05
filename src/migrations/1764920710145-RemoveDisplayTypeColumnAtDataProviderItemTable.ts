import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveDisplayTypeColumnAtDataProviderItemTable1764920710145 implements MigrationInterface {
    name = 'RemoveDisplayTypeColumnAtDataProviderItemTable1764920710145'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP COLUMN "display_type"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD "display_type" character varying(50) NOT NULL DEFAULT 'image'`);
    }

}
