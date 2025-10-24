import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeDataHistoryTable1761316612997 implements MigrationInterface {
    name = 'ChangeDataHistoryTable1761316612997'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_history" ADD "type" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "data_history" ADD "url" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "data_history" ADD "last_modified" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_history" DROP COLUMN "last_modified"`);
        await queryRunner.query(`ALTER TABLE "data_history" DROP COLUMN "url"`);
        await queryRunner.query(`ALTER TABLE "data_history" DROP COLUMN "type"`);
    }

}
