import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';

export interface ISessionWithSearchFeature {
    session: DiscoverySessionEntity;
    searchFeature: DataProviderFeatureEntity;
}
