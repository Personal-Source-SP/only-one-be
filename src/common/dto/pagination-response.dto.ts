export class PaginationResponseDto<T> {
    data: T[];
    total: number;
    pageSize?: number;
    pageIndex?: number;
    constructor(data?: Partial<PaginationResponseDto<T>>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}

export class CachePaginationResponseDto<T> extends PaginationResponseDto<T> {
    constructor(data?: Partial<CachePaginationResponseDto<T>>) {
        super();
        if (data) {
            Object.assign(this, data);
        }
    }
}
