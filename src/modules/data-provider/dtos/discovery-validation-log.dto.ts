import { AutoMap } from '@automapper/classes';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ValidationMatchResult, ValidationOperationStatus } from '../enums';
import { DiscoveryUrlDto } from './discovery-url.dto';

export class DiscoveryValidationLogDto extends AbstractDto {
    @AutoMap()
    sessionId: string;

    @AutoMap()
    discoveryUrlId: string;

    @AutoMap(() => DiscoveryUrlDto)
    discoveryUrl?: DiscoveryUrlDto;

    @AutoMap()
    operationStatus: ValidationOperationStatus;

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
