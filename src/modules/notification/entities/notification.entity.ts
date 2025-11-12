import { AutoMap } from '@automapper/classes';
import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { NotificationType } from '../enum/notification.enum';

@Entity({ name: 'notifications', synchronize: false })
export class NotificationEntity extends AbstractEntity {
    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    title: string;

    @Column({ type: 'varchar', length: 20, default: NotificationType.INFO })
    @AutoMap()
    type: NotificationType;

    @Column({ default: false })
    @AutoMap()
    isRead: boolean;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    @AutoMap()
    description?: string;

    @Column({ nullable: true })
    @AutoMap()
    userId?: string;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    @AutoMap()
    path?: string;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    data?: Record<string, any>;
}
