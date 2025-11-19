import { MigrationInterface, QueryRunner } from "typeorm";

export class SetNullableForErrorMessageAtSimulationItemTable1763536133633 implements MigrationInterface {
    name = 'SetNullableForErrorMessageAtSimulationItemTable1763536133633'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "simulation_items" ALTER COLUMN "error_message" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "simulation_items" ALTER COLUMN "error_message" SET NOT NULL`);
    }

}
