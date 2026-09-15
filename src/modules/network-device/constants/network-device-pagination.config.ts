import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { NetworkDeviceEntity } from '../entities/network-device.entity';

const networkDeviceColumns = getColumnNames(NetworkDeviceEntity);

export const NETWORK_DEVICE_PAGINATION_CONFIG = createPaginationConfig<NetworkDeviceEntity>({
    sortableColumns: ['ipAddress', 'macAddress', 'vendor', 'deviceType', 'lastSeenAt', 'createdAt'],
    searchableColumns: ['ipAddress', 'macAddress', 'vendor', 'model'],
    defaultSortBy: [['lastSeenAt', 'DESC']],
    filterableColumns: {
        deviceType: [FilterOperator.EQ, FilterOperator.IN],
        isOnline: [FilterOperator.EQ],
        vendor: [FilterOperator.ILIKE, FilterOperator.EQ],
        ipAddress: [FilterOperator.ILIKE, FilterOperator.EQ],
    },
    select: [...networkDeviceColumns],
    maxLimit: 100,
    defaultLimit: 20,
});
