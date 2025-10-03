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

    @DeleteDateColumn({ name: 'deleted_at' })
    @AutoMap()
    deletedAt?: Date;

    @Column({ name: 'deleted_by' })
    @AutoMap()
    deletedBy?: string;
}
