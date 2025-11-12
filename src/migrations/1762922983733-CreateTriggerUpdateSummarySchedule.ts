import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriggerUpdateSummarySchedule1762922983733 implements MigrationInterface {
    name = 'CreateTriggerUpdateSummarySchedule1762922983733';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_schedule_job_count()
            RETURNS TRIGGER AS $$
            DECLARE
                v_schedule_id UUID;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    v_schedule_id := OLD.schedule_id;
                ELSE
                    v_schedule_id := NEW.schedule_id;
                END IF;

                UPDATE schedules
                SET job_count = (
                    SELECT COUNT(*)
                    FROM schedule_jobs
                    WHERE schedule_id = v_schedule_id
                    AND deleted_at IS NULL
                )
                WHERE id = v_schedule_id;

                IF TG_OP = 'DELETE' THEN
                    RETURN OLD;
                ELSE
                    RETURN NEW;
                END IF;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE TRIGGER trigger_update_schedule_job_count
            AFTER INSERT OR DELETE ON schedule_jobs
            FOR EACH ROW
            EXECUTE FUNCTION update_schedule_job_count();
        `);

        await queryRunner.query(`
            UPDATE schedules
            SET job_count = COALESCE((
                SELECT COUNT(*)
                FROM schedule_jobs
                WHERE schedule_jobs.schedule_id = schedules.id
                AND schedule_jobs.deleted_at IS NULL
            ), 0);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_schedule_job_count ON schedule_jobs`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_schedule_job_count()`);
    }
}
