import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStartAndFinishAtColumnAtScheduleJobEventTable1762845476482 implements MigrationInterface {
    name = 'AddStartAndFinishAtColumnAtScheduleJobEventTable1762845476482'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_job_events" ADD "started_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "schedule_job_events" ADD "finished_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_job_events" DROP COLUMN "finished_at"`);
        await queryRunner.query(`ALTER TABLE "schedule_job_events" DROP COLUMN "started_at"`);
    }

}
