import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { ScraperServiceEnum } from '../enums';

export interface IFeatureRunner<TConfig = any, TInput = any, TResult = any> {
    testStateless(service: ScraperServiceEnum | string, config: TConfig, input: TInput): Promise<TResult>;
    testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
}
