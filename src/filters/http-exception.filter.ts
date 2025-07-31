import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';

import { LoggerService } from '../shared/services/logger.service';

@Catch()
export class HttpExceptionFilter extends BaseExceptionFilter {
    constructor(private readonly _logger: LoggerService) {
        super();
    }

    catch(exception: HttpException, host: ArgumentsHost) {
        //TODO: Need to remove custom handler here

        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        if (request) {
            const status = exception.getStatus ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

            const errorResponse = {
                code: status,
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
                error: status !== HttpStatus.INTERNAL_SERVER_ERROR ? exception.message || null : 'Internal server error',
                message: typeof exception.getResponse() === 'object' ? (exception.getResponse() as any).message : exception.getResponse(),
            };

            if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
                this._logger.error(exception);
            } else {
                this._logger.error(exception);
            }

            return response.status(status).json(errorResponse);
        } else {
            // GRAPHQL Exception
            // const gqlHost = GqlArgumentsHost.create(host);
            return exception;
        }
    }
}
