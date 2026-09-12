import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetKeywordsToDiscoverySessions1766000000000 implements MigrationInterface {
    name = 'AddTargetKeywordsToDiscoverySessions1766000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discovery_sessions"
            ADD COLUMN IF NOT EXISTS "target_keywords" jsonb DEFAULT '[]';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discovery_sessions"
            DROP COLUMN IF EXISTS "target_keywords";
        `);
    }
}
