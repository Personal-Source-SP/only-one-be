import { AutoMap } from '@automapper/classes';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import {
    DiscoveryUrlStatus,
    DiscoveryValidationStatus,
    FinalValidationStatus,
    ValidationMatchResult,
    ValidationUserAction,
} from '../enums';
import { DataProviderDto } from './data-provider.dto';
import { DiscoverySessionDto } from './discovery-session.dto';

export class DiscoveryUrlDto extends AbstractDto {
    @AutoMap()
    sessionId: string;

    @AutoMap(() => DiscoverySessionDto)
    discoverySession?: DiscoverySessionDto;

    @AutoMap()
    dataProviderId: string;

    @AutoMap(() => DataProviderDto)
    dataProvider?: DataProviderDto;

    @AutoMap()
    url: string;

    @AutoMap()
    domain: string;

    @AutoMap()
    title?: string;

    @AutoMap()
    description?: string;

    @AutoMap()
    status: DiscoveryUrlStatus;

    @AutoMap()
    foundAtDepth: number;

    @AutoMap()
    confidenceScore: number;

    @AutoMap()
    validationStatus: DiscoveryValidationStatus;

    @AutoMap()
    matchResult: ValidationMatchResult;

    @AutoMap()
    userAction?: ValidationUserAction;

    @AutoMap()
    userActionDate?: Date;

    @AutoMap()
    userActionReason?: string;

    @AutoMap()
    finalValidationStatus: FinalValidationStatus;
}
