import type { PipeTransform } from '@nestjs/common';
import { applyDecorators, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import type { Type } from '@nestjs/common/interfaces';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from './permissions.decorator';
import { PublicRoute } from './public-route.decorator';
import { Roles } from './roles.decorator';

export interface IAuthOptions {
    roles?: string[];
    permissions?: string[];
    public?: boolean;
}

export function Auth(options: IAuthOptions = {}): MethodDecorator & ClassDecorator {
    const isPublic = options.public ?? false;

    const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [
        UseGuards(JwtAuthGuard),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ description: 'Unauthorized' }),
        PublicRoute(isPublic),
    ];

    if (options.roles && options.roles.length > 0) {
        decorators.unshift(Roles(...options.roles));
    }

    if (options.permissions && options.permissions.length > 0) {
        decorators.unshift(Permissions(...options.permissions));
    }

    return applyDecorators(...decorators);
}

export function UUIDParam(property: string, ...pipes: Array<Type<PipeTransform> | PipeTransform>): ParameterDecorator {
    return Param(property, new ParseUUIDPipe({ version: '4' }), ...pipes);
}
