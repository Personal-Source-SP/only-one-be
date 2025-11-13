import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationListener } from './listeners/notification.listener';
import { NotificationProfile } from './notification.profile';
import { NotificationService } from './services/notification.service';

const entities = [NotificationEntity];
const services = [NotificationService];
const listeners = [NotificationListener];
@Global()
@Module({
    imports: [TypeOrmModule.forFeature(entities)],
    providers: [...services, NotificationProfile, ...listeners],
    exports: [...services, NotificationProfile, ...listeners],
})
export class NotificationModule {}
