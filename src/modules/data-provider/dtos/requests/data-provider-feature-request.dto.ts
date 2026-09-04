import { EnumField, EnumFieldOptional, ObjectFieldOptional, StringFieldOptional } from '../../../../decorators';
import { DataProviderFeatureType, ScraperServiceEnum } from '../../enums';

export class CreateDataProviderFeatureRequestDto {
    @EnumField(() => DataProviderFeatureType, { description: 'Type of feature' })
    type: DataProviderFeatureType;

    @EnumFieldOptional(() => ScraperServiceEnum, {
        default: ScraperServiceEnum.GENERIC,
        description: 'Service runtime identifier',
    })
    service?: ScraperServiceEnum;

    @ObjectFieldOptional({ description: 'Feature configuration payload' })
    config?: Record<string, any>;
}

export class UpdateFeatureConfigRequestDto {
    @ObjectFieldOptional({ description: 'Feature configuration payload' })
    config: Record<string, any>;

    @EnumFieldOptional(() => ScraperServiceEnum, { description: 'Service runtime identifier' })
    service?: ScraperServiceEnum;

    @StringFieldOptional({ description: 'Description of changes for version history' })
    changeDescription?: string;
}

export class TestFeatureStatelessRequestDto {
    @EnumField(() => DataProviderFeatureType, { description: 'Feature type to test' })
    type: DataProviderFeatureType;

    @EnumFieldOptional(() => ScraperServiceEnum, {
        default: ScraperServiceEnum.GENERIC,
        description: 'Service engine to test',
    })
    service?: ScraperServiceEnum;

    @ObjectFieldOptional({ description: 'Raw draft configuration payload' })
    config: Record<string, any>;

    @ObjectFieldOptional({ description: 'Test input payload (e.g. url, htmlContentString, query)' })
    input?: Record<string, any>;
}

export class TestFeatureContextualRequestDto {
    @ObjectFieldOptional({ description: 'Optional input payload override' })
    input?: Record<string, any>;
}
