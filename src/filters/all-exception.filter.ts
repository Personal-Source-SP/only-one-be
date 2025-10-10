import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { ResponseDto } from '../common/dto/response.dto';
import { ErrorResponse } from '../common/interfaces/error.response';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly httpAdapterHost: HttpAdapterHost | null) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();

        let status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        let messages: string[] = [];
        let primaryMessage = 'Internal server error';

        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            const typeOfResponse = typeof response;

            switch (typeOfResponse) {
                case 'string': {
                    primaryMessage = response as string;
                    break;
                }

                case 'object': {
                    const { message, error } = response as Record<string, any>;

                    const responseMessage = message ?? error ?? exception.message;

                    if (Array.isArray(responseMessage)) {
                        messages = responseMessage.map(String);
                        primaryMessage = messages[0] ?? exception.message ?? primaryMessage;
                    } else if (responseMessage) {
                        primaryMessage = String(responseMessage);
                    } else if (exception.message) {
                        primaryMessage = exception.message;
                    }

                    break;
                }

                default: {
                    primaryMessage = exception.message;
                    break;
                }
            }
        } else if (exception instanceof Error) {
            const ex: any = exception as any;
            const name = ex?.name as string | undefined;
            const rawMessage = ex?.message as string | undefined;

            switch (name) {
                case 'TokenExpiredError':
                case 'JsonWebTokenError':
                case 'NotBeforeError': {
                    status = HttpStatus.UNAUTHORIZED;
                    primaryMessage = rawMessage || 'Unauthorized';
                    break;
                }
                default: {
                    primaryMessage = rawMessage || primaryMessage;
                    break;
                }
            }
        }

        const errorItems: ErrorResponse[] = (messages.length ? messages : [primaryMessage]).map((msg) => ({
            message: msg,
            code: String(status),
        }));

        const responseBody: ResponseDto<null> = {
            data: null,
            isSuccess: false,
            errors: errorItems,
        };

        httpAdapter.reply(ctx.getResponse(), responseBody, status);
    }
}
