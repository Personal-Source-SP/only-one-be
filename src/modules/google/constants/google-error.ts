import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class GoogleError {
    static readonly AuthFailed: IAppError = {
        code: 'google_auth_failed',
        message: 'Xác thực tài khoản Google thất bại hoặc không tìm thấy tài khoản.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly DriveFileNotFound: IAppError = {
        code: 'google_drive_file_not_found',
        message: 'Không tìm thấy file trên Google Drive.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly DriveFolderNotFound: IAppError = {
        code: 'google_drive_folder_not_found',
        message: 'Không tìm thấy thư mục trên Google Drive.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly FileTagNotFound: IAppError = {
        code: 'google_file_tag_not_found',
        message: 'Không tìm thấy thẻ phân loại file.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly UserIdRequired: IAppError = {
        code: 'google_user_id_required',
        message: 'User ID là bắt buộc.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly InvalidDriveType: IAppError = {
        code: 'google_invalid_drive_type',
        message: 'Loại Google Drive không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };
}
