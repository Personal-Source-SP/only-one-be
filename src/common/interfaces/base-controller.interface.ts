import { Paginated } from 'nestjs-paginate';
import { DeleteManyRequestDto } from '../dto/base-request.dto.';
import { BasePaginationRequestDto } from '../dto/pagination-request.dto';

export interface BaseControllerOptions {
    enableDelete?: boolean;
    enableGetAll?: boolean;
    enableGetById?: boolean;
    enablePagination?: boolean;
    enableDeleteMany?: boolean;
}

export interface IBaseController<T, D> {
    getAll(): Promise<D[]>;
    getById(id: string): Promise<D>;
    delete(id: string): Promise<boolean>;
    deleteMany(request: DeleteManyRequestDto): Promise<boolean>;
    getPagination(query: BasePaginationRequestDto): Promise<Paginated<D>>;
}
