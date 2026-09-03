import { AutoMap } from '@automapper/classes';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ValidationMatchResult } from '../enums';
import { DiscoveryUrlDto } from './discovery-url.dto';
import { DiscoveryValidationBatchDto } from './discovery-validation-batch.dto';

export class DiscoveryValidationLogDto extends AbstractDto {
    @AutoMap()
    sessionId: string;

    @AutoMap()
    discoveryUrlId: string;

    @AutoMap(() => DiscoveryUrlDto)
    discoveryUrl?: DiscoveryUrlDto;

    @AutoMap()
    validationBatchId: string;

    @AutoMap(() => DiscoveryValidationBatchDto)
    validationBatch?: DiscoveryValidationBatchDto;

    @AutoMap()
    operationStatus: string;

    @AutoMap()
    matchResult: ValidationMatchResult;

    @AutoMap()
    confidenceScore: number;

    @AutoMap()
    reason?: string;

    @AutoMap()
    matchedCriteria?: Record<string, any>;

    @AutoMap()
    processingDuration: number;

    @AutoMap()
    isLatestLog: boolean;
}
