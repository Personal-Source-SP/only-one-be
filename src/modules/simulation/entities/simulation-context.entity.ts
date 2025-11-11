import { AutoMap } from '@automapper/classes';
import { Check, Column, Entity, OneToMany, Relation, Unique } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { SimulationContextStatus } from '../enums';
import { SimulationItemEntity } from './simulation-item.entity';

@Entity({ name: 'simulation_contexts', synchronize: false })
@Check(`"base_url" NOT LIKE '%/'`)
@Unique(['baseUrl'])
@Check(`"identifier" is null OR "identifier" ~ '^[a-z0-9-]+$'`)
export class SimulationContextEntity extends AbstractEntity {
    @Column({ length: 255 })
    @AutoMap()
    identifier: string;

    @Column({ length: 255 })
    @AutoMap()
    name: string;

    @Column({ length: 255 })
    @AutoMap()
    baseUrl: string;

    @Column({ type: 'varchar', length: 100, default: SimulationContextStatus.ACTIVE })
    @AutoMap()
    status: SimulationContextStatus;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    payload?: Record<string, any>;

    @Column({ type: 'timestamp', nullable: true })
    @AutoMap()
    lastSuccessfulScrapeAt?: Date;

    @OneToMany(() => SimulationItemEntity, (entity) => entity.simulationContext)
    @AutoMap(() => [SimulationItemEntity])
    simulationItems?: Relation<SimulationItemEntity>[];
}
