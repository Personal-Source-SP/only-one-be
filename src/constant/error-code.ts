import { HttpStatus } from '@nestjs/common';

export interface IAppError {
    code: string;
    message: string;
    statusCode: number;
    params?: Record<string, any>;
    metadata?: Record<string, any>;
}

export class AppError {
    // ! 1. COMMON / SYSTEM ERRORS (500, 400, 429)
    static readonly UnexpectedError: IAppError = {
        code: 'unexpected_error',
        message: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    static readonly BadRequest: IAppError = {
        code: 'bad_request',
        message: 'Yêu cầu không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly TooManyRequests: IAppError = {
        code: 'too_many_requests',
        message: 'Bạn thao tác quá nhiều lần. Vui lòng chậm lại và thử lại sau.',
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
    };

    // ! 2. AUTHENTICATION & AUTHORIZATION (401, 403)
    static readonly Unauthorized: IAppError = {
        code: 'unauthorized',
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };

    static readonly Forbidden: IAppError = {
        code: 'forbidden',
        message: 'Bạn không có quyền thực hiện hành động này.',
        statusCode: HttpStatus.FORBIDDEN,
    };

    // ! 3. RESOURCE & STATE ERRORS (404, 409)
    static readonly NotFound: IAppError = {
        code: 'not_found',
        message: 'Không tìm thấy tài nguyên yêu cầu.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly RecordNotFound: IAppError = {
        code: 'record_not_found',
        message: 'Bản ghi không tồn tại trong hệ thống.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly DuplicateRecord: IAppError = {
        code: 'duplicate_record',
        message: 'Dữ liệu đã tồn tại trong hệ thống.',
        statusCode: HttpStatus.CONFLICT,
    };

    static readonly ForeignKeyViolation: IAppError = {
        code: 'foreign_key_violation',
        message: 'Dữ liệu liên kết không hợp lệ hoặc không tồn tại.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly DatabaseError: IAppError = {
        code: 'database_error',
        message: 'Lỗi truy vấn cơ sở dữ liệu.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    // ! 4. VALIDATION ERRORS (400)
    static readonly ValidationError: IAppError = {
        code: 'validation_error',
        message: 'Dữ liệu cung cấp không vượt qua kiểm tra tính hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static FieldRequired = (field: string): IAppError => ({
        code: 'field_required',
        message: `Trường '${field}' là bắt buộc.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { field },
    });

    static InvalidFieldFormat = (field: string, reason?: string): IAppError => ({
        code: 'invalid_field_format',
        message: reason ? `Trường '${field}' không hợp lệ: ${reason}` : `Trường '${field}' không đúng định dạng.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { field, reason },
    });
}
