import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataProviderModule } from '../data-provider/data-provider.module';
import { NotificationController } from './controllers/notification.controller';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationProfile } from './notification.profile';
import { NotificationService } from './services/notification.service';

const entities = [NotificationEntity];
const services = [NotificationService];
const controllers = [NotificationController];

@Module({
    imports: [TypeOrmModule.forFeature(entities), DataProviderModule],
    controllers: [...controllers],
    providers: [...services, NotificationProfile],
    exports: [...services, NotificationProfile],
})
export class NotificationModule {}
