import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
import { GoogleDriveFolderEntity } from '../entities/google-drive-folder.entity';

const googleDriveFileColumns = getColumnNames(GoogleDriveFileEntity);
const googleDriveFolderColumns = getColumnNames(GoogleDriveFolderEntity);

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

export const GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG = createPaginationConfig<GoogleDriveFolderEntity>({
    sortableColumns: ['name', 'createdAt'],
    searchableColumns: ['name'],
    defaultSortBy: [['name', 'ASC']],
    filterableColumns: {
        name: [FilterOperator.ILIKE, FilterOperator.EQ],
    },
    select: [...googleDriveFolderColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
