import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { DEFAULT_PAGE_SIZE } from '../../constant';
import { SortOrder } from '../enums/sort-order';

export enum OrderDirection {}
export class PaginationRequestDto {
    @ApiPropertyOptional({
        minimum: 1,
        default: 1,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    pageIndex?: number = 1;

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
    pageSize?: number = DEFAULT_PAGE_SIZE;

    @ApiPropertyOptional({
        enum: SortOrder,
        default: SortOrder.ASC,
    })
    @IsEnum(SortOrder)
    @Transform(({ value }) => (value ? value.toUpperCase() : 'ASC'))
    @IsOptional()
    order?: SortOrder;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    sort?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    filter?: string;

    get take(): number {
        return this.pageSize;
    }

    get skip(): number {
        return (this.pageIndex - 1) * this.pageSize;
    }

    constructor(options?: { pageSize?: number; pageIndex?: number; filter?: string; order?: SortOrder; sort?: string }) {
        this.pageSize = options?.pageSize;
        this.pageIndex = options?.pageIndex;
        this.filter = options?.filter;
        this.sort = options?.sort;
        this.order = options?.order;
    }
}
