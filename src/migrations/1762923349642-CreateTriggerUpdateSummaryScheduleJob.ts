import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriggerUpdateSummaryScheduleJob1762923349642 implements MigrationInterface {
    name = 'CreateTriggerUpdateSummaryScheduleJob1762923349642';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_schedule_job_event_summary()
            RETURNS TRIGGER AS $$
            DECLARE
                v_schedule_job_id UUID;
                v_event_count INTEGER;
                v_event_failed_count INTEGER;
                v_event_success_count INTEGER;
                v_event_pending_count INTEGER;
                v_current_finished_at TIMESTAMPTZ;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    v_schedule_job_id := OLD.schedule_job_id;
                ELSE
                    v_schedule_job_id := NEW.schedule_job_id;
                END IF;

                SELECT 
                    COUNT(*) FILTER (WHERE deleted_at IS NULL),
                    COUNT(*) FILTER (WHERE event_type = 'failed' AND deleted_at IS NULL),
                    COUNT(*) FILTER (WHERE event_type = 'completed' AND deleted_at IS NULL),
                    COUNT(*) FILTER (WHERE event_type IN ('pending', 'processing') AND deleted_at IS NULL)
                INTO 
                    v_event_count,
                    v_event_failed_count,
                    v_event_success_count,
                    v_event_pending_count
                FROM schedule_job_events
                WHERE schedule_job_id = v_schedule_job_id;

                SELECT finished_at INTO v_current_finished_at
                FROM schedule_jobs
                WHERE id = v_schedule_job_id;

                UPDATE schedule_jobs
                SET 
                    event_count = v_event_count,
                    event_failed_count = v_event_failed_count,
                    event_success_count = v_event_success_count,
                    event_pending_count = v_event_pending_count,
                    status = CASE
                        WHEN v_event_pending_count > 0 THEN 'processing'
                        WHEN v_event_count = 0 THEN 'pending'
                        WHEN v_event_pending_count = 0 AND v_event_failed_count > 0 THEN 'failed'
                        WHEN v_event_pending_count = 0 THEN 'completed'
                    END,
                    finished_at = CASE
                        WHEN v_event_pending_count = 0 
                        AND v_event_count > 0
                        AND v_current_finished_at IS NULL
                        THEN NOW()
                        ELSE v_current_finished_at
                    END
                WHERE id = v_schedule_job_id;

                IF TG_OP = 'DELETE' THEN
                    RETURN OLD;
                ELSE
                    RETURN NEW;
                END IF;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE TRIGGER trigger_update_schedule_job_event_summary
            AFTER INSERT OR UPDATE OR DELETE ON schedule_job_events
            FOR EACH ROW
            EXECUTE FUNCTION update_schedule_job_event_summary();
        `);

        await queryRunner.query(`
            UPDATE schedule_jobs
            SET 
                event_count = COALESCE((
                    SELECT COUNT(*)
                    FROM schedule_job_events
                    WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                    AND schedule_job_events.deleted_at IS NULL
                ), 0),
                event_failed_count = COALESCE((
                    SELECT COUNT(*)
                    FROM schedule_job_events
                    WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                    AND schedule_job_events.event_type = 'failed'
                    AND schedule_job_events.deleted_at IS NULL
                ), 0),
                event_success_count = COALESCE((
                    SELECT COUNT(*)
                    FROM schedule_job_events
                    WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                    AND schedule_job_events.event_type = 'completed'
                    AND schedule_job_events.deleted_at IS NULL
                ), 0),
                event_pending_count = COALESCE((
                    SELECT COUNT(*)
                    FROM schedule_job_events
                    WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                    AND schedule_job_events.event_type IN ('pending', 'processing')
                    AND schedule_job_events.deleted_at IS NULL
                ), 0),
                status = CASE
                    WHEN COALESCE((
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                        AND schedule_job_events.event_type IN ('pending', 'processing')
                        AND schedule_job_events.deleted_at IS NULL
                    ), 0) > 0 THEN 'processing'
                    WHEN COALESCE((
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                        AND schedule_job_events.deleted_at IS NULL
                    ), 0) = 0 THEN 'pending'
                    WHEN COALESCE((
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                        AND schedule_job_events.event_type IN ('pending', 'processing')
                        AND schedule_job_events.deleted_at IS NULL
                    ), 0) = 0 
                    AND COALESCE((
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                        AND schedule_job_events.event_type = 'failed'
                        AND schedule_job_events.deleted_at IS NULL
                    ), 0) > 0 THEN 'failed'
                    ELSE 'completed'
                END,
                finished_at = CASE
                    WHEN COALESCE((
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                        AND schedule_job_events.event_type IN ('pending', 'processing')
                        AND schedule_job_events.deleted_at IS NULL
                    ), 0) = 0 
                    AND COALESCE((
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_events.schedule_job_id = schedule_jobs.id
                        AND schedule_job_events.deleted_at IS NULL
                    ), 0) > 0
                    AND finished_at IS NULL
                    THEN NOW()
                    ELSE finished_at
                END;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_schedule_job_event_summary ON schedule_job_events`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_schedule_job_event_summary()`);
    }
}
