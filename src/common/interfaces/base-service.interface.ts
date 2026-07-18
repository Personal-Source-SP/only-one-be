import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { FindOptionsRelations, FindOptionsSelect, FindOptionsWhere } from 'typeorm';

import { PayloadDto } from '../dto/payload.dto';

export interface IFindOptions<T> {
    isRandom?: boolean;
    withDeleted?: boolean;
    select?: FindOptionsSelect<T>;
    relations?: FindOptionsRelations<T>;
}

export interface IBaseService<T, D> {
    findAll(options?: IFindOptions<T>): Promise<D[]>;
    findById(id: string, options?: IFindOptions<T>): Promise<D>;
    findOneByFilter(where: FindOptionsWhere<T>, options?: IFindOptions<T>): Promise<D>;
    findListByFilter(where: FindOptionsWhere<T>, options?: IFindOptions<T>): Promise<D[]>;

    create(data: T, user?: PayloadDto): Promise<D>;
    createMany(data: T[], user?: PayloadDto): Promise<D[]>;

    update(id: string, data: any, user?: PayloadDto): Promise<boolean>;

    delete(id: string): Promise<boolean>;
    deleteMany(where: FindOptionsWhere<T>): Promise<boolean>;

    count(where: FindOptionsWhere<T>): Promise<number>;
    exists(where: FindOptionsWhere<T>): Promise<boolean>;

    getPaginationWithCustomQuery(query: PaginateQuery, config: PaginateConfig<T>): Promise<Paginated<D>>;
}
