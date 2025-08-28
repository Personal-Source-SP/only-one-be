import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateGoogleDriveTables1754316528342 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create google_drive_tokens table
        await queryRunner.createTable(
            new Table({
                name: 'google_drive_tokens',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'access_token',
                        type: 'varchar',
                        length: '2000',
                        isNullable: false,
                    },
                    {
                        name: 'refresh_token',
                        type: 'varchar',
                        length: '2000',
                        isNullable: true,
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
                        isNullable: false,
                    },
                    {
                        name: 'scope',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'token_type',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create google_drive_files table
        await queryRunner.createTable(
            new Table({
                name: 'google_drive_files',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'google_drive_id',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '500',
                        isNullable: false,
                    },
                    {
                        name: 'mime_type',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'size',
                        type: 'bigint',
                        isNullable: true,
                    },
                    {
                        name: 'web_view_link',
                        type: 'varchar',
                        length: '1000',
                        isNullable: true,
                    },
                    {
                        name: 'web_content_link',
                        type: 'varchar',
                        length: '1000',
                        isNullable: true,
                    },
                    {
                        name: 'thumbnail_link',
                        type: 'varchar',
                        length: '1000',
                        isNullable: true,
                    },
                    {
                        name: 'parent_folder_id',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'last_modified',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'last_viewed_by_me',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'is_trashed',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'is_starred',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create indexes
        await queryRunner.createIndex(
            'google_drive_tokens',
            new TableIndex({
                name: 'IDX_GOOGLE_DRIVE_TOKENS_USER_ID',
                columnNames: ['user_id'],
                isUnique: true,
            }),
        );

        await queryRunner.createIndex(
            'google_drive_files',
            new TableIndex({
                name: 'IDX_GOOGLE_DRIVE_FILES_GOOGLE_DRIVE_ID',
                columnNames: ['google_drive_id'],
                isUnique: true,
            }),
        );

        await queryRunner.createIndex(
            'google_drive_files',
            new TableIndex({
                name: 'IDX_GOOGLE_DRIVE_FILES_USER_ID',
                columnNames: ['user_id'],
            }),
        );

        // Create foreign keys
        await queryRunner.createForeignKey(
            'google_drive_tokens',
            new TableForeignKey({
                name: 'FK_GOOGLE_DRIVE_TOKENS_USER_ID',
                columnNames: ['user_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'google_drive_files',
            new TableForeignKey({
                name: 'FK_GOOGLE_DRIVE_FILES_USER_ID',
                columnNames: ['user_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        await queryRunner.dropForeignKey('google_drive_files', 'FK_GOOGLE_DRIVE_FILES_USER_ID');
        await queryRunner.dropForeignKey('google_drive_tokens', 'FK_GOOGLE_DRIVE_TOKENS_USER_ID');

        // Drop indexes
        await queryRunner.dropIndex('google_drive_files', 'IDX_GOOGLE_DRIVE_FILES_USER_ID');
        await queryRunner.dropIndex('google_drive_files', 'IDX_GOOGLE_DRIVE_FILES_GOOGLE_DRIVE_ID');
        await queryRunner.dropIndex('google_drive_tokens', 'IDX_GOOGLE_DRIVE_TOKENS_USER_ID');

        // Drop tables
        await queryRunner.dropTable('google_drive_files');
        await queryRunner.dropTable('google_drive_tokens');
    }
}
