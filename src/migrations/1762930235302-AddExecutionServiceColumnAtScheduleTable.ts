import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExecutionServiceColumnAtScheduleTable1762930235302 implements MigrationInterface {
    name = 'AddExecutionServiceColumnAtScheduleTable1762930235302'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedules" ADD "execution_service" character varying(20) NOT NULL DEFAULT 'data_provider'`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ADD "execution_service" character varying(20) NOT NULL DEFAULT 'data_provider'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_jobs" DROP COLUMN "execution_service"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "execution_service"`);
    }

}
