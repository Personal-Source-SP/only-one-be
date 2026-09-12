import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDiscoverySessionProgressTrigger1765900000000 implements MigrationInterface {
    name = 'CreateDiscoverySessionProgressTrigger1765900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create composite index for high performance aggregate scans
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_discovery_urls_session_validation"
            ON "discovery_urls" ("session_id", "validation_status", "match_result");
        `);

        // 2. Create PL/pgSQL aggregate function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fn_sync_discovery_session_progress()
            RETURNS TRIGGER AS $$
            DECLARE
                v_session_id UUID;
                v_total_discovered INT;
                v_total_validated INT;
                v_matched_urls INT;
                v_no_match_urls INT;
            BEGIN
                v_session_id := COALESCE(NEW.session_id, OLD.session_id);
                IF v_session_id IS NULL THEN
                    RETURN NULL;
                END IF;

                -- Aggregate metrics from discovery_urls
                SELECT 
                    COUNT(*),
                    COUNT(*) FILTER (WHERE validation_status = 'completed'),
                    COUNT(*) FILTER (WHERE match_result IN ('exact_match', 'partial_match')),
                    COUNT(*) FILTER (WHERE match_result = 'no_match')
                INTO 
                    v_total_discovered,
                    v_total_validated,
                    v_matched_urls,
                    v_no_match_urls
                FROM discovery_urls
                WHERE session_id = v_session_id;

                -- Update discovery_sessions with accurate aggregate numbers
                UPDATE discovery_sessions
                SET 
                    total_discovered = v_total_discovered,
                    total_validated = v_total_validated,
                    matched_urls = v_matched_urls,
                    no_match_urls = v_no_match_urls,
                    validation_status = CASE 
                        WHEN validation_status = 'processing' AND v_total_validated >= v_total_discovered AND v_total_discovered > 0 THEN 'completed'
                        ELSE validation_status 
                    END,
                    validation_completed_at = CASE 
                        WHEN validation_status = 'processing' AND v_total_validated >= v_total_discovered AND v_total_discovered > 0 THEN NOW()
                        ELSE validation_completed_at 
                    END
                WHERE id = v_session_id;

                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 3. Create Trigger on discovery_urls table
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS trg_sync_discovery_session_progress ON discovery_urls;
            CREATE TRIGGER trg_sync_discovery_session_progress
            AFTER INSERT OR UPDATE OF validation_status, match_result OR DELETE
            ON discovery_urls
            FOR EACH ROW
            EXECUTE FUNCTION fn_sync_discovery_session_progress();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS trg_sync_discovery_session_progress ON discovery_urls;
        `);

        await queryRunner.query(`
            DROP FUNCTION IF EXISTS fn_sync_discovery_session_progress();
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_discovery_urls_session_validation";
        `);
    }
}
