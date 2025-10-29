import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueCodeForItemTable1761735082495 implements MigrationInterface {
    name = 'AddUniqueCodeForItemTable1761735082495'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "items" ADD CONSTRAINT "UQ_1b0a705ce0dc5430c020a0ec31f" UNIQUE ("code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "UQ_1b0a705ce0dc5430c020a0ec31f"`);
    }

}
