import { AutoMap } from '@automapper/classes';
import { BaseEntity, Column, CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export class AbstractEntity extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    @AutoMap()
    id: string;

    @CreateDateColumn({ name: 'created_at' })
    @AutoMap()
    createdAt?: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    @AutoMap()
    updatedAt?: Date;

    @Column({ type: 'uuid', nullable: true })
    @AutoMap()
    deletedBy?: string | null;

    @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
    @AutoMap()
    deletedAt?: Date | null;
}
