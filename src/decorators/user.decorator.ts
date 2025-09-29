import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PayloadDto } from '../common/dto/payload.dto';

export const User = createParamDecorator((_: string, ctx: ExecutionContext): PayloadDto => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (user) return user;

    return null;
});
