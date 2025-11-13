import { Mapper } from '@automapper/core';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { paginate, PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
import { LoggerService } from '../shared/services/logger.service';
import { PayloadDto } from './dto/payload.dto';
import { AbstractEntity } from './entities';
import { IBaseService, IFindOptions } from './interfaces/base-service.interface';

export class BaseService<T extends AbstractEntity, D> implements IBaseService<T, D> {
    public repository: Repository<T>;

    protected readonly mapper: Mapper;
    protected readonly dtoMappingKey: any;
    protected readonly entityMappingKey: any;
    protected readonly loggerService: LoggerService;

    constructor(repository: Repository<T>, mapper: Mapper, dtoMappingKey: any, serviceName: string) {
        this.mapper = mapper;
        this.repository = repository;
        this.dtoMappingKey = dtoMappingKey;
        this.loggerService = new LoggerService(serviceName);
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
            this.handleError(error, []);
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

    async create(data: T, user?: PayloadDto): Promise<D> {
        if (user) {
            data.createdBy = user.id;
        }

        try {
            const savedEntity = await this.repository.save(data);
            if (!savedEntity) return null;

            return this.mapEntityToDto(savedEntity) as D;
        } catch (error) {
            this.handleError(error);
        }
    }

    async createMany(data: T[], user?: PayloadDto): Promise<D[]> {
        if (user) {
            data.forEach((item) => {
                item.createdBy = user.id;
            });
        }

        try {
            const createdEntities = await this.repository.save(data);
            if (!createdEntities) return [];

            return this.mapEntityToDto(createdEntities) as D[];
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: any, user?: PayloadDto): Promise<boolean> {
        if (user) {
            data.updatedBy = user.id;
        }

        try {
            const result = await this.repository.update(id, data);
            return result.affected > 0;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string, user?: PayloadDto): Promise<boolean> {
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
        const defaultConfig: PaginateConfig<T> = { sortableColumns: ['createdAt'] } as PaginateConfig<T>;

        if (!isEmpty(config)) {
            Object.assign(defaultConfig, config);
        }

        const defaultResult: Paginated<D> = {
            data: [],
            meta: null,
            links: null,
        };

        try {
            const transformedQuery = this.transformQuery(query);

            const result = await paginate(transformedQuery, this.repository, defaultConfig);
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

        this.loggerService.error(`[${methodName}]: ${error?.message}`);

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

    private readonly transformQuery = (query: PaginateQuery): PaginateQuery => {
        const source = (query ?? {}) as Record<string, unknown>;

        const parseNumber = (value: unknown): number | undefined => {
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            if (typeof value !== 'string') return undefined;
            const trimmed = value.trim();
            if (!trimmed) return undefined;
            const parsed = Number(trimmed);
            return Number.isFinite(parsed) ? parsed : undefined;
        };

        const normalizeStringArray = (value: unknown): string[] | undefined => {
            if (!value) return undefined;

            const values = Array.isArray(value)
                ? value
                : String(value)
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean);

            const normalized = values.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length);

            return normalized.length ? (normalized as string[]) : undefined;
        };

        const normalizeSortBy = (value: unknown): [string, 'ASC' | 'DESC'][] | undefined => {
            if (!value) return undefined;

            const parseSortPair = (input: string): [string, 'ASC' | 'DESC'] | null => {
                if (!input) return null;
                const [column, direction] = input.split(':').map((item) => item.trim());
                if (!column) return null;
                const normalizedDirection = direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
                return [column, normalizedDirection];
            };

            if (Array.isArray(value)) {
                const result: [string, 'ASC' | 'DESC'][] = [];
                value.forEach((item) => {
                    if (Array.isArray(item) && item.length === 2) {
                        const [column, direction] = item as [string, string];
                        if (typeof column === 'string' && typeof direction === 'string') {
                            const normalizedDirection = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
                            result.push([column, normalizedDirection]);
                        }
                        return;
                    }

                    if (typeof item === 'string') {
                        const parsed = parseSortPair(item);
                        if (parsed) {
                            result.push(parsed);
                        }
                    }
                });

                return result.length ? result : undefined;
            }

            if (typeof value === 'string') {
                const result = value
                    .split(',')
                    .map((item) => parseSortPair(item.trim()))
                    .filter((item): item is [string, 'ASC' | 'DESC'] => Array.isArray(item));

                return result.length ? result : undefined;
            }

            return undefined;
        };

        const normalizeFilterValue = (value: unknown): string | string[] | undefined => {
            if (value === undefined || value === null) return undefined;

            if (Array.isArray(value)) {
                const normalized = value
                    .map((item) => normalizeFilterValue(item))
                    .filter(Boolean)
                    .flatMap((item) => (Array.isArray(item) ? item : [item as string]));

                return normalized.length ? normalized : undefined;
            }

            if (typeof value !== 'string') {
                return undefined;
            }

            const trimmed = value.trim();
            if (!trimmed) return undefined;

            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) {
                if (!trimmed.includes(',')) return trimmed;
                const parts = trimmed
                    .split(',')
                    .map((part) => part.trim())
                    .filter((part) => part.length);
                return parts.length ? parts : undefined;
            }

            const operator = trimmed.slice(0, colonIndex);
            const valuePart = trimmed.slice(colonIndex + 1);

            const values = valuePart
                .split(',')
                .map((part) => part.trim())
                .filter((part) => part.length);

            if (!values.length) return undefined;
            if (values.length === 1) return `${operator}:${values[0]}`;

            return values.map((item) => `${operator}:${item}`);
        };

        const normalizeFilter = (raw: Record<string, unknown>): Record<string, string | string[]> => {
            const filter: Record<string, string | string[]> = {};

            const appendFilter = (key: string, value: unknown): void => {
                if (!key) return;
                const normalizedValue = normalizeFilterValue(value);
                if (!normalizedValue) return;

                if (filter[key]) {
                    const existing = Array.isArray(filter[key]) ? filter[key] : [filter[key] as string];
                    const incoming = Array.isArray(normalizedValue) ? normalizedValue : [normalizedValue];
                    filter[key] = [...existing, ...incoming];
                    return;
                }

                filter[key] = normalizedValue;
            };

            if (source.filter && typeof source.filter === 'object') {
                Object.entries(source.filter as Record<string, unknown>).forEach(([key, value]) => appendFilter(key, value));
            }

            Object.entries(raw).forEach(([key, value]) => {
                if (!key.startsWith('filter.')) return;
                appendFilter(key.replace('filter.', ''), value);
            });

            return filter;
        };

        const transformed: PaginateQuery = {
            path: typeof source.path === 'string' && source.path.trim().length ? (source.path as string) : '/',
        };

        const limit = parseNumber(source.limit);
        if (limit !== undefined) transformed.limit = limit;

        const page = parseNumber(source.page);
        if (page !== undefined) transformed.page = page;

        const sortBy = normalizeSortBy(source.sortBy);
        if (sortBy) transformed.sortBy = sortBy;

        const searchBy = normalizeStringArray(source.searchBy);
        if (searchBy) transformed.searchBy = searchBy;

        if (typeof source.search === 'string' && source.search.trim()) {
            transformed.search = source.search.trim();
        }

        const select = normalizeStringArray(source.select);
        if (select) transformed.select = select;

        if (typeof source.cursor === 'string' && source.cursor.trim()) {
            transformed.cursor = source.cursor.trim();
        }

        const filter = normalizeFilter(source);
        if (!isEmpty(filter)) transformed.filter = filter;

        return transformed;
    };
}
