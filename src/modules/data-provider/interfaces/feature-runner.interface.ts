import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { ScraperServiceEnum } from '../enums';
import { FeatureTestInput, TargetConfig } from './target-config.interface';

export interface IFeatureRunner<TConfig = TargetConfig, TInput = FeatureTestInput, TResult = unknown> {
    validateConfig(config: unknown): TConfig;
    testStateless(service: ScraperServiceEnum | string, config: TConfig, input: TInput): Promise<TResult>;
    testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
}
