import { MigrationInterface, QueryRunner } from "typeorm";

export class SetNullForJobPayloadColumn1762844431665 implements MigrationInterface {
    name = 'SetNullForJobPayloadColumn1762844431665'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ALTER COLUMN "job_payload" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ALTER COLUMN "job_payload" SET NOT NULL`);
    }

}
