import { AutoMap } from '@automapper/classes';
import { Column, Entity, Unique } from 'typeorm';

import { AbstractEntity } from '@/common/entities';

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
}

@Entity({ name: 'users ', synchronize: true })
@Unique(['email'])
export class UserEntity extends AbstractEntity {
    @Column({ length: 50, nullable: true })
    @AutoMap()
    firstName: string;

    @Column({ length: 50, nullable: true })
    @AutoMap()
    lastName: string;

    @Column({ length: 200 })
    @AutoMap()
    email: string;

    @Column({ length: 200, select: false })
    @AutoMap()
    password: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    @AutoMap()
    role: UserRole;

    @Column({ default: true })
    @AutoMap()
    isActive: boolean;

    @Column({ nullable: true })
    @AutoMap()
    phoneNumber?: string;

    @Column({ default: false })
    @AutoMap()
    isEmailVerified: boolean;

    @Column({ nullable: true })
    @AutoMap()
    emailVerificationToken?: string;

    @Column({ nullable: true })
    @AutoMap()
    passwordResetToken?: string;

    @Column({ nullable: true })
    @AutoMap()
    passwordResetExpires?: Date;
}
