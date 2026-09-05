import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class ScheduleError {
    static readonly InvalidCronExpression: IAppError = {
        code: 'schedule_invalid_cron_expression',
        message: 'Biểu thức cron không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly DuplicateSchedule: IAppError = {
        code: 'schedule_duplicate',
        message: 'Lịch trình đã tồn tại trong hệ thống.',
        statusCode: HttpStatus.CONFLICT,
    };

    static ScheduleNotFound = (id: string): IAppError => ({
        code: 'schedule_not_found',
        message: `Không tìm thấy lịch trình với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static readonly StatusSwitchFailed: IAppError = {
        code: 'schedule_status_switch_failed',
        message: 'Lỗi khi chuyển đổi trạng thái lịch trình.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly TriggerScheduleFailed: IAppError = {
        code: 'schedule_trigger_failed',
        message: 'Lỗi khi kích hoạt thực thi lịch trình.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly InvalidExecutionService: IAppError = {
        code: 'schedule_invalid_execution_service',
        message: 'Service thực thi lịch trình không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly JobQueueAddFailed: IAppError = {
        code: 'schedule_job_queue_add_failed',
        message: 'Không thể thêm job vào hàng đợi thực thi.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    static readonly NoDataProvidersToScrape: IAppError = {
        code: 'schedule_no_data_providers_to_scrape',
        message: 'Không có nhà cung cấp dữ liệu nào sẵn sàng để scrape.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly NoItemsToScrape: IAppError = {
        code: 'schedule_no_items_to_scrape',
        message: 'Không có item nào sẵn sàng để scrape.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly InvalidScheduleType: IAppError = {
        code: 'schedule_invalid_type',
        message: 'Loại lịch trình không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly JobEventsCreateFailed: IAppError = {
        code: 'schedule_job_events_create_failed',
        message: 'Không thể khởi tạo các sự kiện cho schedule job.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
}
