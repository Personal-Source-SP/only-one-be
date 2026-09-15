import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNetworkDevicesTable1766300000000 implements MigrationInterface {
    name = 'CreateNetworkDevicesTable1766300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "network_devices" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                "deleted_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "ip_address" character varying(45) NOT NULL,
                "device_type" character varying(50) NOT NULL DEFAULT 'UNKNOWN',
                "mac_address" character varying(17),
                "vendor" character varying(100),
                "model" character varying(150),
                "firmware_version" character varying(100),
                "open_ports" jsonb NOT NULL DEFAULT '[]',
                "onvif_metadata" jsonb,
                "is_online" boolean NOT NULL DEFAULT true,
                "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "UQ_network_devices_ip_address" UNIQUE ("ip_address"),
                CONSTRAINT "PK_network_devices_id" PRIMARY KEY ("id")
            );
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_network_devices_ip_address" ON "network_devices" ("ip_address");
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_network_devices_mac_address" ON "network_devices" ("mac_address");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_network_devices_mac_address";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_network_devices_ip_address";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "network_devices";`);
    }
}
