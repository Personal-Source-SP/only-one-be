import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTriggerUpdateLastSuccessfulScrapeAt1761275641888 implements MigrationInterface {
    name = 'AddTriggerUpdateLastSuccessfulScrapeAt1761275641888';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_data_provider_last_scrape()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Update last_successful_scrape_at của data_providers
                UPDATE data_providers 
                SET last_successful_scrape_at = NEW.scrape_timestamp
                WHERE id = (
                    SELECT dpi.data_provider_id 
                    FROM data_provider_items dpi 
                    WHERE dpi.id = NEW.data_provider_item_id
                );
                
                -- Update last_scraped_timestamp của data_provider_items
                UPDATE data_provider_items 
                SET last_scraped_timestamp = NEW.scrape_timestamp
                WHERE id = NEW.data_provider_item_id;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE TRIGGER trigger_update_last_successful_scrape_at
            AFTER INSERT ON data_history
            FOR EACH ROW
            EXECUTE FUNCTION update_data_provider_last_scrape();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS trigger_update_last_successful_scrape_at ON data_history;
        `);

        await queryRunner.query(`
            DROP FUNCTION IF EXISTS update_data_provider_last_scrape();
        `);
    }
}
