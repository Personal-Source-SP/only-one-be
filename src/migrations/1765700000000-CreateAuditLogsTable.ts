import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1765700000000 implements MigrationInterface {
    name = 'CreateAuditLogsTable1765700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "user_id" uuid,
                "user_email" character varying(200),
                "action" character varying(50) NOT NULL,
                "resource" character varying(100) NOT NULL,
                "resource_id" character varying(100),
                "ip_address" character varying(50),
                "user_agent" text,
                "old_values" jsonb,
                "new_values" jsonb,
                "description" text,
                "metadata" jsonb,
                "status" character varying(50) NOT NULL DEFAULT 'SUCCESS',
                "error_message" text,
                "duration_ms" integer,
                CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
            );
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_resource_resource_id" ON "audit_logs" ("resource", "resource_id");
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_user_id_created_at" ON "audit_logs" ("user_id", "created_at");
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_action_created_at" ON "audit_logs" ("action", "created_at");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_action_created_at";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_user_id_created_at";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_resource_resource_id";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
    }
}
