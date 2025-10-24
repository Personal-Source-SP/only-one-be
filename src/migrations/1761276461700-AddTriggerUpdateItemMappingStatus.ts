import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTriggerUpdateItemMappingStatus1761276461700 implements MigrationInterface {
    name = 'AddTriggerUpdateItemMappingStatus1761276461700';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS trigger_when_action ON data_provider_items;
            DROP FUNCTION IF EXISTS update_mapping_status_item_table;
        `);

        // Create the function to update the mapping status of the product
        await queryRunner.query(`
            CREATE FUNCTION update_mapping_status_item_table()
            RETURNS TRIGGER AS $$
            DECLARE
                v_item_id UUID;
                v_mapping_status VARCHAR;
                v_has_data_history BOOLEAN;
                v_data_provider_item_exists BOOLEAN;
            BEGIN
                -- Determine which product ID to check based on operation type
                IF TG_OP = 'DELETE' THEN
                    v_item_id := OLD.item_id;
                ELSE
                    v_item_id := NEW.item_id;
                END IF;
                
                -- Skip if item_id is NULL
                IF v_item_id IS NULL THEN
                    RETURN NEW;
                END IF;

                -- Check if any associated DataProviderItem has data history
                SELECT EXISTS (
                    SELECT 1
                    FROM data_provider_items
                    WHERE item_id = v_item_id
                    AND last_scraped_timestamp IS NOT NULL
                )
                INTO v_has_data_history;
                
                -- Check if item is still mapped to any data provider item
                SELECT EXISTS (
                    SELECT 1
                    FROM data_provider_items
                    WHERE item_id = v_item_id
                )
                INTO v_data_provider_item_exists;
                
                -- Determine mapping status based on conditions
                IF v_has_data_history THEN
                    v_mapping_status := 'mapped_has_data';
                ELSIF v_data_provider_item_exists THEN
                    v_mapping_status := 'mapped';
                ELSE
                    v_mapping_status := 'unmapped';
                END IF;

                -- Update the item's mapping status
                UPDATE items
                SET 
                    mapping_status = v_mapping_status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = v_item_id;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create the trigger to execute the function after insert or update or delete on data_provider_items
        await queryRunner.query(`
            CREATE TRIGGER trigger_when_action
            AFTER UPDATE OR INSERT OR DELETE ON data_provider_items
            FOR EACH ROW
            EXECUTE FUNCTION update_mapping_status_item_table();
        `);

        // Initialize items mapping status based on existing data provider items
        await queryRunner.query(`
            UPDATE items i
            SET mapping_status = 
                CASE 
                    WHEN EXISTS (
                        SELECT 1 
                        FROM data_provider_items dpi 
                        WHERE dpi.item_id = i.id 
                        AND dpi.last_scraped_timestamp IS NOT NULL 
                    ) THEN 'mapped_has_data'
                    WHEN EXISTS (
                        SELECT 1 
                        FROM data_provider_items dpi 
                        WHERE dpi.item_id = i.id
                    ) THEN 'mapped'
                    ELSE 'unmapped'
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE TRUE;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the trigger
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS trigger_when_action ON data_provider_items;
        `);

        // Drop the function
        await queryRunner.query(`
            DROP FUNCTION IF EXISTS update_mapping_status_item_table;
        `);
    }
}
