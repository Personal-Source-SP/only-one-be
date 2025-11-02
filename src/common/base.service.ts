import { Mapper } from '@automapper/core';
import { BadRequestException, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { paginate, PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
import { AbstractEntity } from './entities';
import { IBaseService, IFindOptions } from './interfaces/base-service.interface';

export class BaseService<T extends AbstractEntity, D> implements IBaseService<T, D> {
    public repository: Repository<T>;

    protected readonly mapper: Mapper;
    protected readonly dtoMappingKey: any;
    protected readonly entityMappingKey: any;
    protected readonly logger: Logger = new Logger(BaseService.name);

    constructor(repository: Repository<T>, mapper: Mapper, dtoMappingKey: any) {
        this.mapper = mapper;
        this.repository = repository;
        this.dtoMappingKey = dtoMappingKey;
        this.entityMappingKey = this.repository?.metadata?.target;
    }

    async findAll(options?: IFindOptions<T>): Promise<D[]> {
        const { relations, select } = options ?? {};

        try {
            const entities = await this.repository.find({
                select: select ?? undefined,
                relations: relations ?? undefined,
            });

            return this.mapEntityToDto(entities) as D[];
        } catch (error) {
            this.logger.error(`Find all entities error: ${error?.message}`);
            throw new BadRequestException('Failed to find all entities');
        }
    }

    async findById(id: string, options?: IFindOptions<T>): Promise<D> {
        const { relations, select } = options ?? {};

        try {
            const entity = await this.repository.findOne({
                select: select ?? undefined,
                relations: relations ?? undefined,
                where: { id } as unknown as FindOptionsWhere<T>,
            });
            if (!entity) return null;

            return this.mapEntityToDto(entity) as D;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOneByFilter(where: FindOptionsWhere<T>, options?: IFindOptions<T>): Promise<D> {
        const { relations, select } = options ?? {};

        try {
            const entity = await this.repository.findOne({ where, relations: relations ?? undefined, select: select ?? undefined });
            if (!entity) return null;

            return this.mapEntityToDto(entity) as D;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findListByFilter(where: FindOptionsWhere<T>, options?: IFindOptions<T>): Promise<D[]> {
        const { relations, select, withDeleted } = options ?? {};

        try {
            const entities = await this.repository.find({
                where,
                select: select ?? undefined,
                relations: relations ?? undefined,
                withDeleted: withDeleted ?? false,
            });
            if (!entities) return [];

            return this.mapEntityToDto(entities) as D[];
        } catch (error) {
            this.handleError(error);
        }
    }

    async create(data: T): Promise<D> {
        try {
            const savedEntity = await this.repository.save(data);
            if (!savedEntity) return null;

            return this.mapEntityToDto(savedEntity) as D;
        } catch (error) {
            this.handleError(error);
        }
    }

    async createMany(data: T[]): Promise<D[]> {
        try {
            const createdEntities = await this.repository.save(data);
            if (!createdEntities) return [];

            return this.mapEntityToDto(createdEntities) as D[];
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: any): Promise<boolean> {
        try {
            const result = await this.repository.update(id, data);
            return result.affected > 0;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            const exists = await this.exists({ id } as unknown as FindOptionsWhere<T>);
            if (!exists) {
                throw new NotFoundException('Entity not found');
            }

            const result = await this.repository.delete(id);
            return result.affected > 0;
        } catch (error) {
            this.handleError(error);
        }
    }

    async deleteMany(where: FindOptionsWhere<T>): Promise<boolean> {
        try {
            const result = await this.repository.update(where, { deletedAt: new Date() } as any);
            return result.affected > 0;
        } catch (error) {
            this.handleError(error);
        }
    }

    async count(where: FindOptionsWhere<T>): Promise<number> {
        try {
            return this.repository.count({ where });
        } catch (error) {
            return this.handleError(error, 0);
        }
    }

    async exists(where: FindOptionsWhere<T>): Promise<boolean> {
        try {
            return this.repository.exists({ where });
        } catch (error) {
            return this.handleError(error, false);
        }
    }

    async getPaginationWithCustomQuery(query: PaginateQuery, config: PaginateConfig<T>): Promise<Paginated<D>> {
        const defaultConfig: PaginateConfig<T> = { sortableColumns: ['id'] } as PaginateConfig<T>;

        if (!isEmpty(config)) {
            Object.assign(defaultConfig, config);
        }

        const defaultResult: Paginated<D> = {
            data: [],
            meta: null,
            links: null,
        };

        try {
            const result = await paginate(query, this.repository, defaultConfig);
            if (!result?.data?.length) return defaultResult;

            const mappedData = this.mapEntityToDto(result.data) as D[];

            return { ...result, data: mappedData } as Paginated<D>;
        } catch (error) {
            return this.handleError(error, defaultResult);
        }
    }

    protected mapDataToEntity<K>(data: T | D | K): T | T[] {
        if (!this.dtoMappingKey || !this.entityMappingKey) {
            throw new BadRequestException('Automapper mapping keys are not configured for DTO -> Entity');
        }

        if (Array.isArray(data)) {
            return this.mapper.mapArray(data, this.entityMappingKey, this.dtoMappingKey);
        }

        return this.mapper.map(data, this.dtoMappingKey, this.entityMappingKey);
    }

    protected mapEntityToDto<K>(entity: T | T[] | K): D | D[] {
        if (!this.entityMappingKey || !this.dtoMappingKey) {
            throw new BadRequestException('Automapper mapping keys are not configured for Entity -> DTO');
        }

        if (Array.isArray(entity)) {
            return this.mapper.mapArray(entity, this.entityMappingKey, this.dtoMappingKey);
        }

        return this.mapper.map(entity, this.entityMappingKey, this.dtoMappingKey);
    }

    protected handleError(error: any, result?: any): any {
        let methodName = 'BaseService';
        const err = new Error();

        if (err.stack) {
            const stackLines = err.stack.split('\n');
            if (stackLines.length > 2) {
                const match = stackLines[2].match(/at (\S+)/);
                if (match && match[1]) {
                    methodName = match[1];
                }
            }
        }

        this.logger.error(`[${methodName}]: ${error?.message}`);

        if (error instanceof HttpException) {
            throw error;
        }

        if (result === undefined || result === null) {
            throw new BadRequestException(`[${methodName}]: ${error?.message}`);
        }

        return result;
    }

    protected buildQueryBuilder(queryBuilder: SelectQueryBuilder<T>, options?: IFindOptions<T>): SelectQueryBuilder<T> {
        if (isEmpty(options)) return queryBuilder;

        if (options?.isRandom) {
            queryBuilder.limit(20).orderBy('RANDOM()');
        }

        if (!isEmpty(options?.relations)) {
            Object.keys(options.relations).forEach((relation) => {
                queryBuilder.leftJoinAndSelect(`${queryBuilder.alias}.${relation}`, relation);
            });
        }

        return queryBuilder;
    }
}
