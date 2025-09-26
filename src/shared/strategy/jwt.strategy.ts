import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfigService } from '../services/app-config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: AppConfigService) {
        super({
            ignoreExpiration: false,
            secretOrKey: configService.get('APP_SECRET'),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }

    async validate(payload: any) {
        return {
            id: payload.sub,
            email: payload.email,
            roles: payload.roles,
            username: payload.username,
        };
    }
}
