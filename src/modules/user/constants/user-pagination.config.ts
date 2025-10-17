import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { UserEntity } from '../entities/user.entity';

const userColumns = getColumnNames(UserEntity);

export const USER_PAGINATION_CONFIG = createPaginationConfig<UserEntity>({
    sortableColumns: ['email', 'userName', 'createdAt'],
    searchableColumns: ['email', 'userName'],
    defaultSortBy: [['createdAt', 'DESC']],
    filterableColumns: {
        email: [FilterOperator.ILIKE, FilterOperator.EQ],
        userName: [FilterOperator.ILIKE, FilterOperator.EQ],
    },
    relations: {
        googleAuths: true,
    },
    select: [...userColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
