import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';

const googleDriveFileColumns = getColumnNames(GoogleDriveFileEntity);

export const GOOGLE_DRIVE_FILE_PAGINATION_CONFIG = createPaginationConfig<GoogleDriveFileEntity>({
    sortableColumns: ['name', 'mimeType', 'createdAt'],
    searchableColumns: ['name', 'mimeType'],
    defaultSortBy: [['name', 'ASC']],
    filterableColumns: {
        name: [FilterOperator.ILIKE, FilterOperator.EQ],
        mimeType: [FilterOperator.ILIKE, FilterOperator.EQ],
    },
    select: [...googleDriveFileColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
