import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServiceExecutionColumnAtSimulationItemTable1763561282143 implements MigrationInterface {
    name = 'AddServiceExecutionColumnAtSimulationItemTable1763561282143'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "simulation_items" ADD "service_execution" character varying(255) NOT NULL DEFAULT 'unlucid-ai'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "simulation_items" DROP COLUMN "service_execution"`);
    }

}
