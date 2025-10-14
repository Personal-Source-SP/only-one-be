import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleRefreshTokenExpiresAtColumnAtGoogleAuthTable1760438841846 implements MigrationInterface {
    name = 'AddGoogleRefreshTokenExpiresAtColumnAtGoogleAuthTable1760438841846';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_auths" ADD "google_refresh_token_expires_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_auths" DROP COLUMN "google_refresh_token_expires_at"`);
    }
}
