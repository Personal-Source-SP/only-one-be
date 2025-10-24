import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeDataHistoryTable1761275641887 implements MigrationInterface {
    name = 'ChangeDataHistoryTable1761275641887';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_history" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "data_history" DROP COLUMN "error_message"`);
        await queryRunner.query(`ALTER TABLE "data_history" ADD "data_id" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_history" DROP COLUMN "data_id"`);
        await queryRunner.query(`ALTER TABLE "data_history" ADD "error_message" text`);
        await queryRunner.query(`ALTER TABLE "data_history" ADD "status" character varying(20) DEFAULT 'success'`);
    }
}
