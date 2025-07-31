import { ExecutionContext, Injectable } from '@nestjs/common';

import { AppConfigService } from '../shared/services/app-config.service';

@Injectable()
export class SecretGuard {
    constructor(private readonly _configService: AppConfigService) {}
    canActivate(context: ExecutionContext): boolean {
        const { headers } = context.switchToHttp().getRequest();
        const requestSecret = headers.secret || headers.authorization?.split(' ')[1] || '';
        return requestSecret === this._configService.get('AUTH_SECRET_KEY');
    }
}
