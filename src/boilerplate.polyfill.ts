'use strict';

import _ from 'lodash';

import { AbstractDto } from './common/dto/abstract.dto';
import { AbstractEntity } from './common/entities';

declare global {
    interface Array<T> {
        toDtos<B extends AbstractDto>(this: AbstractEntity[]): B[];
    }
}

Array.prototype.toDtos = function <B extends AbstractDto>(): B[] {
    return _(this)
        .map((item) => item.toDto())
        .compact()
        .value() as B[];
};
process.env.TZ = 'UTC';
