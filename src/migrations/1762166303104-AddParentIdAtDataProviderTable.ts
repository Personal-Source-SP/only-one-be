import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentIdAtDataProviderTable1762166303104 implements MigrationInterface {
    name = 'AddParentIdAtDataProviderTable1762166303104';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_providers" ADD "parent_id" uuid`);
        await queryRunner.query(`ALTER TABLE "data_providers" ALTER COLUMN "identifier" SET NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "data_providers"."identifier" IS NULL`);
        await queryRunner.query(
            `ALTER TABLE "data_providers" ADD CONSTRAINT "FK_f75e897c7184b7a3455a4ac860a" FOREIGN KEY ("parent_id") REFERENCES "data_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_providers" DROP CONSTRAINT "FK_f75e897c7184b7a3455a4ac860a"`);
        await queryRunner.query(`COMMENT ON COLUMN "data_providers"."identifier" IS 'Group identifier for region-specific providers'`);
        await queryRunner.query(`ALTER TABLE "data_providers" ALTER COLUMN "identifier" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "data_providers" DROP COLUMN "parent_id"`);
    }
}
