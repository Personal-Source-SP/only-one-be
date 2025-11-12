import { ScheduleType } from '../enums';

export interface IAddJobRequest {
    scheduleJobId: string;
    scheduleType: ScheduleType;
    jobPayload: Record<string, any>;
}

export interface IScheduleExecutionInterface {
    addJob(request: IAddJobRequest): Promise<boolean>;
}
