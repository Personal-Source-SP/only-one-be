import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRetryCountColumnAtScheduleJobEventTable1762845884929 implements MigrationInterface {
    name = 'AddRetryCountColumnAtScheduleJobEventTable1762845884929'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_jobs" DROP COLUMN "retry_count"`);
        await queryRunner.query(`ALTER TABLE "schedule_job_events" ADD "retry_count" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "schedule_job_events" ADD "payload" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_job_events" DROP COLUMN "payload"`);
        await queryRunner.query(`ALTER TABLE "schedule_job_events" DROP COLUMN "retry_count"`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ADD "retry_count" integer NOT NULL DEFAULT '0'`);
    }

}
