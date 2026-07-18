import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SettingController } from './controllers/setting.controller';
import { SettingEntity } from './entities/setting.entity';
import { SettingService } from './services/setting.service';
import { SettingProfile } from './setting.profile';

const services = [SettingService];
const entities = [SettingEntity];
const controllers = [SettingController];

@Module({
    imports: [TypeOrmModule.forFeature(entities)],
    controllers: [...controllers],
    providers: [...services, SettingProfile],
    exports: [...services, SettingProfile],
})
export class SettingModule {}
