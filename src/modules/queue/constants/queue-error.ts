import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class QueueError {
    static QueueNotFound = (queueName: string): IAppError => ({
        code: 'queue_not_found',
        message: `Không tìm thấy hàng đợi: ${queueName}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { queueName },
    });
}
