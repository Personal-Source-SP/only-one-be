import { AutoMap } from '@automapper/classes';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ValidationBatchStatus } from '../enums';
import { DiscoverySessionDto } from './discovery-session.dto';

export class DiscoveryValidationBatchDto extends AbstractDto {
    @AutoMap()
    sessionId: string;

    @AutoMap(() => DiscoverySessionDto)
    discoverySession?: DiscoverySessionDto;

    @AutoMap()
    batchNumber: string;

    @AutoMap()
    status: ValidationBatchStatus;

    @AutoMap()
    totalUrls: number;

    @AutoMap()
    processedUrls: number;

    @AutoMap()
    matchedUrls: number;

    @AutoMap()
    noMatchUrls: number;

    @AutoMap()
    startedAt?: Date;

    @AutoMap()
    completedAt?: Date;

    @AutoMap()
    reasonCancelled?: string;
}
