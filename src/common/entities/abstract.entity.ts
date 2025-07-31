import { AutoMap } from '@automapper/classes';
import { BaseEntity, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export class AbstractEntity extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    @AutoMap()
    id?: string;

    @CreateDateColumn({ name: 'created_at' })
    @AutoMap()
    createdAt?: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    @AutoMap()
    updatedAt?: Date;
}
