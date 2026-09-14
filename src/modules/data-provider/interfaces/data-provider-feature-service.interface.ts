import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { ScraperServiceEnum } from '../enums';
import { IFeatureTestInput, TargetConfig } from './target-config.interface';

export interface IDataProviderFeatureService<TConfig = TargetConfig, TInput = IFeatureTestInput, TResult = unknown> {
    validateConfig(config: unknown): TConfig;
    testStateless(service: ScraperServiceEnum | string, config: TConfig, input: TInput): Promise<TResult>;
    testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
}
