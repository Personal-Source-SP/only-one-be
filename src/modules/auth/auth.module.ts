import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { JwtStrategy } from '@/shared/services/jwt.strategy';

import { AppConfigService } from '../../shared/services/app-config.service';
import { SharedModule } from '../../shared/shared.module';
import { UserService } from '../user/services/user.service';
import { UserModule } from '../user/user.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

@Module({
    imports: [
        UserModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [AppConfigService],
            useFactory: async (configService: AppConfigService) => ({
                secret: configService.jwtConfig.appSecret,
                signOptions: { expiresIn: configService.jwtConfig.expire },
            }),
        }),
        SharedModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtService, ConfigService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
