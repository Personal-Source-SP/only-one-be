import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';

export interface IFeatureRunner<TConfig = any, TInput = any, TResult = any> {
    testStateless(service: string, config: TConfig, input: TInput): Promise<TResult>;
    testContextual(feature: DataProviderFeatureEntity, input?: TInput): Promise<TResult>;
}
