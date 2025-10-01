import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserNameColumnAtUserTable1759326757505 implements MigrationInterface {
    name = 'CreateUserNameColumnAtUserTable1759326757505';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users " ADD "user_name" character varying(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users " ADD CONSTRAINT "UQ_45f52e54f6052f96adb21bdf650" UNIQUE ("user_name")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users " DROP CONSTRAINT "UQ_45f52e54f6052f96adb21bdf650"`);
        await queryRunner.query(`ALTER TABLE "users " DROP COLUMN "user_name"`);
    }
}
