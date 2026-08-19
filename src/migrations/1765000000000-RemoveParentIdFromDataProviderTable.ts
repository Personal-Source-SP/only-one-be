import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveParentIdFromDataProviderTable1765000000000 implements MigrationInterface {
    name = 'RemoveParentIdFromDataProviderTable1765000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_providers" DROP CONSTRAINT IF EXISTS "FK_f75e897c7184b7a3455a4ac860a"`);
        await queryRunner.query(`ALTER TABLE "data_providers" DROP COLUMN IF EXISTS "parent_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_providers" ADD "parent_id" uuid`);
        await queryRunner.query(
            `ALTER TABLE "data_providers" ADD CONSTRAINT "FK_f75e897c7184b7a3455a4ac860a" FOREIGN KEY ("parent_id") REFERENCES "data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }
}
