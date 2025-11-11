import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveServiceNameColumn1762837246754 implements MigrationInterface {
    name = 'RemoveServiceNameColumn1762837246754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_jobs" DROP COLUMN "worker_service"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "worker_service"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedules" ADD "worker_service" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ADD "worker_service" character varying(50) NOT NULL`);
    }

}
