export enum ScheduleJobTriggerType {
    CRON = 'cron',
    MANUAL = 'manual',
}

export enum ScheduleJobType {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}
