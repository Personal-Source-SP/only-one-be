import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeDataHistoryTable1761634155656 implements MigrationInterface {
    name = 'ChangeDataHistoryTable1761634155656'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_history" ADD "data_provider_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "data_history" ALTER COLUMN "data_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "data_history" ALTER COLUMN "type" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "data_history" ALTER COLUMN "url" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "data_history" ADD CONSTRAINT "FK_2a285e6ca7aeb30bcab9d58c5ed" FOREIGN KEY ("data_provider_id") REFERENCES "data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_history" DROP CONSTRAINT "FK_2a285e6ca7aeb30bcab9d58c5ed"`);
        await queryRunner.query(`ALTER TABLE "data_history" ALTER COLUMN "url" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "data_history" ALTER COLUMN "type" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "data_history" ALTER COLUMN "data_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "data_history" DROP COLUMN "data_provider_id"`);
    }

}
