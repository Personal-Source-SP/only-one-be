import { AutoMap } from '@automapper/classes';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DiscoverySessionStatus } from '../enums';
import { DataProviderDto } from './data-provider.dto';

export class DiscoverySessionDto extends AbstractDto {
    @AutoMap()
    sessionCode: string;

    @AutoMap()
    dataProviderId: string;

    @AutoMap(() => DataProviderDto)
    dataProvider?: DataProviderDto;

    @AutoMap()
    targetUrl: string;

    @AutoMap()
    status: DiscoverySessionStatus;

    @AutoMap()
    depth: number;

    @AutoMap()
    maxUrls?: number | null;

    @AutoMap()
    autoValidate: boolean;

    @AutoMap()
    totalDiscovered: number;

    @AutoMap()
    totalQueued: number;

    @AutoMap()
    totalValidated: number;

    @AutoMap()
    durationSeconds?: number;

    @AutoMap()
    errorMessage?: string;

    @AutoMap()
    notes?: string;
}
