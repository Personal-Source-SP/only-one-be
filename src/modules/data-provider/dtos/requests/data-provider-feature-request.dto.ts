import { EnumField, EnumFieldOptional, ObjectFieldOptional, StringField } from '../../../../decorators';
import { DataProviderFeatureType, ScraperServiceEnum } from '../../enums';
import { FeatureTestInput, TargetConfig } from '../../interfaces';

export class CreateDataProviderFeatureRequestDto {
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

    @EnumFieldOptional(() => ScraperServiceEnum, {
        default: ScraperServiceEnum.GENERIC,
        description: 'Service engine to test',
    })
    service?: ScraperServiceEnum;

    @ObjectFieldOptional({ description: 'Raw draft configuration payload' })
    config: TargetConfig;

    @ObjectFieldOptional({ description: 'Test input payload (e.g. url, htmlContentString, query)' })
    input?: FeatureTestInput;
}
