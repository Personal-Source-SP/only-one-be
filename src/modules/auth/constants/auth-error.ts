import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class AuthError {
    static readonly InvalidCredentials: IAppError = {
        code: 'auth_invalid_credentials',
        message: 'Email hoặc mật khẩu không chính xác.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly UserInactive: IAppError = {
        code: 'auth_user_inactive',
        message: 'Tài khoản người dùng đã bị vô hiệu hóa.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly InvalidPassword: IAppError = {
        code: 'auth_invalid_password',
        message: 'Mật khẩu không chính xác.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly InvalidRefreshToken: IAppError = {
        code: 'auth_invalid_refresh_token',
        message: 'Refresh token không hợp lệ hoặc đã hết hạn.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly UserNotFound: IAppError = {
        code: 'auth_user_not_found',
        message: 'Không tìm thấy thông tin tài khoản người dùng.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };
}
