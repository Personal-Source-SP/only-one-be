import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { NetworkDeviceType } from '../enums';
import { IOnvifMetadata } from '../interfaces';

@Entity('network_devices', { synchronize: false })
export class NetworkDeviceEntity extends AbstractEntity {
    @Column({ type: 'varchar', length: 45, unique: true })
    @Index({ unique: true })
    @AutoMap()
    ipAddress: string;

    @Column({ type: 'varchar', length: 50, default: NetworkDeviceType.UNKNOWN })
    @AutoMap()
    deviceType: NetworkDeviceType;

    @Column({ type: 'varchar', length: 17, nullable: true })
    @Index()
    @AutoMap()
    macAddress?: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    @AutoMap()
    vendor?: string | null;

    @Column({ type: 'varchar', length: 150, nullable: true })
    @AutoMap()
    model?: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    @AutoMap()
    firmwareVersion?: string | null;

    @Column({ type: 'jsonb', default: [] })
    @AutoMap()
    openPorts: number[];

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    onvifMetadata?: IOnvifMetadata | null;

    @Column({ type: 'boolean', default: true })
    @AutoMap()
    isOnline: boolean;

    @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    @AutoMap()
    lastSeenAt: Date;
}
