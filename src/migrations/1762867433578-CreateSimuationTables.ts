import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSimuationTables1762867433578 implements MigrationInterface {
    name = 'CreateSimuationTables1762867433578'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "simulation_contexts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "identifier" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "base_url" character varying(255) NOT NULL, "status" character varying(100) NOT NULL DEFAULT 'active', "payload" jsonb, "last_successful_scrape_at" TIMESTAMP, CONSTRAINT "UQ_9a3be8114da63cb262d5f5cd8f7" UNIQUE ("base_url"), CONSTRAINT "CHK_ecef28402f4c031ffdff8d1095" CHECK ("identifier" is null OR "identifier" ~ '^[a-z0-9-]+$'), CONSTRAINT "CHK_6be520d10ff23ec546a2707330" CHECK ("base_url" NOT LIKE '%/'), CONSTRAINT "PK_2ecd3c0c593e0717b46d4f512a9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "simulation_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "simulation_context_id" uuid NOT NULL, "status" character varying(255) NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMP WITH TIME ZONE, "payload" jsonb, "metadata" jsonb, "error_message" character varying(255) NOT NULL, CONSTRAINT "PK_6f605674b98fdf04f92a764f611" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "simulation_items" ADD CONSTRAINT "FK_3f8699ef81ac8a6db21778e30ab" FOREIGN KEY ("simulation_context_id") REFERENCES "simulation_contexts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "simulation_items" DROP CONSTRAINT "FK_3f8699ef81ac8a6db21778e30ab"`);
        await queryRunner.query(`DROP TABLE "simulation_items"`);
        await queryRunner.query(`DROP TABLE "simulation_contexts"`);
    }

}
