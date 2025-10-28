import { paginate, PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export class BaseService<T> {
    protected repository: Repository<T>;

    constructor(repository: Repository<T>) {
        this.repository = repository;
    }

    async findAll(): Promise<T[]> {
        return this.repository.find();
    }

    async findById(id: string): Promise<T> {
        return await this.repository.findOneBy({ id } as unknown as FindOptionsWhere<T>);
    }

    async findOneByFilter(where: FindOptionsWhere<T>): Promise<T> {
        return this.repository.findOne({ where });
    }

    async create(data: any): Promise<T> {
        return this.repository.save(data);
    }

    async createMany(data: any[]): Promise<T[]> {
        return this.repository.save(data);
    }

    async update(id: string, data: QueryDeepPartialEntity<T>): Promise<boolean> {
        const result = await this.repository.update(id, data);
        return result.affected > 0;
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);
        return result.affected > 0;
    }

    async count(where: FindOptionsWhere<T>): Promise<number> {
        return this.repository.count({ where });
    }

    async exists(where: FindOptionsWhere<T>): Promise<boolean> {
        return this.repository.exists({ where });
    }

    async getPaginationWithCustomQuery(
        query: PaginateQuery,
        repository: Repository<T> | SelectQueryBuilder<T>,
        config: PaginateConfig<T>,
    ): Promise<Paginated<T>> {
        const defaultConfig: PaginateConfig<T> = { sortableColumns: ['id'] } as PaginateConfig<T>;

        if (config) Object.assign(defaultConfig, config);

        return await paginate(query, repository, defaultConfig);
    }
}
