import { Delete, Get, HttpCode, HttpStatus, Inject, NotFoundException, Param, ParseUUIDPipe, Query, Type, Version } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ApiOperation } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';

import { PaginateConfig, PaginateQuery, Paginated } from 'nestjs-paginate';
import { BaseApiOkResponse } from '../decorators/base-response.decorator';
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
        };
    }

    protected getRequest(): PayloadDto | null {
        const user = this.request?.user;
        if (!user) return null;

        return user as PayloadDto;
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
    async getPagination(@Query() query: PaginateQuery): Promise<Paginated<D>> {
        if (!this.options.enablePagination) {
            throw new NotFoundException('Endpoint not supported');
        }
        const result = await this.service.getPaginationWithCustomQuery(query, this.configPagination);
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
}
