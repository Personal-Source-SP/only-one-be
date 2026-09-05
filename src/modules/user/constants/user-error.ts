import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class UserError {
    static readonly UserNotFound: IAppError = {
        code: 'user_not_found',
        message: 'Không tìm thấy người dùng trong hệ thống.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly EmailAlreadyExists: IAppError = {
        code: 'user_email_already_exists',
        message: 'Email đã tồn tại trong hệ thống.',
        statusCode: HttpStatus.CONFLICT,
    };

    static readonly EmailAlreadyInUse: IAppError = {
        code: 'user_email_already_in_use',
        message: 'Email đã được sử dụng bởi tài khoản khác.',
        statusCode: HttpStatus.CONFLICT,
    };

    static readonly InvalidCurrentPassword: IAppError = {
        code: 'user_invalid_current_password',
        message: 'Mật khẩu hiện tại không chính xác.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };
}
