import { AutoMap } from '@automapper/classes';
import { Transform } from 'class-transformer';

import { StringField, StringFieldOptional } from '../../../../decorators';

export class CreateItemRequestDto {
    @StringField({ maxLength: 255 })
    @AutoMap()
    name: string;

    @StringFieldOptional({ maxLength: 20 })
    @AutoMap()
    code?: string;

    @StringFieldOptional({
        each: true,
        description: 'Tags list or comma-separated string',
    })
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((tag: string) => tag.trim())
                .filter(Boolean);
        }
        return value;
    })
    @AutoMap()
    tags?: string[];
}

export class UpdateItemRequestDto {
    @StringFieldOptional({ maxLength: 255 })
    @AutoMap()
    name?: string;

    @StringFieldOptional({ maxLength: 20 })
    @AutoMap()
    code?: string;

    @StringFieldOptional({ each: true })
    @AutoMap()
    tags?: string[];
}
