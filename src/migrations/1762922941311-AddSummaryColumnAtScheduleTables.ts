import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSummaryColumnAtScheduleTables1762922941311 implements MigrationInterface {
    name = 'AddSummaryColumnAtScheduleTables1762922941311'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ADD "event_count" integer`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ADD "event_failed_count" integer`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ADD "event_success_count" integer`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ADD "event_pending_count" integer`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD "job_count" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "job_count"`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" DROP COLUMN "event_pending_count"`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" DROP COLUMN "event_success_count"`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" DROP COLUMN "event_failed_count"`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" DROP COLUMN "event_count"`);
    }

}
