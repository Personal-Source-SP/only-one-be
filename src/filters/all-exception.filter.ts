import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

import { ResponseDto } from '../common/dto/response.dto';
import { ErrorResponse } from '../common/interfaces/error.response';
import { AppError } from '../constant/error-code';
import { AppException } from '../exceptions/app.exception';
import { LoggerService } from '../shared/services/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly loggerService: LoggerService;

    constructor(private readonly httpAdapterHost: HttpAdapterHost | null) {
        this.loggerService = new LoggerService('AllExceptionsFilter');
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();
        const request = ctx.getRequest();

        const url = request?.url || '';
        const method = request?.method || 'HTTP';

        let status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        let messages: string[] = [];
        let errorCode = String(status);
        let primaryMessage = AppError.UnexpectedError.message;

        // 1. Handle AppException
        if (exception instanceof AppException) {
            const { appError } = exception;

            status = exception.getStatus();
            errorCode = appError.code;
            primaryMessage = appError.message;
        }

        // 2. Handle standard HttpException (including ValidationPipe)
        else if (exception instanceof HttpException) {
            const response = exception.getResponse();
            const typeOfResponse = typeof response;

            switch (typeOfResponse) {
                case 'string': {
                    primaryMessage = response as string;
                    errorCode = HttpStatus[status]?.toLowerCase() || String(status);
                    break;
                }

                case 'object': {
                    const resObj = response as Record<string, any>;
                    const { message, error, code } = resObj;

                    errorCode = code || HttpStatus[status]?.toLowerCase() || String(status);

                    const responseMessage = message ?? error ?? (exception as HttpException).message;

                    if (Array.isArray(responseMessage)) {
                        messages = responseMessage.map(String);
                        primaryMessage = messages[0] ?? primaryMessage;
                        errorCode = AppError.ValidationError.code;
                    } else if (responseMessage) {
                        primaryMessage = String(responseMessage);
                    }

                    break;
                }

                default: {
                    primaryMessage = (exception as HttpException).message;
                    errorCode = HttpStatus[status]?.toLowerCase() || String(status);
                    break;
                }
            }
        }
        // 3. Handle TypeORM QueryFailedError & Database Exceptions
        else if (exception instanceof QueryFailedError || (exception as any)?.name === 'QueryFailedError') {
            const driverError = (exception as any)?.driverError;
            const pgCode = driverError?.code;

            if (pgCode === '23505') {
                status = HttpStatus.CONFLICT;
                errorCode = AppError.DuplicateRecord.code;
                primaryMessage = AppError.DuplicateRecord.message;
            } else if (pgCode === '23503') {
                status = HttpStatus.BAD_REQUEST;
                errorCode = AppError.ForeignKeyViolation.code;
                primaryMessage = AppError.ForeignKeyViolation.message;
            } else {
                status = HttpStatus.INTERNAL_SERVER_ERROR;
                errorCode = AppError.DatabaseError.code;
                primaryMessage = AppError.DatabaseError.message;
            }
        }

        // 4. Handle TypeORM EntityNotFoundError
        else if ((exception as any)?.name === 'EntityNotFoundError') {
            status = HttpStatus.NOT_FOUND;
            errorCode = AppError.RecordNotFound.code;
            primaryMessage = AppError.RecordNotFound.message;
        }

        // 5. Handle Known Errors (JWT, etc.)
        else if (exception instanceof Error) {
            const ex = exception as any;
            const name = ex?.name as string | undefined;
            const rawMessage = ex?.message as string | undefined;

            switch (name) {
                case 'TokenExpiredError':
                case 'JsonWebTokenError':
                case 'NotBeforeError': {
                    status = HttpStatus.UNAUTHORIZED;
                    errorCode = AppError.Unauthorized.code;
                    primaryMessage = rawMessage || AppError.Unauthorized.message;
                    break;
                }
                default: {
                    status = HttpStatus.INTERNAL_SERVER_ERROR;
                    errorCode = AppError.UnexpectedError.code;
                    primaryMessage = AppError.UnexpectedError.message;
                    break;
                }
            }
        }

        // Extract call-site location for server log
        const rawStack = (exception as Error)?.stack;
        const location = this.extractLocation(rawStack);
        const rawErrorMsg = (exception as Error)?.message || primaryMessage;

        // Server Log (With location, request info, status, and colored stack)
        this.loggerService.error(`[${method} ${url}] [${status}] [${errorCode}] [${location}] - ${rawErrorMsg}`, rawStack);

        const params = exception instanceof AppException ? exception.appError.params : undefined;

        // Client Response
        const errorItems: ErrorResponse[] = (messages.length ? messages : [primaryMessage]).map((msg, index) => ({
            message: msg,
            code: messages.length > 1 ? `${errorCode}_${index + 1}` : errorCode,
            ...(params ? { params } : {}),
        }));

        const responseBody: ResponseDto<null> = {
            data: null,
            isSuccess: false,
            errors: errorItems,
        };

        httpAdapter.reply(ctx.getResponse(), responseBody, status);
    }

    private extractLocation(stack?: string): string {
        if (!stack) return 'UnknownLocation';

        const lines = stack.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('/src/') && !trimmed.includes('/filters/') && !trimmed.includes('node_modules')) {
                const match = trimmed.match(/^at\s+(.+)$/);
                if (match) return match[1];
            }
        }

        return lines[1]?.trim() || 'UnknownLocation';
    }
}
