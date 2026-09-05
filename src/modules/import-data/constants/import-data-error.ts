import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class ImportDataError {
    static readonly InvalidImportFormat: IAppError = {
        code: 'import_data_invalid_format',
        message: 'Định dạng file hoặc cấu trúc dữ liệu import không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly ImportFailed: IAppError = {
        code: 'import_data_failed',
        message: 'Quá trình import dữ liệu thất bại.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
}
