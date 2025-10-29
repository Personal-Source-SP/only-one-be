import { Paginated, PaginateQuery } from 'nestjs-paginate';

export interface BaseControllerOptions {
    enableDelete?: boolean;
    enableGetAll?: boolean;
    enableGetById?: boolean;
    enablePagination?: boolean;
}

export interface IBaseController<T, D> {
    getAll(): Promise<D[]>;
    getById(id: string): Promise<D>;
    getPagination(query: PaginateQuery): Promise<Paginated<D>>;

    delete(id: string): Promise<boolean>;
}
