import { AutoMap } from '@automapper/classes';

import { EnumFieldOptional, StringField, StringFieldOptional, URLField, URLFieldOptional } from '../../../../decorators';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../../enums';

export class CreateDataProviderRequestDto {
    @StringField({ maxLength: 255 })
    @AutoMap()
    name: string;

    @URLField({ maxLength: 255 })
    @AutoMap()
    baseUrl: string;

    @StringFieldOptional({
        maxLength: 255,
        description: 'Identifier must contain only letters, numbers, and dashes',
    })
    @AutoMap()
    identifier?: string;
}

export class UpdateDataProviderRequestDto {
    @StringFieldOptional({ maxLength: 255, description: 'Data Provider name' })
    @AutoMap()
    name?: string;

    @StringFieldOptional({
        maxLength: 255,
        description: 'Identifier for the data provider',
    })
    @AutoMap()
    identifier?: string;

    @URLFieldOptional({ maxLength: 255, description: 'Base URL of the Data Provider' })
    @AutoMap()
    baseUrl?: string;
}

export class FindDataProvidersWithFeaturesRequestDto {
    @EnumFieldOptional(() => DataProviderFeatureType, { description: 'Filter by feature type' })
    featureType?: DataProviderFeatureType;

    @EnumFieldOptional(() => DataProviderFeatureStatus, { description: 'Filter by feature status' })
    featureStatus?: DataProviderFeatureStatus;
}

