import { EnumField, EnumFieldOptional, ObjectFieldOptional, StringField, StringFieldOptional } from '../../../../decorators';
import { DataProviderFeatureType, ScraperServiceEnum } from '../../enums';

export class CreateDataProviderFeatureRequestDto {
    @EnumField(() => DataProviderFeatureType, { description: 'Type of feature' })
    type: DataProviderFeatureType;

    @EnumField(() => ScraperServiceEnum, {
        description: 'Service runtime identifier',
    })
    service: ScraperServiceEnum;

    @ObjectFieldOptional({ description: 'Feature configuration payload' })
    config?: Record<string, unknown>;

    @ObjectFieldOptional({ description: 'Test input payload to verify feature before creating' })
    input?: Record<string, unknown>;
}

export class UpdateFeatureConfigRequestDto {
    @StringField({ description: 'Description of changes for version history' })
    changeDescription: string;

    @ObjectFieldOptional({ description: 'Feature configuration payload' })
    config?: Record<string, unknown>;

    @ObjectFieldOptional({ description: 'Test input payload to verify feature before updating' })
    input?: Record<string, unknown>;
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
    config: Record<string, unknown>;

    @ObjectFieldOptional({ description: 'Test input payload (e.g. url, htmlContentString, query)' })
    input?: Record<string, unknown>;
}
