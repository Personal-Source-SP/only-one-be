import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeSimulationTables1763716192255 implements MigrationInterface {
    name = 'ChangeSimulationTables1763716192255'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "simulation_contexts" DROP CONSTRAINT "CHK_ecef28402f4c031ffdff8d1095"`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" DROP COLUMN "identifier"`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" DROP COLUMN "payload"`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" DROP COLUMN "last_successful_scrape_at"`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" ADD "service_execution" character varying(255) NOT NULL DEFAULT 'unlucid-ai'`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" ADD "default_payload" jsonb`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" ADD "steps" jsonb`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" ADD "last_successful_run_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "simulation_contexts" DROP COLUMN "last_successful_run_at"`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" DROP COLUMN "steps"`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" DROP COLUMN "default_payload"`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" DROP COLUMN "service_execution"`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" ADD "last_successful_scrape_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" ADD "payload" jsonb`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" ADD "identifier" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "simulation_contexts" ADD CONSTRAINT "CHK_ecef28402f4c031ffdff8d1095" CHECK (((identifier IS NULL) OR ((identifier)::text ~ '^[a-z0-9-]+$'::text)))`);
    }

}
