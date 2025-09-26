'use strict';

import { AutoMap } from '@automapper/classes';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AbstractDto {
    @Expose()
    @AutoMap()
    id?: string;

    @Expose()
    @AutoMap()
    createdAt?: Date;

    @Expose()
    @AutoMap()
    createdBy?: string | null;

    @Expose()
    @AutoMap()
    updatedBy?: string | null;

    @Expose()
    @AutoMap()
    updatedAt?: Date;

    @Expose()
    @AutoMap()
    deletedBy?: string | null;

    @Expose()
    @AutoMap()
    deletedAt?: Date | null;
}
