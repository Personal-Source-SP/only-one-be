import { AutoMap } from '@automapper/classes';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DiscoverySessionStatus, ValidationBatchStatus } from '../enums';
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
    targetKeywords?: string[];

    @AutoMap()
    status: DiscoverySessionStatus;

    @AutoMap()
    depth: number;

    @AutoMap()
    maxUrls?: number;

    @AutoMap()
    autoValidate: boolean;

    @AutoMap()
    totalDiscovered: number;

    @AutoMap()
    totalQueued: number;

    @AutoMap()
    totalValidated: number;

    @AutoMap()
    validationStatus: ValidationBatchStatus;

    @AutoMap()
    matchedUrls: number;

    @AutoMap()
    noMatchUrls: number;

    @AutoMap()
    validationStartedAt?: Date;

    @AutoMap()
    validationCompletedAt?: Date;

    @AutoMap()
    validationReasonCancelled?: string;

    @AutoMap()
    durationSeconds?: number;

    @AutoMap()
    errorMessage?: string;
}
