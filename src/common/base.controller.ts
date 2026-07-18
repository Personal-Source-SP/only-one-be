import {
    Body,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Query,
    Type,
    Version,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ApiOperation } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { isEmpty } from 'lodash';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { In } from 'typeorm';

import { BaseApiOkResponse } from '../decorators/base-response.decorator';
import { DeleteManyRequestDto } from './dto/base-request.dto.';
import { BasePaginationRequestDto } from './dto/pagination-request.dto';
import { PayloadDto } from './dto/payload.dto';
import { BaseControllerOptions, IBaseController } from './interfaces/base-controller.interface';
import { IBaseService } from './interfaces/base-service.interface';

export class BaseController<T, D> implements IBaseController<T, D> {
    @Inject(REQUEST) private request: ExpressRequest;

    protected service: IBaseService<T, D>;
    protected configPagination: PaginateConfig<T>;

    private readonly options: Required<BaseControllerOptions>;

    constructor(service: IBaseService<T, D>, configPagination?: PaginateConfig<T>, options?: BaseControllerOptions) {
        this.service = service;
        this.configPagination = configPagination;

        this.options = {
            enableDelete: options?.enableDelete ?? true,
            enableGetAll: options?.enableGetAll ?? true,
            enableGetById: options?.enableGetById ?? true,
            enablePagination: options?.enablePagination ?? true,
            enableDeleteMany: options?.enableDeleteMany ?? false,
        };
    }

    protected getUserRequest(): PayloadDto | null {
        const user = this.request?.user;
        if (!user) return null;

        return user as PayloadDto;
    }

    protected transformQuery(query: BasePaginationRequestDto): PaginateQuery {
        const queryParams = this.request.query;
        if (isEmpty(queryParams)) return query as PaginateQuery;

        const filter = Object.keys(queryParams).reduce(
            (acc, key) => {
                if (key.startsWith('filter')) {
                    const cleanKey = key.replace(/^filter\.?/, '');
                    acc[cleanKey] = queryParams[key];
                }
                return acc;
            },
            {} as Record<string, any>,
        );
        query.filter = filter;

        return query as PaginateQuery;
    }

    @ApiOperation({ summary: 'Get all entities' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('all')
    @BaseApiOkResponse(Object as unknown as Type<D>, { isArray: true })
    async getAll(): Promise<D[]> {
        if (!this.options.enableGetAll) {
            throw new NotFoundException('Endpoint not supported');
        }

        const result = await this.service.findAll();
        return result;
    }

    @ApiOperation({ summary: 'Get entity by id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id')
    @BaseApiOkResponse(Object as unknown as Type<D>)
    async getById(@Param('id', new ParseUUIDPipe()) id: string): Promise<D> {
        if (!this.options.enableGetById) {
            throw new NotFoundException('Endpoint not supported');
        }

        const result = await this.service.findById(id);
        return result;
    }

    @ApiOperation({ summary: 'Get pagination of entities' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @BaseApiOkResponse(Object as unknown as Type<Paginated<D>>)
    async getPagination(@Query() query: BasePaginationRequestDto): Promise<Paginated<D>> {
        if (!this.options.enablePagination) {
            throw new NotFoundException('Endpoint not supported');
        }

        const result = await this.service.getPaginationWithCustomQuery(this.transformQuery(query), this.configPagination);
        return result;
    }

    @ApiOperation({ summary: 'Delete entity by id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Delete(':id')
    @BaseApiOkResponse(Boolean)
    async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<boolean> {
        if (!this.options.enableDelete) {
            throw new NotFoundException('Endpoint not supported');
        }

        const result = await this.service.delete(id);
        return result;
    }

    @ApiOperation({ summary: 'Delete many entities' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Delete()
    @BaseApiOkResponse(Boolean)
    async deleteMany(@Body() request: DeleteManyRequestDto): Promise<boolean> {
        if (!this.options.enableDeleteMany) {
            throw new NotFoundException('Endpoint not supported');
        }

        const result = await this.service.deleteMany({ id: In(request.ids) } as any);
        return result;
    }
}
