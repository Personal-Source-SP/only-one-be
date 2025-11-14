import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

import { DEFAULT_PAGE_SIZE } from '../../constant';

export class FilterRequest {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    field?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    operator?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    values?: string;
}

export class BasePaginationRequestDto<T = FilterRequest> {
    @ApiPropertyOptional({
        minimum: 1,
        default: 1,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({
        minimum: 1,
        maximum: 100,
        default: DEFAULT_PAGE_SIZE,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @Transform(({ value }) => {
        if (!value) {
            return null;
        }

        if (Array.isArray(value)) return value;

        if (typeof value === 'string') {
            const splitters = /[,&]/;
            const result: [string, string][] = value
                .split(splitters)
                .map((part: string) => {
                    if (part && part.includes(':')) {
                        const [field, dir] = part.split(':');
                        return [field, dir] as [string, string];
                    }
                    return null;
                })
                .filter(Boolean);

            return result.length ? result : undefined;
        }

        return null;
    })
    sortBy?: [string, string][];

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    searchBy?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    filter?: T;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    select?: string[];

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    path?: string;

    constructor(options?: Partial<BasePaginationRequestDto<T>>) {
        if (options) {
            Object.assign(this, options);
        }
    }
}
