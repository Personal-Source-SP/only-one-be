import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { SimulationItemStatus, SimulationService } from '../enums';
import { SimulationContextEntity } from './simulation-context.entity';

@Entity({ name: 'simulation_items', synchronize: false })
export class SimulationItemEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    simulationContextId: string;

    @Column({ type: 'varchar', length: 255, default: SimulationService.UNLUCID_AI })
    @AutoMap()
    serviceExecution: SimulationService;

    @Column({ type: 'varchar', length: 255, default: SimulationItemStatus.PENDING })
    @AutoMap()
    status: SimulationItemStatus;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    expiresAt?: Date;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    payload?: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    metadata?: Record<string, any>;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @AutoMap()
    errorMessage?: string;

    @ManyToOne(() => SimulationContextEntity, (entity) => entity.simulationItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'simulation_context_id' })
    @AutoMap(() => SimulationContextEntity)
    simulationContext: Relation<SimulationContextEntity>;
}
