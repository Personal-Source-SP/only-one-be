import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailColumnAtGoogleAuthTable1760589811749 implements MigrationInterface {
    name = 'AddEmailColumnAtGoogleAuthTable1760589811749';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_auths" ADD "email" character varying(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "google_auths" DROP CONSTRAINT "FK_670ed6362ab09ea86d6293a6749"`);
        await queryRunner.query(`ALTER TABLE "google_auths" DROP CONSTRAINT "UQ_670ed6362ab09ea86d6293a6749"`);
        await queryRunner.query(`ALTER TABLE "google_auths" ADD CONSTRAINT "UQ_80b63bc16bf206a13c451eae2be" UNIQUE ("user_id", "email")`);
        await queryRunner.query(
            `ALTER TABLE "google_auths" ADD CONSTRAINT "FK_670ed6362ab09ea86d6293a6749" FOREIGN KEY ("user_id") REFERENCES "users "("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_auths" DROP CONSTRAINT "FK_670ed6362ab09ea86d6293a6749"`);
        await queryRunner.query(`ALTER TABLE "google_auths" DROP CONSTRAINT "UQ_80b63bc16bf206a13c451eae2be"`);
        await queryRunner.query(`ALTER TABLE "google_auths" ADD CONSTRAINT "UQ_670ed6362ab09ea86d6293a6749" UNIQUE ("user_id")`);
        await queryRunner.query(
            `ALTER TABLE "google_auths" ADD CONSTRAINT "FK_670ed6362ab09ea86d6293a6749" FOREIGN KEY ("user_id") REFERENCES "users "("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(`ALTER TABLE "google_auths" DROP COLUMN "email"`);
    }
}
