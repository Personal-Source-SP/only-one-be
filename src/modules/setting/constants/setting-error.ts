import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class SettingError {
    static readonly KeyAlreadyExists: IAppError = {
        code: 'setting_key_already_exists',
        message: 'Khóa cấu hình đã tồn tại trong hệ thống.',
        statusCode: HttpStatus.CONFLICT,
    };

    static readonly SettingNotFound: IAppError = {
        code: 'setting_not_found',
        message: 'Không tìm thấy cấu hình cài đặt.',
        statusCode: HttpStatus.NOT_FOUND,
    };
}
