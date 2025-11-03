import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUniqueAtDataProviderItem1762168024693 implements MigrationInterface {
    name = 'RemoveUniqueAtDataProviderItem1762168024693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" DROP CONSTRAINT "UQ_4c1e215909dbfc5166ff6ac6e8f"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_provider_items" ADD CONSTRAINT "UQ_4c1e215909dbfc5166ff6ac6e8f" UNIQUE ("item_id", "data_provider_id")`);
    }

}
