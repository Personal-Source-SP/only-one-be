import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdAndSettingTypeToSettings1766100000000 implements MigrationInterface {
    name = 'AddUserIdAndSettingTypeToSettings1766100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settings" ADD "user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "UQ_c8639b7626fa94ba8265628f214"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_settings_global_key" ON "settings" ("key") WHERE "user_id" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_settings_user_key" ON "settings" ("key", "user_id") WHERE "user_id" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "FK_settings_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "FK_settings_user_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_settings_user_key"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_settings_global_key"`);
        await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "UQ_c8639b7626fa94ba8265628f214" UNIQUE ("key")`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "user_id"`);
    }
}
