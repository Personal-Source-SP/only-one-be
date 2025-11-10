import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateScheduleTables1762772303539 implements MigrationInterface {
    name = 'CreateScheduleTables1762772303539'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "schedule_job_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "schedule_job_id" uuid NOT NULL, "event_type" character varying(20) NOT NULL DEFAULT 'pending', "event_message" character varying(255) NOT NULL, "meta_data" jsonb, CONSTRAINT "PK_d61b05ed43d4ad96cf405e7899d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "type" character varying(20) NOT NULL DEFAULT 'global', "cron_expression" character varying(20) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "worker_service" character varying(50) NOT NULL, "min_scrape_interval_minutes" integer NOT NULL DEFAULT '60', "next_run_at" TIMESTAMP WITH TIME ZONE, "last_run_at" TIMESTAMP WITH TIME ZONE, "payload" jsonb, CONSTRAINT "PK_7e33fc2ea755a5765e3564e66dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "schedule_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "schedule_id" uuid NOT NULL, "schedule_type" character varying(20) NOT NULL DEFAULT 'global', "trigger_type" character varying(20) NOT NULL DEFAULT 'cron', "worker_service" character varying(50) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "retry_count" integer NOT NULL DEFAULT '0', "job_payload" jsonb NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, "error_message" text, CONSTRAINT "PK_73748eb31ce95d0832b9fb0be0f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "schedule_job_events" ADD CONSTRAINT "FK_8ad984a7415e35c196bb260dd71" FOREIGN KEY ("schedule_job_id") REFERENCES "schedule_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule_jobs" ADD CONSTRAINT "FK_5f16159b52968a80fa82eb2cf02" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_jobs" DROP CONSTRAINT "FK_5f16159b52968a80fa82eb2cf02"`);
        await queryRunner.query(`ALTER TABLE "schedule_job_events" DROP CONSTRAINT "FK_8ad984a7415e35c196bb260dd71"`);
        await queryRunner.query(`DROP TABLE "schedule_jobs"`);
        await queryRunner.query(`DROP TABLE "schedules"`);
        await queryRunner.query(`DROP TABLE "schedule_job_events"`);
    }

}
