import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfigService } from '../../shared/services/app-config.service';
import { UserController } from './controllers/user.controller';
import { UserEntity } from './entities/user.entity';
import { UserService } from './services/user.service';
import { UserProfile } from './user.profile';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        JwtModule.registerAsync({
            inject: [AppConfigService],
            useFactory: (configService: AppConfigService) => ({
                secret: configService.jwtConfig.appSecret,
                signOptions: { expiresIn: configService.jwtConfig.expire },
            }),
        }),
    ],
    controllers: [UserController],
    providers: [UserService, UserProfile],
    exports: [UserService],
})
export class UserModule {}
