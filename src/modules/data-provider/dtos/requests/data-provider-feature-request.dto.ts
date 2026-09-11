import { EnumField, ObjectFieldOptional, StringField, UUIDField } from '../../../../decorators';
import { DataProviderFeatureType, ScraperServiceEnum } from '../../enums';
import { FeatureTestInput, TargetConfig } from '../../interfaces';

export class CreateDataProviderFeatureRequestDto {
    @UUIDField({ description: 'Data provider ID' })
    dataProviderId: string;

    @EnumField(() => DataProviderFeatureType, { description: 'Type of feature' })
    type: DataProviderFeatureType;

    @EnumField(() => ScraperServiceEnum, {
        description: 'Service runtime identifier',
    })
    service: ScraperServiceEnum;

    @ObjectFieldOptional({ description: 'Feature configuration payload' })
    config?: TargetConfig;

    @ObjectFieldOptional({ description: 'Test input payload to verify feature before creating' })
    input?: FeatureTestInput;
}

export class UpdateFeatureConfigRequestDto {
    @StringField({ description: 'Description of changes for version history' })
    changeDescription: string;

    @ObjectFieldOptional({ description: 'Feature configuration payload' })
    config?: TargetConfig;

    @ObjectFieldOptional({ description: 'Test input payload to verify feature before updating' })
    input?: FeatureTestInput;
}

export class TestFeatureStatelessRequestDto {
    @EnumField(() => DataProviderFeatureType, { description: 'Feature type to test' })
    type: DataProviderFeatureType;

    @EnumField(() => ScraperServiceEnum, {
        description: 'Service engine to test',
    })
    service: ScraperServiceEnum;

    @ObjectFieldOptional({ description: 'Raw draft configuration payload' })
    config: TargetConfig;

    @ObjectFieldOptional({ description: 'Test input payload (e.g. url, htmlContentString, query)' })
    input?: FeatureTestInput;
}
