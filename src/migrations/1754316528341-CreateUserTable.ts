import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserTable1754316528341 implements MigrationInterface {
    name = 'CreateUserTable1754316528341'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users " ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "first_name" character varying(100), "last_name" character varying(100), "email" character varying(200) NOT NULL, "password" character varying(200) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "phone_number" character varying, CONSTRAINT "UQ_0fb77e465edebc92c4aa86c548a" UNIQUE ("email"), CONSTRAINT "PK_4ab1c54e07add7286bfd0c510c4" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users "`);
    }

}
