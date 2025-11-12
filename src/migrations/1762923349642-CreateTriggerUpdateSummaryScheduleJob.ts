import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriggerUpdateSummaryScheduleJob1762923349642 implements MigrationInterface {
    name = 'CreateTriggerUpdateSummaryScheduleJob1762923349642';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_schedule_job_event_summary()
            RETURNS TRIGGER AS $$
            DECLARE
                v_schedule_job_id UUID;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    v_schedule_job_id := OLD.schedule_job_id;
                ELSE
                    v_schedule_job_id := NEW.schedule_job_id;
                END IF;

                UPDATE schedule_jobs
                SET 
                    event_count = (
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_id = v_schedule_job_id
                        AND deleted_at IS NULL
                    ),
                    event_failed_count = (
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_id = v_schedule_job_id
                        AND event_type = 'failed'
                        AND deleted_at IS NULL
                    ),
                    event_success_count = (
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_id = v_schedule_job_id
                        AND event_type = 'completed'
                        AND deleted_at IS NULL
                    ),
                    event_pending_count = (
                        SELECT COUNT(*)
                        FROM schedule_job_events
                        WHERE schedule_job_id = v_schedule_job_id
                        AND event_type IN ('pending', 'processing')
                        AND deleted_at IS NULL
                    )
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
                ), 0);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_schedule_job_event_summary ON schedule_job_events`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_schedule_job_event_summary()`);
    }
}
