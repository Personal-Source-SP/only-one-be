import type { Type } from '@nestjs/common';
import {
    applyDecorators,
    Delete as NestDelete,
    Get as NestGet,
    HttpCode,
    HttpStatus,
    Patch as NestPatch,
    Post as NestPost,
    Put as NestPut,
    RequestMethod,
    Version,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

import { BaseApiOkResponse, ResponseDtoType } from './base-response.decorator';

export interface IRestApiOptions {
    path?: string | string[];
    summary?: string;
    description?: string;
    responseDto?: ResponseDtoType;
    version?: string | string[];
    httpCode?: HttpStatus;
    deprecated?: boolean;
}

export type RestApiInput = string | string[] | IRestApiOptions;

const normalizeOptions = (input?: RestApiInput): IRestApiOptions => {
    if (!input) return {};
    if (typeof input === 'string' || Array.isArray(input)) {
        return { path: input };
    }
    return input;
};

const createRestApiDecorator = (
    method: RequestMethod,
    defaultStatus: HttpStatus = HttpStatus.OK,
    input?: RestApiInput,
): MethodDecorator => {
    const options = normalizeOptions(input);
    const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [];

    // 1. API Versioning (default '1')
    decorators.push(Version(options.version ?? '1'));

    // 2. HTTP Method Routing
    const path = options.path ?? '';
    switch (method) {
        case RequestMethod.GET:
            decorators.push(NestGet(path));
            break;
        case RequestMethod.POST:
            decorators.push(NestPost(path));
            break;
        case RequestMethod.PUT:
            decorators.push(NestPut(path));
            break;
        case RequestMethod.DELETE:
            decorators.push(NestDelete(path));
            break;
        case RequestMethod.PATCH:
            decorators.push(NestPatch(path));
            break;
        default:
            decorators.push(NestGet(path));
            break;
    }

    // 3. HTTP Status Code (default to HttpStatus.OK unless specified otherwise)
    decorators.push(HttpCode(options.httpCode ?? defaultStatus));

    // 4. Swagger ApiOperation Documentation
    if (options.summary || options.description || options.deprecated !== undefined) {
        decorators.push(
            ApiOperation({
                summary: options.summary,
                description: options.description,
                deprecated: options.deprecated,
            }),
        );
    }

    // 5. Response Schema via BaseApiOkResponse
    if (options.responseDto) {
        decorators.push(BaseApiOkResponse(options.responseDto));
    }

    return applyDecorators(...decorators);
};

export function Get(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.GET, HttpStatus.OK, options);
}

export function Post(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.POST, HttpStatus.OK, options);
}

export function Put(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.PUT, HttpStatus.OK, options);
}

export function Delete(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.DELETE, HttpStatus.OK, options);
}

export function Patch(options?: RestApiInput): MethodDecorator {
    return createRestApiDecorator(RequestMethod.PATCH, HttpStatus.OK, options);
}
